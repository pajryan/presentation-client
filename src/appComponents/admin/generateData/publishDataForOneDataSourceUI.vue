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



<script lang="ts">
  import Vue from 'vue'
  import Component from 'vue-class-component'
  import AppVue from '@/AppVue'
  import { Prop, Watch } from 'vue-property-decorator'
  // import {mapGetters} from 'vuex'
  import * as admin from '@/appComponents/admin/adminFunctions.ts'
  import { DataSource, ErrorObject } from '@/configuration/configurationTypes'
  import log from 'electron-log'
  const dataSourceConfigImport = require('@/configuration/dataSourceConfig')

  import path from 'path'

  interface DataFilePublishProgress extends DataSource {
    isPublishRunning: boolean
    publishSucceeded: boolean
    publishSuccessMsg: string
    publishErrorMsg: string
  }

  @Component
  export default class PublishDataForOneDataSource extends AppVue {

    @Prop({required: true}) itemDataSourceConfig!: DataFilePublishProgress // = {name: '', isStoredProcedure: false, query: '', sqlParameters: [], resultHandling: []}
    // if true, component runs automatically (don't need to click the button) - this allows me to run from outside
    @Prop({default: false, required: false}) autoRun!: boolean

    dataSource: DataFilePublishProgress = this.itemDataSourceConfig
    totalFilesCount: number = 0
    runningFilesCount: number = 0

    @Watch('autoRun')
      function(newValue: boolean, oldValue: boolean) {
        if (newValue) {
          this.publishOneDataSource()
        }
      }

    mounted() {
      this.dataSource.isPublishRunning = false
      this.dataSource.publishSucceeded = true
      this.dataSource.publishSuccessMsg = ''
      this.dataSource.publishErrorMsg = ''
    }

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
    }


    // the result of running the queries and generating files
    publishResult(filename: string, success: boolean, error: ErrorObject) {
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

    }

    beforeDestroy() {
      window.removeEventListener('resize', this.resize)
    }
    resize(event: any) {
      // deal with resizing here
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