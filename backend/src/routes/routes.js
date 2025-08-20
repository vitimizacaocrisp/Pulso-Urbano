// Carrega as variáveis de ambiente do arquivo .env
require('dotenv').config();

const express = require('express');
const router = express.Router();
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const { getIBGEPopulationData, getVictimizationData, getPublicSecuritySpending, getSecurityLegislation  } = require('../api/apiConnect');

// --- LÓGICA DO MIDDLEWARE ---
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(403).json({ message: 'Acesso negado. Nenhum token fornecido.' });
    }

    // Usa o segredo do JWT carregado do arquivo .env
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(401).json({ message: 'Token inválido ou expirado. Faça login novamente.' });
        }
        req.user = user;
        next();
    });
};

// --- ROTAS PÚBLICAS (NÃO EXIGEM LOGIN) ---

// Rota para a página inicial (index.html)
router.get('/', (req, res) => {
    res.json({ message: 'Bem-vindo ao Pulso Urbano API!' });
});

// ... (todas as outras rotas públicas como /paineis/*, /sobre, etc. permanecem as mesmas) ...
router.get('/paineis/homicidios', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'html', 'paineis', 'homicidios.html'));
});

router.get('/paineis/violencia-genero', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'html', 'paineis', 'violencia-genero.html'));
});

router.get('/paineis/vitimizacao', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'html', 'paineis', 'vitimizacao.html'));
});

router.get('/paineis/sistema-justica', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'html', 'paineis', 'sistema-justica.html'));
});

router.get('/paineis/atividade-policial', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'html', 'paineis', 'atividade-policial.html'));
});

router.get('/paineis/crimes-economicos', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'html', 'paineis', 'crimes-economicos.html'));
});

router.get('/publicacoes', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'html', 'publicacoes.html'));
});

router.get('/analises', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'html', 'analises.html'));
});

router.get('/educacao', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'html', 'educacao.html'));
});

router.get('/sobre', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'html', 'sobre.html'));
});

// --- ROTAS DE API PARA DADOS ---

// Rota antiga
// router.get('/api/paineis/homicidios', ...);

// Rota para dados de contexto do IBGE
router.get('/api/contexto/populacao', async (req, res) => {
    try {
        // Chama a função que busca os dados do IBGE
        const dadosPopulacao = await getIBGEPopulationData();
        // Envia o JSON padronizado para o frontend
        res.json(dadosPopulacao);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar os dados de população do IBGE.' });
    }
});

router.get('/api/contexto/vitimizacao', async (req, res) => {
    try {
        const { uf, crime, ano, municipio, mes } = req.query; // parâmetros opcionais via query string
        const dadosVitimizacao = await getVictimizationData({ uf, crime, ano, municipio, mes });
        res.json(dadosVitimizacao);
    } catch (error) {
        console.error("Erro ao buscar dados de vitimização:", error);
        res.status(500).json({ message: 'Erro ao buscar dados de vitimização.' });
    }
});

// Rota para gastos com segurança pública
router.get('/api/contexto/gastos-seguranca', async (req, res) => {
    try {
        const dados = await getPublicSecuritySpending(req.query.ano);
        res.json(dados);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar dados de gastos.' });
    }
});

// Rota para legislação de segurança pública
router.get('/api/contexto/legislacao-seguranca', async (req, res) => {
    try {
        const dados = await getSecurityLegislation(req.query.ano);
        res.json(dados);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar dados de legislação.' });
    }
});


// --- ROTAS DE ADMINISTRAÇÃO ---
// Rota para a página de login do admin
router.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'html', 'admin', 'admin_login.html'));
});

// Rota da API para o processo de login - MODIFICADA
router.post('/admin-auth', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Compara com as variáveis de ambiente
        const isAdminEmail = (email === process.env.ADMIN_EMAIL);
        const isPasswordCorrect = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH);

        if (!isAdminEmail || !isPasswordCorrect) {
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }
        
        const payload = { email: process.env.ADMIN_EMAIL }; // O payload pode ser simplificado
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
        
        res.status(200).json({ message: 'Login bem-sucedido!', token: token });

    } catch (error) {
        console.error("Erro no /admin-auth:", error);
        res.status(500).json({ message: 'Erro no servidor.' });
    }
});


// --- ROTAS PROTEGIDAS (EXIGEM LOGIN E TOKEN VÁLIDO) ---

// Rota para servir a página HTML do dashboard.
router.get('/admin/dashboard-page', verifyToken, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'html', 'admin', 'admin-dashboard.html'));
});

// Rota de API protegida que será chamada pelo front-end do dashboard.
router.get('/api/admin/data', verifyToken, (req, res) => {
    res.json({
        message: `Dados secretos para o usuário ${req.user.email}`,
        data: [
            { id: 1, pesquisa: 'Impacto da Urbanização na Criminalidade', ano: 2023 },
            { id: 2, pesquisa: 'Análise de Vitimização em Capitais', ano: 2024 },
            { id: 3, pesquisa: 'Eficiência do Policiamento Comunitário', ano: 2022 }
        ]
    });
});


// --- ROTA "CATCH-ALL" ---
// router.get('*', (req, res) => {
//     res.status(404).sendFile(path.join(__dirname, '..', 'public', 'html', '404.html'));
// });


// Exportamos o router no final do arquivo
module.exports = router;