require('dotenv').config();
const path = require('path');
const { v4: uuidv4 } = require('uuid');
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

  return `${sanitizedBaseName}-${uuidv4()}${fileExt}`;
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

  const filePath = `https://${process.env.B2_BUCKET_NAME}.${process.env.B2_ENDPOINT}/${key}`;
  return { path: filePath, originalName: file.originalname };
}

// Função para deletar arquivo pelo URL
async function deleteFileFromS3(fileUrl) {
  if (!fileUrl || !fileUrl.startsWith('http')) return;
  try {
    const key = new URL(fileUrl).pathname.substring(1); // remove a barra inicial
    const params = { Bucket: process.env.B2_BUCKET_NAME, Key: key };
    const command = new DeleteObjectCommand(params);
    await s3Client.send(command);
    console.log(`[B2] Arquivo deletado: ${key}`);
  } catch (error) {
    console.error(`[B2] Falha ao deletar arquivo ${fileUrl}:`, error);
  }
}

// Função auxiliar para definir pasta conforme fieldname
function getFolderForFile(fieldname) {
  if (fieldname === 'coverImage' || fieldname === 'newCoverImage') return 'coverImages';
  if (fieldname === 'documentFiles' || fieldname === 'newDocumentFiles') return 'documents';
  if (fieldname === 'dataFiles' || fieldname === 'newDataFiles') return 'dataFiles';
  
  // Verificações mais específicas primeiro
  if (fieldname.startsWith('audio_placeholder_')) return 'contentAudio';
  if (fieldname.startsWith('video_placeholder_')) return 'contentVideo';
  
  // Verificação genérica para imagens por último
  if (fieldname.startsWith('placeholder_')) return 'contentImages'; 
  
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