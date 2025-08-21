/**
 * NOTE: Se você estiver usando uma versão do Node.js anterior à 18,
 * o `fetch` não é nativo. Você precisa instalar o `node-fetch`.
 * Rode no terminal: npm install node-fetch
 * E adicione no topo do seu arquivo: const fetch = require('node-fetch');
 */

/**
 * Função robusta para fazer requisições HTTP com tentativas automáticas e timeout.
 */
const fetch = require('node-fetch'); // Certifique-se de importar o fetch se não for nativo

async function fetchWithRetries(url, retries = 3, delay = 1000, timeout = 15000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });

      clearTimeout(id);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} - ${response.statusText}`);
      }

      const json = await response.json();
      return json;

    } catch (err) {
      console.warn(`⚠️ Tentativa ${attempt} falhou [${url}]: ${err.message}`);
      if (attempt === retries) {
        throw new Error(`❌ Falha após ${retries} tentativas em ${url}: ${err.message}`);
      }
      await new Promise(r => setTimeout(r, delay * attempt));
    }
  }
}

// =================================================================================
// FUNÇÕES DE API (REVISADAS)
// =================================================================================

/**
 * [OK] Dados populacionais do IBGE.
 */
async function getIBGEPopulationData() {
  const functionName = "getIBGEPopulationData";
  try {
    const ano = new Date().getFullYear() - 1; // IBGE tem defasagem
    const url = `https://apisidra.ibge.gov.br/values/t/6579/n3/all/v/9324/p/${ano}/h/n`;
    
    console.log(`[${functionName}] Buscando dados em: ${url}`);
    const rawData = await fetchWithRetries(url);
    console.log(`[${functionName}] Dados brutos recebidos. Verificando formato...`);

    if (!Array.isArray(rawData) || rawData.length < 2) {
      throw new Error("Formato de resposta inesperado do IBGE.");
    }

    const processedData = rawData.slice(1).map(item => ({
      uf: item.D3N,
      ano: Number(item.D1N) || ano,
      populacao: Number(item.V) || null,
      fonte: "IBGE - SIDRA"
    }));

    console.log(`✅ [${functionName}] Sucesso. ${processedData.length} registros processados.`);
    return processedData;

  } catch (err) {
    console.error(`❌ Erro em ${functionName}:`, err.message);
    return [];
  }
}

/**
 * [OK] Dados de vitimização.
 */
async function getVictimizationData(filters = {}) {
  const functionName = "getVictimizationData";
  try {
    const baseUrl = 'http://ec2-54-174-4-15.compute-1.amazonaws.com/api';
    const params = new URLSearchParams();
    
    // Adiciona filtros recebidos
    Object.keys(filters).forEach(key => params.append(key, filters[key]));
    
    // Garante paginação na primeira carga para popular filtros
    if (!filters['per_page']) params.set('per_page', '1000');
    if (!filters['page']) params.set('page', '1');

    const url = `${baseUrl}?${params.toString()}`;
    console.log(`[${functionName}] Buscando dados em: ${url}`);
    const rawData = await fetchWithRetries(url);
    console.log(`[${functionName}] Dados brutos recebidos. Verificando formato...`);

    const results = rawData?.data || rawData?.results || [];
    if (!Array.isArray(results)) {
        throw new Error("Formato de resposta inesperado da API de Vitimização.");
    }

    const processedData = results.map(item => ({ ...item, fonte: "API Vitimização (demo)" }));
    
    console.log(`✅ [${functionName}] Sucesso. ${processedData.length} registros processados.`);
    return processedData;

  } catch (err) {
    console.error(`❌ Erro em ${functionName}:`, err.message);
    return [];
  }
}

/**
 * [SUBSTITUÍDA] Gastos públicos com segurança. A API do IPEA está offline.
 */
async function getPublicSecuritySpending() {
  const functionName = "getPublicSecuritySpending";
  console.warn(`⚠️ [${functionName}] AVISO: A API original do IPEADATA está instável/offline. Usando dados de exemplo.`);
  
  // Retorna uma promessa resolvida para simular o comportamento de uma função async
  return Promise.resolve([
    { ano: 2020, valorBRL: 95.8 * 1e9, fonte: "IPEA Data (Exemplo)" },
    { ano: 2021, valorBRL: 106.1 * 1e9, fonte: "IPEA Data (Exemplo)" },
    { ano: 2022, valorBRL: 115.3 * 1e9, fonte: "IPEA Data (Exemplo)" }
  ]);
}

/**
 * [OK] Últimas proposições legislativas sobre segurança pública.
 */
async function getSecurityLegislation(ano = new Date().getFullYear()) {
  const functionName = "getSecurityLegislation";
  try {
    const keywords = "segurança pública";
    const url = `https://dadosabertos.camara.leg.br/api/v2/proposicoes?ano=${ano}&keywords=${encodeURIComponent(keywords)}&ordem=DESC&ordenarPor=ano`;
    
    console.log(`[${functionName}] Buscando dados em: ${url}`);
    const rawData = await fetchWithRetries(url);
    console.log(`[${functionName}] Dados brutos recebidos. Verificando formato...`);

    if (!rawData?.dados) throw new Error("Formato de resposta inesperado da Câmara.");

    const processedData = rawData.dados.map(item => ({
      id: item.id,
      sigla: item.siglaTipo,
      numero: item.numero,
      ano: item.ano,
      resumo: item.ementa,
      link: `https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=${item.id}`,
      fonte: "Câmara dos Deputados"
    }));
    
    console.log(`✅ [${functionName}] Sucesso. ${processedData.length} registros processados.`);
    return processedData;

  } catch (err) {
    console.error(`❌ Erro em ${functionName}:`, err.message);
    return [];
  }
}

/**
 * [OK] Dados de homicídios do Banco Mundial.
 */
async function getHomicideData() {
  const functionName = "getHomicideData";
  try {
    const indicator = "VC.IHR.PSRC.P5";
    const url = `https://api.worldbank.org/v2/country/BR/indicator/${indicator}?format=json&per_page=100&source=2`;
    
    console.log(`[${functionName}] Buscando dados em: ${url}`);
    const rawData = await fetchWithRetries(url);
    console.log(`[${functionName}] Dados brutos recebidos. Verificando formato...`);

    if (!Array.isArray(rawData) || !rawData[1]) {
      throw new Error("Formato de resposta inesperado da API do Banco Mundial.");
    }

    const processedData = rawData[1]
      .filter(item => item.value !== null)
      .map(item => ({
        ano: Number(item.date),
        taxa_por_100k: parseFloat(item.value.toFixed(2)),
        fonte: "Banco Mundial / UNODC"
      }));

    console.log(`✅ [${functionName}] Sucesso. ${processedData.length} registros processados.`);
    return processedData;

  } catch (err) {
    console.error(`❌ Erro em ${functionName}:`, err.message);
    return [];
  }
}

// =================================================================================
// EXPORTS
// =================================================================================

module.exports = {
  getIBGEPopulationData,
  getVictimizationData,
  getPublicSecuritySpending,
  getSecurityLegislation,
  getHomicideData
};
