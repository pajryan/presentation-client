<template>
    <div>
      <p>Use this section to generate new data files to be used in the presentation</p>
      <ol>
        <li>generate the data locally</li>
        <li>review the tablet to confirm everything looks good</li>
        <li>push the data to the server</li>
        <li>alert the users (email) that new data is available</li>
      </ol>

      <div v-if="dataConfigValidationErrors.length>0"  class="alert alert-danger">
        <p> The data source configuration has validation problems:</p>
        <ul>
          <li v-for="err in dataConfigValidationErrors" :key="err.index">{{err.property}} ("{{err.instance}}") {{err.message}} </li>
        </ul>
      </div>

      <ol style="color: red">
        <li>ALL DATA MUST HAVE AN END DATE! (so we can reproduce data; a compliance requirement)</li>
        <li>Need to decide where to write these files. Currenly writing directly to the data dirctory (so pictures are update immediately). But maybe they need to get somewhere else?  On the other hand, maybe archiving takes care of this?</li>
        <li>Would be nice to click from a data file to the pictures that use it...</li>
        <li>Separately - should have a QC deck built in here that 1) has custom QC charts.  2) has all the 'live' pictures</li>
        <li>Each entry should have some QC attached to it (need to think about this)</li>
      </ol>

      <hr />

      <div id="globalVariableHolder">
        <h4>Global Variables</h4>
        <div v-for="globalInput in globalInputs" class=""  :key="globalInput.index">
          <label>{{ globalInput.label }}</label>

          <!-- can get a type of datetime, string, int, or float -->
          <input v-if="globalInput.type=='datetime'" type='text' :id="globalInput.referenceId" class="datePicker" />
          <input v-else-if="globalInput.type=='int'" type='text' :id="globalInput.referenceId" :value="globalInput.defaultValue" />
          <input v-else-if="globalInput.type=='float'" type='text' :id="globalInput.referenceId" :value="globalInput.defaultValue" />
          <input v-else type='text' :id="globalInput.referenceId" :value="globalInput.defaultValue" />
        </div>
      </div>


      <div id="dataSourceHolder">
        <h4>
          Data Sources
          &nbsp;&nbsp;
          <button type="button" class="btn btn-primary btn-sm" @click="queryAndWriteAllDataSources()" :disabled="isRunningAllQueries" >run everything</button>
        </h4>
        
        <div v-for="dataSource in dataSources" class="dataSource"  :key="dataSource.index">
          <button type="button" class="btn btn-primary btn-sm" @click="queryAndWriteOneDataSource(dataSource)" :disabled="dataSource.isRunning">run</button>
          <label>{{ dataSource.name }}</label>
          <!-- messages -->
          <label :hidden="dataSource.successMsg==null"  class="alert alert-success"><span v-html="dataSource.successMsg"></span></label>
          <label :hidden="dataSource.errorMsg==null"  class="alert alert-danger">{{ dataSource.errorMsg }}</label>
          <!-- parameters -->
          <div v-for="parameter in dataSource.sqlParameters" class="dataSourceParameter"  :key="parameter.index">
            <label>{{ parameter.label }}</label>
            <input v-model="parameter.value" />
          </div>
          <!-- components that use this dataSource -->
          <p class="relatedComponentsLink" @click="dataSource.isExpanded = !dataSource.isExpanded">show/hide related components</p>
          <div v-if="dataSource.isExpanded" class="relatedComponents alert alert-primary">
            Components <b>in the active presentation</b> that use this data:
            <ol v-if="activePresentationComponents.filter(c => c.data.find(f => f===dataSource.name)).length>0">
              <li v-for="component in activePresentationComponents.filter(c => c.data.find(f => f===dataSource.name))" :key="component.index">
                {{component.component}}
              </li>
            </ol>
            <ul v-else>
              <li><i>none found. (but could be in other presentations!)</i></li>
            </ul>
          </div>
          
        </div>
      </div>

    </div> 
      
</template>




