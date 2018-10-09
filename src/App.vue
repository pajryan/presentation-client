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
const Admin = require('@/appComponents/Admin.vue').default
const GlobalNavigation = require('@/appComponents/GlobalNavigation.vue').default
const Slideshow = require('@/appComponents/Slideshow.vue').default
const TableOfContents = require('@/appComponents/TableOfContents.vue').default
export default {
  components: {Admin, GlobalNavigation, Slideshow, TableOfContents},
  computed: {
    ...mapState(['isAdmin', 'isAdminShown'])
  },
  mounted() {
    // empty
  }
}
</script>


<style lang="scss">
// this is ROOT css stuff.  Note that Bootstrap is loaded in main.ts (loading it here doesn't work)

// MOST important. Styles are in src/assets/css
//  but they get loaded via vue.config.js (to handle converting scss to css)

// this is really helpful for styles/icons: https://github.com/SimulatedGREG/electron-vue/issues/463
</style>
