import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

// importa o css global
import './assets/css/style.css'
import './assets/js/script.js'

// O cliente axios central (services/api.js) concentra baseURL, withCredentials
// e interceptors. Componentes importam esse cliente — nada de config de axios
// global espalhada aqui.

createApp(App)
  .use(router)
  .mount('#app')
