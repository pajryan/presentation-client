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
          <div class="progress" style="margin-bottom: 30px;">
            <div id="generateDataProgressBarSuccess" class="progress-bar progress-bar-striped  bg-success progress-bar-animated" role="progressbar" :style="{width: dataUpdateProgressSuccess + '%'}" aria-valuenow="50" aria-valuemin="0" aria-valuemax="100"></div>
            <div id="generateDataProgressBarFail" class="progress-bar progress-bar-striped  bg-danger progress-bar-animated" role="progressbar" :style="{width: dataUpdateProgressFail + '%'}" aria-valuenow="50" aria-valuemin="0" aria-valuemax="100"></div>
          </div>
        
        
        <div v-for="dataSource in dataSources" class="dataSource"  :key="dataSource.index">
          <GenerateDataForOneDataSourceUI 
            :itemDataSourceConfig="dataSource"
            :showOtherComponentsThatUseThisData = "true"
            :autoRun = "runDataSource"
            v-on:dataRunComplete = "oneDataRunComplete"
          />
            <!-- props: ['componentIndex', 'itemDataSourceConfig', 'showOtherComponentsThatUseThisData', 'adminObj', 'pageItems', 'state'],  -->




         <!-- 
          <button type="button" class="btn btn-primary btn-sm" @click="queryAndWriteOneDataSource(dataSource)" :disabled="dataSource.isRunning">run</button>
          <label>{{ dataSource.name }}</label>
          < !- - messages - - >
          <label :hidden="dataSource.successMsg==null"  class="alert alert-success"><span v-html="dataSource.successMsg"></span></label>
          <label :hidden="dataSource.errorMsg==null"  class="alert alert-danger">{{ dataSource.errorMsg }}</label>
          < !- - parameters - - >
          <div v-for="parameter in dataSource.sqlParameters" class="dataSourceParameter"  :key="parameter.index">
            <label>{{ parameter.label }}</label>
            <input v-model="parameter.value" />
          </div>
          < !- - components that use this dataSource - - >
          <p class="relatedComponentsLink" @click="dataSource.isExpanded = !dataSource.isExpanded">show/hide related components</p>
          <div v-if="dataSource.isExpanded" class="relatedComponents alert alert-primary">
            Components <b>in the active presentation</b> that use this data:
            <ol v-if="activePresentationComponents.filter(c => c.type.data.find(f => f===dataSource.name)).length>0">
              <li v-for="component in activePresentationComponents.filter(c => c.type.data.find(f => f===dataSource.name))" :key="component.index">
                {{component.type.component}} (section {{component.sectionIndex + 1}}, page {{component.pageIndex + 1}})
              </li>
            </ol>
            <ul v-else>
              <li><i>none found. (but could be in other presentations!)</i></li>
            </ul>
          </div>
        -->

          
        </div>
      </div>

    </div> 
      
</template>




<script>
  import Vue from 'vue'
  import {mapGetters} from 'vuex'
  // import * as admin from '@/appComponents/admin/adminFunctions.ts'
  import dataSourceConfig from '@/configuration/dataSourceConfig.json'
  import dataSourceConfigSchema from '@/configuration/dataSourceConfigSchema.json'
  // import {QueryRunnerFileWriter} from '@/appComponents/admin/generateData/queryRunnerFileWriter.ts'
  import GenerateDataForOneDataSourceUI from './generateDataForOneDataSourceUI.vue'

  import log from 'electron-log'
  import jquery from 'jquery'
  const $ = jquery
  import 'bootstrap-datepicker'


  import path from 'path'
  import { setTimeout } from 'timers'

  const validate = require('jsonschema').validate

  export default {
    components: {
      GenerateDataForOneDataSourceUI
    },
    data() {
      return {
        globalInputs: dataSourceConfig.globalInputs,
        dataSources: dataSourceConfig.dataSources,
        isRunningAllQueries: false,
        dataConfigValidationErrors: [],
        runDataSource: false,
        runAllQueriesCount: 0,
        runAllQueriesSuccessCount: 0,
        runAllQueriesFailCount: 0,
        dataUpdateProgressSuccess: 0,
        dataUpdateProgressFail: 0
      }
    },
    computed: {
      ...mapGetters({
          fullAppDataStoreDirectoryPath: 'fullAppDataStoreDirectoryPath'
        })
    },
    mounted() {
      // be sure the dataSourceConfig validates
      this.dataConfigValidationErrors = validate(dataSourceConfig, dataSourceConfigSchema).errors

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
        todayBtn: 'linked'
      })

    },


    methods: {
      queryAndWriteAllDataSources() {
        this.runAllQueriesCount = 0
        this.dataUpdateProgressSuccess = 0
        this.runAllQueriesSuccessCount = 0
        this.dataUpdateProgressFail = 0
        this.runAllQueriesFailCount = 0
        this.runDataSource = true // changing this triggers the queries to run in the subcomponent
        this.isRunningAllQueries = true

        document.getElementById('generateDataProgressBarSuccess').classList.add('progress-bar-animated')
        document.getElementById('generateDataProgressBarFail').classList.add('progress-bar-animated')
      },

      // subcomponent emits event when data is run that gets us here.  We should *always* get here (failed or not)
      //  this allows us to re-enable the 'run all' button.
      //  but we can check the status of each request, so can provide top-level feedback
      oneDataRunComplete(completedDataSource) {
        this.runAllQueriesCount++
        // update the progress bar
        if (completedDataSource.succeeded) {
          this.runAllQueriesSuccessCount++
          this.dataUpdateProgressSuccess = 100 * this.runAllQueriesSuccessCount / this.dataSources.length
          document.getElementById('generateDataProgressBarSuccess').innerHTML = this.runAllQueriesSuccessCount
        } else {
          this.runAllQueriesFailCount++
          this.dataUpdateProgressFail = 100 * this.runAllQueriesFailCount / this.dataSources.length
          document.getElementById('generateDataProgressBarFail').innerHTML = this.runAllQueriesFailCount
          log.info('FAILED running datasource', completedDataSource.name)
        }


        // if complete, reset, allowing the "run everything" button to be clicked again
        if (this.runAllQueriesCount === this.dataSources.length) {
          this.runDataSource = false
          this.isRunningAllQueries = false
          document.getElementById('generateDataProgressBarSuccess').classList.remove('progress-bar-animated')
          document.getElementById('generateDataProgressBarFail').classList.remove('progress-bar-animated')
        }
      }

    }
  }


</script>

<style scoped lang="scss">
  #globalVariableHolder{
    margin-bottom: 40px;
  }

  .progress{
    height: 20px;
  }

  .progress-bar{
    font-weight: bold;
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