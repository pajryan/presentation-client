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
            Be a little careful here!  Data is updated in individual files which means all you can do is force-get every file that was updated as of a given date, or delete all files.  There's no concept of 'deleting the last month' (e.g. going back in time.)
          </div>
          <div class="row">
            <div class="col-sm">
              <p>refresh all data <i>on and after</i> <input id="dataAfterDateAdd" :value="dataAfterDate" style="width:90px"> <a href="#" @click.stop.prevent="getDataAsOf()">go</a></p>
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



<script>
  import Vue from 'vue'
  import * as d3 from 'd3'

  const formatDate = d3.timeFormat('%m/%d/%y')
  const parseDate = d3.timeParse('%m/%d/%y')

  export default {
    props: ['adminObj'],
    data() {
      return {
        updateButtonDisabled: false,
        isOnline: true,
        updateReady: 0, // 0 = not sure yet, -1 is no update available, 1 = update available
        numberOfFilesToUpdate: 0,
        updatePercentComplete: 0,
        updatePercentFailed: 0,
        amFetchingData: false,
        fetchDataComplete: false,
        msg: '',
        fetchDataCompleteMsg: '',
        arrayOfErrors: [],

        showAdvanced: false,
        dataAfterDate: formatDate(new Date()),
        deleteMsg: ''
      }
    },
    mounted() {
      // empty
    },
    methods: {
      checkForUpdate() {
        this.updateReady = 0
        this.updateButtonDisabled = true
        this.adminObj.checkForDataUpdates(this.checkForDataUpdatesResult, null)  // returns {isOnline:true/false, dataAvailable:true/false, message:<ifFalse>{text:.., severity:...</if>}
      },

      checkForDataUpdatesResult(arg) {
        log.info('getting to result', arg)
        this.arrayOfErrors = []
        this.fetchDataComplete = false
        this.updateButtonDisabled = false
        this.isOnline = arg.isOnline
        this.msg = arg.message ? arg.message.text : ''
        if (!this.isOnline) {   // we're not online (or can't connect to the service.  get out.)
          return
        }

        if (arg.dataAvailable) {
          this.updateReady = 1   // need to fetch data
          this.updateButtonDisabled = true
        } else {
          this.updateReady = -1  // data is up to date
        }
      },

      fetchData() {
        this.amFetchingData = true
        this.numberOfFilesToUpdate = 0
        this.adminObj.getUpdatedData(this.fetchDataProgress, this.fetchDataResult)
      },
      fetchDataProgress(percentComplete, percentFailed, totalNumber) { // 0 to 100
        this.numberOfFilesToUpdate = totalNumber
        this.updatePercentComplete = percentComplete
        this.updatePercentFailed = percentFailed
      },
      fetchDataResult(arrayOfErrors) {
        this.updateButtonDisabled = false
        this.fetchDataComplete = true
        this.amFetchingData = false
        if (arrayOfErrors) {
          this.arrayOfErrors = arrayOfErrors
          log.error('done fetching data, but some files not complete', arrayOfErrors)
          this.fetchDataCompleteMsg = arrayOfErrors.length + ' data file(s) could not be updated.'
        } else {
          this.fetchDataCompleteMsg = 'Data update complete.'
        }
      },
      getDataAsOf() {
        const onAfterDate = parseDate(document.getElementById('dataAfterDateAdd').value)
        this.dataAfterDate = formatDate(onAfterDate)
        this.updateReady = 0
        this.updateButtonDisabled = true
        this.adminObj.checkForDataUpdates(this.checkForDataUpdatesResult, onAfterDate)
      },
      deleteData() {
        document.getElementById('deleteDataModal').style.display = 'block'
      },
      deleteDataDecline() {
        document.getElementById('deleteDataModal').style.display = 'none'
      },
      deleteDataAccept() {
        document.getElementById('deleteDataModal').style.display = 'none'
        this.adminObj.deleteData(err => {
          if (err) {
            log.error(err)
            this.deleteMsg = 'error deleting files'
          } else {
            this.deleteMsg = 'files deleted'
          }
          setTimeout(() => { this.deleteMsg = '' }, 3000)
        })
      }
    }
  }


  
</script>

<style scoped lang="scss">
  .updateContainer{
    margin-top: 30px;
  }

  #errorList{
    max-height: 100px;
    overflow: scroll;
  }

  // force the scrolbar to show up
  #errorList::-webkit-scrollbar {
    -webkit-appearance: none;
    width: 7px;
  }
  #errorList::-webkit-scrollbar-thumb {
    border-radius: 4px;
    background-color: rgba(0,0,0,.5);
    -webkit-box-shadow: 0 0 1px rgba(255,255,255,.5);
  }

  .advancedSection{
    margin-top: 40px;
    padding-top: 20px;
    padding-bottom: 20px;
    border-top: 1px solid #dee2e6;
  }
</style>