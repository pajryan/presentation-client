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
            <td><button type="button" class="btn btn-primary btn-sm" @click="deployArchive(archive)">use this archive</button></td>
            <td><button type="button" class="btn btn-primary btn-sm" @click="publishArchive(archive)">publish to server</button></td>
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
            <td><button type="button" class="btn btn-primary btn-sm" @click="downloadPublishedArchiveToLocal(publishedArchive)">download to local archives</button></td>
          </tr>
        </tbody>
      </table>      

    </div> 
      
</template>




<script>
  /* tslint:disable */
  import Vue from 'vue'
  import { setTimeout } from 'timers';
  import { arch } from 'os';

  let classReady = 'btn btn-primary btn-sm'
  let classSuccess = 'btn btn-success btn-sm'
  let classFail = 'btn btn-danger btn-sm'
  let classInProgress = 'btn btn-warning btn-sm'

  export default {
    props: ['adminObj'], 

    data () {
      return {
        isRunningArchive: false,
        archiveButtonClass: classReady,
        archiveErrorMsg: '',
        archiveSuccessMsg: '',

        existingLocalArchives: [],

        isRunningGetPublishedArchives: false,
        getPublishedArchivesButtonClass: classReady,
        getPublishedArchivesErrorMsg: '',
        existingPublishedArchives: []
        
      }
    },
    mounted () {
      this.getLocalArchives()
    },

    methods: {
      createArchive(){
        this.isRunningArchive = true;
        this.archiveButtonClass = classInProgress
        this.adminObj.archiveLocalData(err => {
          this.isRunningArchive = false;
          if(err){
            this.archiveButtonClass = classFail;
            this.archiveErrorMsg = 'Failed to create archive. ('+err+')'
          }else{
            this.getLocalArchives();  //update the archives list
            this.archiveButtonClass = classSuccess;
            this.archiveSuccessMsg = 'Archive successfully created';
            setTimeout(() => { 
              this.archiveButtonClass = classReady
              this.archiveSuccessMsg = ''
            }, 2000)
          }
        });
      },

      getLocalArchives(){
        this.existingLocalArchives = this.adminObj.getLocalArchives();
        //sort with most recent date on top
        this.existingLocalArchives = this.existingLocalArchives.sort((a,b) => {
          return a>b ? -1 : 1;
        })
      },

      titleToDate(filename){  // dataArchive_yyyy-mm-dd-hh-mm-ss.zip   (month is 1-based. )
        try{
          let dateStr = filename.split('_')[1].replace('.zip', '')
          let dateParts = dateStr.split('-')
          return dateParts[1] + '/' + dateParts[2] + '/' + dateParts[0] + ' at ' + dateParts[3] + ':' + dateParts[4] + ':' + dateParts[5]
        }catch(e){
          return filename
        }
      },

      publishArchive(archiveFileName){
        console.log('going to publish to server: ', archiveFileName);
        this.event = event;
        this.event.target.className = classInProgress;
        this.adminObj.publishDataArchive(archiveFileName, (res, err) => {
          if(err){
            console.log('Error publishing archive', err)
            this.event.target.className = classFail;
          }else{
            console.log('Success publishing archive', res)
            this.event.target.className = classSuccess;
            setTimeout(() => {
              this.event.target.className = classReady
            }, 2000)
          }
        })
      },

      downloadDataArchiveList(){
        this.isRunningGetPublishedArchives = true;
        // this.getPublishedArchivesButtonClass = classInProgress;
        this.adminObj.downloadDataArchiveList((res,err) => {
          this.isRunningGetPublishedArchives = false;
          if(err){
            this.getPublishedArchivesButtonClass = classFail;
            this.getPublishedArchivesErrorMsg = 'Failed to get published archives. ('+err+')'

          }else{
            console.log('got list of remote archives', res)
            // this.getPublishedArchivesButtonClass = classSuccess;
            this.existingPublishedArchives = res.data.archives;
            //sort with most recent date on top
            this.existingPublishedArchives = this.existingPublishedArchives.sort((a,b) => {
              return a>b ? -1 : 1;
            })
            setTimeout(() => {
              this.getPublishedArchivesButtonClass = classReady
            }, 2000)
          }
        });
      },

      downloadPublishedArchiveToLocal(archiveFileName){
        console.log('downloading archive', archiveFileName)
        // this.event = event;
        // this.event.target.className = classInProgress;
        this.adminObj.downloadOneDataArchive(archiveFileName, (res, err) => {
          if(err){
            console.log('Error downloading archive', err)
            this.event.target.className = classFail;
          }else{
            console.log('Success downloading archive')
            // this.event.target.className = classSuccess;
            //refresh the local and published lists
            this.downloadDataArchiveList();
            this.getLocalArchives();
          }
        })
      },

      deployArchive(archiveFileName){
        if(window.confirm('This will overwrite your existing data. Do you want to continue? This cannot be undone.')){

          let fullDelete = window.confirm('Do you want to remove all existing data before using this archive?')

          console.log('deploying archive', archiveFileName)
          this.event = event;
          this.event.target.className = classInProgress;
          this.adminObj.deployArchive(fullDelete, archiveFileName, (err) => {
            if(err){
              console.log('Error deploying archive', err)
              this.event.target.className = classFail;
            }else{
              console.log('Success deploying archive')
              this.event.target.className = classSuccess;
              setTimeout(() => {
                this.event.target.className = classReady
              }, 2000)
            }
          })
        }
      }



     
    }
  }


  
</script>

<style scoped lang="less">

  
</style>