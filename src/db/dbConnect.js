require('dotenv').config();

const { Pool } = require('pg');

// Configuração da conexão com o PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Event listeners para debugging
pool.on('connect', (client) => {
  console.log('📦 Novo cliente conectado ao pool');
});

pool.on('error', (err, client) => {
  console.error('❌ Erro inesperado no cliente do pool:', err);
  process.exit(-1);
});

// Testar conexão ao inicializar
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Conectado ao PostgreSQL com sucesso!');
    client.release();
  } catch (error) {
    console.error('❌ Erro ao conectar com PostgreSQL:', error.message);
    process.exit(1);
  }
};

// Função para executar queries
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log(`📊 Query executada em ${duration}ms:`, text);
    return res;
  } catch (error) {
    console.error('❌ Erro na query:', error.message);
    throw error;
  }
};

// Função para obter um cliente do pool
const getClient = async () => {
  try {
    const client = await pool.connect();
    return client;
  } catch (error) {
    console.error('❌ Erro ao obter cliente:', error.message);
    throw error;
  }
};

module.exports = {
  pool,
  query,
  getClient,
  testConnection
};