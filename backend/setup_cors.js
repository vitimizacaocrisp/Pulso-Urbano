require('dotenv').config();
const { S3Client, PutBucketCorsCommand } = require("@aws-sdk/client-s3");

// Reutiliza a mesma configuração que você já tem no s3Connection.js
const s3Client = new S3Client({
  endpoint: `https://${process.env.B2_ENDPOINT}`,
  region: process.env.B2_ENDPOINT.split('.')[1],
  credentials: {
    accessKeyId: process.env.B2_KEY_ID,
    secretAccessKey: process.env.B2_APPLICATION_KEY,
  },
  // --- CORREÇÃO DO REDDIT ---
  // Desativa o cálculo automático de checksum (CRC32) que o AWS SDK v3
  // força e que quebra a compatibilidade com o Backblaze B2.
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

const run = async () => {
  console.log(`Configurando CORS para o bucket: ${process.env.B2_BUCKET_NAME}...`);

  const params = {
    Bucket: process.env.B2_BUCKET_NAME,
    CORSConfiguration: {
      CORSRules: [
        {
          // Permite que qualquer site (incluindo localhost) faça upload
          // Para produção, você pode trocar "*" por "https://seu-site.com"
          AllowedOrigins: ["*"], 
          // Permite métodos de Upload (PUT) e Leitura (GET)
          AllowedMethods: ["GET", "PUT", "POST", "HEAD"],
          // Permite enviar cabeçalhos como Content-Type (essencial para o axios)
          AllowedHeaders: ["*"],
          ExposeHeaders: ["ETag"],
          MaxAgeSeconds: 3000
        }
      ]
    }
  };

  try {
    await s3Client.send(new PutBucketCorsCommand(params));
    console.log("✅ Sucesso! Regras de CORS aplicadas. Agora o upload via navegador deve funcionar.");
  } catch (err) {
    console.error("❌ Erro ao configurar CORS:", err);
  }
};

run();