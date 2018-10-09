<template>
  <div id="slideshow">
    <h1>slideshow</h1>
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
