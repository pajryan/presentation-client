'use strict'

// const http = require('http')
import http from 'http'
import fs from 'fs'
import path from 'path'
const request = require('request')


const archiver = require('archiver')
import log from 'electron-log'
import store from '@/store'
import {DataFileFormat, CallbackObjErr, ErrorObject} from '@/configuration/configurationTypes'

type CallbackOnline = (isOnline: boolean) => void
export type CallbackSuccessErr = (success: boolean, error?: ErrorObject) => void
type CallbackStatusErr = (result: StatusErrorObject) => void
type CallbackErr = (error?: any) => void


interface StatusErrorObject {
  status: number
  error?: any
}

// export interface Utils {
//   getUUID: () => string
//   checkIfOnline: (callback: CallbackOnline) => void
//   checkIfHaveDataConnection: any
//   checkIfHaveValidApiKey: any
//   checkOnlineAndDataConnectionAndApiKey: (dataUrl: string, apiKey: string, callback: CallbackSuccessErr) => void
//   dataServiceCall: any
//   publishPresentation: any
//   getPresentations: any
//   getImagesList: any
//   publishDataArchive: any
//   getDataArchiveList: any
//   extractKeyValueFromObject: any
//   publishImage: any
//   downloadImage: any
//   listImagesInLocalStore: any
//   zipDirectory: any
//   getDataArchive: any
// }

// export let utils: Utils = {

export function getUUID() {
  // https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript?utm_medium=organic&utm_source=google_rich_qa&utm_campaign=google_rich_qa
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    // I'm disabling bitwise generally in tslint since it can lead to unintentional use (and weird bugs.) But I want bitwise here.
    /* tslint:disable */
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    /* tslint:enable */
    return v.toString(16)
  })
}


export function checkIfOnline(callback: CallbackOnline) {
  const dataUrl = 'www.google.com'
  require('dns').resolve(dataUrl, (err: any) => {
    if (err) {
      log.error('trying to connect to internet resulted in', err)
      callback(false)
    } else {
      callback(true)
    }
  })
}


export function checkIfHaveDataConnection(dataUrl: string, callback: CallbackOnline) {
  // the dns.resolve fails on localhost... making local dev difficult...  So if I find localhost, using http.request.
  //    But don't want o use http.request generally because it requires me to split out host, port etc.
  if (dataUrl.indexOf('localhost') !== -1) {
    const opts = { host: 'localhost', port: '3000', path: '/', method: 'GET'}
    const req = http.request(opts, (res: any) => {
        res.setEncoding('utf8')
        res.on('data', (data: any) => {
          let o
          let success = true
          try {
            o = JSON.parse(data)
          } catch (e) {
            success = false
            log.error('when checking data connection, received JSON parse error when parsing: ', data)
            callback(false)
          }
          if (success && o.status && o.status === 200) { callback(true) } else { callback(false) }
        })
    })

    req.on('error', (error: any) => {
      log.log('error connecting to localhost', error)
      callback(false)
    })
    req.end()
  } else {
    require('dns').resolve(dataUrl, (err: any) => {
      if (err) {
        log.error('trying to connect to data service resulted in', err)
        callback(false)
      } else {
        callback(true)
      }
    })
  }
}

export function checkIfHaveValidApiKey(dataUrl: string, apiKey: string, callback: CallbackObjErr) {
  const postData = {data: {apiKey}}  // shorthand, equivalent to apiKey: apiKey
  const opts = { host: dataUrl, port: 80, path: '/apiCheck', method: 'POST', headers: {'Content-Type': 'application/json'}}
  if (dataUrl.indexOf('localhost') !== -1) {opts.port = 3000; opts.host = 'localhost'}
  const req = http.request(opts, (res: any) => {
      res.setEncoding('utf8')
      res.on('data', (data: any) => {
        const o = JSON.parse(data)
        if (o.status && o.status === 200) {
          callback(o)
        } else {
          callback(null, {error: o.error})
        }
      })
  })

  req.on('error', (error: any) => {
    log.error('error checking if have valid api key', error)
    callback(null, {error}) // short hand, equivalent to error: error
  })
  req.write(JSON.stringify(postData))
  req.end()
}


