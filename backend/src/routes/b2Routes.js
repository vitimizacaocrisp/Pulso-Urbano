// backend/routes/b2Routes.js
import express from 'express';
import multer from 'multer';
import { uploadFile, deleteFile, listFiles } from '../controllers/b2Controller.js';
import { verifyToken, asyncHandler } from '../middleware/middlewares.js';

const router = express.Router();
const upload = multer(); // multer apenas para receber arquivos

router.post('/upload', verifyToken, upload.single('file'), uploadFile);
router.post('/delete', verifyToken, deleteFile);
router.get('/list', verifyToken, listFiles);

export default router;
