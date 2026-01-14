require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

// Inicializa o cliente Neon
const sql = neon(process.env.DATABASE_URL);

const testConnection = async () => {
  try {
    await sql`SELECT 1;`;
    console.log('✅ Conectado ao Netlify Neon PostgreSQL com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao conectar com o Netlify Neon PostgreSQL:', error.message);
  }
};

const requestHandler = async (req, res) => {
  try {
    const result = await sql`SELECT version()`;
    const { version } = result[0];
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end(version);
  } catch (error) {
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Erro no banco: " + error.message);
  }
};

module.exports = {
  sql,
  testConnection,
  requestHandler
};