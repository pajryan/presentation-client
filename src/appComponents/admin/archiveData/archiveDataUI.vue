<template>
    <div>
      <p>Use this section to create archives of data and to revert to archived data</p>
      <ol>
        <li>Create archive: zip up all the data with a date/timestamp on the filename</li>
        <li>View arvhives: list of available archives</li>
        <li>Retrieve archive: download, unzip and install data</li>
      </ol>

      <hr />

      <h3>Create Local Archive</h3>
      <p v-show="archiveErrorMsg!=''"  class="alert alert-danger">{{archiveErrorMsg}}</p>
      <p v-show="archiveSuccessMsg!=''" class="alert alert-success">{{archiveSuccessMsg}}</p>
      <button type="button" :class="archiveButtonClass" @click="createArchive()" :disabled="isRunningArchive" >Create archive from current data</button>
      
      <br /><br /> <br /><br />   
      <h3>Local Archives</h3>
      <p v-show="publishArchiveErrorMsg!=''"  class="alert alert-danger">{{publishArchiveErrorMsg}}</p>
      <p v-if="existingLocalArchives.length===0">You have no local archives</p>
      <table class="table table-sm" v-if="existingLocalArchives.length>0"> 
        <thead>
          <tr>
            <th colspan="8">Archived Data (local)</th>
          </tr>
          <tr>
            <th>date created</th>
            <th colspan="2"></th>
          </tr>
        </thead>
        <tbody id="presentationTableBody">
          <tr v-for="archive in existingLocalArchives" :key="archive.id">
            <td :title="archive">{{titleToDate(archive)}}</td>
            <td><button type="button" class="btn btn-primary btn-sm" @click="deployArchive(archive, $event)">use this archive</button></td>
            <td><button type="button" class="btn btn-primary btn-sm" @click="publishArchive(archive, $event)">publish to server</button></td>
          </tr>
        </tbody>
      </table>





      <br /><br /> <br /><br />   
      <h3>Published Archives</h3>
      <p v-show="getPublishedArchivesErrorMsg!=''"  class="alert alert-danger">{{getPublishedArchivesErrorMsg}}</p>
      <button type="button" :class="getPublishedArchivesButtonClass" @click="downloadDataArchiveList()" :disabled="isRunningGetPublishedArchives" >Download published archives</button>
      
      <table class="table table-sm" v-if="existingPublishedArchives.length>0"> 
        <thead>
          <tr>
            <th colspan="8">Archived Data (published to server)</th>
          </tr>
          <tr>
            <th>date created</th>
            <th></th>
          </tr>
        </thead>
        <tbody id="presentationTableBody">
          <tr v-for="publishedArchive in existingPublishedArchives" :key="publishedArchive.id">
            <td :title="publishedArchive">{{titleToDate(publishedArchive)}}</td>
            <td><button type="button" class="btn btn-primary btn-sm" @click="downloadPublishedArchiveToLocal(publishedArchive, $event)">download to local archives</button></td>
          </tr>
        </tbody>
      </table>
      <p v-show="existingPublishedArchivesMsg!=''"  class="alert alert-warning">{{existingPublishedArchivesMsg}}</p>  

    </div> 
      
</template>




