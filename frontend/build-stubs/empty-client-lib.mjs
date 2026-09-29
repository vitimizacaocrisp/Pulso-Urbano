// Stub vazio para libs client-only (papaparse/xlsx/sql.js/mammoth/monaco-editor)
// no bundle do SERVIDOR (ver nitro.alias em nuxt.config.ts). Nenhuma delas
// roda no servidor de verdade — todo uso é dentro de `import()` disparado só
// depois de montar no navegador (leitura de arquivo por fetch, clique do
// usuário). Sem isto, o bundler do Nitro tenta processar o CJS real dessas
// libs (algumas com código de worker embutido como string) e a build quebra.
export default {}
