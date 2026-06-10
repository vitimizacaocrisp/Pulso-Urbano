import { createApp } from 'vue'
import axios from 'axios'
import App from './App.vue'
import router from './router'

// importa o css global
import './assets/css/style.css'
import './assets/js/script.js'

// Injeta o token JWT (localStorage) no header Authorization de toda requisição.
// Auth stateless: funciona cross-domain (Netlify <-> Vercel) sem cookie/proxy.
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

createApp(App)
  .use(router)
  .mount('#app')

