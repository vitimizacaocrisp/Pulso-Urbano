// Garante que o script só rode após o carregamento completo do HTML
document.addEventListener('DOMContentLoaded', function() {

    // --- LÓGICA PARA O BOTÃO "VOLTAR AO TOPO" ---
    const backToTopButton = document.getElementById('backToTopBtn');

    // Verifica se o botão existe na página antes de continuar
    if (backToTopButton) {
        // Função para mostrar/ocultar o botão
        const scrollFunction = () => {
            if (document.body.scrollTop > 100 || document.documentElement.scrollTop > 100) {
                backToTopButton.style.display = 'block';
            } else {
                backToTopButton.style.display = 'none';
            }
        };

        // Função para rolar para o topo
        const scrollToTop = () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };

        // Adiciona os 'escutadores' de eventos
        window.onscroll = scrollFunction;
        backToTopButton.addEventListener('click', scrollToTop);
    }


    // --- LÓGICA PARA O MENU MOBILE (HAMBURGER) ---
    const mobileMenuIcon = document.getElementById('mobileMenuIcon');
    const mainNavMenu = document.getElementById('mainNavMenu');

    // Verifica se os elementos do menu existem na página
    if (mobileMenuIcon && mainNavMenu) {
        // Adiciona o 'escutador' de clique no ícone
        mobileMenu-icon.addEventListener('click', () => {
            // Alterna a classe que mostra/esconde o menu
            mainNavMenu.classList.toggle('mobile-menu-open');
        });
    }

});