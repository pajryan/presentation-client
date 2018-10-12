<template>
    
    <div>
      <div v-if="isFirstTimeUser">
        <h3>Welcome to the application!</h3>
        <p>This is your first time launching the application, so you have been directed to the admin configuration section to do a bit of setup</p>
        <p>
          This setup <u>must</u> be completed before using the application.  It defines:
          <ul>
            <li>who you are</li>
            <li>where updated data comes from</li>
            <li>provides you access to data and application updates</li>
          </ul>
        </p>
        <p>Please fill out the following fields. All of this information should have been provided to you (e.g. via email)</p>
      </div>
      <div>
        <form class="needs-validation" novalidate onsubmit="submitForm()">
          <div class="form-group">
            <label for="inputName">Your name</label>
            <input type="input" class="form-control" id="inputName" aria-describedby="nameHelp" placeholder="Enter first and last name" required v-model="fieldName">
            <small id="nameHelp" class="form-text text-muted">REQUIRED. This is not shown to clients, just used internally.</small>
          </div>
          <div class="form-group">
            <label for="inputEmail">Email address</label>
            <input type="email" class="form-control" id="inputEmail" aria-describedby="emailHelp" placeholder="Enter email" required  v-model="fieldEmail">
            <small id="emailHelp" class="form-text text-muted">REQUIRED. Not shown or shared, just for internal communication.</small>
          </div>
          <div class="form-group">
            <label for="inputUrl">Data update service URL</label>
            <input type="input" class="form-control" id="inputUrl" aria-describedby="urlHelp" placeholder="http://xyz.com" required  v-model="fieldDataUrl">
            <small id="urlHelp" class="form-text text-muted">REQUIRED. This should have been provided to you.</small>
          </div>
          <div class="form-group">
            <label for="inputApiKey">API key</label>
            <input type="input" class="form-control" id="inputApiKey" aria-describedby="apiHelp" placeholder="abc-123-xyz-789" required  v-model="fieldApiKey">
            <small id="apiHelp" class="form-text text-muted">REQUIRED. This should have been provided to you.</small>
          </div>
          <div class="form-group">
            <label for="inputApiKey">Administrator Password</label>
            <input type="input" class="form-control" id="inputAdminPassword" aria-describedby="adminPassword" placeholder="***" required  v-model="fieldAdminPassword">
            <small id="apiHelp" class="form-text text-muted">OPTIONAL. This is only relevant for team member responsible for creating and distributing updates.</small>
          </div>
          <button class="btn btn-primary" type="submit"  @click.stop.prevent="checkInputs" style="width:190px;">Save and test inputs</button>
          <p class="text-danger" v-if="errorMsg!=''" style="padding-top:20px;">{{errorMsg}}</p>
          <p class="text-success" v-if="successMsg!=''" style="padding-top:20px;">{{successMsg}}</p>
        </form>
      </div>
      <p style="margin-top:15px; font-size: 0.8em; color: #999;">( local data store: {{fullAppDataStoreDirectoryPath}} )</p>
    </div>
</template>



<script>
  import { mapState, mapGetters, mapMutations } from 'vuex' // import state
  import log from 'electron-log'
  import * as admin from '@/appComponents/admin/adminFunctions.ts'

  export default {
    computed: {
      ...mapState(['isFirstTimeUser', 'userName', 'apiKey', 'userEmail', 'dataUpdateServiceURL', 'adminPassword']),
      ...mapGetters({
          fullAppDataStoreDirectoryPath: 'fullAppDataStoreDirectoryPath'
        })
    },
    data() {
      return {
        successMsg: '',
        errorMsg: '',

        fieldName: '',
        fieldEmail: '',
        fieldDataUrl: '',
        fieldApiKey: '',
        fieldAdminPassword: ''
      }
    },
    mounted() {
      // we don't want to bind directly to state. So copy to local fields
      this.fieldName = this.userName
      this.fieldEmail = this.userEmail
      this.fieldDataUrl = this.dataUpdateServiceURL
      this.fieldApiKey = this.apiKey
      this.fieldAdminPassword = this.adminPassword
    },
    methods: {
      checkInputs(event) {
        event.target.className = event.target.className.replace('btn-primary', 'btn-warning')
        event.target.className = event.target.className.replace('btn-danger', 'btn-danger')
        event.target.innerHTML = '…'
        event.preventDefault()
        event.stopPropagation()

        if (this.validateInputs(event)) {
          const configObj = {
            userName: this.fieldName,
            userEmail: this.fieldEmail,
            dataUrl: this.fieldDataUrl,
            apiKey: this.fieldApiKey,
            adminPassword: this.fieldAdminPassword
          }
          // save the configuration inputs to the local flat file
          log.info('writing the following app configuration', configObj)
          admin.writeConfigFileDetails(configObj)

          // store config items in state
          admin.initializeStateFromConfig()

          // now see if the data URL and API key provided actually work.
          admin.checkDataConnectionReady((res, err) => {
            if (err) {
              this.errorMsg = err.error
              this.successMsg = ''
              event.target.className = event.target.className.replace('btn-warning', 'btn-danger')
              event.target.innerHTML = 'Save and test inputs'
            } else {
              this.errorMsg = ''
              this.successMsg = 'Congratulations, your app is now configured! Now recommend clicking "update data" at the top left and making sure you have the latest data.'
              event.target.className = event.target.className.replace('btn-warning', 'btn-success')
              event.target.className = event.target.className.replace('btn-danger', 'btn-success')
              event.target.innerHTML = 'Save and test inputs'
            }
          })
        } else {
          event.target.className = event.target.className.replace('btn-warning', 'btn-danger')
          event.target.innerHTML = 'Save and test inputs'
        }
      },
      validateInputs(event) {
        const forms = document.getElementsByClassName('needs-validation')
        let formValid = true
        Array.prototype.filter.call(forms, form => {
          form.classList.add('was-validated')
          if (form.checkValidity() === false) {
            formValid = false
          }
        })
        return formValid
      }
    }
  }
</script>



<style scoped lang="scss">

</style>