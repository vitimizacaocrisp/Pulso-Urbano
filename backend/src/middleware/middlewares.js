// --- Carrega variáveis de ambiente ---
require('dotenv').config();
const jwt = require('jsonwebtoken');

// --- Middleware para tratar async/await sem repetir try/catch ---
const asyncHandler = fn => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

// --- Middleware de autenticação ---
const verifyToken = (req, res, next) => {
    // Fonte primária: cookie httpOnly `auth_token` (não acessível a JS → imune a
    // exfiltração por XSS). Fallback: header Authorization "Bearer <token>"
    // (compat com clientes não-browser e transição). Ignora 'null'/'undefined'.
    const cookieToken = req.cookies?.auth_token;
    const headerToken = req.headers['authorization']?.split(' ')[1];
    const raw = cookieToken || headerToken;
    const token = (raw && raw !== 'null' && raw !== 'undefined') ? raw : null;

    // 401 = não autenticado (sem credencial). 403 = autenticado mas sem permissão.
    // Ausência de token é 401, não 403.
    if (!token) {
        return res.status(401).json({ success: false, message: 'Acesso negado. Nenhum token fornecido.' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(401).json({ success: false, message: 'Token inválido ou expirado. Faça login novamente.' });
        }
        req.user = user;
        next();
    });
};

// NOTA: a Multer (diskStorage) foi removida — era código morto. Uploads são
// feitos via URLs pré-assinadas do R2 (ver services/storage.js), e gravar em
// disco quebraria de qualquer forma no filesystem read-only da Vercel.

module.exports = {
    asyncHandler,
    verifyToken
};