export function checkOnlineAndDataConnectionAndApiKey(dataUrl: string, apiKey: string, callback: CallbackSuccessErr) {
  checkIfOnline((online: boolean) => {
    if (online) {
      checkIfHaveDataConnection(dataUrl, (dataConnected: boolean) => {
        if (dataConnected) {
          checkIfHaveValidApiKey(dataUrl, apiKey, (apiAccepted: boolean, err: any) => {
            if (apiAccepted) {
              callback(true)
            } else {
              callback(false, {error: 'Your API key was rejected. Double check the API key above. If you do not have a valid key, contact support.'})
            }
          })
        } else {
          callback(false, {error: 'It looks like you are online, but the data service provider is not available. If this persists, contact support.'})
        }
      })
    } else {
      callback(false, {error: 'It looks like you are not online. Check your internet connection.'})
    }
  })
}


export function publishDataFile(dataFileJson: DataFileFormat, callback: CallbackSuccessErr) {
  const dataUrl = store.getters.getDataUpdateServiceURL
  const apiKey = store.getters.getApiKey
  const endpoint = '/publishData'
  const postData = {data: {dataFileJson, apiKey}}
  const opts = { host: dataUrl, port: 80, path: endpoint, method: 'POST', headers: {'Content-Type': 'application/json'}}
  if (dataUrl.indexOf('localhost') !== -1) {opts.port = 3000; opts.host = 'localhost'}
  const req = http.request(opts, (res: any) => {
    res.setEncoding('utf8')
    res.on('data', (data: any) => {
      try {
        const o = JSON.parse(data)
        if (o.status && o.status === 400) {
          callback(false, {error: o.error})
        } else {
          callback(true)
        }
      } catch (e) {
        log.error('got an unexpected response from the server', e)
        callback(false, {error: 'unexpected response from server, resulting in: ' + e.toString() + ' CHECK SERVER LOGS'})
      }
    })
  })

  req.on('error', (error: any) => {
    log.error('error making publishDataFile call', error)
    callback(false, {error})
  })
  req.write(JSON.stringify(postData))
  req.end()
}




// fetch data from data service
export function dataServiceCallLargeFile(endpoint: string, fileAndPath: string, callback: CallbackSuccessErr) {
  const dataUrl = store.getters.getDataUpdateServiceURL
  const apiKey = store.getters.getApiKey
  const postData = {data: {apiKey}}
  const opts = { host: dataUrl, port: 80, path: endpoint, method: 'POST', headers: {'Content-Type': 'application/json'}}
  if (dataUrl.indexOf('localhost') !== -1) {opts.port = 3000; opts.host = 'localhost'}

  const fullUrl = dataUrl + endpoint
  try {
    request.post({url: fullUrl, form: postData}).pipe(fs.createWriteStream(fileAndPath))
    callback(true)
  } catch (e) {
    callback(false, e)
  }
}


// fetch data from data service
export function dataServiceCall(endpoint: string, callback: CallbackObjErr) {
  const dataUrl = store.getters.getDataUpdateServiceURL
  const apiKey = store.getters.getApiKey
  const postData = {data: {apiKey}}
  const opts = { host: dataUrl, port: 80, path: endpoint, method: 'POST', headers: {'Content-Type': 'application/json'}}
  if (dataUrl.indexOf('localhost') !== -1) {opts.port = 3000; opts.host = 'localhost'}
  const req = http.request(opts, (res: any) => {
    res.setEncoding('utf8')
    res.on('data', (data: any) => {
      const o = JSON.parse(data)
      if (o.error) {
        callback(null, {error: o.error})
      } else {
        callback(o)
      }
    })
  })

  req.on('error', (error: any) => {
    log.error('error making dataService call', error)
    callback(null, {error})
  })
  req.write(JSON.stringify(postData))
  req.end()
}



//   publishPresentation: (dataUrl: string, apiKey: string, endpoint: string, presentation: any, callback: CallbackObjErr) => {
//     const postData = {data: {presentation, apiKey}}
//     const opts = { host: dataUrl, port: 80, path: endpoint, method: 'POST', headers: {'Content-Type': 'application/json'}}
//     if (dataUrl.indexOf('localhost') !== -1) {opts.port = 3000; opts.host = 'localhost'}
//     const req = http.request(opts, (res: any) => {
//       res.setEncoding('utf8')
//       res.on('data', (data: any) => {
//         const o = JSON.parse(data)
//         if (o.status && o.status === 400) {
//           callback(null, {error: o.error})
//         } else {
//           callback(o)
//         }
//       })
//     })

