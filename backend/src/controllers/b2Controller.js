// backend/controllers/b2Controller.js
import asyncHandler from 'express-async-handler';
import { uploadFileToB2, deleteFileFromS3, listFilesB2 } from '../services/b2Service.js';

export const uploadFile = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'Nenhum arquivo enviado.' });
  
  try {
    const url = await uploadFileToB2(req.file);
    res.json({ success: true, url });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erro ao enviar arquivo', error: err.message });
  }
});

export const deleteFile = asyncHandler(async (req, res) => {
  const { fileUrl } = req.body;
  if (!fileUrl) return res.status(400).json({ success: false, message: 'URL do arquivo necessária.' });
  
  try {
    await deleteFileFromS3(fileUrl);
    res.json({ success: true, message: 'Arquivo deletado com sucesso.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erro ao deletar arquivo', error: err.message });
  }
});

export const listFiles = asyncHandler(async (req, res) => {
  try {
    const files = await listFilesB2();
    res.json({ success: true, files });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erro ao listar arquivos', error: err.message });
  }
});
