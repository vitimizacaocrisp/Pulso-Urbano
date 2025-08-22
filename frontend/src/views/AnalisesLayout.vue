<template>
  <div class="analises-container">
    <header class="analises-header">
      <h1>Repositório de Análises</h1>
      <p>Explorando dados sobre segurança pública e justiça no Brasil.</p>
      </header>
    <main class="analise-content">
      <router-view />
    </main>
  </div>
</template>

<script setup>
// Este layout pode ter lógica própria no futuro, se necessário.
</script>

<style scoped>
.analises-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
}

.analises-header {
  text-align: center;
  margin-bottom: 3rem;
  padding-bottom: 1.5rem;
  border-bottom: 2px solid #f0f0f0;
}

.analises-header h1 {
  font-size: 2.8rem;
  color: #2c3e50;
}

.analises-header p {
  font-size: 1.1rem;
  color: #555;
}

.analise-content {
  background-color: #fff;
}
</style>