<template>
  <div>
    <div id="metadata">
      <p>Data File: {{$route.params.dataFileName}}</p>
      <table v-if="this.dataFileContents !== undefined">
         <!-- v-if="this.dataFileContents && this.dataFileContents.metadata" -->
        <tr><td>data creation:</td><td>{{this.dataFileContents.metadata.runTime}}</td></tr>
        <tr><td>query used:</td><td>{{this.dataFileContents.metadata.query}}</td></tr>
        <tr><td>file location:</td><td>{{dataPath}}</td></tr>
      </table>
    </div>

    <table v-if="fieldNames.length > 0" id="dataTable">
      <thead>
        <tr>
          <td v-for="(field, i) in fieldNames" :key="'key-'+i">{{field}}</td>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, r) in this.dataFileContents.data" :key="'row-' + r">
          <td v-for="(field, f) in fieldNames" :key="'cell-' + f + r">
            {{row[field]}}
          </td>
        </tr>
      </tbody>
     </table>
    {{this.dataFileContents}}
  </div>
</template>


<script>

import { mapState, mapGetters } from 'vuex' // import state
import path from 'path'
import fs from 'fs'

export default{
  // props: ['dataFileName'],
  components: {},
  data() {
    return {
      dataPath: '',
      filename: '',
      dataFileContents: undefined,
      // data: [],
      fieldNames: []
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

    this.dataFileContents = JSON.parse(fs.readFileSync(this.dataPath, 'utf8'))
    this.data = this.dataFileContents.data

    this.fieldNames = Object.keys(this.dataFileContents.data[0])

  },
  methods: {
    // empty
  }
}


</script>

<style scoped lang="scss">
  div{
    padding: 20px;
  }
  p{
    font-weight: bold;
  }
  table{
    border-collapse: collapse;
    margin-left: 10px;
    margin-right: 10px;
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

  tbody{
    overflow: scroll;
  }

  #metadata{
    background: #666;
    color: #fff;
  }

  #dataTable{
    margin-top: 20px;
    min-width: 98%
  }

  #dataTable thead td{
    font-weight: bold;
  }
</style>
