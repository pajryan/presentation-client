import Vue from 'vue'
import Vuex from 'vuex'
import { remote } from 'electron'

const passwords = require('@/configuration/PASSWORDS.json')

Vue.use(Vuex)


export default new Vuex.Store({
  state: {
    applicationVersion: remote.app.getVersion(),

    isAdminUser: true,
    isAdminShown: true,
    isFirstTimeUser: false,

    // This is where ALL data will be stored (user data as well as data driving pictures)
    appPath: remote.app.getPath('userData'),
    appDataStorePath: '/_data',
    appDataArchivePath: '/_dataArchive',
    appPresentationPath: '/_presentations',
    appImagePath: '/_images',

    appDefaultPresentationFileName: '_defaultPresentation.json',
    appPresentationConfigFileName: '_presentationConfig.json',
    appConfigFileName: '_appConfig.json',

    validAdminPassword: passwords.adminPassword


  },
  mutations: {
    setIsAdminUser(state, isAdminUser) {
      state.isAdminUser = isAdminUser
    },
    setIsAdminShown(state, isAdminShown) {
      state.isAdminShown = isAdminShown
    },
    setIsFirstTimeUser(state, isFirstTimeUser) {
      state.isFirstTimeUser = isFirstTimeUser
    }
  },
  actions: {

  }
})
