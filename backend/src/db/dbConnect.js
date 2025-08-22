import { neon } from '@netlify/neon';

// Inicializa o cliente Neon. Ele usa a connection string da variável de ambiente.
const sql = neon();

// [MODIFICADO] A nova forma de testar a conexão é executar uma query simples.
const testConnection = async () => {
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

export {
  sql,
  testConnection
};