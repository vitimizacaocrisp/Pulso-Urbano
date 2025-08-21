<template>
    <header class="main-header">
    <nav class="navbar">
      <div class="logo-container">
        <a href="/" class="logo">
          <h1>Pulso Urbano</h1>
          <p class="tagline">Observatório Nacional de Segurança Pública e Justiça</p>
        </a>
      </div>

      <button id="mobileMenuIcon" class="mobile-menu-icon">
        <span class="icon-bar"></span>
        <span class="icon-bar"></span>
        <span class="icon-bar"></span>
      </button>

      <ul class="nav-menu" id="mainNavMenu">
        <li><a href="/" class="active">Início</a></li>

        <li class="dropdown">
          <a href="#">Painéis & Dados</a>
          <ul class="dropdown-content">
            <li><a href="/paineis/homicidios">Homicídios</a></li>
            <li><a href="/paineis/violencia-genero">Violência de Gênero</a></li>
            <li><a href="/paineis/vitimizacao">Vitimiação</a></li>
            <li><a href="/paineis/sistema-justica">Sistema de Justiça e Prisional</a></li>
            <li><a href="/paineis/atividade-policial">Atividade Policial e Crime Organizado</a></li>
            <li><a href="/paineis/crimes-economicos">Crimes Econômicos e Corrupção</a></li>
          </ul>
        </li>

        <li><a href="/publicacoes">Publicações</a></li>
        <li><a href="/analises">Análises & Cenários</a></li>
        <li><a href="/educacao">Educação</a></li>
        <li><a href="/sobre">Sobre</a></li>
      </ul>
    </nav>
  </header>
</template>
<script>
export default {
  name: 'MeuHeader',

}
</script>
