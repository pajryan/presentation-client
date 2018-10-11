'use strict'

/**
 * THIS FILE contains a bunch of utility functions that are called throughout the app.  It follows these rules:
 *  - nothing here directly alters app state at all. The individual components are responsible for that
 *  - however, this will post/get from the update server. So the state of the SERVER may change.
 */

import path from 'path'
import fs from 'fs'
import store from '@/store'

import {AppConfig, Passwords} from '@/configuration/configurationTypes'

const unzipper = require('unzipper')

const passwords: Passwords = require('@/configuration/PASSWORDS.json')

import * as utils from './adminUtils'
// const utils = require ('./adminUtils.ts')
// const msg = require ('./../messages.js');
import log from 'electron-log'


type CallbackSuccess = (success: boolean) => void
type CallbackSuccessErr = (success: boolean, error?: ErrorObject) => void

interface StatusErrorObject {
  status: number
  error?: any
}
interface ErrorObject {
  error: any
}

export interface AppInitialization {
  isFirstTimeUser: () => boolean
  initAppDirectories: () => void
  writeConfigFileDetails: (configData: AppConfig) => void
  initializeStateFromConfig: () => void
}

export interface CheckNetwork {
  isReadyForCloud: () => boolean
}


export function isFirstTimeUser(): boolean {
  // check if the path and config file exist.  If so, this is an existing user.
  //  if not, is new user.
  return (!fs.existsSync(path.join(store.state.appPath, store.state.appConfigFileName)))
}

export function initAppDirectories(): void {
  log.info('-----------')
  log.info('This is a new install. Creating config files and directories in the user storage')

  // going to write a bunch of directories and skeleton files that the app uses throughout
  //  goal here is to have a files that are separate from the app (app can be wiped and reinstalled if needed)
  //  all of the paths are stored in state (.store). Getters are used to compose the paths
  const defaultAppConfig = require('@/configuration/defaultAppConfig.json')
  const defaultPresentationFlow = require('@/configuration/defaultPresentationFlow.json')
  const defaultPresentationConfig = require('@/configuration/defaultPresentationConfig.json')

  fs.writeFileSync(store.getters.fullAppConfigFilePath, JSON.stringify(defaultAppConfig, null, '\t'), 'utf8')

  // write the _data directory
  if (!fs.existsSync(store.getters.fullAppDataStoreDirectoryPath)) {
    fs.mkdirSync(store.getters.fullAppDataStoreDirectoryPath)
  }
  // write the _archive directory
  if (!fs.existsSync(store.getters.fullAppArchiveDirectoryPath)) {
    fs.mkdirSync(store.getters.fullAppArchiveDirectoryPath)
  }
  // write the _presentation directory
  if (!fs.existsSync(store.getters.fullAppPresentationDirectoryPath)) {
    fs.mkdirSync(store.getters.fullAppPresentationDirectoryPath)
    // write the default presentation flow
    const appDefaultPresentationFile = path.join(store.getters.fullAppPresentationDirectoryPath, defaultPresentationFlow.metadata.id + '.json') // name the default file based on its UUID
    fs.writeFileSync(appDefaultPresentationFile, JSON.stringify(defaultPresentationFlow, null, '\t'), 'utf8')
    // write the default presentation config
    fs.writeFileSync(store.getters.fullAppPresentationConfigFilePath, JSON.stringify(defaultPresentationConfig, null, '\t'), 'utf8')
  }

  // write the _images directory
  if (!fs.existsSync(store.getters.fullAppImageDirectoryPath)) {
    fs.mkdirSync(store.getters.fullAppImageDirectoryPath)
  }

}

// this is called from the config tab of the admin view - to update the flat-file config with api key, user name etc
export function writeConfigFileDetails(configData: AppConfig): void {
  const config: AppConfig = JSON.parse(fs.readFileSync(store.getters.fullAppConfigFilePath, 'utf8'))
  config.userName = configData.userName
  config.userEmail = configData.userEmail
  config.dataUrl = configData.dataUrl
  config.apiKey = configData.apiKey
  config.adminPassword = configData.adminPassword
  fs.writeFileSync(store.getters.fullAppConfigFilePath, JSON.stringify(config, null, '\t'), 'utf8')
}

