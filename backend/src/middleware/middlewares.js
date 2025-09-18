// --- Carrega variáveis de ambiente ---
require('dotenv').config();
const multer = require('multer');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const express = require('express');

// --- Middleware para tratar async/await sem repetir try/catch ---
const asyncHandler = fn => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

// --- Middleware de autenticação ---
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];

    if (!token) {
        return res.status(403).json({ success: false, message: 'Acesso negado. Nenhum token fornecido.' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(401).json({ success: false, message: 'Token inválido ou expirado. Faça login novamente.' });
        }
        req.user = user;
        next();
    });
};

// --- Configuração da Multer para guardar os ficheiros ---
// Define onde os ficheiros serão guardados e como serão nomeados
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Define pastas diferentes para cada tipo de ficheiro
    if (file.fieldname === 'coverImage') {
      cb(null, 'src/uploads/images/');
    } else if (file.fieldname === 'documentFile') {
      cb(null, 'src/uploads/documents/');
    } else {
      cb(null, 'src/uploads/data/');
    }
  },
  filename: function (req, file, cb) {
    // Cria um nome de ficheiro único para evitar sobreposições
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

module.exports = {
    asyncHandler,
    verifyToken
};