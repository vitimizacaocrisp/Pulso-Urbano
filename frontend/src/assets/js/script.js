// Botão "voltar ao topo" (#back-to-top-btn está em index.html).
document.addEventListener('DOMContentLoaded', function () {
  const backToTopButton = document.getElementById('back-to-top-btn');
  if (!backToTopButton) return;

  const toggleVisibility = () => {
    const scrolled = document.body.scrollTop > 100 || document.documentElement.scrollTop > 100;
    backToTopButton.style.display = scrolled ? 'block' : 'none';
  };

  window.addEventListener('scroll', toggleVisibility);
  backToTopButton.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});
