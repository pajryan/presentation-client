<template>
    <div class="oneDataUpdateComponent" style="padding-left: 6px;">
      <button type="button" class="btn btn-primary btn-sm" @click="queryAndWriteOneDataSource(dataSource)" :disabled="dataSource.isRunning">run</button>
      <label style="font-weight:bold; margin-left: 12px; padding-top: 4px;">{{ dataSource.name }}</label>

      <!-- parameters -->
      <div v-for="parameter in dataSource.sqlParameters" class="dataSourceParameter"  :key="parameter.index">
        <label>{{ parameter.label }}: </label>
        <input v-model="parameter.value" />
      </div>
      
      <!-- messages -->
      <div style="margin-left: 15px; margin-top: 10px;">
        <label :hidden="dataSource.successMsg==null"  class="alert alert-success" style="width: 100%"><span v-html="dataSource.successMsg"></span></label>
        <label :hidden="dataSource.errorMsg==null"  class="alert alert-danger" style="width: 100%">{{ dataSource.errorMsg }}</label>
      </div>

      <!-- qa component -->
      <dataQualityControlUI v-if="dataSource.succeeded" :dataSource="dataSource" />

      <!-- components that use this dataSource -->
      <div v-if="showOtherComponentsThatUseThisData">
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
      </div>

    </div>
</template>



<script>
  import Vue from 'vue'
  import {mapGetters} from 'vuex'
  import * as admin from '@/appComponents/admin/adminFunctions.ts'
  import {QueryRunnerFileWriter} from '@/appComponents/admin/generateData/queryRunnerFileWriter.ts'
  import log from 'electron-log'
  const dataSourceConfigImport = require('@/configuration/dataSourceConfig')
  const componentRunner = require('@/pageComponents/_componentRunner.js')

  import path from 'path'
  
  import dataQualityControlUI from './dataQualityControlUI.vue'

  export default {
    components: {
      dataQualityControlUI
    },

    // componentIndex is the index of the component on the page that this whole section is reponsible for updating. we'll use it when refreshing components
    props: [
      'itemDataSourceConfig', 'showOtherComponentsThatUseThisData',   // always used
      'autoRun',  // if true, component runs automatically (don't need to click the button) - this allows me to run from outside
      'pageItems', 'componentIndex' // used only when running from the page itself (I think - haven't authored yet)
    ],

    data() {
      return {
        dataSource: this.itemDataSourceConfig,
        activePresentationComponents: []
      }
    },
    computed: {
      ...mapGetters({
          fullAppDataStoreDirectoryPath: 'fullAppDataStoreDirectoryPath'
        })
    },
    watch: {
      /*tslint:disable*/
      autoRun: function(newValue, oldValue) { // DO NOT change this to an arrow function.  It changes the scope of "this". https://vuejs.org/v2/api/#watch
      /*tslint:enable*/
        if (newValue) {
          log.info('auto running dataSource item: ', this.dataSource.name)
          this.queryAndWriteOneDataSource(this.dataSource)
        }
      }
    },
    mounted() {
      // use Vue.set to add new keys (https://vuejs.org/2016/02/06/common-gotchas/)
      Vue.set(this.dataSource, 'isRunning', false)
      Vue.set(this.dataSource, 'attempted', false)
      Vue.set(this.dataSource, 'succeeded', false)

      Vue.set(this.dataSource, 'successMsg', null)
      Vue.set(this.dataSource, 'errorMsg', null)
      Vue.set(this.dataSource, 'isExpanded', false)

      // capture the components used in the active presentation. We'll try to open these up later.
      this.activePresentationComponents = admin.getActivePresentationItemOfType('component')

    },
    methods: {
      /*
        Important Note:
          Some data has the potential to be quite large. It's tempting to just manage large data by streaming directly to a file.
          However, the issue will simply arise later when trying to *load* that data to a component.

          So this dataGeneration WILL bring the data into memory (json object), then write that object to a file
          This allows me to capture "large data request problems" *here* rather than when a user tries to render that same data
      */
      queryAndWriteOneDataSource(dataSource, callback = this.runResult) {
        dataSource.isRunning = true
        dataSource.attempted = true
        dataSource.successMsg = null
        dataSource.errorMsg = null
        const qr = new QueryRunnerFileWriter(dataSource, callback)
      },


      // the result of running the queries and generating files
      runResult(result, dataSource) {
        dataSource.isRunning = false
        // we get here even if we've had an error. So check that the error message hasn't already been populated
        if (result.success && dataSource.errorMsg == null) {
          dataSource.succeeded = true
          dataSource.successMsg = 'received ' + result.result.length + ' record set(s), with a total of ' + result.result.reduce((p, c) => p + c) + ' records. Wrote ' + result.filesWritten + ' file(s) '
          dataSource.resultHandling.forEach(rh => {
            const filename = rh.filename
            const url = '/#/displayDataFile/' + filename    // use /displayDataFile route to open a new page to DisplayDataFile.vue
            dataSource.successMsg += ' : <a href="' + url + '" target="_blank">' + filename + '</a> <br />'
          })
        } else if (result.error != null) {
          dataSource.errorMsg = '' + result.error
        }

        this.$emit('dataRunComplete', this.dataSource)

        // would like to refresh the related component(s)
        //  NOTE: have authored this component to be run from generateDataUI.vue. So not doing this yet (?)
        if (this.componentIndex) {
          const itmToRefresh = this.pageItems[this.componentIndex]
          const uiElemToRefresh = itmToRefresh.uiElem
          // kill anything inside this UI component.  Note that I'm not properly removing the element
          //  so i'm not removing event listeners etc.  I'm deeming this ok since this is an admin task, but:
          //  TODO: Properly remove the contents of this item
          uiElemToRefresh.innerHTML = ''
          // Vue overwrites the element (see same in page.js). So give it a child div to work with
          componentRunner.build(itmToRefresh, uiElemToRefresh.appendChild(document.createElement('div')), this.state)
          // pass the datasource to the qa mechanism
        }

      },


      beforeDestroy: () => {
        window.removeEventListener('resize', this.resize)
      },
      resize(event) {
        // deal with resizing here
      },

    }
  }


  
</script>
<style scoped lang="scss">

  .runOneDataButton{
    padding: 3px;
    line-height: 1;
    position: absolute;
    right: 5px;
    margin-top: -1.8em;
  }

  .dataSourceParameter label{
    font-weight: normal;
  }

  .relatedComponentsLink{
    color: #008edc;
    cursor: pointer;
    font-size: 0.8em;
    text-align: right;
    margin: 12px 4px 0px 4px;
  }

  .relatedComponents{
    margin-left: 14px;
  }
  
</style>