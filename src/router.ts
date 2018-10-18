//  Just building a single-page app.  But can use routes like below.
// To use this, modify main.ts to use:
// new Vue({
//   router,   //#**** UNCOMMENT THIS in main.ts to use the router
//   store,
//   render: (h) => h(App),
// }).$mount('#app

import Vue from 'vue'
import Router from 'vue-router'
import App from './App.vue'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      name: 'Presenter',
      component: App,
    },
    {
      path: '/displayDataFile/:dataFileName',
      name: 'Data file',
      component: () => import(/* webpackChunkName: "displayDataFile" */ './appComponents/DisplayDataFile.vue'),
    }

    // {
    //   path: '/appUpdate',
    //   name: 'application update',
    //   // route level code-splitting
    //   // this generates a separate chunk (about.[hash].js) for this route
    //   // which is lazy-loaded when the route is visited.
    //   component: () => import(/* webpackChunkName: "about" */ './views/ApplicationUpdate.vue'),
    // }
  ]
})
