require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { requestHandler, testConnection } = require('./src/db/dbConnect');
const mainRoutes = require('./src/routes/routes');

const app = express();
const PORT = process.env.PORT || 3000;

// --- 1. CONFIGURAÇÃO DE ORIGENS PERMITIDAS ---

const ALLOWED_ORIGINS = [
  process.env.ALLOWED_ORIGIN,
  process.env.ALLOWED_ORIGIN_LOCALHOST
];

// --- 2. CORS GLOBAL (Essencial: Deve vir antes das rotas) ---
app.use(cors({
  origin: function (origin, callback) {
    // Em desenvolvimento, libera qualquer localhost:porta (Vite pode subir em
    // 5173, 5174, 5180... dependendo do que estiver livre).
    const isDevLocalhost = origin
      && /^http:\/\/localhost:\d+$/.test(origin)
      && process.env.NODE_ENV !== 'production';
    // Permite requisições sem 'origin' (Postman/mobile) ou na lista branca.
    if (!origin || ALLOWED_ORIGINS.includes(origin) || isDevLocalhost) {
      callback(null, true);
    } else {
      callback(new Error('Bloqueado pela política de CORS (Origem não permitida)'));
    }
  },
  credentials: false, // Auth via header Authorization (sem cookie)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'], // Garante que UPDATE e DELETE funcionem
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

// --- 4. MIDDLEWARES DE PARSE ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- 5. ROTAS ---
app.use('/', mainRoutes);

// Rota de teste simples para banco de dados
app.use('/db-check', requestHandler); 

// --- 6. INICIALIZAÇÃO DO SERVIDOR ---
// O 'if' abaixo garante que o listen só rode localmente.
// Na Vercel, o export do 'app' é quem comanda.
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 Servidor rodando na porta ${PORT}`);
        testConnection();
    });
}

module.exports = app;