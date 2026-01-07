<script>
import LoadComponent from '@/components/LoadComponent.vue';

export default {
  name: 'App',
  components: {
    LoadComponent,

  }
}

</script>

<template>
  <suspense>
    <template #default>
      <router-view />
    </template>
    <template #fallback>
      <LoadComponent />
    </template>
  </suspense>
</template>