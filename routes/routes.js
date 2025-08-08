const express = require('express');
const router = express.Router();
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// --- BANCO DE DADOS SIMULADO ---
const adminUser = {
    id: 1,
    email: 'admin@pulsourbano.org',
    passwordHash: '$2b$10$tcsA7lxGxATAkSVn8DSyeuUwcT4BgKSXrqUaJyZRANrCP2T7sWnL.' // Senha: admin123
};

// --- LÓGICA DO MIDDLEWARE (AGORA DENTRO DESTE ARQUIVO) ---
// Função para verificar o token JWT.
const verifyToken = (req, res, next) => {
    // Pega o token do cabeçalho de autorização (formato "Bearer TOKEN")
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    // Se não houver token, retorna um erro
    if (!token) {
        return res.status(403).json({ message: 'Acesso negado. Nenhum token fornecido.' });
    }

    // Verifica se o token é válido
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(401).json({ message: 'Token inválido ou expirado. Faça login novamente.' });
        }
        // Se o token for válido, anexa os dados do usuário à requisição
        req.user = user;
        // Continua para a rota que está sendo protegida
        next();
    });
};


// --- ROTAS PÚBLICAS (NÃO EXIGEM LOGIN) ---

// Rota para a página inicial (index.html)
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Rota para a página de login do admin
router.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'html', 'admin', 'admin_login.html'));
});

// Rota da API para o processo de login
router.post('/admin-auth', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (adminUser.email !== email || !(await bcrypt.compare(password, adminUser.passwordHash))) {
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }
        const payload = { id: adminUser.id, email: adminUser.email };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.status(200).json({ message: 'Login bem-sucedido!', token: token });
    } catch (error) {
        console.error("Erro no /admin-auth:", error);
        res.status(500).json({ message: 'Erro no servidor.' });
    }
});


// --- ROTAS PROTEGIDAS (EXIGEM LOGIN E TOKEN VÁLIDO) ---

// Rota para servir a página HTML do dashboard.
router.get('/admin/dashboard-page', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'html', 'admin', 'admin-dashboard.html'));
});

// Rota de API protegida que será chamada pelo front-end do dashboard.
// A função 'verifyToken' é chamada antes da função final da rota.
router.get('/api/admin/data', verifyToken, (req, res) => {
    // Como o token foi verificado, temos acesso a req.user
    res.json({
        message: `Dados secretos para o usuário ${req.user.email}`,
        data: [
            { id: 1, pesquisa: 'Impacto da Urbanização na Criminalidade', ano: 2023 },
            { id: 2, pesquisa: 'Análise de Vitimização em Capitais', ano: 2024 },
            { id: 3, pesquisa: 'Eficiência do Policiamento Comunitário', ano: 2022 }
        ]
    });
});


// Exportamos o router no final do arquivo
module.exports = router;


