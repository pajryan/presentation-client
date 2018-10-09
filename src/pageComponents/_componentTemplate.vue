<template>
    <div>
      <p>Sample Component</p>
      <button id="sampleButton" type="button" class="btn btn-primary" @click="showStuff" >show stuff</button>

      <div v-if="showingStuff">
        <p  class="text-danger">{{msg}}</p>
      </div>

      
    </div>
</template>



<script>
  /* tslint:disable */
  import Vue from 'vue'

   // using http://animejs.com/documentation/ for animations

  export default {
    props: ['itm', 'uiElem', 'data'], 

    data () {
      return {
        showingStuff: false,
        msg: 'stuff',
      }
    },
    mounted () {
      window.addEventListener('resize', this.resize); // add an event listener in case you'll need to adjust on resize
      console.log('in the component',this.itm)
      
      // if this is expecting data, make sure we got it.  this.data is an array of data objects (from files)
      //  if there was an error reading in the file, data[n] will be {error: <errorMsg>, filename: <filename>}
      this.data.forEach(d => {
        if(d.error){
          console.error('do something about this!', error)
        }
      })
    },
    methods: {
      showStuff(){
        this.showingStuff = true;

        anime({
          targets: document.getElementById('sampleButton'),
          translateX: 500
        });
      },



      beforeDestroy: function () {
        // REMOVE all event listeners!
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