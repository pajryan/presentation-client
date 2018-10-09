'use strict'
/* tslint:disable */
const sql = require('mssql')
const pwd = require('../../../../PASSWORDS.json')
const path = require('path');
const fs = require('fs')

// const qa = require('./dataQualityControlScripts')

const events = require('events');
let ee = events.EventEmitter;

const config = {
  user: pwd.databaseUsername, 
  password: pwd.databasePassword, 
  server: pwd.databaseServer,
  // database: '...',

  options: {
      encrypt: false // Use this if you're on Windows Azure
  }
}


module.exports = class QueryRunnerFileWriter {

  constructor(dataSource, _state, callback){

    this.dataSource = dataSource;
    this._state = _state;
    this.callback = callback;

    this.filesWritten = 0;

    this.results = [];  // this is an ARRAY of ARRAYS to support multiple recordsets
    this.rowsAffected;  //contains some metadata about row counts etc
    this.recordCount = -1;

    this.run();
  }

  // iteratively write each file (asynchronous, but doing one at a time.)
  writeAllFiles(currFileIndex = this.filesWritten){
    let filename = this.dataSource.resultHandling[currFileIndex].filename;
    this.writeOneFile(this.results[currFileIndex], filename, (err) => {
      if(err){
        this.filesWritten = 0;
        this.callback(
          {success: false, error: err},
          this.dataSource
        )
      }else{
        if(this.filesWritten < this.results.length){
          this.writeAllFiles(this.filesWritten++)
        }else{
          let finalFileCount = this.filesWritten;
          this.filesWritten = 0;
          this.callback(
            {success: true, result: this.rowsAffected, filesWritten: finalFileCount},
            this.dataSource
          )
        }
      }
      
    })

  }

  // write one file
  writeOneFile(data, filename, fileCallback){
    // going to write straight to my own _data directory (so that pictures are immediately updated)
    // might want to consider providing a way to backup existing data? (If I do that, I might as well expose it to the user so they can backup before updating their data??)

    let appDataPath = path.join(this._state.appPath, this._state.appDataStorePath);

    if(!filename){
      console.error('Error writing data file. Got results, but found no filename. Maybe this returned more results than expected?.  Check this: ', this.dataSource)
      fileCallback('Error writing data file. Got results, but found no filename')
    }

    fs.writeFile(path.join(appDataPath, filename), JSON.stringify(data, null, '\t'), err => {
      if(err){
        console.error('error writing file ' + filename, err)
        fileCallback(err)
      }else{
        fileCallback()
      }
    });

  }


  // run the query
  run(){

    sql.connect(config, err => {
   
      const request = new sql.Request()
      request.stream = true               // You can set streaming differently for each request

      // stored procedure
      if(this.dataSource.isStoredProcedure){
        console.error('TODO, need to handle parameters to SP.')
        request.execute(this.dataSource.sqlString) 
      }else{
        let sqlstring = this.dataSource.sqlString
        // parameters
        this.dataSource.sqlParameters.forEach((p, i) => {
          let paramReplace = "{" + (i+1) + "}";
          sqlstring = sqlstring.replace(paramReplace, p.value)
        })
        request.query(sqlstring)
      }
      
      let onRecordset = (columns) => {  // Emitted once for each recordset in a query
        this.recordCount++;
        this.results[this.recordCount] = [];  // initialize an array for this record set
      }
      request.on('recordset', onRecordset)

   
      let onRow = (row) => {  // Emitted for each row in a recordset
        this.results[this.recordCount].push(row)
      }
      request.on('row', onRow)
   
      let onError = (err) => {  // May be emitted multiple times
        console.error('error', err)
        // request.removeListener('recordset', onRecordset);
        // request.removeListener('row', onRow);
        // request.removeListener('error', onError);
        // request.removeListener('done', onDone);
        // sql.removeListener('error', onSqlError);
        this.callback(
          {success: false, error: err},
          this.dataSource
        )
      }
      request.on('error', onError)
   

      let onDone = (result) => {  // ALWAYS emitted as the last one. result contains # of records etc.
        request.removeListener('recordset', onRecordset);
        request.removeListener('row', onRow);
        request.removeListener('error', onError);
        request.removeListener('done', onDone);
        

        console.log('---------------------')
        console.log('events on request', request.eventNames())

        sql.close();
        // sql.removeListener('error', onSqlError);

        // console.log('result', this.results ) // careful showing the results. Can massively slow the app.
        // write the results to a file
        this.rowsAffected = result.rowsAffected;
        this.writeAllFiles();


        // NOTE NOTE I'm just adding the qa thing here to see how it'll work.
        //  If I stick with something like this, it'll have to return something to the UI
        // let qaResult = new qa(this.results, this.dataSource)
      }
      request.on('done', onDone)


    })
    
    let onSqlError = (err) => {
      sql.close();
      sql.removeListener('error', onSqlError);
      console.error('Error running sql query.', this.dataSource, err)
      this.callback(
        {success: false,error: err},
        this.dataSource
      )
    }
    sql.on('error', onSqlError)





  }


  
 
  




}