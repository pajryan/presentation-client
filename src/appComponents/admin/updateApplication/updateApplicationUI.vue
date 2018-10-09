<template>
    
    <div>
      <p>Use this section to update the overall presentation application (not the data).</p>
      <p>It is best to use this functionality when:
        <ul>
          <li>you are on to a good, fast, internet connection</li>
          <li>have a little time to review the presentation to be sure there are no surprises.</li>
        </ul>
      </p>

      <button type="button" class="btn btn-primary" @click="checkForUpdate" :disabled="updateButtonDisabled">check for application updates</button>

      <div v-if="updateAvailable===1" class="updateContainer">
        <p>An update is available.<br />Downloading:</p>
        <div class="progress">
          <div class="progress-bar" role="progressbar" :style="{width: updateDownloadProgress + '%'}" aria-valuenow="50" aria-valuemin="0" aria-valuemax="100"></div>
        </div>
      </div>

      <div v-if="updateAvailable===2" class="updateContainer">
        <p class="text-success">You are up to date. (version {{currentVersion}})</p>
      </div>

      <div v-if="updateAvailable===3" class="updateContainer">
        <p class="text-success">An update has been downloaded. <span class="text-danger">Restart the application</span> to use the latest version.</p>
      </div>

      <div v-if="updateError" class="updateContainer">
        <p class="text-danger">An error has occured during update.</p>
        <p class="text-info">{{updateErrorMessage}}</p>
      </div>
    </div>
</template>



<script>
  import Vue from 'vue'

  export default {
    props: ['adminObj'],

    data() {
      return {
        currentVersion: '',           // only used/updated when the app update is checked, but comes back up to date (updateNotAvailable)
        updateButtonDisabled: false,
        updateAvailable: 0,           // 0=not checked, 1=checked and available, 2=checked and not available (up to date), 3=update available and download complete
        updateDownloadProgress: -1,   // -1 = not started.  0 thru 100 = progress
        updateError: false,
        updateErrorMessage: '',
      }
    },
    mounted() {
      // console.log('inside updateApplicationUI', this.adminObj);
    },
    methods: {
      checkForUpdate() {
        this.updateButtonDisabled = true
        this.adminObj.checkForApplicationUpdates(this.updateCallback)
      },
      updateCallback(event, args) {
        if (event === 'updateAvailable') {
          this.updateAvailable = 1
          this.updateButtonDisabled = true

        } else if (event === 'updateNotAvailable') {
          this.updateAvailable = 2
          this.updateButtonDisabled = false
          this.currentVersion = args

        } else if (event === 'downloadProgress') {
          this.updateButtonDisabled = true
          this.updateDownloadProgress = args.percent

        } else if (event === 'updateDownloaded') {
          this.updateButtonDisabled = true
          this.updateAvailable = 3

        } else if (event === 'error') {
          log.error('receved error when trying to update application', args)
          this.updateError = true
          this.updateErrorMessage = args  // need to put in the right key here to get the message
          this.updateButtonDisabled = false
        }
      }
    }
  }
  
</script>

<style scoped lang="scss">
  .updateContainer{
    margin-top: 30px;
  }
</style>