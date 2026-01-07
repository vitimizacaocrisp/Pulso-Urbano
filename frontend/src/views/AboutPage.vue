<template>
  <MeuHeader />
  <div>
    <h1>Bem-vindo à Home</h1>
    <button @click="carregarUsuarios">Carregar Usuários</button>
    <ul>
      <li v-for="user in users" :key="user.id">{{ user.name }}</li>
    </ul>
  </div>
  <MeuFooter />
</template>

<script>
import MeuHeader from '../components/MeuHeader.vue';
import MeuFooter from '../components/MeuFooter.vue';

export default {
  components: {
    MeuHeader,
    MeuFooter
  },
  data() {
    return {
      users: []
    };
  },
  methods: {
    async carregarUsuarios() {
      const res = await fetch(process.env.VUE_APP_API_URL || "http://localhost:3000/");
      this.users = await res.json();
    }
  }
};
</script>
