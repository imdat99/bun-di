import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import naive from 'naive-ui'
import 'vfonts/Lato.css'
import 'vfonts/FiraCode.css'

import router from './router'

createApp(App).use(naive).use(router).mount('#app')
