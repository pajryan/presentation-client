<template>
  <div>
    <div class="qa">
      <p style="font-weight: bold">Data QA: </p>

      <div v-for="(rh, i) in resultHandlers" :key="'result-' + i" class="qaHolder">
        <b>{{rh.filename}}</b>
        <ul v-if="!rh.qa || (!rh.qa.asOfDateField && (!rh.qa.sparkPlusMetadataOnFields || rh.qa.sparkPlusMetadataOnFields.length < 1) && (!rh.qa.scripts || rh.qa.scripts.length < 1))">
          <li>No QA defined for this file</li>
        </ul>
        <table v-if="rh.fullQaResults.length > 0">
          <thead>
            <tr>
              <th>field</th>
              <th>latest date</th>
              <th>trend</th>
              <th>latest</th>
              <th>min</th>
              <th>max</th>
              <th>median</th>
              <th>histogram</th>
            </tr>
          </thead>
          <tr v-for="(fullQa, i) in rh.fullQaResults" :key="'fullqa-'+i">
            <td style="font-weight: bold">{{fullQa.fieldName}}</td>
            <td>{{dateFormat(fullQa.endDate)}}</td>
            <td><span v-html="fullQa.sparklineSvg"></span></td>
            <td class="rt">{{fullQa.latestValue}}</td>
            <td class="rt">{{fullQa.minValue}}</td>
            <td class="rt">{{fullQa.maxValue}}</td>
            <td class="rt">{{fullQa.medianValue}}</td>
            <td><span v-html="fullQa.histogramSvg"></span></td>
          </tr>
        </table>
        <ul>
          <li v-for="(qaMessage, i) in rh.qaMessages" :key="'qamessage-'+i">
            {{qaMessage.label}}: <span v-html="qaMessage.value"></span>
          </li>
        </ul>

      </div>

    </div>
  </div>
</template>



<script>
  import Vue from 'vue'
  import {mapGetters} from 'vuex'
  import fs from 'fs'
  import path from 'path'
  import log from 'electron-log'
  const d3 = require('d3')

  import {DataQualityControlScripts} from './dataQualityControlScripts'

  export default {
    props: ['dataSource'],

    data() {
      return {
        resultHandlers: [],
        dateFormat: d3.timeFormat('%b%d,%Y'),
        asOfDate: undefined
      }
    },
    mounted() {
      // goal here is to run the various QA queries and report back results
      //  all it needs is a datasource. It grabs the flat files (assumes they exist), and runs the qa
      //  want to have a nested structure to show the file, then the qa
      this.resultHandlers = this.dataSource.resultHandling.map( rh => ({
        filename: rh.filename,  // the filename for this result handler
        qa: rh.qa,              // the qa object from dataSourceConfig.json for this result handler
        qaMessages: [],         // will put array of qa messages for this file here (results of function calls)
        fullQaResults: []       // will put array of "fullQaResults" (sparkline, min, max etc) here
      }))

      this.resultHandlers.forEach(rh => {
        if (rh.qa) {
          const data = JSON.parse(fs.readFileSync(path.join(this.fullAppDataStoreDirectoryPath, rh.filename)))
          const qaObj = new DataQualityControlScripts(data, rh)
          rh.qaMessages = rh.qa.scripts ? qaObj.runQaFunctions() : []
          rh.fullQaResults = rh.qa.sparkPlusMetadataOnFields ? qaObj.runStandardQaItems() : []
        }
      })

    },
    computed: {
      ...mapGetters({
          fullAppDataStoreDirectoryPath: 'fullAppDataStoreDirectoryPath'
        })
    },
    methods: {

    }
  }


  
</script>

<style scoped lang="scss">
  /deep/ *{
    font-size: 0.95em
  }

  /deep/ .qa{
    margin-left: 14px;
    background: #f7f7f7;
    padding: 10px;
    border-radius: 5px;
  }

  /deep/ .qaHolder{
    border-top: 1px solid #333;
    margin-top: 22px;
  }
  /deep/ .qaHolder table{
    margin-left: 20px;
  }

  /deep/ .qaHolder ul{
    margin-top: 5px;
    margin-left:0px;
  }

  /deep/ svg path.line{
    fill: none;
    stroke: #000
  }
  /deep/ svg text{
    fill: #000
  }

  /deep/ svg rect{
    fill:#000;
  }

  /deep/ table{
    width: 95%;
  }
  /deep/ th, /deep/ td{
    padding: 1px 3px
  }
  /deep/ td{
    border: 1px solid #ccc;
  }
  /deep/ td.rt{
    text-align: right
  }
</style>