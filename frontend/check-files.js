const fs = require('fs');
const path = require('path');

const filesToCheck = [
    './src/assets/html/home.html',
    './src/assets/html/publicacoes.html',
    './src/assets/html/analises.html',
    './src/assets/html/educacao.html',
    './src/assets/html/sobre.html',
    './src/assets/html/paineis/homicidios.html',
    './src/assets/html/paineis/violencia-genero.html',
    './src/assets/html/paineis/vitimizacao.html',
    './src/assets/html/paineis/sistema-justica.html',
    './src/assets/html/paineis/atividade-policial.html',
    './src/assets/html/paineis/crimes-economicos.html',
    './src/assets/html/paineis/populacao_ibge.html',
    './src/assets/html/admin/adminlogin.html',
    './src/assets/html/admin/admindashboard.html'
];

console.log('📁 Verificando arquivos HTML...');

filesToCheck.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`✅ ${file}`);
    } else {
        console.log(`❌ ${file} - NÃO ENCONTRADO`);
    }
});

// Verifica estrutura da pasta dist após build
console.log('\n📁 Verificando pasta dist...');
if (fs.existsSync('./dist')) {
    const distFiles = fs.readdirSync('./dist', { recursive: true });
    distFiles.forEach(file => {
        if (file.includes('.html')) {
            console.log(`📄 dist/${file}`);
        }
    });
}