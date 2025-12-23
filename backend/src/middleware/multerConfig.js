const multer = require('multer');

// Usamos 'memoryStorage' para manter o arquivo como um buffer na memória RAM
const storage = multer.memoryStorage();

// 1. Lista expandida de tipos de arquivo permitidos (MIME types)
const allowedMimeTypes = [
  // --- IMAGEM ---
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',

  // --- ÁUDIO ---
  'audio/mpeg', // .mp3
  'audio/wav',
  'audio/ogg',
  'audio/aac',
  'audio/midi',

  // --- VÍDEO ---
  'video/mp4',
  'video/mpeg',
  'video/webm',
  'video/quicktime', // .mov
  'video/x-msvideo', // .avi

 // --- NOTEBOOKS (Jupyter) ---
  'application/x-ipynb+json',
  'text/html', // Notebooks exportados como HTML

  // --- SCRIPT / TEXTO ---
  'text/plain',
  'text/javascript',
  'application/javascript',
  'text/x-python',
  'application/x-python-code',
  'text/css',
  'text/html',
  'application/x-sh', // Shell script

  // --- DOCUMENTO (PDF e Word) ---
  'application/pdf',
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx

  // --- DADOS (CSV e Excel) ---
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel', // .xls
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' // .xlsx
];

// 2. Função de filtro de arquivo
const fileFilter = (req, file, cb) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo não suportado! Envie imagens, áudios, vídeos, notebooks, scripts ou documentos válidos.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 300 * 1024 * 1024 } // Limite de 300MB
});

module.exports = upload;