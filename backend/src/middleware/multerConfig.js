const multer = require('multer');

// Usamos 'memoryStorage' para manter o arquivo como um buffer na memória RAM
// para que possamos enviá-lo diretamente para o serviço de armazenamento externo.
const storage = multer.memoryStorage();

const upload = multer({ 
  storage: storage,
  // Opcional: Adicionar um limite de tamanho de arquivo de 10MB
  limits: { fileSize: 10 * 1024 * 1024 }
});

module.exports = upload;