// pulling the users config into state/store
export function initializeStateFromConfig(): void {
  // read the config file
  const config: AppConfig = JSON.parse(fs.readFileSync(store.getters.fullAppConfigFilePath, 'utf8'))

  // store key values in state
  if (config.adminPassword && passwords.adminPassword === config.adminPassword) {
    store.commit('setIsAdminUser', true)
  }

  // definitionally (because config exists), is not a first time user
  store.commit('setIsFirstTimeUser', false)

  store.commit('setUserName', config.userName)
  store.commit('setApiKey', config.apiKey)
  store.commit('setUserEmail', config.userEmail)
  store.commit('setDataUpdateServiceURL', config.dataUrl)
  store.commit('setAdminPassword', config.adminPassword)
}


// export let onlineStatus = {
//   checkForDataServer: (callback) => {
//     utils.checkOnlineAndDataConnectionAndApiKey(_state.dataUpdateServiceURL, _state.apiKey, (online, err) => {
//       if (online) {
//         callback({status: 200})
//       } else {
//         log.error('could not connect to data provider', err)
//         callback(null, {error: err})
//       }
//     })
//   },


export function checkDataConnectionReady(callback: CallbackSuccessErr): void {
  utils.checkOnlineAndDataConnectionAndApiKey(
    store.state.dataUpdateServiceURL,
    store.state.apiKey,
    (success: boolean, err?: utils.ErrorObject) => {
      callback(success, err)
    }
  )
}