<script>
  /* tslint:disable */
  import Vue from 'vue'
  import dataSourceConfig from './dataSourceConfig.json'
  import dataSourceConfigSchema from './dataSourceConfigSchema.json'
  import queryRunnerFileWriter from './queryRunnerFileWriter.js'
  import jquery from 'jquery'
  let $ = jquery
  import 'bootstrap-datepicker'

  import path from 'path'

  var validate = require('jsonschema').validate;

  export default {
    props: ['adminObj'], 

    data () {
      return {
        shown: false,
        globalInputs: dataSourceConfig.globalInputs,
        dataSources: dataSourceConfig.dataSources,
        runAllQueriesCount: 0,
        isRunningAllQueries: false,
        dataConfigValidationErrors: [],
        activePresentationComponents: []
      }
    },
    mounted () {
      // be sure the dataSourceConfig validates
      console.log('VALIDATION', validate(dataSourceConfig, dataSourceConfigSchema))
      this.dataConfigValidationErrors = validate(dataSourceConfig, dataSourceConfigSchema).errors;
      

      this.dataSources.forEach(d => {
        // use Vue.set to add new keys (https://vuejs.org/2016/02/06/common-gotchas/)
        Vue.set(d, 'isRunning', false)
        Vue.set(d, 'attempted', false)
        Vue.set(d, 'succeeded', false)

        Vue.set(d, 'successMsg', null)
        Vue.set(d, 'errorMsg', null)
        Vue.set(d, 'isExpanded', false)

      })

      // build the datepickers (https://uxsolutions.github.io/bootstrap-datepicker/)
      $('.datePicker').datepicker({
        daysOfWeekHighlighted: '5',  // highlight fridays
        autoclose: true,
        todayHighlight: true,
        todayBtn: "linked"
      });

      // capture the components used in the active presentation. We'll try to open these up later.
      this.activePresentationComponents = this.adminObj.getActivePresentationItemOfType('component');

    },
    

    methods: {
      /*
        Important Note: 
          Because some data might be quite large, I'm NOT going to return results here (just metadata)
          Instead, will STREAM the result of the query straight to a file.  This makes things a little harder to debug, but will ultimately be required due to the data

          Hang on... problem: if the files are too big to write - how will I be able to read them to generate a picture ..? 
          Maybe I should deal with file size HERE rather than in the various components that consume files...

          OK - going with this for now: will return results here as a json object and write to a file.
          It's simpler, and forces me to deal with file-size (memory) issues when I create the file (thereby not having to deal with it when I consume the files)
      */
      queryAndWriteOneDataSource (dataSource, callback = this.runResult) {
        dataSource.isRunning=true;
        dataSource.attempted=true;
        dataSource.successMsg = null;
        dataSource.errorMsg = null;
        console.log('running dataSource with', dataSource)
        let qr = new queryRunnerFileWriter(dataSource, this.adminObj.state(), callback)
      },

      // probably don't want to actually return all the results... could be huge
      runResult (result, dataSource){ // result is an object of {success:true, results:..., filesWritten:...} or {success:false, err: error}
        dataSource.isRunning = false;
        console.log('datasource', dataSource)
        // we get here even if we've had an error. So check that the error message hasn't already been populated
        if(result.success && dataSource.errorMsg == null){
          dataSource.succeeded = true;
          dataSource.successMsg = 'received ' + result.result.length + ' record set(s), with a total of ' + result.result.reduce((p,c) => p + c)+ ' records. Wrote ' + result.filesWritten + ' file(s) ';
          dataSource.resultHandling.forEach(rh => {
            let filename = rh.filename;
            dataSource.successMsg += ' : <a href="file://'+path.join(this.adminObj.getAppDataPath(), filename)+'" target="_blank">'+filename+'</a> '
          })
        }else if(result.error != null){
          dataSource.errorMsg = 'error: ' + result.error
        }

      },


      queryAndWriteAllDataSources (currQuery = this.runAllQueriesCount) {
        this.isRunningAllQueries = true;
        this.queryAndWriteOneDataSource(this.dataSources[currQuery], (result, dataSource) => {
          this.runResult(result, dataSource);
          if(this.runAllQueriesCount < this.dataSources.length){
            this.queryAndWriteAllDataSources(this.runAllQueriesCount++);
          }else{
            this.runAllQueriesCount = 0;
            this.isRunningAllQueries = false;
          }
        })
      }


      
    }
  }


  
</script>

<style scoped lang="scss">
  #globalVariableHolder{
    margin-bottom: 40px;
  }

  .dataSource{
    padding: 4px 10px 4px 20px;
    border-bottom: 1px solid #ccc;
  }

  .dataSource label{
    font-weight: bold;
    padding-left: 15px;
    padding-top: 3px;
    padding-bottom: 5px;
    padding-right: 10px;
  }

  .dataSource .alert{
    margin-bottom: 0 !important;
    font-weight: normal;
  }

  .dataSourceParameter label{
    margin-left: 63px;
    font-weight: normal;
    width: 250px;

  }


  .relatedComponentsLink{
    color: #008edc;
    cursor: pointer;
    font-size: 0.8em;
    text-align: right;
  }

  .relatedComponents{
    margin-left: 64px;
  }
  
</style>