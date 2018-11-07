<template>
    <div>
      <p>Use this section to update the data that drives all of the dynamic pictures in the presentation.</p>
      <p>It is best to use this functionality when:
        <ul>
          <li>you are on to a good, fast, internet connection</li>
          <li>have a little time to review the presentation (as pictures <i>will</i> change)</li>
        </ul>
      </p>

      <!-- ADVANCED -->
      <div v-if="!showAdvanced" class="advancedSection">
        <p style="text-align: right"><a href="#" @click.stop.prevent="showAdvanced=true">advanced</a></p>
      </div>
      <div v-if="showAdvanced" class="advancedSection" style="background:#f7f7f7">
        <div class="container-fluid">
          <div class="row">
            <div class="col-sm">
              <p>Advanced Options</p>
            </div>
            <div class="col-sm">
              <button type="button" class="close" aria-label="Close" @click.stop.prevent="showAdvanced=false"><span aria-hidden="true">&times;</span></button>
            </div>
          </div>
        </div>
        <div class="container-fluid">
          <div class="row alert alert-warning" role="alert">
            Be a little careful here!  Data is updated in individual files which means all you can do is force-get every file that was updated as of a given date, or delete all files.  There's no concept of 'deleting the last month' (e.g. going back in time) here.
            <br /><br />
            <strong>If going back in time is what you're after, go to the 'data archive' tab above.</strong>
          </div>
          <div class="row">
            <div class="col-sm">
              <p>refresh all data <i>on and after</i> <input id="dataAfterDateAdd" v-model="dataAfterDate" style="width:90px"> <a href="#" @click.stop.prevent="getDataAsOf()">go</a></p>
              <p>delete all data <a href="#" @click.stop.prevent="deleteData()">go</a> <span class="text-danger">{{deleteMsg}}</span></p>
            </div>
          </div>
        </div>
      </div>

      <button type="button" class="btn btn-primary" @click="checkForUpdate" :disabled="updateButtonDisabled">check for data updates</button>

      <div v-if="!isOnline" class="updateContainer">
        <p class="text-danger">{{msg}}</p>
      </div>

      <div v-if="isOnline" class="updateContainer">
        <p class="text-warning">{{msg}}</p>
      </div>

      <div v-if="updateReady === 1" class="updateContainer">
        <p class="text-success">New data is available, click the button below to continue.</p>
        <button type="button" class="btn btn-primary" @click="fetchData" :disabled="amFetchingData">get latest data</button>
        <input type="checkbox" v-model="doLocalDataArchive" /><label>Create local data archive before getting data? (recommended)</label>
        <div v-if="amFetchingData || fetchDataComplete">
          <br />
          <div class="progress">
            <div class="progress-bar bg-success" role="progressbar" :style="{width: updatePercentComplete + '%'}" aria-valuenow="50" aria-valuemin="0" aria-valuemax="100">{{updatePercentComplete*numberOfFilesToUpdate/100}} of {{numberOfFilesToUpdate}}</div>
            <div class="progress-bar bg-danger" role="progressbar" :style="{width: updatePercentFailed + '%'}" aria-valuenow="50" aria-valuemin="0" aria-valuemax="100">{{updatePercentFailed*numberOfFilesToUpdate/100}} of {{numberOfFilesToUpdate}}</div>
          </div>
        </div>
        <div v-if="fetchDataComplete">
          <br />
          <p :class="arrayOfErrors.length==0?'text-success':'text-danger'">{{fetchDataCompleteMsg}}</p>
          <ol id="errorList">
            <li v-for="err in arrayOfErrors" :key="err.index" class="text-danger">{{ err.file }} <span>{{err.msg.error}}</span></li>
          </ol>
        </div>
      </div>

      <div v-if="updateReady === -1" class="updateContainer">
        <p class="text-success">Your data is up to date. Nothing more to do here!</p>
      </div>

      <!-- delete data modal -->
      <div class="modal" id="deleteDataModal" tabindex="-1" role="dialog" aria-labelledby="exampleModalCenterTitle" aria-hidden="false">
        <div class="modal-dialog modal-dialog-centered" role="document">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="exampleModalLongTitle">Delete Data</h5>
            </div>
            <div class="modal-body">
              Are you sure you want to delete <b>all</b> data for the presentation?<br />
              The presentation will not work until you fetch new data.
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-dismiss="modal" @click.stop.prevent="deleteDataDecline()">never mind</button>
              <button type="button" class="btn btn-primary" @click.stop.prevent="deleteDataAccept()">yes, delete data</button>
            </div>
          </div>
        </div>
      </div>

      
    </div>
</template>



