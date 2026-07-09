require('dotenv').config();
const path = require('path');
const crypto = require('crypto');
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

// --- VALIDAÇÃO DAS VARIÁVEIS DE AMBIENTE DO R2 (fail-fast) ---
// Bucket PRIVADO (sem domínio público r2.dev). Leituras são feitas por URL
// pré-assinada (presignGetByKey) — não há mais STORAGE_PUBLIC_URL.
const REQUIRED_R2_ENV = [
  'STORAGE_ENDPOINT', 'STORAGE_ASSESS_KEY_ID', 'STORAGE_SECRET_ACCESS_KEY',
  'STORAGE_BUCKET_NAME',
];
const missingR2Env = REQUIRED_R2_ENV.filter((k) => !process.env[k]);
if (missingR2Env.length > 0) {
  console.error(`❌ [R2] Variáveis de ambiente ausentes: ${missingR2Env.join(', ')}. Uploads e deleções vão falhar.`);
}

// --- CONFIGURAÇÃO DO CLIENTE S3 (Cloudflare R2) ---
const s3Client = new S3Client({
  endpoint: process.env.STORAGE_ENDPOINT, // O endpoint da conta R2
  region: "auto",
  credentials: {
    // Mantive a grafia "ASSESS" pois foi como você forneceu nas chaves
    accessKeyId: process.env.STORAGE_ASSESS_KEY_ID, 
    secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY,
  },
  // R2 funciona bem com o checksum padrão, mas manter WHEN_REQUIRED não quebra
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
  // Mantemos forcePathStyle: true para garantir compatibilidade usando o endpoint da conta
  forcePathStyle: true,
});

// --- LISTA PERMITIDA DE MIME TYPES (Mantido inalterado) ---
const ALLOWED_MIME_TYPES = [
  // Removido por segurança: 'image/svg+xml' (SVG pode conter scripts → stored XSS inline).
  'image/jpeg', 'image/pjpeg', 'image/png', 'image/gif', 'image/webp',
  'image/bmp', 'image/tiff', 'image/x-icon', 'image/heic', 'image/heif',
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/ogg', 
  'audio/aac', 'audio/midi', 'audio/x-m4a', 'audio/flac', 'audio/webm',
  'video/mp4', 'video/mpeg', 'video/webm', 'video/quicktime', 'video/x-msvideo', 
  'video/x-matroska', 'video/3gpp',
  'application/pdf', 'application/msword', 
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/rtf', 'text/csv', 'application/csv', 'text/x-csv', 
  'text/comma-separated-values', 'text/tab-separated-values',
  'application/x-ipynb+json', 'application/json', 'text/json', 'application/geo+json',
  // Removidos por segurança: 'text/html', 'text/javascript', 'application/javascript'
  // (executam no navegador ao serem servidos pelo domínio público → stored XSS).
  'text/plain', 'text/x-python',
  'application/x-python-code', 'text/css', 'application/xml',
  'text/xml', 'application/x-sh', 'application/x-sql', 'text/x-r-source', 'text/markdown',
  'application/zip', 'application/x-zip-compressed', 'application/x-7z-compressed', 
  'application/x-rar-compressed', 'application/gzip', 'application/x-tar'
];

// Extensões permitidas (Mantido inalterado)
const ALLOWED_EXTENSIONS = ['.ipynb', '.csv', '.R', '.py', '.sql', '.md'];

// Tamanho máximo de upload (2 GB). Advisory: validado ao gerar a URL assinada.
// Como o upload vai DIRETO do navegador pro R2 (presigned PUT), o limite de
// body do backend/Vercel não se aplica — por isso arquivos grandes passam.
// Garantia rígida de tamanho no R2 exigiria um Cloudflare Worker à frente.
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024;
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

// --- MAPEAMENTO DE CATEGORIAS (Mantido inalterado) ---
const FOLDER_MAP = {
  'cover': 'uploads/images/covers',
  'content': 'uploads/images/content',
  'image': 'uploads/images/content',
  'document': 'uploads/documents',
  'data': 'uploads/data',
  'audio': 'uploads/audio',
  'video': 'uploads/video',
  'notebook': 'uploads/notebooks',
  'script': 'uploads/scripts'
};

// --- FUNÇÕES UTILITÁRIAS ---

function isAllowedFileType(mimeType, fileName) {
  const normalizedMime = (mimeType || '').toLowerCase();
  if (normalizedMime && ALLOWED_MIME_TYPES.includes(normalizedMime)) return true;
  const ext = path.extname(fileName || '').toLowerCase();
  if (ext && ALLOWED_EXTENSIONS.includes(ext)) return true;
  return false;
}

