<template>
  <div class="loading-container">
    <div class="spinner">
      <div
        v-for="n in 8"
        :key="n"
        class="dot"
        :style="{ transform: `rotate(${n * 45}deg)` }"
      >
        <span></span>
      </div>
    </div>

    <h2>Conectando ao servidor...</h2>
    <p>Aguarde enquanto verificamos o backend.</p>
  </div>
</template>

<script setup>
  import { onMounted, onUnmounted } from 'vue'
  import { useRouter } from 'vue-router'
  import axios from 'axios'

  const router = useRouter()

  const API_BASE_URL = process.env.VUE_APP_API_URL || 'http://localhost:3000'

  let interval = null

  const checkServer = async () => {
    try {
      await axios.get(API_BASE_URL + '/health', { timeout: 100000 })
      router.replace({ name: 'AdminLogin' })
    } catch {
      // servidor ainda offline → continua tentando
    }
  }

  onMounted(() => {
    interval = setInterval(checkServer, 1500)
  })

  onUnmounted(() => {
    if (interval) clearInterval(interval)
  })
</script>



<style scoped>
.loading-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

/* ===== Spinner ===== */
.spinner {
  position: relative;
  width: 64px;
  height: 64px;
  margin-bottom: 24px;
}

.dot {
  position: absolute;
  width: 100%;
  height: 100%;
  animation: spin 1.2s linear infinite;
}

.dot span {
  position: absolute;
  top: 0;
  left: 50%;
  width: 10px;
  height: 10px;
  background-color: #8a8a8a;
  border-radius: 50%;
  transform: translateX(-50%);
  animation: fade 1.2s linear infinite;
}

/* Delay progressivo */
.dot:nth-child(1) span { animation-delay: 0s; }
.dot:nth-child(2) span { animation-delay: 0.15s; }
.dot:nth-child(3) span { animation-delay: 0.3s; }
.dot:nth-child(4) span { animation-delay: 0.45s; }
.dot:nth-child(5) span { animation-delay: 0.6s; }
.dot:nth-child(6) span { animation-delay: 0.75s; }
.dot:nth-child(7) span { animation-delay: 0.9s; }
.dot:nth-child(8) span { animation-delay: 1.05s; }

@keyframes fade {
  0% { opacity: 1; }
  100% { opacity: 0.2; }
}
</style>
