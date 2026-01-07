import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

// importa o css global
import './assets/css/style.css'
import './assets/js/script.js'

createApp(App)
  .use(router)
  .mount('#app')

