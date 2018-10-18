<template>
  <div id="tableOfContents">
    <h1>table of contents</h1>
  </div>
</template>


<script>

import { mapState } from 'vuex' // import state
export default{
  components: {},
  data() {
    return {
    }
  },

  computed: {
    ...mapState(['isAdminUser'])
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
