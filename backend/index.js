require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { requestHandler, testConnection } = require('./src/db/dbConnect');
const mainRoutes = require('./src/routes/routes');

const app = express();
const PORT = process.env.PORT || 3000;

// --- 1. CONFIGURAÇÃO DE ORIGENS PERMITIDAS ---
const ALLOWED_ORIGINS = [
  'https://pulso-urbano.netlify.app', // Produção
  'http://localhost:3000',            // Localhost React
  'http://localhost:5173'             // Localhost Vite
];

// --- 2. CORS GLOBAL (Essencial: Deve vir antes das rotas) ---
app.use(cors({
  origin: function (origin, callback) {
    // Permite requisições sem 'origin' (como Postman/Mobile apps) ou se a origem estiver na lista branca
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Bloqueado pela política de CORS (Origem não permitida)'));
    }
  },
  credentials: true, // Permite cookies e headers de autorização
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