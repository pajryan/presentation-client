'use strict'

/**
 * THIS FILE contains a bunch of utility functions that are called throughout the app.  It does two key things
 *  - updates state depending on user actions
 *  - updates the local storage with data/config etc
 *  - updates the cloud storage with data/config etc
 */

import path from 'path'
import fs from 'fs'
import store from '@/store'

import {AppConfig, Passwords,
        Presentation, PresentationConfig, PresentationSection, PresentationPage, PageItem, PageItemTypes,
        DataLogFileItem,
        CallbackObjErr, ErrorObject} from '@/configuration/configurationTypes'

const unzipper = require('unzipper')

const passwords: Passwords = require('@/configuration/PASSWORDS.json')

import * as utils from './adminUtils'
// const utils = require ('./adminUtils.ts')
// const msg = require ('./../messages.js');
import log from 'electron-log'



type CallbackSuccess = (success: boolean) => void
type CallbackSuccessErr = (success: boolean, error?: ErrorObject) => void
type CallbackDataUpdateCheck = (isOnline: boolean, dataAvailable: boolean, message?: string) => void
type CallbackGetDataUpdateFiles = (dataLogFiles: DataLogFileItem[], err?: ErrorObject) => void
type CallbackGetDataUpdateProgress = (percentComplete: number, percentFailed: number, totalNumber: number) => void
type CallbackGetDataUpdateErrors = (arrayOfErrors: DataLogFileItemProgress[]) => void