/*
  PRESENTATION MANAGEMENT ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  For presentations, there are two sources:
    - the online web-update service (same service as data update, just different endpoints)
    - the local user storage.  When displaying existing presentations, this is where we pull from
*/
export let presentationManagement = {

  // getPresentations: () => {
  //   // get a list of all presentations available
  //   const presentations = []
  //   fs.readdirSync(appPresentationPath).forEach(file => {
  //     if (file !== _state.appPresentationConfigFileName && file !== '.DS_Store' && file.indexOf('deleted_') === -1) { // skip the config file! and skip deleted files!
  //       presentations.push(JSON.parse(fs.readFileSync(path.join(appPresentationPath, file))))
  //     }
  //   })
  //   return presentations
  // },

  // getArchivedPresentations: () => {
  //   let presentations = []
  //   fs.readdirSync(appPresentationPath).forEach(file => {
  //     if (file.indexOf('deleted_') !== -1) { // only included the "deleted_<id>.json" files
  //       presentations.push(JSON.parse(fs.readFileSync(path.join(appPresentationPath, file))))
  //     }
  //   })
  //   presentations = presentations.sort((a, b) => b.metadata.creationDate - a.metadata.creationDate)
  //   return presentations
  // },

  // getActivePresentationId: () => {
  //   const presentationConfig = JSON.parse(fs.readFileSync(appPresentationConfig))
  //   return presentationConfig.activePresentation
  // },

  // getActivePresentation: () => {
  //   const activePresentationId = admin.getActivePresentationId()
  //   return JSON.parse(fs.readFileSync(path.join(appPresentationPath, activePresentationId + '.json')))
  // },

  // getActivePresentationItemOfType: (type= 'component') => {
  //   // can look for 'component', 'mmdText', or 'image
  //   const sections = this.getActivePresentation().presentation.sections
  //   const pages = sections.reduce((acc, s) => acc.concat(s.pages), [])
  //   const pageItems = pages.reduce((acc, p) => acc.concat(p.pageItems), [])
  //   const pageItemTypes = pageItems.map(pi => pi.type)
  //   const chosenPageType = pageItemTypes.filter(pit => pit[type])
  //   return chosenPageType
  // },

  // setActivePresentation: (id) => {
  //   const presentationConfig = JSON.parse(fs.readFileSync(appPresentationConfig))
  //   presentationConfig.activePresentation = id
  //   fs.writeFileSync(appPresentationConfig, JSON.stringify(presentationConfig, null, '\t'), 'utf8')
  //   _state.activePresentation = this.getActivePresentation()
  // },

  // getPresentationById: (id) => {
  //   return JSON.parse(fs.readFileSync(path.join(appPresentationPath, id + '.json')))
  // },

  // duplicatePresentation: (id) => {
  //   const newPresentation = admin.getPresentationById(id)
  //   const newPresentationId = utils.getUUID()
  //   newPresentation.metadata.title += ' (COPY)'
  //   newPresentation.metadata.id = newPresentationId
  //   newPresentation.metadata.isPublished = false
  //   newPresentation.metadata.version = 0
  //   newPresentation.metadata.creationDate = new Date().getTime()
  //   admin.writePresentation(newPresentation)
  //   return newPresentation
  // },

  // writePresentation: (presentationObject) => {
  //   const fileName = presentationObject.metadata.id
  //   fs.writeFileSync(path.join(appPresentationPath, fileName + '.json'), JSON.stringify(presentationObject, null, '\t'), 'utf8')
  // },

  // archivePresentation: (id) => { // prepend file with "deleted_"
  //   const currName = path.join(appPresentationPath, id + '.json')
  //   const newName = path.join(appPresentationPath, 'deleted_' + id + '.json')
  //   fs.renameSync(currName, newName)
  // },

  // unarchivePresentation: (id) => { // remove prepended "deleted_"
  //   const currName = path.join(appPresentationPath, 'deleted_' + id + '.json')
  //   const newName = path.join(appPresentationPath, id + '.json')
  //   fs.renameSync(currName, newName)
  // },

  // deletePresentation: (id) => {  // fully delete from the file system.  Note that this can receive "deleted_<id>" (not just id).  So dont' use this ID for other calls!!!
  //   fs.unlinkSync(path.join(appPresentationPath, id + '.json')) // this just deletes
  // },

  // publishPresentation: (id, callback) => {
  //   utils.checkOnlineAndDataConnectionAndApiKey(_state.dataUpdateServiceURL, _state.apiKey, (online, err) => {
  //     if (online) {

  //       const presentationToPublish = admin.getPresentationById(id)
  //       // push the presentation to the server
  //       utils.publishPresentation(_state.dataUpdateServiceURL, _state.apiKey, '/savePresentation', presentationToPublish, (data, err1) => {
  //         // now, need to go thru the presentation and see if it includes any images not already published to the server
  //         if (!err1 && data && data.status === 200) {
  //           utils.getImagesList(_state.dataUpdateServiceURL, _state.apiKey, (data2, err2) => {
  //             if (!err2 && data2 && data2.status === 200) {
  //               const publishedImages = data2.images // array of <uuid>.png
  //               // determine what images are in the presentation
  //               const pres = this.getPresentationById(id)
  //               const presImages = utils.extractKeyValueFromObject(pres, 'image')
  //               // see if any of the presentation images are NOT published
  //               const unpublishedImages = presImages.filter(pi => (publishedImages.findIndex(pub => pub === pi) === -1))
  //               // log.info('unpublished images: ', unpublishedImages)
  //               if (unpublishedImages.length === 0) {
  //                 callback(data, err)    // no images to publish, return
  //               } else {
  //                 // need to publish images
  //                 unpublishedImageObj = unpublishedImages.map(upi =>  ({image: upi, attempted: false, complete: false, msg: ''}))
  //                 unpublishedImageObj.forEach(upi => {
  //                   utils.publishImage(_state.dataUpdateServiceURL, _state.apiKey, path.join(admin.getAppImagePath(), upi.image), upi.image, (data, error) => {
  //                     if (error) {
  //                       log.error('error publishing image to server ', error)
  //                       upi.attempted = true
  //                       up.msg = error
  //                       admin.publishPresentationImageStatus(callback)
  //                     } else {
  //                       upi.attempted = true
  //                       upi.complete = true
  //                       admin.publishPresentationImageStatus(callback)
  //                     }
  //                   })
  //                 })
  //               }

  //             } else {
  //               callback(data, err)
  //             }
  //           })
  //         } else {
  //           callback(data, err)
  //         }
  //       })
  //     } else {
  //       log.error('could not connect to data provider', err)
  //       callback(null, {error: err})
  //     }
  //   })
  // },

  // publishPresentationImageStatus: (callback) => {
  //   const attempted = unpublishedImageObj.filter(d => d.attempted)
  //   const percentAttempted = 100 * attempted.length / unpublishedImageObj.length

  //   if (percentAttempted === 100) {
  //     const incomplete = unpublishedImageObj.filter(d => !d.complete)
  //     if (incomplete.length === 0) {
  //       callback({status: 200})
  //     } else {
  //       callback(null, {status: 400, error: incomplete})
  //     }
  //   }
  // },

  // markLocalPresentationAsPublished: (id) => {
  //   const pres = admin.getPresentationById(id)
  //   pres.metadata.isPublished = true
  //   admin.writePresentation(pres)
  // },

  // downloadPresentations: (callback) => {
  //   // will download all presentations. only want presentations we dont already have, so pass an array of what we have to prevent large, unnecessary downloads
  //   const existingPresentations = admin.getArchivedPresentations().concat(admin.getPresentations())
  //   const existingPresentationNames = existingPresentations.map(p => p.metadata.id)

  //   // make sure we're online and connected to data
  //   utils.checkOnlineAndDataConnectionAndApiKey(_state.dataUpdateServiceURL, _state.apiKey, (online, err) => {
  //     if (online) {
  //       // make call to server to get presentations
  //       utils.getPresentations(_state.dataUpdateServiceURL, _state.apiKey, existingPresentationNames, (data, err) => {
  //         if (err) {
  //           callback(null, {error: err})
  //         } else {
  //           callback({status: 200, data})
  //         }
  //       })
  //     } else {
  //       log.error('could not connect to data provider to download presentations', err)
  //       callback(null, {error: err})
  //     }
  //   })
  // },

}

