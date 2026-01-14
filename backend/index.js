const express = require('express');
const app = express();

// Rota raiz simples para teste
app.get('/', (req, res) => {
  res.json({
    status: 'Sucesso',
    message: 'O Backend está rodando perfeitamente na Vercel!',
    timestamp: new Date().toISOString()
  });
});

// Uma rota extra para garantir que o roteamento funciona
app.get('/api/teste', (req, res) => {
  res.send('Rota /api/teste funcionando!');
});

const port = process.env.PORT || 3000;

// Configuração para rodar tanto localmente quanto na Vercel
if (require.main === module) {
  app.listen(port, () => {
    console.log(`Servidor rodando localmente na porta ${port}`);
  });
}

// OBRIGATÓRIO para a Vercel (exportar o app)
module.exports = app;