import { createApp } from 'vue'
import axios from 'axios'
import App from './App.vue'
import router from './router'

// importa o css global
import './assets/css/style.css'
import './assets/js/script.js'

// Auth via cookie httpOnly: o navegador anexa o cookie automaticamente.
// withCredentials garante o envio do cookie nas requisições (inclusive se a
// API ficar num subdomínio). O cookie é httpOnly → imune a XSS.
axios.defaults.withCredentials = true

// Fallback de compat: se ainda houver um token legado em localStorage, envia no
// header. Após o primeiro login novo, o auth passa a ser 100% via cookie.
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

createApp(App)
  .use(router)
  .mount('#app')