/*
  IMAGE MANAGEMENT ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
*/
export let imageManagement = {

  // saveImage: (localPath) => {
  //   const uuid = utils.getUUID()
  //   const fileParts = localPath.split('.')
  //   const extension = '.' + fileParts[fileParts.length - 1]
  //   const filename = uuid + extension
  //   fs.copyFileSync(localPath, path.join(appImagePath, filename))
  //   return filename
  // },


  // downloadPresentationImages: (pres, callback) => {  // callback expecting one parameter: true/false for success
  //   // need to determine first if any of the imags required for this presentation are "new" for the user
  //   const presentationImages = utils.extractKeyValueFromObject(pres, 'image')
  //   log.info('presentation images', presentationImages)
  //   // get list of presentations we already have
  //   const existingImages = utils.listImagesInLocalStore(this.getAppImagePath())
  //   log.info('existing images', existingImages)

  //   missingImages = presentationImages.filter(pi => (existingImages.findIndex(pub => pub === pi) === -1))
  //   log.info('missing images', missingImages)

  //   if (missingImages.length === 0) {
  //     callback({status: 200})
  //   } else {
  //     // need to get images
  //     missingImages = presentationImages.map(d => ({image: d, attempted: false, complete: false, msg: ''})) // add some metadata
  //     missingImages.forEach(mi => {
  //       const downloadToPath = path.join(this.getAppImagePath(), mi.image)
  //       utils.downloadImage(_state.dataUpdateServiceURL, _state.apiKey, mi.image, downloadToPath, (data, error) => {
  //         if (error) {
  //           mi.attempted = true
  //           mi.msg = error
  //           admin.downloadPresentationImagesStatus(callback)
  //         } else {
  //           mi.attempted = true
  //           mi.complete = true
  //           admin.downloadPresentationImagesStatus(callback)
  //         }
  //       })
  //     })
  //   }
  // },


  // downloadPresentationImagesStatus: (callback) => {
  //   const attempted = missingImages.filter(d => d.attempted)
  //   const percentAttempted = 100 * attempted.length / missingImages.length
  //   if (percentAttempted === 100) {
  //     const incomplete = missingImages.filter(d => !d.complete)
  //     if (incomplete.length === 0) {
  //       callback({status: 200})
  //     } else {
  //       callback(null, {status: 400, error: incomplete})
  //     }
  //   }
  // },

}

