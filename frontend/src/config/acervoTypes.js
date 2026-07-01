// Config única dos "modos" do acervo. Compartilhada pelo viewer universal
// (AcervoView), pelo dropdown do header e pelas rotas — assim rótulo, rota,
// ícone e textos do hero vivem num só lugar.
//
// entryType null = "todas" (sem filtro de tipo na API).
export const ACERVO_VIEWS = {
  all: {
    key: 'all',
    entryType: null,
    route: '/catalogo',
    label: 'Todas',
    eyebrow: 'Acervo completo',
    icon: 'mdi:bookshelf',
    title: 'Catálogo Pulso Urbano',
    subtitle: 'Análises, produções científicas e dados primários sobre segurança pública, vitimização e violência no Brasil — reunidos em um só lugar.',
    countLabel: 'itens no acervo',
    accent: '#2f54eb',
  },
  analysis: {
    key: 'analysis',
    entryType: 'analysis',
    route: '/analises',
    label: 'Análises',
    eyebrow: 'Análises',
    icon: 'mdi:chart-box-outline',
    title: 'Análises',
    subtitle: 'Panoramas, indicadores e leituras aprofundadas sobre segurança pública e criminalidade.',
    countLabel: 'análises publicadas',
    accent: '#1c7ed6',
  },
  academic: {
    key: 'academic',
    entryType: 'academic',
    route: '/producoes',
    label: 'Produções',
    eyebrow: 'Produções Científicas',
    icon: 'mdi:school-outline',
    title: 'Produções Científicas',
    subtitle: 'Teses, dissertações, artigos e relatórios técnicos produzidos no âmbito do projeto.',
    countLabel: 'produções',
    accent: '#7048e8',
  },
  dataset: {
    key: 'dataset',
    entryType: 'dataset',
    route: '/dados',
    label: 'Dados',
    eyebrow: 'Repositório de Dados',
    icon: 'mdi:database-outline',
    title: 'Repositório de Dados Primários',
    subtitle: 'Questionários, microdados, livros de códigos e fichas técnicas das pesquisas de vitimização.',
    countLabel: 'conjuntos de dados',
    accent: '#0ea5a4',
  },
  // Recorte transversal (não é um entry_type): filtra por is_crisp.
  crisp: {
    key: 'crisp',
    entryType: null,
    crisp: true,
    route: '/crisp',
    label: 'CRISP/UFMG',
    eyebrow: 'CRISP · UFMG',
    icon: 'mdi:shield-star-outline',
    title: 'Produção do CRISP/UFMG',
    subtitle: 'Pesquisas de vitimização, dossiês e análises produzidas pelo CRISP — Centro de Estudos de Criminalidade e Segurança Pública da UFMG.',
    countLabel: 'itens do CRISP',
    accent: '#d6336c',
  },
};

// Ordem de exibição (dropdown do header e tabs do hero).
export const ACERVO_ORDER = ['all', 'analysis', 'academic', 'dataset', 'crisp'];

export const acervoView = (key) => ACERVO_VIEWS[key] || ACERVO_VIEWS.all;
