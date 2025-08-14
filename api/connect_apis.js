/**
 * Busca dados da população estimada por estado para o ano de 2022 diretamente da API do SIDRA/IBGE.
 * @returns {Promise<Array<Object>>} Uma promessa que resolve para um array com os dados de população padronizados.
 */
async function getIBGEPopulationData() {
    // URL da API do SIDRA para buscar a população estimada de 2022 para todas as UFs
    const ibgeApiUrl = 'https://apisidra.ibge.gov.br/values/t/6579/n3/all/v/9324/p/2022/h/n';

    console.log("Buscando dados da API do IBGE...");

    try {
        // 1. Faz a requisição de rede para a URL da API
        const response = await fetch(ibgeApiUrl);

        // 2. Verifica se a requisição foi bem-sucedida
        if (!response.ok) {
            // Se a resposta não for OK (ex: erro 404, 500), lança um erro.
            throw new Error(`Erro ao buscar dados do IBGE. Status: ${response.status}`);
        }

        // 3. Converte a resposta em JSON
        const data = await response.json();

        // 4. --- PADRONIZAÇÃO ---
        // O JSON do IBGE vem em um formato genérico. Vamos padronizá-lo para um formato mais limpo e útil para nós.
        // Usamos .slice(1) para pular o primeiro item do array, que é um cabeçalho descritivo.
        const standardizedData = data.map(item => {
            return {
                uf: item.D3N, // Nome da Unidade da Federação
                ano: parseInt(item.D1N, 10), // Ano
                populacao: parseInt(item.V, 10) // Valor da variável (População)
            };
        });

        console.log("Dados do IBGE recebidos e padronizados com sucesso.");
        return standardizedData;

    } catch (error) {
        console.error("Falha na conexão com a API do IBGE:", error);
        // Em caso de erro de rede ou na conversão, rejeitamos a promessa
        throw error;
    }
}

// Exportamos a nova função
module.exports = {
    getIBGEPopulationData
};