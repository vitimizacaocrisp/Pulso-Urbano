import dotenv from "dotenv";
dotenv.config();

import { neon } from "@neondatabase/serverless";

// Inicializa o cliente Neon. Ele usa a connection string da variável de ambiente.
export const sql = neon(process.env.DATABASE_URL);

// [MODIFICADO] A nova forma de testar a conexão é executar uma query simples.
export const testConnection = async () => {
  try {
    // `SELECT 1` é uma query inofensiva e rápida para verificar a conexão.
    await sql`SELECT 1;`;
    console.log('✅ Conectado ao Netlify Neon PostgreSQL com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao conectar com o Netlify Neon PostgreSQL:', error.message);
    // Em produção, você pode querer um tratamento de erro mais robusto aqui.
    process.exit(1);
  }
};
export const requestHandler = async (req, res) => {
  const result = await sql`SELECT version()`;
  const { version } = result[0];
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end(version);
};
