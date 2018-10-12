'use strict'
// const sql = require('mssql').default
// import { ConnectionPool } from 'mssql'
// const sql = require('mssql').default

import sql from 'mssql'
import { config } from 'mssql'
const pwd = require('../../../configuration/PASSWORDS.json')
import path from 'path'
import fs from 'fs'
import log from 'electron-log'

// import {sql} from 'mssql'
// const client = require('mssql/msnodesqlv8')
// import { ConnectionPool } from 'mssql'

// const Connection = require('tedious').Connection



import store from '@/store'
import {DataSource, DataSourceResultHandler, DataSourceSqlParameter} from '@/configuration/configurationTypes'

// // const qa = require('./dataQualityControlScripts')

// const events = require('events');
// let ee = events.EventEmitter;
interface SuccessObj {
  success: boolean
  error?: any
  result?: any
  filesWritten?: any
}
type CallbackFunc = (successObj: SuccessObj, dataSource: DataSource) => void

const config: config = {
  user: pwd.databaseUsername,
  password: pwd.databasePassword,
  server: pwd.databaseServer,
  database: pwd.database,

  options: {
      encrypt: false // Use this if you're on Windows Azure
  }
}

export class QueryRunnerFileWriter {

  dataSource: DataSource
  callback: CallbackFunc
  filesWritten: number
  results: any[]          // need to type this
  rowsAffected: any       // need to type this
  recordCount: number


  constructor(dataSource: DataSource, callback: CallbackFunc) {

    this.dataSource = dataSource
    this.callback = callback

    this.filesWritten = 0

    this.results = []         // this is an ARRAY of ARRAYS to support multiple recordsets
    this.rowsAffected = null  // contains some metadata about row counts etc
    this.recordCount = -1

    this.run()
  }

  // iteratively write each file (asynchronous, but doing one at a time.)
  writeAllFiles(currFileIndex: number = this.filesWritten) {
    const filename = this.dataSource.resultHandling[currFileIndex].filename
    this.writeOneFile(this.results[currFileIndex], filename, (err: any) => {
      if (err) {
        this.filesWritten = 0
        this.callback(
          {success: false, error: err},
          this.dataSource
        )
      } else {
        if (this.filesWritten < this.results.length) {
          this.writeAllFiles(this.filesWritten++)
        } else {
          const finalFileCount = this.filesWritten
          this.filesWritten = 0
          this.callback(
            {success: true, result: this.rowsAffected, filesWritten: finalFileCount},
            this.dataSource
          )
        }
      }
    })

  }


  // write one file
  writeOneFile(data: any, filename: string, fileCallback: (err?: any) => void) {
    // going to write straight to my own _data directory (so that pictures are immediately updated)
    if (!filename) {
      log.error('Error writing data file. Got results, but found no filename. Maybe this returned more results than expected?.  Check this: ', this.dataSource)
      fileCallback('Error writing data file. Got results, but found no filename')
    }

    fs.writeFile(path.join(store.getters.fullAppDataStoreDirectoryPath, filename), JSON.stringify(data, null, '\t'), (err: any) => {
      if (err) {
        log.error('error writing file ' + filename, err)
        fileCallback(err)
      } else {
        fileCallback()
      }
    })

  }


  // run the query
  run() {
    log.info('trying to connect with', config)
    config.database = ''




    // const connectToSqlServer = (async (): Promise<void> => {
    //   try {
    //     const pool = new sql.ConnectionPool(config)
    //     pool.connect().then(() => {
    //         const request = new sql.Request(pool)
    //         const result = request.query(`select * from user_admin..user_login`)
    //         log.info('got a result', result)
    //     })
    //   } catch (err) {
    //     log.info('error', err)
    //   }
    // })()






    const dbConn = new sql.ConnectionPool(config)
    dbConn.connect((err: any) => {
      const request = new sql.Request(dbConn)
      request.stream = true               // You can set streaming differently for each request

      // stored procedure
      if (this.dataSource.isStoredProcedure) {
        log.error('TODO, need to handle parameters to SP.')
        request.execute(this.dataSource.query)

      } else {
        let sqlstring: string = this.dataSource.query
        // parameters
        if (this.dataSource.sqlParameters) {
          this.dataSource.sqlParameters.forEach((p: DataSourceSqlParameter, i: number) => {
            const paramReplace = '{' + (i + 1) + '}'
            sqlstring = sqlstring.replace(paramReplace, p.value || '')
          })
        }
        log.info('running query', sqlstring)
        request.query(sqlstring)
      }

      const onRecordset = (columns: any) => {  // Emitted once for each recordset in a query
        this.recordCount++
        this.results[this.recordCount] = []  // initialize an array for this record set
      }
      request.on('recordset', onRecordset)

      const onRow = (row: any) => {  // Emitted for each row in a recordset
        this.results[this.recordCount].push(row)
      }
      request.on('row', onRow)

      const onError = (err2: any) => {  // May be emitted multiple times
        log.error('error', err2)
        // request.removeListener('recordset', onRecordset);
        // request.removeListener('row', onRow);
        // request.removeListener('error', onError);
        // request.removeListener('done', onDone);
        // sql.removeListener('error', onSqlError);
        this.callback(
          {success: false, error: err2},
          this.dataSource
        )
      }
      request.on('error', onError)

      const onDone = (result: any) => {  // ALWAYS emitted as the last one. result contains # of records etc.
        request.removeListener('recordset', onRecordset)
        request.removeListener('row', onRow)
        request.removeListener('error', onError)
        request.removeListener('done', onDone)

        log.log('---------------------')
        // log.log('events on request', request.eventNames())

        dbConn.close()
        // sql.removeListener('error', onSqlError);

        // console.log('result', this.results ) // careful showing the results. Can massively slow the app.
        // write the results to a file
        this.rowsAffected = result.rowsAffected
        this.writeAllFiles()
      }
      request.on('done', onDone)


    })

    const onSqlError = (err: any) => {
      dbConn.close()
      dbConn.removeListener('error', onSqlError)
      log.error('Error running sql query.', this.dataSource, err)
      this.callback(
        {success: false, error: err},
        this.dataSource
      )
    }
    dbConn.on('error', onSqlError)


  }

}
