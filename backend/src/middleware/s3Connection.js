require('dotenv').config();
const path = require('path');
const crypto = require('crypto');
const { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } = require("@aws-sdk/client-s3");

// Configuração do cliente S3 para Backblaze B2
const s3Client = new S3Client({
  endpoint: `https://${process.env.B2_ENDPOINT}`,
  region: process.env.B2_ENDPOINT.split('.')[1],
  credentials: {
    accessKeyId: process.env.B2_KEY_ID,
    secretAccessKey: process.env.B2_APPLICATION_KEY,
  },
});

// Função para testar conexão com bucket
async function testConnectionData() {
  try {
    await s3Client.send(new ListObjectsV2Command({ Bucket: process.env.B2_BUCKET_NAME, MaxKeys: 1 }));
    console.log("[B2] Conexão bem-sucedida.");
    return true;
  } catch (error) {
    console.error("[B2] Falha na conexão:", error.message);
    return false;
  }
}

// Função para gerar nome de arquivo único
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

// Função para garantir que pasta exista no S3 (objeto vazio com key terminada em '/')
async function ensureS3FolderExists(folder) {
  if (!folder) return;
  try {
    const result = await s3Client.send(new ListObjectsV2Command({
      Bucket: process.env.B2_BUCKET_NAME,
      Prefix: `${folder}/`,
      MaxKeys: 1
    }));
    if (!result.KeyCount) {
      const putCommand = new PutObjectCommand({
        Bucket: process.env.B2_BUCKET_NAME,
        Key: `${folder}/`,
        Body: '',
        ContentType: 'application/x-directory'
      });
      await s3Client.send(putCommand);
      console.log(`[B2] Pasta criada: ${folder}/`);
    }
  } catch (err) {
    console.warn(`[B2] Falha ao criar pasta ${folder}:`, err);
  }
}

// Função para upload de arquivo, usando a pasta garantida
async function uploadFileToS3(file, key) {
  const folder = key.includes('/') ? key.split('/')[0] : null;
  if (folder) {
    await ensureS3FolderExists(folder);
  }
  const params = {
    Bucket: process.env.B2_BUCKET_NAME,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  };
  const command = new PutObjectCommand(params);
  await s3Client.send(command);

  // Constrói a URL pública
  // Nota: Verifique se o bucket é público ou privado. Se privado, precisaria de URL assinada.
  const filePath = `https://${process.env.B2_BUCKET_NAME}.${process.env.B2_ENDPOINT}/${key}`;
  
  return { path: filePath, originalName: file.originalname };
}

// Função para deletar arquivo pelo URL
async function deleteFileFromS3(fileUrl) {
  if (!fileUrl || !fileUrl.startsWith('http')) return;
  try {
    // Extrai a Key da URL completa
    // Ex: https://bucket.s3.us-west.backblazeb2.com/covers/imagem.jpg -> covers/imagem.jpg
    const urlObj = new URL(fileUrl);
    // Remove a barra inicial do pathname se existir
    const key = urlObj.pathname.startsWith('/') ? urlObj.pathname.substring(1) : urlObj.pathname;
    
    const params = { Bucket: process.env.B2_BUCKET_NAME, Key: key };
    const command = new DeleteObjectCommand(params);
    await s3Client.send(command);
    console.log(`[B2] Arquivo deletado: ${key}`);
  } catch (error) {
    console.error(`[B2] Falha ao deletar arquivo ${fileUrl}:`, error);
  }
}

/**
 * Função auxiliar para definir pasta conforme fieldname ou objeto de arquivo
 * [CORRIGIDO] Agora aceita objeto File ou String fieldname para evitar erros
 */
function getFolderForFile(fileOrFieldname) {
  let fieldname = '';
  let mimetype = '';

  // Verifica se recebeu o objeto File do multer ou apenas a string fieldname
  if (fileOrFieldname && typeof fileOrFieldname === 'object' && fileOrFieldname.fieldname) {
      fieldname = fileOrFieldname.fieldname;
      mimetype = fileOrFieldname.mimetype || '';
  } else if (typeof fileOrFieldname === 'string') {
      fieldname = fileOrFieldname;
  }

  // 1. Campos Padrão do Formulário
  if (fieldname === 'coverImage' || fieldname === 'newCoverImage') return 'coverImages';
  if (fieldname === 'documentFiles' || fieldname === 'newDocumentFiles') return 'documents';
  if (fieldname === 'dataFiles' || fieldname === 'newDataFiles') return 'dataFiles';
  
  // 2. Campos Dinâmicos (Novos - analysisUtils.js)
  if (fieldname.startsWith('image_')) return 'contentImages';
  if (fieldname.startsWith('video_')) return 'contentVideo';
  if (fieldname.startsWith('audio_')) return 'contentAudio';
  if (fieldname.startsWith('notebook_')) return 'contentNotebooks';
  if (fieldname.startsWith('script_')) return 'contentScripts';
  if (fieldname.startsWith('document_')) return 'documents'; // Downloads inline
  if (fieldname.startsWith('data_')) return 'dataFiles';     // Downloads inline

  // 3. Campos Dinâmicos (Legado / Fallback)
  if (fieldname.startsWith('audio_placeholder_')) return 'contentAudio';
  if (fieldname.startsWith('video_placeholder_')) return 'contentVideo';
  if (fieldname.startsWith('placeholder_')) return 'contentImages'; 

  // 4. Fallback por Mimetype (Se o nome do campo for genérico)
  if (mimetype.startsWith('image/')) return 'contentImages';
  if (mimetype.startsWith('video/')) return 'contentVideo';
  if (mimetype.startsWith('audio/')) return 'contentAudio';
  if (mimetype.includes('pdf')) return 'documents';
  
  return 'others';
}

module.exports = {
  s3Client,
  testConnectionData,
  uploadFileToS3,
  deleteFileFromS3,
  getFolderForFile,
  generateUniqueFilename,
  ensureS3FolderExists,
};