interface StatusErrorObject {
  status: number
  error?: any
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




export function checkDataConnectionReady(callback: CallbackSuccessErr): void {
  utils.checkOnlineAndDataConnectionAndApiKey(
    store.state.dataUpdateServiceURL,
    store.state.apiKey,
    (success: boolean, err?: ErrorObject) => {
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

export function getActivePresentationId(): string {
  const presentationConfig: PresentationConfig = JSON.parse(fs.readFileSync(store.getters.fullAppPresentationConfigFilePath, 'utf8'))
  return presentationConfig.activePresentation
}

export function getActivePresentation(): Presentation {
  const activePresentationId: string = getActivePresentationId()
  return JSON.parse(fs.readFileSync(path.join(store.getters.fullAppPresentationDirectoryPath, activePresentationId + '.json'), 'utf8'))
}


interface PageItemWithIndex extends PageItem {
  sectionIndex: number
  pageIndex: number
}
interface PresentationPageWithIndex extends PresentationPage {
  sectionIndex: number
}

// this function searches the active presentation for items of type 'component', 'mmdText', or 'image
//  the usage is an admin user asking "I'm data and I want to know what components are in this presentation"
//    or, "what images are used in this presentation?"
//  So this function will look for all instances of an *item* (component or text or image)
//    an array of objects that include item name, section number, page number: such that the user can get an answer to their question in the form:
//     "there are three components in this presentation, the first is componentX in section1, page3"
export function getActivePresentationItemOfType(passedType: PageItemTypes = 'component') {  // default to looking for 'component' since that's most valuable
  const sections: PresentationSection[] = getActivePresentation().sections
  // create array of pages, keeping track of what section (index) the page came from
  const pages: PresentationPageWithIndex[] = sections.reduce((acc: PresentationPageWithIndex[], s: PresentationSection, sectionIndex: number) => acc.concat(
    s.pages.map((p: PresentationPage) => ({...p, sectionIndex}))
  ), [])
  // create array of pageItems, keeping track of what section and page the item came from
  const pageItems: PageItemWithIndex[] = pages.reduce((acc: PageItemWithIndex[], p: PresentationPageWithIndex, pageIndex: number) => acc.concat(
    p.pageItems.map((pi: PageItem) => ({...pi, pageIndex, sectionIndex: p.sectionIndex }))
  ), [])
  // return only those pageItems that match the type passed
  const chosenPageType = pageItems.filter((pit: PageItemWithIndex) => passedType in pit.type)
  return chosenPageType
}

export function setActivePresentation(id: string) {
  const presentationConfig: PresentationConfig = JSON.parse(fs.readFileSync(store.getters.fullAppPresentationConfigFilePath, 'utf8'))
  presentationConfig.activePresentation = id
  fs.writeFileSync(store.getters.fullAppPresentationConfigFilePath, JSON.stringify(presentationConfig, null, '\t'), 'utf8')
  store.commit('setActivePresentation', getActivePresentation())
}

export function getPresentationById(id: string): Presentation {
  return JSON.parse(fs.readFileSync(path.join(store.getters.fullAppPresentationDirectoryPath, id + '.json'), 'utf8'))
}

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

// export function publishPresentation(id, callback) {
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
// }

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
  DATA PUBLISH AND UPDATE ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
*/
export function publishOneDataFile(localDataFileName: string, callback: CallbackSuccessErr) {
  // make sure we're online and connected to data
  checkDataConnectionReady((success: boolean, error?: ErrorObject) => {
    if (success) {
      // get the file
      let dataFileStr = ''
      let dataJson = null
      const filePath = path.join(store.getters.fullAppDataStoreDirectoryPath, localDataFileName)
      if (fs.existsSync(filePath)) {
        dataFileStr = fs.readFileSync(filePath, 'utf8')
        try {
          dataJson = JSON.parse(dataFileStr)
        } catch (e) {
          callback(false, {error: 'invalid json: ' + e})
          return
        }

        // make call to server to publish the data file
        utils.publishDataFile(dataJson, (publishSuccess: boolean, publishError) => {
          if (publishSuccess) {
            callback(true)
          } else {
            callback(false, publishError)
          }
        })
      } else {
        callback(false, {error: 'file does not exist (' + filePath + ')'})
      }
    } else {
      log.error('could not connect to data provider to publish data file', error)
      callback(false, error)
    }
  })
}

// export function checkForDataUpdates(callback: CallbackDataUpdateCheck, dataAfterDate?: Date) {
//   checkDataConnectionReady((success: boolean, error?: ErrorObject) => {
//     if (success) {

//       // get the date this was last updated
//       log.info('checking last update at ', store.getters.fullAppConfigFilePath)
//       const appConfig = JSON.parse(fs.readFileSync(store.getters.fullAppConfigFilePath, 'utf8'))  // get the last data update from the config
//       let lastAppDataUpdate = appConfig.lastDataUpdate
//       console.log('dataAfterDate', dataAfterDate)
//       console.log('CONFIG', lastAppDataUpdate)

//       // if a date was passed, we're forcing a data update after the given date
//       if (dataAfterDate) {lastAppDataUpdate = dataAfterDate.getTime()}

//       console.log('DATE WEre USING', lastAppDataUpdate)

//       if (lastAppDataUpdate === null) {  // new user, or data has been deleted
//         callback(
//           true, true, 'This is the first time you have fetched data. The application does not work until you have pulled down the latest, and it may take a little while. Please proceed with the data update, and be patient!'
//         )
//         return
//       }

//       // now get the data log from the data update service.
//       getFilesToUpdate(lastAppDataUpdate, (dataToUpdate: DataLogFileItem[], err?: ErrorObject) => {
//         if (err) {
//           log.error('error calling the data update service: ', err)
//           callback(true, false, 'error: ' + JSON.stringify(err))
//           return
//         }
//         console.log('files to update: ', dataToUpdate)
//         callback(true, dataToUpdate.length > 0)
//       })

//     } else {
//       log.error('could not connect to data provider to publish data file', error)
//       callback(false, false, error ? error.error : 'Could not connect to data update service')
//     }
//   })
// }

export function getFilesToUpdate(asOfDateInclusive: Date | undefined, callback: CallbackGetDataUpdateFiles): void {
  // Get the data log from the data update service.  The data log is a large object that looks like { dataLog: [timestamp:<timeInMS>, file:<fileName>, timestamp:<timeInMS>, file:<fileName>, ....]}
  //   The <timestamp> is when the source data (<fileName>) was created.  So any timestamps greater than the last udpate time in the config is NEW
  utils.dataServiceCall('/dataLog', (data, err) => {
    if (err) {
      log.error('error calling the data update service: ', err)
      callback([], err)
      return
    }
    // filter the data by the date. If date is null, assume we want everything (e.g. after 1/1/1900)
    const dataToUpdate: DataLogFileItem[] = data.dataLog.filter((d: DataLogFileItem) => {
      return d.timeStamp >= (asOfDateInclusive ? asOfDateInclusive.getTime() : new Date(1900, 0, 1).getTime())
    })
    callback(dataToUpdate)
  })
}




interface DataLogFileItemProgress extends DataLogFileItem {
  // the following are used to keep track of progress as we download
  index?: number
  attempted?: boolean
  complete?: boolean
  msg?: string
}

export class GetDataUpdateFilesAsOf {
  dataUpdateCheckCallback: CallbackDataUpdateCheck
  progressCallback: CallbackGetDataUpdateProgress
  completeCallback: CallbackGetDataUpdateErrors
  errorCallback: CallbackObjErr
  asOfDateInclusive: Date | undefined
  dataToUpdate: DataLogFileItemProgress[] = []

  constructor(
      dataUpdateCheckCallback: CallbackDataUpdateCheck,
      progressCallback: CallbackGetDataUpdateProgress,
      completeCallback: CallbackGetDataUpdateErrors,
      errorCallback: CallbackObjErr,
      asOfDateInclusive?: Date
      ) {
    this.dataUpdateCheckCallback = dataUpdateCheckCallback
    this.progressCallback = progressCallback
    this.completeCallback = completeCallback
    this.errorCallback = errorCallback
    // can be null if user has never fetched data (in fact, it's how we *know* they're new)
    this.asOfDateInclusive = asOfDateInclusive
  }

  public checkStatusAndGetFiles() {
    checkDataConnectionReady((success: boolean, error?: ErrorObject) => {
      if (success) {
        this.getLastAsOfDate(() => {
          this.determineFilesToFetch(() => {
            this.getUpdatedData()
          })
        })
      } else {
        this.errorCallback(error)
      }
    })
  }

  public checkStatus() {
    checkDataConnectionReady((success: boolean, error?: ErrorObject) => {
      if (success) {
        this.getLastAsOfDate(() => {
          if (!this.asOfDateInclusive) {  // no last update date, so inform user
            this.dataUpdateCheckCallback(
              true, true, 'This is the first time you have fetched data. The application does not work until you have pulled down the latest, and it may take a little while. Please proceed with the data update, and be patient!'
            )
            return
          }
          this.determineFilesToFetch(() => {
            // have files, say so
            this.dataUpdateCheckCallback(true, this.dataToUpdate.length > 0)
          })
        })
      } else {
        this.dataUpdateCheckCallback(false, false, error ? error.error : 'Could not connect to data update service')
      }
    })
  }


  public setAsOfDateInclusive(dt: Date) {
    this.asOfDateInclusive = dt
  }

  private getLastAsOfDate(cb: any) {
    if (this.asOfDateInclusive) {  // date was passed, use it.
      cb()
    } else {
      const appConfig: AppConfig = JSON.parse(fs.readFileSync(store.getters.fullAppConfigFilePath, 'utf8'))  // get the last data update from the config
      if (appConfig.lastDataUpdate !== null && appConfig.lastDataUpdate !== undefined) {
        this.asOfDateInclusive = new Date(appConfig.lastDataUpdate)
      }
      cb()
    }
  }

  private determineFilesToFetch(cb: any) {
    getFilesToUpdate(this.asOfDateInclusive, (dataToUpdate: DataLogFileItemProgress[], err?: ErrorObject) => {
      this.dataToUpdate = dataToUpdate
      cb()
    })
  }

  private getUpdatedData() {
      log.info('fetching new data for the following files:', this.dataToUpdate)
      // add some metadata to track progress
      this.dataToUpdate.forEach((d: DataLogFileItemProgress, i: number) => {
        d.index = i
        d.attempted = false
        d.complete = false
        d.msg = ''
      })
      // loop through all the data to update, fetch, and manage status
      this.dataToUpdate.forEach((d: DataLogFileItemProgress, i: number) => {
        // fetch the file and copy to the local directory
        const req = '/requestFile/' + d.file
        const outputFileAndPath: string = path.join(store.getters.fullAppDataStoreDirectoryPath, d.file)
        utils.dataServiceCallLargeFile(req, outputFileAndPath, (data: any, error?: ErrorObject) => {
          if (error) {// file not found
            log.error('error fetching file from data service ', error)
            d.attempted = true
            d.msg = error.error
            this.getUpdatedDataStatus()
          } else {
            d.attempted = true
            d.complete = true
            this.getUpdatedDataStatus()
          }
        })
      })
  }

  private getUpdatedDataStatus() {
    const attempted = this.dataToUpdate.filter(d => d.attempted)
    const attemptedAndComplete = attempted.filter(d => d.complete)
    const attemptedAndFailed = attempted.filter(d => !d.complete)
    const percentComplete = 100 * attemptedAndComplete.length / this.dataToUpdate.length
    const percentFailed = 100 * attemptedAndFailed.length / this.dataToUpdate.length
    const percentAttempted = 100 * attempted.length / this.dataToUpdate.length
    this.progressCallback(percentComplete, percentFailed, this.dataToUpdate.length)

    if (percentAttempted === 100) {
      const incomplete = this.dataToUpdate.filter(d => !d.complete)
      if (incomplete.length === 0) {
        this.completeCallback([])
        this.asOfDateInclusive = new Date()
        updateConfig('lastDataUpdate', this.asOfDateInclusive.getTime())
      } else {
        this.completeCallback(incomplete)
      }
    }
  }


}


export function updateConfig(key: string, value: string | number) {
  const appConfig = JSON.parse(fs.readFileSync(store.getters.fullAppConfigFilePath, 'utf8'))
  appConfig[key] = value
  fs.writeFileSync(store.getters.fullAppConfigFilePath, JSON.stringify(appConfig, null, '\t'))
}


// export function getUpdatedData(progressCallback, completeCallback) {
//   const appConfig = JSON.parse(fs.readFileSync(store.getters.fullAppConfigFilePath, 'utf8'))  // get the last data update from the config
//   const lastAppDataUpdate = appConfig.lastDataUpdate

//   getFilesToUpdate(lastAppDataUpdate, (dataToUpdate: DataLogFileItemProgress[], err?: ErrorObject) => {
//     if (err) {
//       log.error('error calling the data update service: ', err)
//       completeCallback([])
//       callback(true, false, 'error: ' + JSON.stringify(err))
//       return
//     }


//     log.info('fetching new data:', dataToUpdate)
//     // add some metadata to track progress
//     dataToUpdate.forEach((d, i: number) => {
//       d.index = i
//       d.attempted = false
//       d.complete = false
//       d.msg = ''
//     })
//     // loop through all the data to update, fetch, and manage status
//     dataToUpdate.forEach((d, i: number) => {
//       // fetch the file and copy to the local directory
//       const req = '/requestFile/' + d.file
//       utils.dataServiceCall(req, (data, error) => {

//         if (error) {// file not found
//           log.error('error fetching file from data service ', error)
//           d.attempted = true
//           d.msg = error
//           getUpdatedDataStatus(progressCallback, completeCallback)
//         } else {
//           fs.writeFile(path.join(appDataPath, d.file), JSON.stringify(data, null, '\t'), writeError => {
//             if (writeError) {
//               log.error('error writing file ' + d.file, writeError)
//               d.msg = writeError
//               d.attempted = true
//               getUpdatedDataStatus(progressCallback, completeCallback)
//             } else {
//               d.attempted = true
//               d.complete = true
//               getUpdatedDataStatus(progressCallback, completeCallback)
//             }
//           })
//         }
//       })
//     })
//   })
// }

// export function getUpdatedDataStatus(progressCallback, completeCallback) {
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
// }



export let dataUpdate = {

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

