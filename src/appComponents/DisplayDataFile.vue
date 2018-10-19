<template>
  <div id="wrap">
    <div id="metadata">
      <p>Data File: {{$route.params.dataFileName}}</p>
      <table v-if="dataFileContentsJson !== undefined">
         <!-- v-if="this.dataFileContentsJson && this.dataFileContentsJson.metadata" -->
        <tr><td>data creation:</td><td>{{dataFileContentsJson.metadata.runTime}}</td></tr>
        <tr><td>query used:</td><td><textarea v-model="formattedSql"></textarea></td></tr>
        <tr><td>rows returned:</td><td>{{dataFileContentsJson.data.length}}</td></tr>
        <tr><td>file location:</td><td>{{dataPath}}</td></tr>
      </table>
    </div>

    <ul class="nav nav-tabs" id="tabNavs" role="tablist">
      <li class="nav-item">
        <a class="nav-link active" id="home-tab" data-toggle="tab" href="#home" role="tab" aria-controls="home" aria-selected="true">Table</a>
      </li>
      <li class="nav-item">
        <a class="nav-link" id="profile-tab" data-toggle="tab" href="#profile" role="tab" aria-controls="profile" aria-selected="false">JSON</a>
      </li>
      <li class="nav-item">
        <a class="nav-link"  href="#contact" @click="generateCSV">CSV</a> <!-- id="contact-tab" role="tab" data-toggle="tab" aria-controls="contact" aria-selected="false"  -->
      </li>
    </ul>
    <div class="tab-content" id="tabNavsContent">
      <div class="tab-pane fade show active" id="home" role="tabpanel" aria-labelledby="home-tab">
        <table v-if="fieldNames.length > 0" id="dataTable">
          <thead>
            <tr>
              <td v-for="(field, i) in fieldNames" :key="'key-'+i" class="dataTableHeader" @click="sortBy(field)"><span style="color:#666">&#8597;</span> {{field}} </td>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, r) in this.dataFileContentsJson.data" :key="'row-' + r">
              <td v-for="(field, f) in fieldNames" :key="'cell-' + f + r">
                {{row[field]}}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="tab-pane fade" id="profile" role="tabpanel" aria-labelledby="profile-tab"><textarea v-model="dataFileContentsString"></textarea></div>
      <!-- <div class="tab-pane fade" id="contact" role="tabpanel" aria-labelledby="contact-tab">csv</div> -->
    </div>
  </div>
</template>

<script>

import { mapState, mapGetters } from 'vuex' // import state
import path from 'path'
import fs from 'fs'
import sqlFormatter from 'sql-formatter'
const d3 = require('d3')
const dataSourceConfig = require('@/configuration/dataSourceConfig')

// for downloading
const elerem = require('electron').remote
const dialog = elerem.dialog
const app = elerem.app
const json2csv = require('json2csv').parse


