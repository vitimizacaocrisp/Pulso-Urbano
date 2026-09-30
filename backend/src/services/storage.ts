import 'dotenv/config';
import path from 'path';
import crypto from 'crypto';
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

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
    accessKeyId: process.env.STORAGE_ASSESS_KEY_ID as string,
    secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY as string,
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
const ALLOWED_EXTENSIONS = ['.ipynb', '.csv', '.r', '.py', '.sql', '.md'];

// Tamanho máximo de upload (2 GB). Advisory: validado ao gerar a URL assinada.
// Como o upload vai DIRETO do navegador pro R2 (presigned PUT), o limite de
// body do backend/Vercel não se aplica — por isso arquivos grandes passam.
// Garantia rígida de tamanho no R2 exigiria um Cloudflare Worker à frente.
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024;
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

// --- MAPEAMENTO DE CATEGORIAS (Mantido inalterado) ---
const FOLDER_MAP: Record<string, any> = {
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

function isAllowedFileType(mimeType: any, fileName: any) {
  const normalizedMime = (mimeType || '').toLowerCase();
  // MIME informado nunca cai para a extensão: isso impediria, por exemplo,
  // `text/html` renomeado para `.csv` de furar a allowlist.
  if (normalizedMime) return ALLOWED_MIME_TYPES.includes(normalizedMime);
  const ext = path.extname(fileName || '').toLowerCase();
  if (ext && ALLOWED_EXTENSIONS.includes(ext)) return true;
  return false;
}

const MIME_PREFIX_BY_ATTACHMENT: Record<string, any> = {
  cover: 'image/', imagem: 'image/', audio: 'audio/', video: 'video/',
};
const MIME_BY_ATTACHMENT: Record<string, any> = {
  dado: new Set([
    'text/csv', 'application/csv', 'text/x-csv', 'text/comma-separated-values',
    'text/tab-separated-values', 'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/x-ipynb+json', 'application/json', 'text/json', 'application/geo+json',
  ]),
  documento: new Set([
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/rtf', 'text/plain', 'text/markdown',
  ]),
  codigo: new Set([
    'text/plain', 'text/x-python', 'application/x-python-code', 'text/x-r-source',
    'application/x-sql', 'application/x-sh', 'text/css', 'text/markdown',
    'application/xml', 'text/xml', 'application/javascript', 'text/javascript',
    'application/typescript', 'text/typescript', 'application/octet-stream',
  ]),
  notebook: new Set([
    'application/x-ipynb+json', 'application/json', 'text/json', 'text/plain',
    'application/octet-stream',
  ]),
};

const EXT_BY_ATTACHMENT: Record<string, any> = {
  codigo: new Set([
    '.py', '.pyw', '.r', '.sql', '.js', '.jsx', '.ts', '.tsx', '.css', '.scss',
    '.sh', '.bash', '.ps1', '.java', '.c', '.h', '.cpp', '.hpp', '.cs', '.go',
    '.rs', '.rb', '.php', '.swift', '.kt', '.kts', '.lua', '.yaml', '.yml', '.toml',
  ]),
  notebook: new Set(['.ipynb']),
  dado: new Set(['.db', '.sqlite', '.sqlite3', '.parquet']),
};

function isAllowedAttachmentType(tipo: any, mimeType: any, fileName: any) {
  const normalizedMime = String(mimeType || '').toLowerCase();
  const ext = path.extname(fileName || '').toLowerCase();
  const categoryExts = EXT_BY_ATTACHMENT[tipo];
  if (categoryExts?.has(ext)) {
    if (tipo === 'dado') {
      return !normalizedMime || [
        'application/octet-stream', 'application/vnd.sqlite3', 'application/x-sqlite3',
        'application/vnd.apache.parquet',
      ].includes(normalizedMime);
    }
    return !normalizedMime || MIME_BY_ATTACHMENT[tipo].has(normalizedMime);
  }
  // Extensões reservadas não podem voltar para a categoria genérica por um
  // MIME vazio. Isso mantém código, notebooks e bancos nas áreas próprias.
  if (Object.values(EXT_BY_ATTACHMENT).some((extensions) => extensions.has(ext))) return false;
  if (!isAllowedFileType(mimeType, fileName)) return false;
  const prefix = MIME_PREFIX_BY_ATTACHMENT[tipo];
  if (prefix) return String(mimeType || '').toLowerCase().startsWith(prefix);
  const exact = MIME_BY_ATTACHMENT[tipo];
  if (exact) return exact.has(String(mimeType || '').toLowerCase());
  return true;
}

function generateUniqueFilename(originalName: any) {
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

async function deleteFileFromS3(fileUrl: any) {
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
    const bucketName = process.env.STORAGE_BUCKET_NAME as string;
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
async function generatePresignedUrls(filesMeta: any, baseUrl?: string) {
  const urls = await Promise.all(filesMeta.map(async (file: any) => {
    
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

    const uploadUrl = await getSignedUrl(s3Client as any, command, { expiresIn: 600 });

    // Bucket privado (comentário no topo do arquivo) -- não existe mais
    // domínio público r2.dev. /api/studio-media/:key (studioAlpha.ts) devolve
    // uma URL estável do ponto de vista do cliente: redireciona pra uma URL
    // assinada de GET gerada na hora, então nunca expira mesmo o bucket sendo
    // privado. baseUrl vem do próprio request (adminRoutes.ts), então funciona
    // igual em dev e produção sem env var extra.
    const publicUrl = `${baseUrl || ''}/api/studio-media/${key}`;

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
async function presignPostagemUpload({ postagemId, fileName, fileType, fileSize, attachmentType }: any) {
  if (!postagemId) throw new Error('postagemId obrigatório.');
  if (!fileName) throw new Error('fileName obrigatório.');
  const permitido = attachmentType
    ? isAllowedAttachmentType(attachmentType, fileType, fileName)
    : isAllowedFileType(fileType, fileName);
  if (!permitido) {
    throw new Error(`Tipo de arquivo não permitido: ${fileName} (${fileType || 'sem mime'}).`);
  }
  const size = Number(fileSize);
  if (!Number.isSafeInteger(size) || size <= 0) throw new Error(`Tamanho inválido: ${fileName}.`);
  if (size > MAX_UPLOAD_BYTES) throw new Error(`Arquivo excede ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB.`);
  const key = `postagens/${postagemId}/${generateUniqueFilename(fileName)}`;
  const command = new PutObjectCommand({
    Bucket: process.env.STORAGE_BUCKET_NAME,
    Key: key,
    ContentType: fileType || 'application/octet-stream',
  });
  // TTL longo (1h): um upload de 2 GB em conexão lenta pode demorar.
  const uploadUrl = await getSignedUrl(s3Client as any, command, { expiresIn: 3600 });
  return { uploadUrl, key };
}

/**
 * Confirma no R2 o objeto enviado diretamente pelo navegador. A confirmação
 * transforma a linha pendente em utilizável e revalida o tamanho real.
 */
async function confirmPostagemUpload({ key, expectedSize, expectedType }: any) {
  if (!key || !String(key).startsWith('postagens/')) throw new Error('Chave de upload inválida.');
  let head: any;
  for (const delay of [0, 200, 600, 1200]) {
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    try {
      head = await s3Client.send(new HeadObjectCommand({ Bucket: process.env.STORAGE_BUCKET_NAME, Key: key }));
      break;
    } catch (e) {
      const notFound = e?.name === 'NotFound' || e?.$metadata?.httpStatusCode === 404;
      if (!notFound) throw e;
      if (delay === 1200) {
        throw Object.assign(new Error('O armazenamento ainda está processando o arquivo.'), { code: 'upload_pendente' });
      }
    }
  }
  const size = Number(head.ContentLength);
  const contentType = String(head.ContentType || '').toLowerCase();
  const wantedType = String(expectedType || '').toLowerCase();
  if (!Number.isSafeInteger(size) || size <= 0 || size > MAX_UPLOAD_BYTES) {
    throw new Error('O arquivo armazenado tem tamanho inválido ou excede o limite.');
  }
  if (size !== Number(expectedSize)) throw new Error('O tamanho enviado não corresponde ao arquivo autorizado.');
  if (!wantedType || contentType !== wantedType) throw new Error('O tipo do arquivo enviado não corresponde ao autorizado.');
  return { size, contentType, etag: head.ETag || null };
}

/**
 * Presign de AVATAR (foto de perfil). Só imagens; layout versionado por hash.
 * Path: `avatares/{tipo}/{id}/{hash}.ext`. A rota chamadora cria a linha em
 * `anexos` (owner_tipo/owner_id) com a chave retornada.
 */
async function presignAvatarUpload({ tipo, id, fileName, fileType, fileSize }: any) {
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
  const uploadUrl = await getSignedUrl(s3Client as any, command, { expiresIn: 600 });
  return { uploadUrl, key };
}

/**
 * Upload de AVATAR pelo SERVIDOR (imagem pequena ≤2 MB). O navegador manda o
 * arquivo pro backend, que faz o PUT no R2 — assim o upload NÃO precisa de CORS
 * do bucket no browser (ao contrário da mídia de postagem, que vai direto por
 * ser grande). Valida imagem/tamanho e devolve a chave.
 */
async function uploadAvatarObject({ tipo, id, fileName, fileType, buffer }: any) {
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
async function presignGetByKey(key: any, ttlSeconds = 300, { downloadName, inline = false, contentType }: { downloadName?: string; inline?: boolean; contentType?: string } = {}) {
  if (!key) return null;
  const safeName = String(downloadName || 'arquivo').replace(/[\r\n"\\]/g, '_').slice(0, 180);
  const command = new GetObjectCommand({
    Bucket: process.env.STORAGE_BUCKET_NAME,
    Key: key,
    ResponseContentDisposition: inline ? 'inline' : `attachment; filename="${safeName}"`,
    ...(contentType ? { ResponseContentType: contentType } : {}),
  });
  return getSignedUrl(s3Client as any, command, { expiresIn: ttlSeconds });
}

/**
 * Lê um objeto do R2 direto (sem redirect) pra servir via proxy do backend.
 * Evita o hop cross-origin (backend -> R2) que quebra CORS em fetch() do
 * navegador quando o objeto é consumido via JS (CSV/código/notebook do
 * Editor Alpha) -- redirect funciona em <img>/<video>/<iframe> (não passam
 * por CORS), mas fetch() reaplica a checagem de CORS na resposta pós-redirect
 * e o R2 não expõe Access-Control-Allow-Origin nesse hop. Repassa Range pra
 * manter seek de vídeo/PDF funcionando.
 */
async function getObjectStream(key: any, range?: string) {
  const command = new GetObjectCommand({
    Bucket: process.env.STORAGE_BUCKET_NAME,
    Key: key,
    ...(range ? { Range: range } : {}),
  });
  const out = await s3Client.send(command);
  return {
    body: out.Body,
    contentType: out.ContentType,
    contentLength: out.ContentLength,
    contentRange: out.ContentRange,
    acceptRanges: out.AcceptRanges,
    statusCode: out.ContentRange ? 206 : 200,
  };
}

/**
 * Deleta um objeto do R2 pela CHAVE (nunca por URL do cliente). Fonte da
 * verdade = anexos.chave_r2. Retorna true/false.
 */
async function deleteByKey(key: any) {
  if (!key) return false;
  try {
    await s3Client.send(new DeleteObjectCommand({ Bucket: process.env.STORAGE_BUCKET_NAME, Key: key }));
    return true;
  } catch (e) {
    console.error(`[R2] delete por chave falhou (${key}):`, e.message);
    return false;
  }
}

export {
  s3Client,
  getObjectStream,
  testConnectionData,
  deleteFileFromS3,
  deleteByKey,
  presignGetByKey,
  generatePresignedUrls,
  presignPostagemUpload,
  presignAvatarUpload,
  uploadAvatarObject,
  confirmPostagemUpload,
  isAllowedFileType,
  isAllowedAttachmentType,
  MAX_UPLOAD_BYTES,
  ALLOWED_MIME_TYPES,
};
