<template>
  <div id="admin">
    <div class="container-fluid">
      <div class="row">
        <div class="col-sm">
          <h3>Presenter Admin</h3>
        </div>
        <div class="col-sm">
          <button type="button" class="close" aria-label="Close" @click.stop.prevent="toggleShown()"><span aria-hidden="true">&times;</span></button>
        </div>
      </div>
    </div>
    <ul class="nav nav-tabs">
      <li v-for="tab in tabs" class="nav-item"  :key="tab.index">
        <a href="#" v-if="!tab.isAdminOnly || isAdminUser" class="nav-link" :class="{active:tab.isActive}" @click.stop.prevent="setActive(tab)">{{ tab.name }}</a>
      </li>
    </ul>
    <div class="tab-content">  
      <div v-for="tab in tabs" :key="tab.index" class="tab-pane" :class="{active:tab.isActive}">
        <div v-if="!tab.isAdminOnly || isAdminUser" :id="tab.childId">{{tab.childId}}</div>
      </div>
    </div>
  </div>
</template>


<script>
import Vue from 'vue'
import { mapState } from 'vuex' // import state
import UpdateData from '@/appComponents/admin/updateData/updateDataUI.vue'
import EditPresentation from '@/appComponents/admin/editPresentation/editPresentationUI.vue'
import ManagePresentations from '@/appComponents/admin/managePresentations/managePresentationsUI.vue'
import UpdateApplication from '@/appComponents/admin/updateApplication/updateApplicationUI.vue'
import ConfigureApplication from '@/appComponents/admin/configuration/configurationUI.vue'
import GenerateData from '@/appComponents/admin/generateData/generateDataUI.vue'
import ArchiveData from '@/appComponents/admin/archiveData/archiveDataUI.vue'
import log from 'electron-log'


export default{
  props: ['jumpToConfigTab'],
  components: {
    UpdateData,
    EditPresentation,
    ManagePresentations,
    UpdateApplication,
    ConfigureApplication,
    GenerateData,
    ArchiveData
  },
  data() {
    return {
      tabIndex: 0,
      tabs: [
        {name: 'update data', index: 0, isActive: true, hasBeenLoaded: false, childId: 'adminUpdateData', uiToLoad: UpdateData, isAdminOnly: false},
        {name: 'update application', index: 1, isActive: false, hasBeenLoaded: false, childId: 'adminUpdateApplication', uiToLoad: UpdateApplication, isAdminOnly: false},
        {name: 'manage presentations', index: 2, isActive: false, hasBeenLoaded: false, childId: 'adminManagePresentation', uiToLoad: ManagePresentations, isAdminOnly: false},
        // if you move `configuration`, update the default tab index that opens for a first time user!
        {name: 'configuration', index: 3, isActive: false, hasBeenLoaded: false, childId: 'adminConfiguration', uiToLoad: ConfigureApplication, isAdminOnly: false},
        {name: 'edit presentation', index: 4, isActive: false, hasBeenLoaded: false, childId: 'adminEditPresentation', uiToLoad: EditPresentation, isAdminOnly: true},
        {name: 'generate data', index: 5, isActive: false, hasBeenLoaded: false, childId: 'adminGenerateData', uiToLoad: GenerateData, isAdminOnly: true},
        {name: 'data archive', index: 6, isActive: false, hasBeenLoaded: false, childId: 'adminArchiveData', uiToLoad: ArchiveData, isAdminOnly: true}
      ],
      vues: []
    }
  },

  computed: {
    ...mapState(['isAdminUser', 'applicationVersion'])
  },

  mounted() {
    // because the tabs are getting defined above, they are still being written to the DOM when this code runs. Need to show a given tab after the DOM loads
    //  https://github.com/vuejs/vue/issues/2918
    setTimeout(() => { // setTimeout to put this into event queue
      if (this.jumpToConfigTab) {
        this.tabIndex = 3
      }
      this.setActive(this.tabs[this.tabIndex])
    }, 0)
  },
  methods: {
    toggleShown() {
      this.shown = !this.shown
      this.adminObj.isShown(this.shown)
      if (this.shown) {
        this.setActive(this.tabs[this.tabIndex])
      }
      if (!this.shown) {
        this.adminObj.closeAdmin()
      }
    },
    setActive(tab) {
      this.tabs.forEach( t => { t.isActive = false })
      tab.isActive = true
      this.tabIndex = tab.index  // store so when the user returns to admin, they're where they left off

      // build the tabs on-demand so we dont use resources that are never used.
      if (!tab.hasBeenLoaded) {
        tab.hasBeenLoaded = true
        this.vues[tab.index] = new Vue({
          el: '#' + tab.childId,
          store: this.$store,
          render: h => h(tab.uiToLoad, { props: {adminObj: this.adminObj } })
        })
      } else {
        // call the child tab's getPresentations function to refresh the list of presentations.
        // This matters e.g. when a new presentation has been created in "edit presentation", then the user comes back to "manage presentation".
        // We want the new presentation to appear
        if (this.vues[tab.index].$children[0].getPresentations) {
          this.vues[tab.index].$children[0].getPresentations()
        }
      }
    }
  }
}


</script>

<style scoped lang="scss">

</style>
