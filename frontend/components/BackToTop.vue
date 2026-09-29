<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const visible = ref(false)

function toggleVisibility() {
  visible.value = (document.body.scrollTop || document.documentElement.scrollTop) > 100
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => window.addEventListener('scroll', toggleVisibility))
onUnmounted(() => window.removeEventListener('scroll', toggleVisibility))
</script>

<template>
  <button
    id="back-to-top-btn"
    title="Voltar ao topo"
    :style="{ display: visible ? 'block' : 'none' }"
    @click="scrollToTop"
  >&uarr;</button>
</template>
