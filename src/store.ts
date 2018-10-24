import Vue from 'vue'
import Vuex, { StoreOptions } from 'vuex'
import { remote } from 'electron'
import path from 'path'

const passwords = require('@/configuration/PASSWORDS.json')

Vue.use(Vuex)

export interface AppStore {
  applicationVersion: string
  isAdminUser: boolean
  isAdminShown: boolean
  isFirstTimeUser: boolean
  activePresentation: any, // type this
  appPath: string
  appDataStorePath: string
  appDataArchivePath: string
  appPresentationPath: string
  appImagePath: string
  appPresentationConfigFileName: string
  appConfigFileName: string
  userName: string
  apiKey: string
  userEmail: string
  dataUpdateServiceURL: string
  adminPassword: string
}


const store: StoreOptions<AppStore> = {
  state: {
    applicationVersion: remote.app.getVersion(),

    isAdminUser: true,
    isAdminShown: true,
    isFirstTimeUser: false,

    // the json representation of the active presentionat
    activePresentation: {},

    // This is where ALL data will be stored (user data as well as data driving pictures )
    //  note that for full paths, use the getters below
    appPath: remote.app.getPath('userData'),
    appDataStorePath: '/_data',
    appDataArchivePath: '/_dataArchive',
    appPresentationPath: '/_presentations',
    appImagePath: '/_images',
    // appDefaultPresentationFileName: '_defaultPresentation.json', // i don't think i'm using this..
    appPresentationConfigFileName: '_presentationConfig.json',
    appConfigFileName: '_appConfig.json',

    // items stored in _appConfig.json
    userName: '',
    apiKey: '',
    userEmail: '',
    dataUpdateServiceURL: '',
    adminPassword: ''

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
    },

    setActivePresentation(state, activePresentation) {
      state.activePresentation = activePresentation
    },

    setUserName(state, userName) {
      state.userName = userName
    },
    setApiKey(state, apiKey) {
      state.apiKey = apiKey
    },
    setUserEmail(state, userEmail) {
      state.userEmail = userEmail
    },
    setDataUpdateServiceURL(state, dataUpdateServiceURL) {
      state.dataUpdateServiceURL = dataUpdateServiceURL
    },
    setAdminPassword(state, adminPassword) {
      state.adminPassword = adminPassword
    }
  },
  getters: {
    fullAppDataStoreDirectoryPath: state => {
      return path.join(state.appPath, state.appDataStorePath)
    },
    fullAppArchiveDirectoryPath: state => {
      return path.join(state.appPath, state.appDataArchivePath)
    },
    fullAppPresentationDirectoryPath: state => {
      return path.join(state.appPath, state.appPresentationPath)
    },
    fullAppImageDirectoryPath: state => {
      return path.join(state.appPath, state.appImagePath)
    },
    fullAppConfigFilePath: state => {
      return path.join(state.appPath, state.appConfigFileName)
    },
    fullAppPresentationConfigFilePath: state => {
      return path.join(state.appPath, state.appPresentationPath, state.appPresentationConfigFileName)
    },
    getApiKey: state => {
      return state.apiKey
    },
    getDataUpdateServiceURL: state => {
      return state.dataUpdateServiceURL
    }

  },
  actions: {

  }
}

export default new Vuex.Store<AppStore>(store)
