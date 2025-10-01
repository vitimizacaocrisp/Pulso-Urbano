const multer = require('multer');

// Usamos 'memoryStorage' para manter o arquivo como um buffer na memória RAM
const storage = multer.memoryStorage();

// 1. Lista de tipos de arquivo permitidos (MIME types)
const allowedMimeTypes = [
  // Imagens
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  // Vídeos
  'video/mp4',
  'video/mpeg',
  'video/webm',
  'video/quicktime', // .mov
  // Áudios
  'audio/mpeg', // .mp3
  'audio/wav',
  'audio/ogg',
  // Documentos
  'application/pdf',
  'application/vnd.ms-excel', // .xls
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' // .xlsx
];

// 2. Função de filtro de arquivo
const fileFilter = (req, file, cb) => {
  // Verifica se o MIME type do arquivo está na nossa lista de permissões
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true); // Aceita o arquivo
  } else {
    // Rejeita o arquivo e passa uma mensagem de erro
    cb(new Error('Tipo de arquivo não suportado! Por favor, envie apenas vídeos, imagens, áudios, PDFs ou arquivos Excel.'), false);
  }
};

const upload = multer({
  storage: storage,
  // 3. Adiciona a função de filtro à configuração do Multer
  fileFilter: fileFilter,
  // Corrigi e defini um limite de 300MB.
  limits: { fileSize: 300 * 1024 * 1024 }
});

module.exports = upload;