<script lang="ts">
  import Vue from 'vue'
  import Component from 'vue-class-component'
  import * as d3 from 'd3'
  import * as admin from '@/appComponents/admin/adminFunctions.ts'
  import log from 'electron-log'

  import {DataLogFileItem, ErrorObject} from '@/configuration/configurationTypes'

  const formatDate = d3.timeFormat('%m/%d/%y')
  const parseDate = d3.timeParse('%m/%d/%y')

  @Component
  export default class UpdateDataUI extends Vue {
    updateButtonDisabled: boolean = false
    isOnline: boolean = true
    updateReady: number =  0 // 0 = not sure yet, -1 is no update available, 1 = update available
    numberOfFilesToUpdate: number =  0
    updatePercentComplete: number =  0
    updatePercentFailed: number =  0
    amFetchingData: boolean = false
    fetchDataComplete: boolean = false
    msg: string = ''
    fetchDataCompleteMsg: string = ''
    arrayOfErrors: DataLogFileItem[] = []

    showAdvanced: boolean = false
    dataAfterDate: string =  formatDate(new Date())
    deleteMsg: string =  ''

    dataUpdater: admin.GetDataUpdateFilesAsOf

    doLocalDataArchive: boolean = true

    constructor() {
      super()
      // can set initial states here
      this.dataUpdater = new admin.GetDataUpdateFilesAsOf(this.checkForDataUpdatesResult, this.fetchDataProgress, this.fetchDataResult, this.fetchDataError)
    }

    // mounted() {
    //   // don't know if mounted is still a thing? seems like constructor() might do that?
    // }
    checkForUpdate() {
      this.updateReady = 0
      this.updateButtonDisabled = true
      this.dataUpdater.checkStatus()
    }

    checkForDataUpdatesResult(isOnline: boolean, dataAvailable: boolean, message?: string) {
      this.arrayOfErrors = []
      this.fetchDataComplete = false
      this.updateButtonDisabled = false
      this.isOnline = isOnline
      this.msg = message ? message : ''
      if (!this.isOnline) {   // we're not online (or can't connect to the service.  get out.)
        return
      }

      if (dataAvailable) {
        this.updateReady = 1   // need to fetch data
        this.updateButtonDisabled = true
      } else {
        this.updateReady = -1  // data is up to date
      }
    }

    fetchData() {
      this.amFetchingData = true
      this.numberOfFilesToUpdate = 0

      let fetchReadyAfterArchive = true
      // if requested, archive the data first
      if (this.doLocalDataArchive) {
        log.info('creating local archive before updating')
        admin.archiveLocalData((success: boolean, error?: ErrorObject) => {
          fetchReadyAfterArchive = success
          if (!fetchReadyAfterArchive) {
            fetchReadyAfterArchive = window.confirm('The archive was not successfully created. Do you want to fetch data anyway?\n\n(' + JSON.stringify(error) + ')')
          }
        })
      }

      if (fetchReadyAfterArchive) {
        this.dataUpdater.checkStatusAndGetFiles()
      } else {
        this.amFetchingData = false
      }

    }
    fetchDataProgress(percentComplete: number, percentFailed: number, totalNumber: number) { // 0 to 100
      this.numberOfFilesToUpdate = totalNumber
      this.updatePercentComplete = percentComplete
      this.updatePercentFailed = percentFailed
    }
    fetchDataResult(arrayOfErrors: DataLogFileItem[]) {
      this.updateButtonDisabled = false
      this.fetchDataComplete = true
      this.amFetchingData = false
      if (arrayOfErrors && arrayOfErrors.length > 0) {
        this.arrayOfErrors = arrayOfErrors
        log.error('done fetching data, but some files not complete', arrayOfErrors)
        this.fetchDataCompleteMsg = arrayOfErrors.length + ' data file(s) could not be updated.'
      } else {
        this.fetchDataCompleteMsg = 'Data update complete.'
      }
    }
    fetchDataError(error: ErrorObject) {
      log.error('error updating data', error)
    }
    getDataAsOf() {
      this.updateReady = 0
      this.updateButtonDisabled = true
      this.dataUpdater.setAsOfDateInclusive(parseDate(this.dataAfterDate) as Date)
      this.dataUpdater.checkStatus()
      // this.adminObj.checkForDataUpdates(this.checkForDataUpdatesResult, onAfterDate)
    }
    deleteData() {
      document.getElementById('deleteDataModal')!.style.display = 'block'
    }
    deleteDataDecline() {
      document.getElementById('deleteDataModal')!.style.display = 'none'
    }
    deleteDataAccept() {
      document.getElementById('deleteDataModal')!.style.display = 'none'
      admin.deleteData((success: boolean, err: any) => {
        if (!success) {
          log.error(err.error)
          this.deleteMsg = ' error deleting files'
        } else {
          // note that I'm separately setting the local dataUpdater object's asOf date to undefined
          //  this allows me to re-run data (the object doesn't have a stored asOfDate)
          //  the alternative is the make admin.deleteData (above) a method of the dataUpdater class, but
          //   I'd like that to be a more generic function for other use cases
          this.dataUpdater.setAsOfDateInclusive(undefined)
          this.deleteMsg = ' files deleted'
        }
        setTimeout(() => { this.deleteMsg = '' }, 3000)
      })
    }
  }


</script>

<style scoped lang="scss">

label{
  padding-left: 4px;
  font-style: italic;
  font-size: 0.9em;
}
input[type='checkbox']{
  margin-left: 25px;
}
//   .updateContainer{
//     margin-top: 30px;
//   }

//   #errorList{
//     max-height: 100px;
//     overflow: scroll;
//   }

//   // force the scrolbar to show up
//   #errorList::-webkit-scrollbar {
//     -webkit-appearance: none;
//     width: 7px;
//   }
//   #errorList::-webkit-scrollbar-thumb {
//     border-radius: 4px;
//     background-color: rgba(0,0,0,.5);
//     -webkit-box-shadow: 0 0 1px rgba(255,255,255,.5);
//   }

//   .advancedSection{
//     margin-top: 40px;
//     padding-top: 20px;
//     padding-bottom: 20px;
//     border-top: 1px solid #dee2e6;
//   }
</style>