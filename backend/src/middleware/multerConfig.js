const multer = require('multer');
const path = require('path');

// Usamos 'memoryStorage' para manter o arquivo como um buffer na memória RAM
// NOTA: Na Vercel (Serverless), cuidado com arquivos > 50MB, pois isso consome a RAM da função.
const storage = multer.memoryStorage();

// 1. Lista Completa e Expandida de MIME Types
const allowedMimeTypes = [
  // --- IMAGEM (Web & Design) ---
  'image/jpeg',
  'image/pjpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/bmp',
  'image/tiff',
  'image/x-icon', // .ico
  'image/heic',   // iPhone photos
  'image/heif',
  'image/vnd.adobe.photoshop', // .psd (suporte básico)

  // --- ÁUDIO (Estúdio & Web) ---
  'audio/mpeg', // .mp3
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
  'audio/aac',
  'audio/midi',
  'audio/x-m4a',
  'audio/flac',
  'audio/webm',

  // --- VÍDEO ---
  'video/mp4',
  'video/mpeg',
  'video/webm',
  'video/quicktime', // .mov
  'video/x-msvideo', // .avi
  'video/x-matroska', // .mkv
  'video/3gpp',      // .3gp

  // --- NOTEBOOKS & DADOS (Data Science) ---
  'application/x-ipynb+json', // Jupyter Notebook (padrão)
  'application/json',         // Jupyter às vezes é enviado como JSON puro
  'text/json',
  'application/geo+json',     // GeoJSON

  // --- SCRIPT / CÓDIGO FONTE ---
  'text/plain',
  'text/javascript',
  'application/javascript',
  'text/x-python',
  'application/x-python-code',
  'text/css',
  'text/html',
  'application/xml',
  'text/xml',
  'application/x-sh',     // Shell script
  'application/x-sql',    // SQL dumps
  'text/x-r-source',      // Linguagem R
  'text/markdown',        // .md files

  // --- DOCUMENTOS DE ESCRITÓRIO ---
  'application/pdf',
  'application/msword', // .doc legacy
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.ms-excel', // .xls legacy
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-powerpoint', // .ppt legacy
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'application/rtf',

  // --- DADOS ESTRUTURADOS (CSV / TSV) ---
  'text/csv',
  'application/csv',
  'text/x-csv',
  'text/comma-separated-values',
  'text/tab-separated-values',

  // --- ARQUIVOS COMPACTADOS (Archives) ---
  'application/zip',
  'application/x-zip-compressed',
  'application/x-7z-compressed', // .7z
  'application/x-rar-compressed', // .rar
  'application/gzip', // .gz
  'application/x-tar' // .tar
];

// 2. Função de filtro de arquivo melhorada
const fileFilter = (req, file, cb) => {
  // Normaliza o mimetype para lowercase para evitar erros de case sensitive
  const mimeType = file.mimetype.toLowerCase();

  // Verificação primária pelo MimeType
  if (allowedMimeTypes.includes(mimeType)) {
    return cb(null, true);
  }

  // Verificação secundária: Casos especiais onde o MimeType falha ou é genérico
  // (Ex: Alguns sistemas enviam CSV ou Scripts como 'application/octet-stream')
  const ext = path.extname(file.originalname).toLowerCase();
  
  // Lista de exceções permitidas por extensão se o mimetype falhar
  const allowedExtensions = ['.ipynb', '.csv', '.R', '.py', '.sql', '.md'];

  if (allowedExtensions.includes(ext)) {
     // Se a extensão for confiável, deixamos passar mesmo com mimetype genérico
     return cb(null, true);
  }

  // Se falhar em tudo:
  const error = new Error(`Tipo de arquivo não suportado (${mimeType})!`);
  error.code = 'UNSUPPORTED_FILE_TYPE'; // Código útil para o frontend tratar
  cb(error, false);
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 300 * 1024 * 1024, // 300MB
    files: 30 // Limite máximo de 30 arquivos por upload
  }
});

module.exports = upload;