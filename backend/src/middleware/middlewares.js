// src/middleware/middlewares.js
import 'dotenv/config';
import jwt from 'jsonwebtoken';

// Middleware para tratar async/await sem repetir try/catch
export const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Middleware de autenticação
export const verifyToken = (req, res, next) => {
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