/*
  DATA UPDATE ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
*/
export let dataUpdate = {
  // checkForDataUpdates: (callback, dataAfterDate) => {
  //   return utils.checkIfOnline((isOnline) => {
  //     if (!isOnline) {
  //       callback({isOnline: false, dataAvailable: null, message: 'It looks like you are not connected to the internet. Connect to the internet and try again.'})
  //       return
  //     }
  //     return utils.checkIfHaveDataConnection(_state.dataUpdateServiceURL, (hasDataConnection) => {
  //       if (!hasDataConnection) {
  //         callback({isOnline: false, dataAvailable: null, message: 'You appear to be connected to the internet, but the data-update service is not available. Contact Patrick.'})
  //         return
  //       }

  //       // get the date this was last updated
  //       log.info('checking last update at ', appConfigPath)
  //       const appConfig = JSON.parse(fs.readFileSync(appConfigPath))  // get the last data update from the config
  //       const lastAppDataUpdate = appConfig.lastDataUpdate

  //       // if a date was passed, we're forcing a data update after the given date
  //       if (dataAfterDate) {lastAppDataUpdate = dataAfterDate.getTime()}

  //       // now get the data log from the data update service.  The data log is a large object that looks like { dataLog: [timestamp:<timeInMS>, file:<fileName>, timestamp:<timeInMS>, file:<fileName>, ....]}
  //       //   The <timestamp> is when the source data (<fileName>) was created.  So any timestamps greater than the last udpate time in the config is NEW
  //       utils.dataServiceCall(_state.dataUpdateServiceURL, _state.apiKey, '/dataLog', (data, err) => {
  //         if (err) {
  //           log.error('error calling the data update service: ', err)
  //           callback({isOnline: true, dataAvailable: false, messsage: {text: 'error: ' + JSON.stringify(err)}})
  //           return
  //         }
  //         dataToUpdate = data.dataLog.filter(d => d.timeStamp >= lastAppDataUpdate)
  //         if (lastAppDataUpdate === null) {  // new user, or data has been deleted
  //           callback({
  //             isOnline: true, dataAvailable: true,
  //             message: 'This is the first time you have fetched data. The application does not work until you have pulled down the latest, and it may take a little while. Please proceed with the data update, and be patient!'
  //           })
  //         } else {  // just a normal update
  //           callback({isOnline: true, dataAvailable: dataToUpdate.length > 0})
  //         }
  //       })
  //     })
  //   })
  // },


  // getUpdatedData: (progressCallback, completeCallback) => {
  //   log.info('fetching new data:', dataToUpdate)
  //   // the following will work, but will need to setInterval or something gross to know when it's done. really need promises here
  //   dataToUpdate.forEach((d, i) => { // add some metadata to track
  //     d.index = i; d.attempted = false; d.complete = false; d.msg = ''
  //   })
  //   dataToUpdate.forEach((d, i) => {
  //     // fetch the file and copy to the local directory
  //     const req = '/requestFile/' + d.file
  //     utils.dataServiceCall(_state.dataUpdateServiceURL, _state.apiKey, req, (data, error) => {

  //       if (error) {// file not found
  //         log.error('error fetching file from data service ', error)
  //         d.attempted = true
  //         d.msg = error
  //         admin.getUpdatedDataStatus(progressCallback, completeCallback)
  //       } else {
  //         fs.writeFile(path.join(appDataPath, d.file), JSON.stringify(data, null, '\t'), err => {
  //           if (err) {
  //             log.error('error writing file ' + d.file, err)
  //             d.msg = err
  //             d.attempted = true
  //             admin.getUpdatedDataStatus(progressCallback, completeCallback)
  //           } else {
  //             d.attempted = true
  //             d.complete = true
  //             admin.getUpdatedDataStatus(progressCallback, completeCallback)
  //           }
  //         })
  //       }
  //     })
  //   })
  // },

  // getUpdatedDataStatus: (progressCallback, completeCallback) => {
  //   const attempted = dataToUpdate.filter(d => d.attempted)
  //   const attemptedAndComplete = attempted.filter(d => d.complete)
  //   const attemptedAndFailed = attempted.filter(d => !d.complete)
  //   const percentComplete = 100 * attemptedAndComplete.length / dataToUpdate.length
  //   const percentFailed = 100 * attemptedAndFailed.length / dataToUpdate.length
  //   const percentAttempted = 100 * attempted.length / dataToUpdate.length
  //   progressCallback(percentComplete, percentFailed, dataToUpdate.length)

  //   if (percentAttempted === 100) {
  //     const incomplete = dataToUpdate.filter(d => !d.complete)
  //     if (incomplete.length === 0) {
  //       completeCallback()
  //       admin.updateConfig('lastDataUpdate', new Date().getTime())
  //     } else {
  //       completeCallback(incomplete)
  //     }
  //   }
  // },

  // deleteData = (callback) => {
  //   fs.readdir(appDataPath, (err, files) => {
  //     if (err) {callback(err); return}
  //     for (const file of files) {
  //       fs.unlink(path.join(appDataPath, file), err => {
  //         if (err) {callback(err); return}
  //       })
  //     }
  //     callback()
  //   })
  //   // update the config to null date
  //   admin.updateConfig('lastDataUpdate', null)
  // },

  // updateConfig: (key, value) => {
  //   const appConfig = JSON.parse(fs.readFileSync(appConfigPath))
  //   appConfig[key] = value
  //   fs.writeFileSync(appConfigPath, JSON.stringify(appConfig, null, '\t'))
  // },

}

