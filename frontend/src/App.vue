<template>
  <div>
    <MeuHeader v-if="!$route.meta.hideLayout" />
    <router-view />
    <MeuFooter v-if="!$route.meta.hideLayout" />
  </div>
</template>

<script>
import MeuHeader from './components/MeuHeader.vue';
import MeuFooter from './components/MeuFooter.vue';

export default {
  name: 'App',
  components: {
    MeuHeader,
    MeuFooter
  }
}
</script>
