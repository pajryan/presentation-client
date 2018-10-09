'use strict'
// const sql = require('mssql').default
// import { ConnectionPool } from 'mssql'
// const sql = require('mssql').default

// import sql from 'mssql'
import { config } from 'mssql'
const pwd = require('../../../configuration/PASSWORDS.json')
import path from 'path'
import fs from 'fs'
import log from 'electron-log'
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

interface DataSource {
  isStoredProcedure: boolean
  sqlString: string
  sqlParameters: any[]
  resultHandling: any[]
}

export interface QueryRunnerFileWriter {
  dataSource: DataSource
  _state: any
  callback: CallbackFunc
  filesWritten: number
  results: any[]
  rowsAffected: any
  recordCount: number

}

export class QueryRunnerFileWriter {
  private sql = require('mssql')
  constructor(dataSource: DataSource, state: any, callback: CallbackFunc) {

    this.dataSource = dataSource
    this._state = state
    this.callback = callback

    this.filesWritten = 0

    this.results = []  // this is an ARRAY of ARRAYS to support multiple recordsets
    this.rowsAffected = null  // contains some metadata about row counts etc
    this.recordCount = -1

    this.run()
  }

  // iteratively write each file (asynchronous, but doing one at a time.)
  writeAllFiles(currFileIndex = this.filesWritten) {
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
    // might want to consider providing a way to backup existing data? (If I do that, I might as well expose it to the user so they can backup before updating their data??)

    const appDataPath = path.join(this._state.appPath, this._state.appDataStorePath)

    if (!filename) {
      log.error('Error writing data file. Got results, but found no filename. Maybe this returned more results than expected?.  Check this: ', this.dataSource)
      fileCallback('Error writing data file. Got results, but found no filename')
    }

    fs.writeFile(path.join(appDataPath, filename), JSON.stringify(data, null, '\t'), (err: any) => {
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
    const dbConn = new this.sql.ConnectionPool(config)
    dbConn.connect((err: any) => {

      const request = new this.sql.Request()
      request.stream = true               // You can set streaming differently for each request

      // stored procedure
      if (this.dataSource.isStoredProcedure) {
        log.error('TODO, need to handle parameters to SP.')
        request.execute(this.dataSource.sqlString)
      } else {
        let sqlstring = this.dataSource.sqlString
        // parameters
        this.dataSource.sqlParameters.forEach((p, i) => {
          const paramReplace = '{' + (i + 1) + '}'
          sqlstring = sqlstring.replace(paramReplace, p.value)
        })
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
        log.log('events on request', request.eventNames())

        this.sql.close()
        // sql.removeListener('error', onSqlError);

        // console.log('result', this.results ) // careful showing the results. Can massively slow the app.
        // write the results to a file
        this.rowsAffected = result.rowsAffected
        this.writeAllFiles()
      }
      request.on('done', onDone)


    })

    const onSqlError = (err: any) => {
      this.sql.close()
      this.sql.removeListener('error', onSqlError)
      log.error('Error running sql query.', this.dataSource, err)
      this.callback(
        {success: false, error: err},
        this.dataSource
      )
    }
    this.sql.on('error', onSqlError)


  }

}
