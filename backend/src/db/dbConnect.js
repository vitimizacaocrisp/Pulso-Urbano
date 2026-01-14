require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

// 1. Captura a variável
const dbUrl = process.env.DATABASE_URL;

// 2. Verifica se ela existe ANTES de tentar usar
if (!dbUrl) {
  console.error("❌ ERRO CRÍTICO: A variável de ambiente 'DATABASE_URL' NÃO foi encontrada.");
  console.error("   Verifique em Settings > Environment Variables na Vercel.");
} else {
  console.log("✅ DATABASE_URL encontrada. Tentando conectar...");
}

// 3. Inicializa o cliente Neon
// Se a URL não existir, passamos undefined, o que vai gerar erro apenas na hora da query, não no boot.
const sql = neon(dbUrl);

const testConnection = async () => {
  try {
    if (!dbUrl) throw new Error("DATABASE_URL está vazia.");
    await sql`SELECT 1;`;
    console.log('✅ Conexão com Neon PostgreSQL bem-sucedida!');
  } catch (error) {
    console.error('❌ Falha na conexão:', error.message);
  }
};

const requestHandler = async (req, res) => {
  try {
    if (!dbUrl) {
        throw new Error("A variável DATABASE_URL não está configurada no servidor.");
    }
    const result = await sql`SELECT version()`;
    const { version } = result[0];
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end(`Sucesso! Versão do Banco: ${version}`);
  } catch (error) {
    console.error("Erro no requestHandler:", error);
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Erro de Conexão: " + error.message);
  }
};

module.exports = {
  sql,
  testConnection,
  requestHandler
};