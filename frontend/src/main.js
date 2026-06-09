import { createApp } from 'vue'
import axios from 'axios'
import App from './App.vue'
import router from './router'

// importa o css global
import './assets/css/style.css'
import './assets/js/script.js'

// Envia o cookie httpOnly de autenticação em todas as requisições.
axios.defaults.withCredentials = true

createApp(App)
  .use(router)
  .mount('#app')

