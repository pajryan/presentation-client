<template>
  <div id="app">  

    <!-- the slideshow -->
    <Slideshow v-if="!isAdminShown" />

    <!-- the admin panel -->
    <Admin v-if="isAdminShown" :jumpToConfigTab="jumpToConfigTab" />

    <!-- table of contents (e.g. coverflow) (always shown, is just behind admin or slideshow) -->
    <TableOfContents v-if="!isAdminShown" />

    <!-- the global navigation (always shown, is just behind admin or slideshow) -->
    <GlobalNavigation />
  </div>  
</template>

<script>
import { mapState } from 'vuex' // import state
import Admin from '@/appComponents/Admin.vue'
import GlobalNavigation from '@/appComponents/GlobalNavigation.vue'
import Slideshow from '@/appComponents/Slideshow.vue'
import TableOfContents from '@/appComponents/TableOfContents.vue'
import log from 'electron-log'

import { appInitialization } from '@/appComponents/adminFunctions.ts'



export default {
  components: {Admin, GlobalNavigation, Slideshow, TableOfContents},
  computed: {
    ...mapState(['appPath', 'isAdminUser', 'isAdminShown'])
  },
  data() {
    return {
      jumpToConfigTab: false
    }
  },
  mounted() {
    log.info('All data is stored in ' + this.appPath)
    // want to check if this is a first time user.  If so, default to the configuration tab so they can fill out required content
    //  We will check if they're first time by examining their storage directory. If it doesn't have the config file, they're new.
    if (appInitialization.isFirstTimeUser()) {
      // build the directory structure required for the app & open the config tab in admin
      log.info('this is a first-time user. directing them to admin -> configuration')
      this.$store.commit('setIsFirstTimeUser', true)  // set state for first time user
      this.jumpToConfigTab = true                     // default to config tab
      this.$store.commit('setIsAdminShown', true)     // open the admin
      appInitialization.initAppDirectories()          // create the directory structure and skeleton files
    }
  }
}
</script>


<style lang="scss">
// this is ROOT css stuff.  Note that Bootstrap is loaded in main.ts (loading it here doesn't work)

// MOST important. Styles are in src/assets/css
//  but they get loaded via vue.config.js (to handle converting scss to css)

// this is really helpful for styles/icons: https://github.com/SimulatedGREG/electron-vue/issues/463
</style>
