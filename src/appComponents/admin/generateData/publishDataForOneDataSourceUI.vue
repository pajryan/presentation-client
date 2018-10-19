<template>
    <div class="oneDataUpdateComponent" style="padding-left: 6px;">
      <button type="button" class="btn btn-primary btn-sm" @click="publishOneDataSource()" :disabled="dataSource.isPublishRunning">publish</button>
      <label style="font-weight:bold; margin-left: 12px; padding-top: 4px;">{{ dataSource.name }}</label>

      <!-- messages -->
      <div style="margin-left: 15px; margin-top: 10px;">
        <label :hidden="dataSource.publishSuccessMsg==null || dataSource.publishSuccessMsg==''"  class="alert alert-success" style="width: 100%"><span v-html="dataSource.publishSuccessMsg"></span></label>
        <label :hidden="dataSource.publishErrorMsg==null || dataSource.publishErrorMsg==''"  class="alert alert-danger" style="width: 100%">{{ dataSource.publishErrorMsg }}</label>
      </div>

    </div>
</template>



<script>
  import Vue from 'vue'
  import {mapGetters} from 'vuex'
  import * as admin from '@/appComponents/admin/adminFunctions.ts'
  import log from 'electron-log'
  const dataSourceConfigImport = require('@/configuration/dataSourceConfig')

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
        activePresentationComponents: [],

        totalFilesCount: 0,
        runningFilesCount: 0
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
          this.publishOneDataSource()
        }
      }
    },
    mounted() {
      // use Vue.set to add new keys (https://vuejs.org/2016/02/06/common-gotchas/)
      Vue.set(this.dataSource, 'isPublishRunning', false)
      Vue.set(this.dataSource, 'publishSucceeded', true)

      Vue.set(this.dataSource, 'publishSuccessMsg', '')
      Vue.set(this.dataSource, 'publishErrorMsg', '')
    },
    methods: {
      publishOneDataSource(callback = this.publishResult) {
        this.dataSource.isPublishRunning = true
        this.dataSource.publishSuccessMsg = ''
        this.dataSource.publishErrorMsg = ''

        this.totalFilesCount = this.dataSource.resultHandling.length
        this.runningFilesCount = 0

        this.dataSource.publishSucceeded = true // need to reset this for any subsequent runs

        this.dataSource.resultHandling.forEach(rh => {
          admin.publishOneDataFile(rh.filename, this.publishResult.bind(this, rh.filename))
        })
      },


      // the result of running the queries and generating files
      publishResult(filename, success, error) {
        this.runningFilesCount++

        // we get here even if we've had an error. So check that the error message hasn't already been populated
        if (success) {
          this.dataSource.publishSuccessMsg += ' published file: '
          const url = '/#/displayDataFile/' + filename    // use /displayDataFile route to open a new page to DisplayDataFile.vue
          this.dataSource.publishSuccessMsg += ' : <a href="' + url + '" target="_blank">' + filename + '</a> <br />'
        } else {
          log.error('Failed to publish data file (' + filename + ') ', error)
          this.dataSource.publishSucceeded = false
          this.dataSource.publishErrorMsg = 'error publishing ' + filename + ': ' + (error ? error.error : '')
        }

        if (this.runningFilesCount === this.totalFilesCount) {
          this.$emit('publishComplete', this.dataSource)
          this.dataSource.isPublishRunning = false
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