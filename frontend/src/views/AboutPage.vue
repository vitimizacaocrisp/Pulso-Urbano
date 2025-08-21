<template>
  <div>
    <h1>Bem-vindo à Home</h1>
    <button @click="carregarUsuarios">Carregar Usuários</button>
    <ul>
      <li v-for="user in users" :key="user.id">{{ user.name }}</li>
    </ul>
  </div>
</template>

<script>
export default {
  data() {
    return {
      users: []
    };
  },
  methods: {
    async carregarUsuarios() {
      const res = await fetch("http://localhost:3000/");
      this.users = await res.json();
    }
  }
};
</script>
