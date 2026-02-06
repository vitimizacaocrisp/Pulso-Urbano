require('dotenv').config();
const path = require('path');
const crypto = require('crypto');
const { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

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
  'image/jpeg', 'image/pjpeg', 'image/png', 'image/gif', 'image/webp', 
  'image/svg+xml', 'image/bmp', 'image/tiff', 'image/x-icon', 'image/heic', 'image/heif',
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
  'text/plain', 'text/javascript', 'application/javascript', 'text/x-python', 
  'application/x-python-code', 'text/css', 'text/html', 'application/xml', 
  'text/xml', 'application/x-sh', 'application/x-sql', 'text/x-r-source', 'text/markdown',
  'application/zip', 'application/x-zip-compressed', 'application/x-7z-compressed', 
  'application/x-rar-compressed', 'application/gzip', 'application/x-tar'
];

// Extensões permitidas (Mantido inalterado)
const ALLOWED_EXTENSIONS = ['.ipynb', '.csv', '.R', '.py', '.sql', '.md'];

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
  const normalizedMime = mimeType.toLowerCase();
  if (ALLOWED_MIME_TYPES.includes(normalizedMime)) return true;
  const ext = path.extname(fileName).toLowerCase();
  if (ALLOWED_EXTENSIONS.includes(ext)) return true;
  return false;
}

function generateUniqueFilename(originalName) {
  const fileExt = path.extname(originalName);
  const baseName = path.basename(originalName, fileExt);
  const sanitizedBaseName = baseName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
  return `${sanitizedBaseName}-${crypto.randomUUID()}${fileExt}`;
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
  if (!fileUrl || !fileUrl.startsWith('http')) return;
  try {
    const urlObj = new URL(fileUrl);
    
    // No R2 Public (r2.dev), a URL é https://pub-xxx.r2.dev/pasta/arquivo.ext
    // A Key é simplesmente o pathname sem a barra inicial.
    let key = urlObj.pathname;
    if (key.startsWith('/')) key = key.substring(1);
    
    // NOTA: Removemos a lógica antiga que retirava o bucket do path, 
    // pois a URL pública do R2 aponta direto para a raiz do bucket.

    const params = { Bucket: process.env.STORAGE_BUCKET_NAME, Key: key };
    await s3Client.send(new DeleteObjectCommand(params));
    console.log(`[R2] Arquivo deletado: ${key}`);
  } catch (error) {
    console.error(`[R2] Falha ao deletar arquivo ${fileUrl}:`, error);
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

module.exports = {
  s3Client,
  testConnectionData,
  deleteFileFromS3,
  generatePresignedUrls
};