function generateUniqueFilename(originalName) {
  const fileExt = path.extname(originalName);
  
  // 1. Juntamos o nome original, a data/hora exata em milissegundos e um UUID
  const dataToObfuscate = `${originalName}-${Date.now()}-${crypto.randomUUID()}`;
  
  // 2. Criamos um Hash (criptografia irreversível) dessa mistura
  const hashedName = crypto.createHash('sha256').update(dataToObfuscate).digest('hex');
  
  // 3. Retornamos os primeiros 32 caracteres do hash (para o nome não ficar gigante) + a extensão
  return `${hashedName.substring(0, 32)}${fileExt}`;
}

async function testConnectionData() {
  try {
    // Alterado para STORAGE_BUCKET_NAME
    await s3Client.send(new ListObjectsV2Command({ Bucket: process.env.STORAGE_BUCKET_NAME, MaxKeys: 1 }));
    console.log("[R2] Conexão bem-sucedida.");
    return true;
  } catch (error) {
    console.error("[R2] Falha na conexão:", error.message);
    return false;
  }
}

async function deleteFileFromS3(fileUrl) {
  if (!fileUrl || !fileUrl.startsWith('http')) {
    console.log(`[S3 Delete] Ignorando URL inválida: ${fileUrl}`);
    return false;
  }
  
  try {
    const urlObj = new URL(fileUrl);
    
    // Extrair a key da URL pública do R2
    // Ex: https://pub-xxx.r2.dev/pasta/arquivo.ext -> pasta/arquivo.ext
    let key = urlObj.pathname;
    if (key.startsWith('/')) key = key.substring(1);
    
    // Se a URL contém o bucket no path (formato path-style), remover
    // Ex: https://<account>.r2.cloudflarestorage.com/bucket-name/pasta/arquivo.ext
    const bucketName = process.env.STORAGE_BUCKET_NAME;
    if (key.startsWith(`${bucketName}/`)) {
      key = key.substring(bucketName.length + 1);
    }

    console.log(`[S3 Delete] Deletando: ${key} (do bucket: ${bucketName})`);

    const params = { 
      Bucket: bucketName, 
      Key: key 
    };
    
    await s3Client.send(new DeleteObjectCommand(params));
    console.log(`[S3 Delete] Sucesso: ${key}`);
    return true;
    
  } catch (error) {
    console.error(`[S3 Delete] Falha ao deletar ${fileUrl}:`, error.message);
    return false;
  }
}

/**
 * 5. GERAR URLS PRÉ-ASSINADAS
 */
async function generatePresignedUrls(filesMeta) {
  const urls = await Promise.all(filesMeta.map(async (file) => {
    
    if (!isAllowedFileType(file.fileType, file.fileName)) {
      throw new Error(`Tipo de arquivo não permitido: ${file.fileName} (${file.fileType})`);
    }

    if (file.fileSize != null) {
      const size = Number(file.fileSize);
      if (!Number.isFinite(size) || size <= 0) {
        throw new Error(`Tamanho de arquivo inválido: ${file.fileName}`);
      }
      if (size > MAX_UPLOAD_BYTES) {
        throw new Error(`Arquivo excede o limite de ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB: ${file.fileName}`);
      }
    }

    const baseFolder = FOLDER_MAP[file.category] || 'uploads/others';
    const uniqueName = generateUniqueFilename(file.fileName);
    const key = `${baseFolder}/${uniqueName}`;

    const contentType = file.fileType || 'application/octet-stream';

    const command = new PutObjectCommand({
      Bucket: process.env.STORAGE_BUCKET_NAME, // Alterado para a nova variável
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 600 });

    // --- ALTERAÇÃO PRINCIPAL AQUI ---
    // R2 usa um domínio público separado (o STORAGE_PUBLIC_URL fornecido)
    // Ex: https://pub-ea77481ae01544aa9db5da2e3a5ef70e.r2.dev/key
    const publicUrl = `${process.env.STORAGE_PUBLIC_URL}/${key}`;

    return {
      tempId: file.tempId,
      uploadUrl,     
      publicUrl,     
      key
    };
  }));

  return urls;
}

/**
 * Presign v2 para mídia de POSTAGEM. Layout `postagens/{id}/...` (doc 05).
 * Diferente do generatePresignedUrls legado (FOLDER_MAP): a linha em `anexos`
 * é criada pela rota chamadora com a `chave_r2` retornada aqui.
 */
