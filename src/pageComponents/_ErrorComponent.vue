<template>
    <div>
      <p>There was an error loading this page.</p>
      <div>
        <p class="text-danger">{{data.errorMsg}}</p>
      </div>
    </div>
</template>



<script>
  /* tslint:disable */
  import Vue from 'vue'

  export default {
    props: ['itm', 'uiElem', 'data'], 

    data () {
      return {
        msg: 'stuff'
      }
    },
    mounted () {
      window.addEventListener('resize', this.resize); // add an event listener in case you'll need to adjust on resize
    },
    methods: {

      beforeDestroy: function () {
        window.removeEventListener('resize', this.resize) 
      },
      resize(event) { 
        // deal with resizing here
       },

    }
  }


  
</script>

<style scoped lang="scss">
</style>