//     req.on('error', (error: any) => {
//       log.error('error making publishPresentation call', error)
//       callback(null, {error})
//     })
//     req.write(JSON.stringify(postData))
//     req.end()
//   },


//   getPresentations: (dataUrl: string, apiKey: string, localPresentationIds: string, callback: CallbackObjErr) => {
//     const postData = {data: {presentations: localPresentationIds, apiKey}}
//     const opts = { host: dataUrl, port: 80, path: '/getPresentations', method: 'POST', headers: {'Content-Type': 'application/json'}}
//     if (dataUrl.indexOf('localhost') !== -1) {opts.port = 3000; opts.host = 'localhost'}
//     const req = http.request(opts, (res: any) => {
//         res.setEncoding('utf8')
//         res.on('data', (data: any) => {
//           const o = JSON.parse(data)
//           if (o.status && o.status === 200) {
//             callback(o)
//           } else {
//             log.error('error in getPresentations', data)
//             callback(null, {error: o.error})
//           }
//         })
//     })

//     req.on('error', (error: any) => {
//       log.error('error making getPresentations call', error)
//       callback(null, {error})
//     })
//     req.write(JSON.stringify(postData))
//     req.end()
//   },


//   getImagesList: (dataUrl: string, apiKey: string, callback: CallbackObjErr) => {
//     const postData = {data: {apiKey}}
//     const opts = { host: dataUrl, port: 80, path: '/getImagesList', method: 'POST', headers: {'Content-Type': 'application/json'}}
//     if (dataUrl.indexOf('localhost') !== -1) {opts.port = 3000; opts.host = 'localhost'}
//     const req = http.request(opts, (res: any) => {
//       res.setEncoding('utf8')
//       res.on('data', (data: any) => {
//         const o = JSON.parse(data)
//         if (o.status && o.status === 200) {
//           callback(o)
//         } else {
//           callback(null, {error: o.error})
//         }
//       })
//     })

//     req.on('error', (error: any) => {
//       log.error('error making getImagesList call', error)
//       callback(null, {error})
//     })
//     req.write(JSON.stringify(postData))
//     req.end()
//   },



export function publishDataArchive(dataUrl: string, apiKey: string, archivePath: string, fileName: string, callback: CallbackSuccessErr) {
  const postData = {data: {apiKey}}
  const opts = { host: dataUrl, port: 80, path: '/saveDataArchive', method: 'POST'}
  if (dataUrl.indexOf('localhost') !== -1) {opts.port = 3000; opts.host = 'localhost'}

  const req = http.request({
    hostname: opts.host,
    port: opts.port,
    path: '/saveDataArchive?filename=' + fileName,
    method: 'POST'
  })

  fs.createReadStream(path.join(archivePath, fileName)).pipe(req)

  req.on('error', (err: any) => {
    log.error('error publishing data archive', err)
    callback(false, {error: err})
  })

  req.on('response', (res: any) => {
    log.info('successfully published data archive ', fileName)
    callback(true)
  })

}


export function getDataArchiveList(localDataArchiveNames: string[], callback: CallbackObjErr) {
  const dataUrl = store.getters.getDataUpdateServiceURL
  const apiKey = store.getters.getApiKey
  const postData = {data: {archives: localDataArchiveNames, apiKey}}
  const opts = { host: dataUrl, port: 80, path: '/getDataArchiveList', method: 'POST', headers: {'Content-Type': 'application/json'}}
  if (dataUrl.indexOf('localhost') !== -1) {opts.port = 3000; opts.host = 'localhost'}
  const req = http.request(opts, (res: any) => {
      res.setEncoding('utf8')
      res.on('data', (data: any) => {
        log.log('got response from /getDataArchiveList', data)
        const o = JSON.parse(data)
        if (o.status && o.status === 200) {
          callback(o)
        } else {
          log.error('error in getDataArchiveList', data)
          callback(null, {error: o.error})
        }
      })
  })

  req.on('error', (error: any) => {
    log.error('error making getDataArchiveList call', error)
    callback(null, {error})
  })
  req.write(JSON.stringify(postData))
  req.end()
}


