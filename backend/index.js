// Carrega as variáveis de ambiente do arquivo .env
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const { requestHandler } = require('./src/db/dbConnect');

const PORT = process.env.PORT || 3000;

// Importa o arquivo principal de rotas
const mainRoutes = require('./src/routes/routes');

// Cria a aplicação Express
const app = express();

// Configura os Middlewares essenciais
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// [REMOVIDO] Não servimos mais arquivos estáticos da pasta 'uploads'
// pois agora eles estão no Backblaze B2.

// Usa o arquivo de rotas para gerenciar todas as requisições da API
app.use('/', mainRoutes);

// Middleware para conexão com o banco de dados
app.use(requestHandler);

// Inicia o Servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Acesse o site em http://localhost:${PORT}`);
});