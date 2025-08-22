// --- Carrega variáveis de ambiente ---
require('dotenv').config();
if (!process.env.JWT_SECRET) {
    throw new Error("⚠️ Defina JWT_SECRET no arquivo .env");
}

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const {
    getIBGEPopulationData,
    getVictimizationData,
    getPublicSecuritySpending,
    getSecurityLegislation,
    getHomicideData
} = require('../api/apiConnect');

const { testConnection, sql } = require('../db/dbConnect');

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

// ================= ROTAS PÚBLICAS =================

// Status da API
router.get('/', async (req, res) => {
    await testConnection();
    res.json({ success: true, message: 'Bem-vindo ao Pulso Urbano API!' });
});

// Contexto: população IBGE
router.get('/api/contexto/populacao', asyncHandler(async (req, res) => {
    const dados = await getIBGEPopulationData();
    res.json({ success: true, data: dados });
}));

// Contexto: vitimização
router.get('/api/contexto/vitimizacao', asyncHandler(async (req, res) => {
    const { uf, crime, ano, municipio, mes } = req.query;
    const dados = await getVictimizationData({ uf, crime, ano, municipio, mes });
    res.json({ success: true, data: dados });
}));

// Contexto: gastos em segurança pública
router.get('/api/contexto/gastos-seguranca', asyncHandler(async (req, res) => {
    const dados = await getPublicSecuritySpending(req.query.ano);
    res.json({ success: true, data: dados });
}));

// Contexto: legislação de segurança
router.get('/api/contexto/legislacao-seguranca', asyncHandler(async (req, res) => {
    const dados = await getSecurityLegislation(req.query.ano);
    res.json({ success: true, data: dados });
}));
// Painéis: homicídios
router.get('/api/paineis/homicidios', async (req, res) => {
  try {
    const dadosHomicidios = await getHomicideData();
    res.json(dadosHomicidios);
  } catch (error) {
    console.error("Erro na rota /api/paineis/homicidios:", error);
    res.status(500).json({ message: 'Erro ao buscar dados de homicídios.' });
  }
});
// Painéis: vitimização
router.get('/api/paineis/vitimizacao', async (req, res) => {
  try {
    // req.query conterá os filtros enviados pelo frontend.
    // Ex: se a URL for /api/paineis/vitimizacao?ano=2023&uf=SP,
    // req.query será { ano: '2023', uf: 'SP' }
    console.log('Filtros recebidos:', req.query);

    const dados = await getVictimizationData(req.query);
    
    res.status(200).json(dados);

  } catch (error) {
    console.error("Erro na rota /api/paineis/vitimizacao:", error);
    res.status(500).json({ message: 'Erro no servidor ao buscar dados de vitimização.' });
  }
});
// ================= AUTENTICAÇÃO ADMIN =================

// Login do admin
router.post('/admin-auth', asyncHandler(async (req, res) => {
    testConnection(); // testa conexão ao iniciar
    const { email, password } = req.body;

    const isAdminEmail = email === process.env.ADMIN_EMAIL;
    const isPasswordCorrect = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH);

    if (!isAdminEmail || !isPasswordCorrect) {
        return res.status(401).json({ success: false, message: 'Credenciais inválidas.' });
    }

    const payload = { email: process.env.ADMIN_EMAIL };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.json({ success: true, message: 'Login bem-sucedido!', token });
}));

// ================= ROTAS PRIVADAS =================

router.post('/api/sql-query', verifyToken, asyncHandler(async (req, res) => {
    const { query } = req.body;

    if (!query) {
        return res.status(400).json({ success: false, error: 'A query não pode estar vazia.' });
    }

    if (query.trim().split(';').filter(s => s.length > 0).length > 1) {
        return res.status(400).json({ success: false, error: 'Múltiplos comandos SQL não são permitidos.' });
    }

    console.log(`Executando query pelo usuário ${req.user.email}:`, query);

    try {
        const result = await sql(query);

        // SELECT retorna rows
        if (/^\s*select/i.test(query)) {
            res.json({ success: true, data: result });
        } else {
            res.json({
                success: true,
                data: [{
                    status: `Comando executado com sucesso.`,
                    linhas_afetadas: result.length ?? 'N/A'
                }],
            });
        }
    } catch (err) {
        console.error('Erro ao executar query:', err);
        res.status(500).json({ success: false, error: 'Erro ao executar query.' });
    }
}));


router.get('/api/admin/data', verifyToken, (req, res) => {
    res.json({
        success: true,
        message: `Dados secretos para o usuário ${req.user.email}`,
        data: [
            { id: 1, pesquisa: 'Impacto da Urbanização na Criminalidade', ano: 2023 },
            { id: 2, pesquisa: 'Análise de Vitimização em Capitais', ano: 2024 },
            { id: 3, pesquisa: 'Eficiência do Policiamento Comunitário', ano: 2022 }
        ]
    });
});

// ================= HANDLER GLOBAL DE ERROS =================
router.use((err, req, res, next) => {
    console.error("❌ Erro interno:", err.message);
    res.status(500).json({
        success: false,
        message: 'Erro interno no servidor. Tente novamente mais tarde.'
    });
});

module.exports = router;
