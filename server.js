require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// 1. Importa o nosso novo arquivo de rotas
const mainRoutes = require('./routes/routes');

// 2. Cria a aplicação Express
const app = express();

// 3. Configura os Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public'))); // Middleware para arquivos estáticos

// 4. Usa o arquivo de rotas
// Todas as requisições serão gerenciadas pelo mainRoutes
app.use('/', mainRoutes);


// 5. Inicia o Servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Acesse o site em http://localhost:${PORT}`);
});