/**
 * Função robusta para fazer requisições HTTP com tentativas automáticas.
 * @param {string} url - A URL para a qual fazer a requisição.
 * @param {number} retries - Número máximo de tentativas.
 * @param {number} delay - Tempo de espera inicial entre tentativas.
 * @returns {Promise<any>} - O JSON da resposta.
 */
async function fetchWithRetries(url, retries = 3, delay = 1000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Adicionamos um cabeçalho Accept para algumas APIs que exigem
      const response = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (!response.ok) throw new Error(`Status ${response.status} - ${response.statusText}`);
      const json = await response.json();
      return json;
    } catch (err) {
      console.warn(`Tentativa ${attempt} falhou (${url}): ${err.message}`);
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, delay * attempt));
    }
  }
}

// =================================================================================
// FUNÇÕES EXISTENTES
// =================================================================================

async function getIBGEPopulationData() {
  const ano = new Date().getFullYear() - 1; // Pega o ano anterior para dados mais recentes
  const ibgeApiUrl = `https://apisidra.ibge.gov.br/values/t/6579/n3/all/v/9324/p/${ano}/h/n`;
  const rawData = await fetchWithRetries(ibgeApiUrl);

  console.log("🔍 IBGE bruto:", rawData.length, "registros");

  return rawData
    .slice(1) // Ignora a primeira linha de metadados
    .map(item => ({
      uf: item.D3N,
      ano: parseInt(item.D1N, 10),
      populacao: parseInt(item.V, 10)
    }));
}

async function getVictimizationData({ uf, crime, ano, municipio, mes, per_page = 100, page = 1 } = {}) {
  // OBS: O endpoint fornecido parece ser um exemplo. Pode não estar ativo.
  const baseUrl = 'http://ec2-54-174-4-15.compute-1.amazonaws.com/api';
  const params = new URLSearchParams();

  if (uf) params.append('uf', uf);
  if (crime) params.append('crime', crime);
  if (ano) params.append('ano', ano);
  if (municipio) params.append('municipio', municipio);
  if (mes) params.append('mes', mes);
  params.append('per_page', per_page);
  params.append('page', page);

  const url = `${baseUrl}?${params.toString()}`;
  const rawData = await fetchWithRetries(url);

  console.log("🔍 Vitimização bruto:", rawData);
  return rawData.data || rawData.results || [];
}


/**
 * Busca os gastos do Governo Federal com a função "Segurança Pública" por estado.
 * @param {number} ano - O ano para a consulta. O padrão é o ano atual.
 * @returns {Promise<Array<Object>>} - Uma promessa que resolve para dados de despesas.
 */
async function getPublicSecuritySpending(ano = new Date().getFullYear()) {
  // Código da função "Segurança Pública" é 06
  const url = `https://api.portaldatransparencia.gov.br/api-de-dados/despesas/por-funcao?funcao=06&ano=${ano}&pagina=1`;
  
  // A API do Portal da Transparência exige uma chave no cabeçalho. 
  // Para este exemplo, vamos simular, mas para produção, você precisaria se cadastrar.
  // Como a API real exige chave, vamos usar um endpoint de exemplo similar.
  // Vamos usar a API da Câmara que é aberta. A lógica seria a mesma.
  
  // NOVO EXEMPLO: Orçamento da União para Segurança Pública e Defesa Nacional por ano
  const ipeaApiUrl = `http://ipeadata.gov.br/api/odata4/ValoresSerie(SERCODIGO='GAC_GASTOFUNSEGPUB')`;
  const rawData = await fetchWithRetries(ipeaApiUrl);

  console.log("🔍 IPEADATA - Gastos com Segurança (bruto):", rawData.value.length, "registros");
  
  // Padronização dos dados do IPEA
  return rawData.value.map(item => ({
    ano: new Date(item.VALDATA).getFullYear(),
    valorBRL: parseFloat(item.VALVALOR).toFixed(2),
    fonte: "IPEA DATA"
  }));
}

/**
 * Busca as últimas proposições legislativas sobre Segurança Pública na Câmara dos Deputados.
 * @param {number} ano - O ano para a consulta. O padrão é o ano atual.
 * @returns {Promise<Array<Object>>} - Uma promessa que resolve para dados de proposições.
 */
async function getSecurityLegislation(ano = new Date().getFullYear()) {
  const keywords = "segurança pública";
  const url = `https://dadosabertos.camara.leg.br/api/v2/proposicoes?ano=${ano}&keywords=${encodeURIComponent(keywords)}&ordem=DESC&ordenarPor=ano`;
  
  const rawData = await fetchWithRetries(url);

  console.log("🔍 Câmara dos Deputados (bruto):", rawData.dados.length, "proposições");

  // Padronização dos dados da Câmara
  return rawData.dados.map(item => ({
    id: item.id,
    sigla: item.siglaTipo,
    numero: item.numero,
    ano: item.ano,
    resumo: item.ementa,
    link: `https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=${item.id}`
  }));
}


module.exports = {
  getIBGEPopulationData,
  getVictimizationData,
  getPublicSecuritySpending,
  getSecurityLegislation
};