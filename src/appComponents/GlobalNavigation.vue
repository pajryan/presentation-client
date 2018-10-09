<template>
  <div id="globalNavigation">
    <h1>global navigation</h1>
    <img alt="dci logo" src="../assets/img/dciLogoDots.png">
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
