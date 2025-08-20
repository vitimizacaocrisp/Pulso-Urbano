import Navigo from 'navigo';

const router = new Navigo('/', { hash: false });
const appDiv = document.getElementById('app');

const loadHtml = async (url) => {
    try {
        // Tenta primeiro o caminho relativo
        let response = await fetch(url);
        
        // Se falhar, tenta caminho absoluto
        if (!response.ok) {
            const absoluteUrl = url.startsWith('./') ? url.substring(1) : `/${url}`;
            response = await fetch(absoluteUrl);
        }
        
        if (!response.ok) {
            throw new Error(`Erro ao carregar ${url}: ${response.statusText}`);
        }
        
        const html = await response.text();
        appDiv.innerHTML = html;
        window.scrollTo(0, 0);
        
    } catch (error) {
        console.error('Erro detalhado:', error);
        appDiv.innerHTML = `
            <h1>Erro ao carregar a página</h1>
            <p>${error.message}</p>
            <p>URL tentada: ${url}</p>
        `;
    }
};

router
    .on({
        // Rotas Principais
        '/': () => loadHtml('./html/home.html'), 
        '/publicacoes': () => loadHtml('./html/publicacoes.html'),
        '/analises': () => loadHtml('./html/analises.html'),
        '/educacao': () => loadHtml('./html/educacao.html'),
        '/sobre': () => loadHtml('./html/sobre.html'),

        // Rotas de Painéis
        '/paineis/homicidios': () => loadHtml('./html/paineis/homicidios.html'),
        '/paineis/violencia-genero': () => loadHtml('./html/paineis/violencia-genero.html'),
        '/paineis/vitimizacao': () => loadHtml('./html/paineis/vitimizacao.html'),
        '/paineis/sistema-justica': () => loadHtml('./html/paineis/sistema-justica.html'),
        '/paineis/atividade-policial': () => loadHtml('./html/paineis/atividade-policial.html'),
        '/paineis/crimes-economicos': () => loadHtml('./html/paineis/crimes-economicos.html'),
        '/paineis/populacao_ibge': () => loadHtml('./html/paineis/populacao_ibge.html'),

        // Rotas de Admin
        '/admin/dashboard-page': () => loadHtml('./html/admin/admindashboard.html'),
        '/admin': () => loadHtml('./html/admin/adminlogin.html'),
    })
    .notFound(() => {
        appDiv.innerHTML = '<h1>Erro 404 - Página não encontrada</h1>';
    })
    .resolve();

router.updatePageLinks();

export default router;