async function presignPostagemUpload({ postagemId, fileName, fileType, fileSize }) {
  if (!postagemId) throw new Error('postagemId obrigatório.');
  if (!fileName) throw new Error('fileName obrigatório.');
  if (!isAllowedFileType(fileType, fileName)) {
    throw new Error(`Tipo de arquivo não permitido: ${fileName} (${fileType || 'sem mime'}).`);
  }
  if (fileSize != null) {
    const size = Number(fileSize);
    if (!Number.isFinite(size) || size <= 0) throw new Error(`Tamanho inválido: ${fileName}.`);
    if (size > MAX_UPLOAD_BYTES) throw new Error(`Arquivo excede ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB.`);
  }
  const key = `postagens/${postagemId}/${generateUniqueFilename(fileName)}`;
  const command = new PutObjectCommand({
    Bucket: process.env.STORAGE_BUCKET_NAME,
    Key: key,
    ContentType: fileType || 'application/octet-stream',
  });
  // TTL longo (1h): um upload de 2 GB em conexão lenta pode demorar.
  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  return { uploadUrl, key };
}

/**
 * Presign de AVATAR (foto de perfil). Só imagens; layout versionado por hash.
 * Path: `avatares/{tipo}/{id}/{hash}.ext`. A rota chamadora cria a linha em
 * `anexos` (owner_tipo/owner_id) com a chave retornada.
 */
async function presignAvatarUpload({ tipo, id, fileName, fileType, fileSize }) {
  if (!tipo || !id) throw new Error('dono do avatar obrigatório.');
  if (!(fileType || '').toLowerCase().startsWith('image/')) throw new Error('O avatar deve ser uma imagem.');
  if (!isAllowedFileType(fileType, fileName)) throw new Error('Tipo de imagem não permitido.');
  if (fileSize != null) {
    const size = Number(fileSize);
    if (!Number.isFinite(size) || size <= 0) throw new Error('Tamanho inválido.');
    if (size > MAX_AVATAR_BYTES) throw new Error('A imagem excede 2 MB.');
  }
  const key = `avatares/${tipo}/${id}/${generateUniqueFilename(fileName || 'avatar.jpg')}`;
  const command = new PutObjectCommand({
    Bucket: process.env.STORAGE_BUCKET_NAME, Key: key, ContentType: fileType,
  });
  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 600 });
  return { uploadUrl, key };
}

/**
 * Upload de AVATAR pelo SERVIDOR (imagem pequena ≤2 MB). O navegador manda o
 * arquivo pro backend, que faz o PUT no R2 — assim o upload NÃO precisa de CORS
 * do bucket no browser (ao contrário da mídia de postagem, que vai direto por
 * ser grande). Valida imagem/tamanho e devolve a chave.
 */
async function uploadAvatarObject({ tipo, id, fileName, fileType, buffer }) {
  if (!tipo || !id) throw new Error('dono do avatar obrigatório.');
  if (!(fileType || '').toLowerCase().startsWith('image/')) throw new Error('O avatar deve ser uma imagem.');
  if (!isAllowedFileType(fileType, fileName)) throw new Error('Tipo de imagem não permitido.');
  const size = buffer?.length || 0;
  if (size <= 0) throw new Error('Imagem vazia.');
  if (size > MAX_AVATAR_BYTES) throw new Error('A imagem excede 2 MB.');
  const key = `avatares/${tipo}/${id}/${generateUniqueFilename(fileName || 'avatar.jpg')}`;
  await s3Client.send(new PutObjectCommand({
    Bucket: process.env.STORAGE_BUCKET_NAME, Key: key, Body: buffer, ContentType: fileType,
  }));
  return { key, size };
}

/**
 * URL pré-assinada de GET (leitura) para uma chave do bucket privado.
 * TTL curto (default 5 min). Usada para downloads gated e para servir
 * imagens (capa/avatar) via redirect.
 */
async function presignGetByKey(key, ttlSeconds = 300) {
  if (!key) return null;
  const command = new GetObjectCommand({ Bucket: process.env.STORAGE_BUCKET_NAME, Key: key });
  return getSignedUrl(s3Client, command, { expiresIn: ttlSeconds });
}

/**
 * Deleta um objeto do R2 pela CHAVE (nunca por URL do cliente). Fonte da
 * verdade = anexos.chave_r2. Retorna true/false.
 */
async function deleteByKey(key) {
  if (!key) return false;
  try {
    await s3Client.send(new DeleteObjectCommand({ Bucket: process.env.STORAGE_BUCKET_NAME, Key: key }));
    return true;
  } catch (e) {
    console.error(`[R2] delete por chave falhou (${key}):`, e.message);
    return false;
  }
}

module.exports = {
  s3Client,
  testConnectionData,
  deleteFileFromS3,
  deleteByKey,
  presignGetByKey,
  generatePresignedUrls,
  presignPostagemUpload,
  presignAvatarUpload,
  uploadAvatarObject,
  isAllowedFileType,
  MAX_UPLOAD_BYTES,
  ALLOWED_MIME_TYPES
};