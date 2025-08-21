require('dotenv').config();
const { Pool } = require('pg');

async function testConnection() {
  console.log('🔍 Testando conexão com PostgreSQL...');
  console.log('Configuração:', {
    connectionString: process.env.DATABASE_URL,
  });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

  try {
    const client = await pool.connect();
    console.log('✅ Conexão bem-sucedida!');
    
    // Testar algumas queries básicas
    const versionResult = await client.query('SELECT version()');
    console.log('📋 Versão do PostgreSQL:', versionResult.rows[0].version);
    
    const databasesResult = await client.query(`
      SELECT datname FROM pg_database 
      WHERE datistemplate = false
    `);
    console.log('🗃️ Bancos de dados disponíveis:');
    databasesResult.rows.forEach(db => console.log('  -', db.datname));
    
    client.release();
    await pool.end();
    
  } catch (error) {
    console.error('❌ Erro de conexão:', error.message);
    console.log('\n🔧 Soluções possíveis:');
    console.log('1. Verifique se o PostgreSQL está instalado e rodando');
    console.log('2. Confirme as credenciais no arquivo .env');
    console.log('3. Verifique se o banco de dados existe');
    console.log('4. Confirme as permissões do usuário');
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Dica: O PostgreSQL pode não estar rodando na porta 5432');
    }
    
    if (error.code === '28P01') {
      console.log('\n💡 Dica: Senha incorreta ou usuário não existe');
    }
    
    if (error.code === '3D000') {
      console.log('\n💡 Dica: Banco de dados não existe');
    }
  }
}

testConnection();