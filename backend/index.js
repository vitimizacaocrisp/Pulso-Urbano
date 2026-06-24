require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { requestHandler, testConnection } = require('./src/db/dbConnect');
const mainRoutes = require('./src/routes/routes');

const app = express();
const PORT = process.env.PORT || 3000;

// --- 0. SECURITY HEADERS (helmet) ---
// API devolve só JSON, então CSP não se aplica (e atrapalharia). CORP em
// cross-origin para o frontend (Netlify/Vercel) conseguir ler as respostas;
// o controle de acesso real é feito pelo CORS abaixo.
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// --- 1. CONFIGURAÇÃO DE ORIGENS PERMITIDAS ---

const ALLOWED_ORIGINS = [
  process.env.ALLOWED_ORIGIN,
  process.env.ALLOWED_ORIGIN_LOCALHOST
];

// --- 2. CORS GLOBAL (Essencial: Deve vir antes das rotas) ---
function isAllowedOrigin(origin) {
  if (!origin) return true;                                 // Postman, mobile, same-origin
  if (ALLOWED_ORIGINS.includes(origin)) return true;        // lista branca (env vars)
  if (/\.vercel\.app$/.test(origin)) return true;           // preview deploys
  if (/\.netlify\.app$/.test(origin)) return true;          // compat Netlify
  if (/^http:\/\/localhost:\d+$/.test(origin)) return true; // dev local
  return false;
}

app.use(cors({
  // Não lançamos Error em origem bloqueada: isso virava 500 no handler default
  // do Express. Devolvendo `false`, o middleware apenas omite os headers CORS e
  // o próprio navegador bloqueia a resposta (sem ruído de erro 500 no servidor).
  origin: (origin, callback) => callback(null, isAllowedOrigin(origin)),
  credentials: true, // Cookie httpOnly de auth precisa de credenciais habilitadas
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'], // Garante que UPDATE e DELETE funcionem
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

// --- 3. COOKIES ---
app.use(cookieParser());

// --- 4. MIDDLEWARES DE PARSE ---
// Limite elevado: o conteúdo das análises é HTML que pode conter mídia embutida
// e textos longos. O default de 100kb gerava 413 silencioso em posts grandes.
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// --- 5. ROTAS ---
app.use('/', mainRoutes);

// Rota de teste simples para banco de dados
app.use('/db-check', requestHandler);

// --- 6. HANDLER DE ERRO GLOBAL ---
// Última linha de defesa: captura tudo que os asyncHandler encaminham via
// next(err). Sem isto, qualquer erro caía no handler default do Express,
// virando 500 opaco (e vazando stack trace fora de produção).
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error('[erro não tratado]', err);
  res.status(status).json({
    success: false,
    message: status >= 500 ? 'Erro interno no servidor.' : (err.message || 'Erro na requisição.'),
  });
});

// --- 7. INICIALIZAÇÃO DO SERVIDOR ---
// O 'if' abaixo garante que o listen só rode localmente.
// Na Vercel, o export do 'app' é quem comanda.
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 Servidor rodando na porta ${PORT}`);
        testConnection();
    });
}

module.exports = app;