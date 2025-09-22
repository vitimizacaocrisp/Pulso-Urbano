// Carrega as variáveis de ambiente do arquivo .env
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { sql, testConnection, requestHandler } from './db/dbConnect.js';
import b2Routes from './routes/b2Routes.js';

const PORT = process.env.PORT || 3000;

// Importa o arquivo principal de rotas
import mainRoutes from './routes/routes.js';

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
app.use('/api/b2', b2Routes);

// Middleware para conexão com o banco de dados
app.use(requestHandler);

// Inicia o Servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Acesse o site em http://localhost:${PORT}`);
});