/*
  DATA ARCHIVE ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
*/
export let dataArchive = {

  // archiveLocalData: (callback) => {
  //   // going to get everythingin the _data directory, create a .zip it, name it dataArchive-yyyy-mm-dd-hh-mm.zip and move to _archive directory
  //   const now = new Date()
  //   const archiveFilename = 'dataArchive_' + now.getFullYear() + '-' +
  //                                         ((now.getMonth() + 1) < 10 ? '0' + (now.getMonth() + 1) : (now.getMonth() + 1)) + '-' +
  //                                         (now.getDate() < 10 ? '0' + now.getDate() : now.getDate()) + '-' +
  //                                         (now.getHours() < 10 ? '0' + now.getHours() : now.getHours()) + '-' +
  //                                         (now.getMinutes() < 10 ? '0' + now.getMinutes() : now.getMinutes()) + '-' +
  //                                         (now.getSeconds() < 10 ? '0' + now.getSeconds() : now.getSeconds()) + '.zip'
  //   log.info('creating archive file', archiveFilename)

  //   utils.zipDirectory(appDataPath, appDataArchivePath, archiveFilename, (err) => {
  //     if (err) {
  //       log.info('error creating archive', err)
  //       callback(err)
  //     } else {
  //       callback()
  //     }
  //   })
  // },


  // deployArchive: (removeAllExistingFiles, archiveFileName, callback) => {
  //   // going to get an existing archive (.zip) and expand it into the _data directory REMOVING everything else in that directory
  //   if (removeAllExistingFiles) {
  //     fs.readdir(appDataPath, (err, files) => {
  //       if (err) {
  //         log.error('error cleaning _data directory', err)
  //         callback(err)
  //       }
  //       for (const file of files) {
  //         fs.unlink(path.join(appDataPath, file), err => {
  //           if (err) {
  //             log.error('error deleting file from _data directory', err)
  //             callback(err)
  //           }
  //         })
  //       }
  //     })
  //   }

  //   // unzip the chosen archive and put the contents in the _data folder
  //   try {
  //     fs.createReadStream(path.join(appDataArchivePath, archiveFileName)).pipe(unzipper.Extract({ path: appDataPath }))
  //     callback()
  //   } catch (e) {
  //     log.error('error unzipping archive', e)
  //     callback(e)
  //   }

  // },


  // getLocalArchives: () => {
  //   // get a list of all the archives on the user's machine (.zip files in _dataArchive directory)
  //   const archives = []
  //   fs.readdirSync(appDataArchivePath).forEach(file => {
  //     if (file.indexOf('.zip') !== -1) {
  //       archives.push(file)
  //     }
  //   })
  //   return archives
  // },


  // publishDataArchive: (localDataArchiveFileName, callback) => {
  //   // make sure we're online and connected to data
  //   utils.checkOnlineAndDataConnectionAndApiKey(_state.dataUpdateServiceURL, _state.apiKey, (online, err) => {
  //     if (online) {
  //       // make call to server to get data archives
  //       utils.publishDataArchive(_state.dataUpdateServiceURL, _state.apiKey, appDataArchivePath, localDataArchiveFileName, (data, err) => {
  //         if (err) {
  //           callback(null, {error: err})
  //         } else {
  //           callback({status: 200})
  //         }
  //       })
  //     } else {
  //       log.error('could not connect to data provider to upload data archive', err)
  //       callback(null, {error: err})
  //     }
  //   })
  // },

  // downloadDataArchiveList: (callback) => {
  //   // will download list all archives. only want archives we dont already have locally, so pass an array of what we have to prevent large, unnecessary downloads
  //   const existingArchives = admin.getLocalArchives()

  //   // make sure we're online and connected to data
  //   utils.checkOnlineAndDataConnectionAndApiKey(_state.dataUpdateServiceURL, _state.apiKey, (online, err) => {
  //     if (online) {
  //       // make call to server to get data archives
  //       utils.getDataArchiveList(_state.dataUpdateServiceURL, _state.apiKey, existingArchives, (data, err) => {
  //         if (err) {
  //           callback(null, {error: err})
  //         } else {
  //           callback({status: 200, data})
  //         }
  //       })
  //     } else {
  //       log.error('could not connect to data provider to download list of data archives', err)
  //       callback(null, {error: err})
  //     }
  //   })
  // },

  // downloadOneDataArchive: (archiveFileName, callback) => {
  //   // make sure we're online and connected to data
  //   utils.checkOnlineAndDataConnectionAndApiKey(_state.dataUpdateServiceURL, _state.apiKey, (online, err) => {
  //     if (online) {
  //       // make call to server to get presentations
  //       utils.getDataArchive(_state.dataUpdateServiceURL, _state.apiKey, archiveFileName, appDataArchivePath, (data, err) => {
  //         if (err) {
  //           callback(null, {error: err})
  //         } else {
  //           callback({status: 200})
  //         }
  //       })
  //     } else {
  //       log.error('could not connect to data provider to download data archive', err)
  //       callback(null, {error: err})
  //     }
  //   })

  // },

}