//   // WILL NEED TO CHECK THIS.... I HAD TO REFACTOR IT FOR TYPESCRIPT, NOT SURE IF IT'S HAPPY
//   extractKeyValueFromObject: (itm: any, key: string, returnedValues: any[] = []) => {
//     if (typeof itm === 'object') {
//       for (const k in itm) {
//         if (itm.hasOwnProperty(k)) {
//           if (k === key) {
//             returnedValues.push(itm[k])
//           }
//           utils.extractKeyValueFromObject(itm[k], key, returnedValues)
//         }
//       }
//     } else if (Array.isArray(itm)) {
//       itm.forEach((i: any) => {
//         utils.extractKeyValueFromObject(i, key, returnedValues)
//       })
//     }
//     return returnedValues
//   },


//   publishImage: (dataUrl: string, apiKey: string, imgPath: string, fileName: string, callback: CallbackStatusErr) => {
//     const postData = {data: {apiKey}}
//     const opts = { host: dataUrl, port: 80, path: '/saveImage', method: 'POST', headers: {'Content-Type': 'image/png'}}
//     if (dataUrl.indexOf('localhost') !== -1) {opts.port = 3000; opts.host = 'localhost'}

//     const fullURL = dataUrl + 'saveImage'

//     const req = request.post(fullURL, (err: any, resp: any, body: any) => {
//       if (err) {
//         log.error('Error publishing image', err)
//         callback({status: 400, error: err})
//       } else {
//         callback({status: 200})
//       }
//     })

//     const form = req.form()
//     form.append('file', fs.createReadStream(imgPath))
//   },


//   downloadImage: (dataUrl: string, apiKey: string, fileName: string, downloadToPath: string, callback: CallbackStatusErr) => {
//     const postData = {data: {apiKey, fileName}}
//     const opts = { host: dataUrl, port: 80, path: '/downloadImage', method: 'POST', headers: {'Content-Type': 'application/json'}}
//     if (dataUrl.indexOf('localhost') !== -1) {opts.port = 3000; opts.host = 'localhost'}

//     const fullURL = dataUrl + 'downloadImage'
//     try {
//       request.post({ url: fullURL, json: postData}).pipe(fs.createWriteStream(downloadToPath))
//       callback({status: 200})
//     } catch (err) {
//       callback({status: 400, error: err})
//     }
//   },

//   listImagesInLocalStore: (imageDirectory: string) => {
//     const images: string[] = []
//     fs.readdirSync(imageDirectory).forEach((file: string) => {
//       if (file.indexOf('.DS') === -1) {
//         images.push(file)
//       }
//     })
//     return images
//   },



export function zipDirectory(dirToZip: string, zipPath: string, zipFileName: string, callback: CallbackErr) {

  if (!fs.existsSync(zipPath)) {
    callback({error: 'path to zip file doesn not exist: ' + path.join(zipPath, zipFileName)})
    return
  }
  const output = fs.createWriteStream(path.join(zipPath, zipFileName))

  const archive = archiver('zip', {
    zlib: { level: 9 } // Sets the compression level.
  })

  // listen for all archive data to be written
  // 'close' event is fired only when a file descriptor is involved
  output.on('close', () => {
    log.log('zip file has been created (' + archive.pointer() + ' total bytes)', zipPath, zipFileName)
    callback(null)
  })

  // good practice to catch warnings (ie stat failures and other non-blocking errors)
  archive.on('warning', (err: any) => {
    if (err.code === 'ENOENT') {
      log.error('ENOENT error creating archive', err)
      callback(err)
    } else {
      log.error('error creating archive', err)
      callback(err)
    }
  })
  // good practice to catch this error explicitly
  archive.on('error', (err: any) => {
    log.error('generic error creating archive, err')
    callback(err)
  })
  // pipe archive data to the file
  archive.pipe(output)
  archive.directory(dirToZip, false)
  archive.finalize()
}




export function getDataArchive(archiveFile: string, callback: CallbackSuccessErr) {
  const dataUrl = store.getters.getDataUpdateServiceURL
  const apiKey = store.getters.getApiKey
  const downloadToPath = store.getters.fullAppArchiveDirectoryPath
  const postData = {data: {apiKey, fileName: archiveFile}}
  const opts = { host: dataUrl, port: 80, path: '/downloadDataArchive', method: 'POST', headers: {'Content-Type': 'application/json'}}
  if (dataUrl.indexOf('localhost') !== -1) {opts.port = 3000; opts.host = 'localhost'}

  const fullURL = dataUrl + '/downloadDataArchive'
  try {
    request.post({ url: fullURL, json: postData}).pipe(fs.createWriteStream(path.join(downloadToPath, archiveFile)))
    callback(true)
  } catch (err) {
    callback(false, {error: err})
  }
}

