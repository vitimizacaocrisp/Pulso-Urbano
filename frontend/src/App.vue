<script setup>
import LoadComponent from '@/components/LoadComponent.vue';
import ToastContainer from '@/components/ToastContainer.vue';
import { isRouteLoading } from '@/router';

</script>

<template>
  <div id="app">
    <LoadComponent v-show="isRouteLoading" />
    <router-view v-show="!isRouteLoading" />
    <ToastContainer />
  </div>
</template>