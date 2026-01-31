require('dotenv').config();

const express = require('express');
const cors = require('cors');
// Importa o requestHandler e também o testConnection para rodar no boot
const { requestHandler, testConnection } = require('./src/db/dbConnect');

const PORT = process.env.PORT || 3000;

const mainRoutes = require('./src/routes/routes');

const app = express();

// --- 1. CONFIGURAÇÃO DE ORIGENS PERMITIDAS ---
const ALLOWED_ORIGINS = [
  'https://pulso-urbano.netlify.app', // Seu frontend em produção
  'http://localhost:3000',            // Seu frontend local
  'http://localhost:5173'             // Vite local (se estiver usando)
];

// --- 2. APLIQUE O CORS GLOBALMENTE (Antes das rotas!) ---
app.use(cors({
  origin: function (origin, callback) {
    // Permite requisições sem origin (como Postman/Mobile) ou se estiver na lista
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Origem não permitida pelo CORS'));
    }
  },
  credentials: true, // Importante para cookies/sessões
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'], // Todos os métodos permitidos
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

// --- 3. MANTER O PREFLIGHT (Opcional, mas recomendado para Vercel) ---
// Força o Express a responder requisições OPTIONS rapidamente
app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- ROTA DE DEBUG (NOVA) ---
// Acesse https://seu-site.vercel.app/debug-env para testar
// app.get('/debug-env', (req, res) => {
//     const dbUrl = process.env.DATABASE_URL;
    
//     if (!dbUrl) {
//         return res.status(500).json({
//             status: 'ERRO',
//             message: 'A variável DATABASE_URL não existe neste ambiente.',
//             env_keys: Object.keys(process.env) // Mostra quais variáveis existem (para debug)
//         });
//     }

//     // Segurança: Mostra apenas o início da URL para confirmar que é a correta, sem mostrar a senha
//     const hiddenUrl = dbUrl.substring(0, 15) + "..." + dbUrl.substring(dbUrl.length - 5);

//     res.json({
//         status: 'OK',
//         message: 'Variável encontrada.',
//         url_masked: hiddenUrl
//     });
// });

app.use('/', mainRoutes);

// Middleware de banco (Cuidado: isso captura qualquer rota não definida acima)
app.use('/db-check', requestHandler); 

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Servidor rodando na porta ${PORT}`);
        // Tenta testar a conexão ao iniciar localmente
        testConnection();
    });
}

module.exports = app;