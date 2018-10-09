<template>
  <div id="app">  

    <!-- the slideshow -->
    <Slideshow v-if="!isAdminShown" />

    <!-- the admin panel -->
    <Admin v-if="isAdminShown" />

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

import buildApp from './appComponents/admin.js'

export default {
  components: {Admin, GlobalNavigation, Slideshow, TableOfContents},
  computed: {
    ...mapState(['isAdmin', 'isAdminShown'])
  },
  mounted() {
    // want to check if this is a first time user.  If so, default to the configuration tab so they can fill out required content
    //  We will check if they're first time by examining their storage directory. If it doesn't have the config file, they're new.

  }
}
</script>


<style lang="scss">
// this is ROOT css stuff.  Note that Bootstrap is loaded in main.ts (loading it here doesn't work)

// MOST important. Styles are in src/assets/css
//  but they get loaded via vue.config.js (to handle converting scss to css)

// this is really helpful for styles/icons: https://github.com/SimulatedGREG/electron-vue/issues/463
</style>