export default{
  // props: ['dataFileName'],
  components: {},
  data() {
    return {
      dataPath: '',
      filename: '',
      dataFileContentsString: '',
      dataFileContentsJson: undefined,
      // data: [],
      fieldNames: [],
      formattedSql: '',
      sortToggle: false
    }
  },
  computed: {
    ...mapGetters({
      fullAppDataStoreDirectoryPath: 'fullAppDataStoreDirectoryPath'
    })
  },
  mounted() {
    // empty
    this.filename = this.$route.params.dataFileName
    this.dataPath = path.join(this.fullAppDataStoreDirectoryPath, this.filename)

    this.dataFileContentsString = fs.readFileSync(this.dataPath, 'utf8')
    this.dataFileContentsJson = JSON.parse(this.dataFileContentsString)
    this.data = this.dataFileContentsJson.data
    this.formattedSql = sqlFormatter.format(this.dataFileContentsJson.metadata.query)

    this.fieldNames = Object.keys(this.dataFileContentsJson.data[0])

  },
  methods: {
    sortBy(field) {
      // determine field type (date, string, number)
      const sample = this.dataFileContentsJson.data[0][field]

      this.sortToggle = !this.sortToggle

      if (isNaN(sample)) {
        // string or date

        // check for date
        const dateFormat = d3.utcParse(dataSourceConfig.metadata.dbDateFormat)
        const asDate = dateFormat(sample)
        if (asDate && typeof asDate.getMonth === 'function') {
          // date
          this.dataFileContentsJson.data.sort((a, b) =>
              this.sortToggle ? dateFormat(b[field]) - dateFormat(a[field]) : dateFormat(a[field]) - dateFormat(b[field])
            )

        } else {
          // string
          const reA = /[^a-zA-Z]/g
          const reN = /[^0-9]/g
          this.dataFileContentsJson.data.sort((a, b) => {
            // this one line will simply alpha sort ...
            // return this.sortToggle ? ('' + a[field].attr).localeCompare(b[field].attr, 'en', { numeric: true }) : ('' + b[field].attr).localeCompare(a[field].attr, 'en', { numeric: true })
            // .. but this will sort alphanumerics (common in financial data)
              const AInt = parseInt(a[field], 10)
              const BInt = parseInt(b[field], 10)

              if (isNaN(AInt) && isNaN(BInt)) {
                const aA = a[field].replace(reA, '')
                const bA = b[field].replace(reA, '')
                if (aA === bA) {
                  const aN = parseInt(a[field].replace(reN, ''), 10)
                  const bN = parseInt(b[field].replace(reN, ''), 10)
                  return aN === bN ? 0 : aN > bN ? (this.sortToggle ? 1 : -1) : (this.sortToggle ? -1 : 1)
                } else {
                  return aA > bA ? (this.sortToggle ? 1 : -1) : (this.sortToggle ? -1 : 1)
                }
              } else if (isNaN(AInt)) { // A is not an Int
                return this.sortToggle ? 1 : -1 // to make alphanumeric sort first return -1 here
              } else if (isNaN(BInt)) { // B is not an Int
                return this.sortToggle ? -1 : 1 // to make alphanumeric sort first return 1 here
              } else {
                return AInt > BInt ? (this.sortToggle ? 1 : -1) : (this.sortToggle ? -1 : 1)
              }
            }

          )
        }

      } else {
        // number
        this.dataFileContentsJson.data.sort((a, b) =>
          this.sortToggle ? parseFloat(b[field]) - parseFloat(a[field]) : parseFloat(a[field]) - parseFloat(b[field])
        )
      }

    },

    generateCSV() {
      // prompt user for download location
      const filename = this.$route.params.dataFileName.replace('.json', '.csv')
      const toLocalPath = path.resolve(app.getPath('downloads'), filename)
      const userChosenPath = dialog.showSaveDialog({ defaultPath: toLocalPath })
      if (userChosenPath) {
        // create and save CSV
        const jsonData = json2csv(this.dataFileContentsJson.data)
        fs.writeFileSync(userChosenPath, jsonData, 'utf8')
      }
    }
  }
}


</script>

<style scoped lang="scss">
  #wrap{
    height: 100%;
    display: flex;
    flex-flow: column;
  }
  #wrap, #metadata{
    padding: 20px;
  }
  p{
    font-weight: bold;
  }

  .nav{
    margin-top: 20px;
    font-size: 0.8em;
    height: 35px;
  }

  .tab-content{
    flex: 1;
    overflow: scroll;
    border-left: 1px solid #dee2e6;
    border-right: 1px solid #dee2e6;
    border-bottom: 1px solid #dee2e6;
    background: #fff;
    padding: 10px;
    font-size: 0.8em;
    display: flex;
  }

  .tab-pane{
    flex: 1;
  }

  

  table{
    border-collapse: collapse;
    margin-left: 10px;
    margin-right: 10px;
  }

  .dataTableHeader{
    cursor: pointer;
  }
  .dataTableHeader:hover{
    background: #dee2e6;
  }

  table#dataTable{
    display: flex;
    flex-flow: column;
    height: 95%;
  }

  table#dataTable tr{
    display:flex;
  }
  table#dataTable td{
    flex: 1;
    border-top: 0;
  }
  table#dataTable tbody{
    overflow: scroll;
    flex: 1
  }

  td{
    font-size: 0.8em;
    padding: 4px !important;
    line-height: 0.9em;
    border-top: 1px solid #ccc;
    border-bottom: 1px solid #ccc;
  }
  tr td:first-child{
    width: 100px;
  }

  #metadata{
    background: #666;
    color: #fff;
  }
  #metadata table{
    width: 98%;
  }
  #metadata textarea{
    color: #fff;
    min-height: 94px;
    background: #666;
  }

  #dataTable{
    margin-top: 20px;
    min-width: 98%
  }

  textarea{
    width: 100%;
    border: 0;
    height: 100%;
  }

  #dataTable thead td{
    font-weight: bold;
  }
</style>
