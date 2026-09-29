import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { requestHandler, testConnection } from './db/dbConnect';
import mainRoutes from './routes/routes';

import type { NextFunction, Response } from 'express';
import type { Req } from './types/http';
const app = express();
const PORT = process.env.PORT || 3000;

// Atrás do proxy da Vercel: req.ip passa a refletir o cliente real (o rate
// limiter usa x-real-ip/req.ip — o primeiro x-forwarded-for é forjável, doc 07).
app.set('trust proxy', 1);

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
function isAllowedOrigin(origin: any) {
  if (!origin) return true;                                 // Postman, mobile, same-origin
  if (ALLOWED_ORIGINS.includes(origin)) return true;        // lista branca (env vars)
  // Preview deploys: só do NOSSO time Vercel (não qualquer *.vercel.app —
  // com credentials:true, wildcard genérico permitiria CSRF via projeto de
  // terceiros hospedado em vercel.app; doc 07/P9).
  if (/\.vitimizacaocrisps-projects\.vercel\.app$/.test(origin)) return true;
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
app.use((err: any, req: Req, res: Response, next: NextFunction) => {
  if (res.headersSent) return next(err);
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error('[erro não tratado]', err);
  res.status(status).json({
    success: false,
    message: status >= 500 ? 'Erro interno no servidor.' : (err.message || 'Erro na requisição.'),
  });
});

// --- 7. INICIALIZAÇÃO DO SERVIDOR ---
// Localmente (tsx/node) o servidor sobe com listen(). Na Vercel o runtime
// importa este módulo e usa o `export default app` — nunca chamamos listen()
// lá. Nenhum vercel.json precisa apontar para este arquivo (nada de rewrite
// para /index.js): a Vercel detecta a entrada do Express sozinha.
if (!process.env.VERCEL && require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    testConnection();
  });
}

export default app;