/*
  APPLICATION UPDATE ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
*/
export let appUpdate = {
  // checkForApplicationUpdates: (callback) => {
  //   // set the events
  //   autoUpdater.on('update-available', (info) => {
  //     callback('updateAvailable')
  //   })
  //   autoUpdater.on('update-not-available', (info) => {
  //     callback('updateNotAvailable', _state.appVersion)
  //   })
  //   autoUpdater.on('error', (err) => {
  //     callback('error', err)
  //   })
  //   autoUpdater.on('download-progress', (progressObj) => {
  //     callback('downloadProgress', progressObj)
  //   })
  //   autoUpdater.on('update-downloaded', (info) => {
  //     log.info('update downloaded')
  //     callback('updateDownloaded')
  //   })

  //   // call for updates
  //   log.info('checking for app update. current version: ', _state.appVersion)
  //   autoUpdater.checkForUpdatesAndNotify()
  // },

}

  /*
    GETTERS / SETTERS ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  */
export let MOVE_THESE_I_THINK = {
  // state and other parts of the app
  // state: (val) => {
  //   if (!arguments.length) { return _state }
  //   _state = val
  //   return admin
  // },
  // slideshow: (val) => {
  //   if (!arguments.length) { return _slideshow }
  //   _slideshow = val
  //   return admin
  // },
  // toc: (val) => {
  //   if (!arguments.length) { return _toc }
  //   _toc = val
  //   return admin
  // },
  // // autoUpdater
  // autoUpdater: (val) => {
  //   if (!arguments.length) { return autoUpdater }
  //   autoUpdater = val
  //   return admin
  // },
  // // is first time user
  // firstTimeUser: (val) => {
  //   if (!arguments.length) { return isFirstTimeUser }
  //   isFirstTimeUser = val
  //   return admin
  // },

  // adminVue: () => {
  //   return adminVue
  // },

  // getAppDataPath: () => {
  //   return appDataPath
  // },

  // getAppImagePath: () => {
  //   return appImagePath
  // },

  // isShown: (val) => {
  //   if (!arguments.length) { return isShown }
  //   isShown = val
  //   return admin
  // },

  // isAdminUser: () => {
  //   return _state.isAdmin
  // }

}

