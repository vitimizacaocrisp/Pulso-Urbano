// --- Carrega variáveis de ambiente ---
require('dotenv').config();
const jwt = require('jsonwebtoken');

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

module.exports = {
    asyncHandler,
    verifyToken
};