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
        <a href="#" class="nav-link" :class="{active:tab.isActive}" @click.stop.prevent="setActive(tab)">{{ tab.name }}</a>
      </li>
    </ul>
    <div class="tab-content">       
      <div v-for="tab in tabs" :key="tab.index" class="tab-pane" :class="{active:tab.isActive}">
        <div :id="tab.childId">{{tab.childId}}</div>
      </div>
    </div>
  </div>
</template>


<script>

import { mapState } from 'vuex' // import state
import UpdateData from '@/appComponents/admin/updateData/updateDataUI.vue'
import EditPresentation from '@/appComponents/admin/editPresentation/editPresentationUI.vue'
import ManagePresentations from '@/appComponents/admin/managePresentations/managePresentationsUI.vue'
import UpdateApplication from '@/appComponents/admin/updateApplication/updateApplicationUI.vue'
import ConfigureApplication from '@/appComponents/admin/configuration/configurationUI.vue'
import GenerateData from '@/appComponents/admin/generateData/generateDataUI.vue'
// import ArchiveData from '@/appComponents/admin/archiveData/archiveDataUI.vue'

export default{
  components: {},
  data() {
    return {
      tabIndex: 1,
      tabs: [
        {name: 'update data', index: 0, isActive: true, hasBeenLoaded: false, childId: 'adminUpdateData', uiToLoad: UpdateData},
        {name: 'update application', index: 1, isActive: false, hasBeenLoaded: false, childId: 'adminUpdateApplication', uiToLoad: UpdateApplication},
        {name: 'manage presentations', index: 2, isActive: false, hasBeenLoaded: false, childId: 'adminManagePresentation', uiToLoad: ManagePresentations},
        // if you move `configuration`, update the default tab index that opens for a first time user!
        {name: 'configuration', index: 3, isActive: false, hasBeenLoaded: false, childId: 'adminConfiguration', uiToLoad: ConfigureApplication}
      ],
      vues: []
    }
  },

  computed: {
    ...mapState(['isAdmin', 'applicationVersion'])
  },

  mounted() {
    // empty
  },
  methods: {
    // empty
  }
}


</script>

<style scoped lang="scss">

</style>
