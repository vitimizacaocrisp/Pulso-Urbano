import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import crypto from 'crypto-browserify';

// --- Configuração do Cliente S3 para Backblaze B2 ---
const b2Endpoint = 's3.us-east-005.backblazeb2.com';
const b2Region = 'us-east-005';
const b2BucketName = 'pulso-urbano';

const s3Client = new S3Client({
  endpoint: `https://${b2Endpoint}`,
  region: b2Region,
  credentials: {
    accessKeyId: '0058a162b325fdd0000000002',
    secretAccessKey: 'K0050a5FJ3yFe6+MKqIZjsQil59+Qso',
  },
});

export async function testB2Connection() {
  console.log("[B2 Service] Testando conexão com o bucket...");
  try {
    const command = new ListObjectsV2Command({
      Bucket: b2BucketName,
      MaxKeys: 1, // Pede apenas 1 item para ser uma operação rápida e leve
    });
    await s3Client.send(command);
    console.log("%c[B2 Service] Conexão bem-sucedida!", "color: green; font-weight: bold;");
    return true;
  } catch (error) {
    console.error("%c[B2 Service] Falha na conexão com o bucket:", "color: red; font-weight: bold;", error.message);
    console.error("[B2 Service] Verifique as variáveis de ambiente (VUE_APP_...) e as permissões da chave no Backblaze.");
    return false;
  }
}

/**
 * Faz o upload de um arquivo para o Backblaze B2.
 * @param {File} file O arquivo a ser enviado.
 * @returns {Promise<string>} A URL pública do arquivo após o upload.
 */
export async function uploadFile(file) {
  if (!file) throw new Error("Nenhum arquivo fornecido.");

  // Gera um nome de arquivo único para evitar colisões
  const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
  const extension = file.name.substring(file.name.lastIndexOf('.'));
  const uniqueKey = `${uniqueSuffix}${extension}`;

  // Converte o arquivo para um ArrayBuffer para compatibilidade com o SDK
  const buffer = await file.arrayBuffer();

  const params = {
    Bucket: b2BucketName,
    Key: uniqueKey,
    Body: buffer,
    ContentType: file.type,
  };

  try {
    const command = new PutObjectCommand(params);
    await s3Client.send(command);
    
    const publicUrl = `https://${b2BucketName}.${b2Endpoint}/${uniqueKey}`;
    console.log(`[B2 Service] Arquivo enviado com sucesso: ${publicUrl}`);
    return publicUrl;
  } catch (error) {
    console.error("[B2 Service] Erro ao fazer upload:", error);
    throw error;
  }
}

/**
 * Deleta um arquivo do Backblaze B2 usando sua URL pública.
 * @param {string} fileUrl A URL completa do arquivo a ser deletado.
 * @returns {Promise<void>}
 */
export async function deleteFile(fileUrl) {
  if (!fileUrl || !fileUrl.startsWith('http')) {
    console.warn("[B2 Service] URL inválida para exclusão:", fileUrl);
    return;
  }

  try {
    const key = new URL(fileUrl).pathname.substring(1);
    
    const params = {
      Bucket: b2BucketName,
      Key: key,
    };

    const command = new DeleteObjectCommand(params);
    await s3Client.send(command);
    console.log(`[B2 Service] Arquivo deletado com sucesso: ${key}`);
  } catch (error) {
    console.error(`[B2 Service] Falha ao deletar o arquivo ${fileUrl}:`, error);
  }
}

/**
 * Atualiza um arquivo, deletando o antigo e enviando o novo.
 * @param {File} newFile O novo arquivo a ser enviado.
 * @param {string} oldFileUrl A URL do arquivo antigo a ser deletado.
 * @returns {Promise<string>} A URL pública do novo arquivo.
 */
export async function updateFile(newFile, oldFileUrl) {
    if (oldFileUrl) {
        deleteFile(oldFileUrl).catch(err => console.error("Falha ao deletar arquivo antigo durante atualização:", err));
    }
    return await uploadFile(newFile);
}

// --- Executa o teste de conexão assim que o módulo é carregado pela aplicação ---
testB2Connection();