<script lang="ts">
  import Vue from 'vue'
  import AppVue from '@/AppVue'
  import Component from 'vue-class-component'
  import { setTimeout } from 'timers'
  import { arch } from 'os'
  import * as admin from '@/appComponents/admin/adminFunctions.ts'
  import { ErrorObject } from '@/configuration/configurationTypes'
  import log from 'electron-log'
  // import { eventNames } from 'cluster'

  const classReady = 'btn btn-primary btn-sm'
  const classSuccess = 'btn btn-success btn-sm'
  const classFail = 'btn btn-danger btn-sm'
  const classInProgress = 'btn btn-warning btn-sm'

  @Component
  export default class ArchiveDataUI extends AppVue {
    isRunningArchive: boolean = false
    archiveButtonClass: string = classReady
    archiveErrorMsg: string = ''
    archiveSuccessMsg: string = ''
    publishArchiveErrorMsg: string = ''

    existingLocalArchives: string[] = []

    isRunningGetPublishedArchives: boolean = false
    getPublishedArchivesButtonClass: string = classReady
    getPublishedArchivesErrorMsg: string = ''
    existingPublishedArchives: string[] = []
    existingPublishedArchivesMsg: string = ''

    constructor() {
      super()
    }

    mounted() {
      this.getLocalArchives()
    }

    // called when the user switches *back* to this tab (not on initial load)
    changedToThisTab() {
      this.getLocalArchives()
    }

    createArchive() {
      this.isRunningArchive = true
      this.archiveButtonClass = classInProgress
      admin.archiveLocalData((success: boolean, error?: ErrorObject) => {
        this.isRunningArchive = false
        if (!success) {
          this.archiveButtonClass = classFail
          this.archiveErrorMsg = 'Failed to create archive. (' + (error ? error.error : error) + ')'
        } else {
          this.getLocalArchives()  // update the archives list
          this.archiveButtonClass = classSuccess
          this.archiveSuccessMsg = 'Archive successfully created'
          setTimeout(() => {
            this.archiveButtonClass = classReady
            this.archiveSuccessMsg = ''
          }, 2000)
        }
      })
    }

    getLocalArchives() {
      this.existingLocalArchives = admin.getLocalArchives()
      // sort with most recent date on top
      this.existingLocalArchives = this.existingLocalArchives.sort((a, b) => {
        return a > b ? -1 : 1
      })
    }

    titleToDate(filename: string) {  // dataArchive_yyyy-mm-dd-hh-mm-ss.zip   (month is 1-based. )
      try {
        const dateStr = filename.split('_')[1].replace('.zip', '')
        const dateParts = dateStr.split('-')
        return dateParts[1] + '/' + dateParts[2] + '/' + dateParts[0] + ' at ' + dateParts[3] + ':' + dateParts[4] + ':' + dateParts[5]
      } catch (e) {
        return filename
      }
    }

    publishArchive(archiveFileName: string, event: any) {
      this.publishArchiveErrorMsg = ''
      event.target.className = classInProgress
      admin.publishDataArchive(archiveFileName, (success: boolean, err?: ErrorObject) => {
        if (err) {
          log.log('Error publishing archive', err.error)
          this.publishArchiveErrorMsg = 'Error publishing archive: ' + err.error
          event.target.className = classFail
        } else {
          log.log('Success publishing archive')
          event.target.className = classSuccess
          setTimeout(() => {
            event.target.className = classReady
          }, 2000)
        }
      })
    }

    downloadDataArchiveList() {
      this.isRunningGetPublishedArchives = true
      this.existingPublishedArchivesMsg = ''
      // this.getPublishedArchivesButtonClass = classInProgress;
      admin.downloadDataArchiveList((res, err) => {
        this.isRunningGetPublishedArchives = false
        if (res && res.status === 200) {
          log.log('got list of remote archives', res)
          // this.getPublishedArchivesButtonClass = classSuccess;
          if (res.archives.length === 0) {
            this.existingPublishedArchivesMsg = 'No new published archives found.'
          }
          this.existingPublishedArchives = res.archives
          // sort with most recent date on top
          this.existingPublishedArchives = this.existingPublishedArchives.sort((a, b) => {
            return a > b ? -1 : 1
          })
          setTimeout(() => {
            this.getPublishedArchivesButtonClass = classReady
          }, 2000)

        } else {
          this.getPublishedArchivesButtonClass = classFail
          this.getPublishedArchivesErrorMsg = 'Failed to get published archives. (' + err + ')'
        }
      })
    }

    downloadPublishedArchiveToLocal(archiveFileName: string, event: any) {
      log.log('downloading archive', archiveFileName)
      event.target.className = classInProgress
      admin.downloadOneDataArchive(archiveFileName, (res, err) => {
        if (err) {
          log.log('Error downloading archive', err)
          event.target.className = classFail
        } else {
          log.log('Success downloading archive')
          event.target.className = classSuccess
          // refresh the local and published lists
          this.downloadDataArchiveList()
          this.getLocalArchives()
        }
      })
    }

    deployArchive(archiveFileName: string, event: any) {
      if (window.confirm('This will overwrite your existing data. Do you want to continue? This cannot be undone.')) {

        const fullDelete = window.confirm('Do you want to remove all existing data before using this archive?')

        log.info('deploying archive', archiveFileName)
        event.target.className = classInProgress
        admin.deployArchive(fullDelete, archiveFileName, (success: boolean, err?: ErrorObject) => {
          if (err) {
            log.error('Error deploying archive', err)
            event.target.className = classFail
          } else {
            log.info('Success deploying archive')
            event.target.className = classSuccess
            setTimeout(() => {
              event.target.className = classReady
            }, 2000)
          }
        })
      }
    }

  }


</script>

<style scoped lang="scss">

  
</style>