import Vue from 'vue'
import Vuex from 'vuex'

const appVersion = require('electron').remote.app.getVersion()

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    isAdminUser: true,
    isAdminShown: true,
    isFirstTimeUser: false,

    applicationVersion: appVersion
  },
  mutations: {
    setIsAdminUser(state, isAdminUser) {
      state.isAdminUser = isAdminUser
    },
    setIsAdminShown(state, isAdminShown) {
      state.isAdminShown = isAdminShown
    }
  },
  actions: {

  }
})
