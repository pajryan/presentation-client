import Vue from 'vue'
import App from './App.vue'
import AppStart from './AppStart.vue'
import router from './router'  // not used, but available
import store from './store'
import {remote} from 'electron'
import 'sass-loader'

// import bootstrap's css
import 'bootstrap/dist/css/bootstrap.min.css'

Vue.config.productionTip = false

// add right-click to get menu
const Menu = remote.Menu
const MenuItem = remote.MenuItem
let rightClickPosition: any = null
const menu = new Menu()
const menuItem = new MenuItem({
  label: 'Inspect Element',
  click: () => {
    remote.getCurrentWindow().webContents.inspectElement(rightClickPosition.x, rightClickPosition.y)
  }
})
menu.append(menuItem)
window.addEventListener('contextmenu', (e) => {
  e.preventDefault()
  rightClickPosition = {x: e.x, y: e.y}
  menu.popup({})
}, false)


// build the main view
new Vue({
  router,  // see router.ts.  Building a one-page app, so not using the router
  store,
  render: (h) => h(AppStart),
}).$mount('#app')
