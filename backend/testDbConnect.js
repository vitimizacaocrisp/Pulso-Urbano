// test-db.js
require('dotenv').config();
const { Pool } = require('pg');

console.log('A tentar conectar com a base de dados usando a URL fornecida...');
console.log('URL:', process.env.DATABASE_URL); // Verifica se a URL está a ser carregada

if (!process.env.DATABASE_URL) {
    console.error('❌ ERRO: A variável de ambiente DATABASE_URL não foi encontrada no ficheiro .env');
    process.exit(1);
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

const test = async () => {
    let client;
    try {
        client = await pool.connect();
        console.log('✅✅✅ Conexão com o PostgreSQL bem-sucedida! ✅✅✅');
        client.release();
    } catch (error) {
        console.error('❌❌❌ Falha ao conectar com o PostgreSQL ❌❌❌');
        console.error('Mensagem de Erro:', error.message);
    } finally {
        await pool.end();
    }
};

test();