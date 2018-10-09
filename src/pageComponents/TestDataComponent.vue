<template>
    <div>
      <p>This number is updated from the data tab in admin</p>
      <p class="text-danger">d1 {{uiData1}}</p>
      <p class="text-danger">d2 {{uiData2}}</p>
      <p class="text-danger">d3 {{uiData3}}</p>
    </div>
</template>



<script>
  /* tslint:disable */
  import Vue from 'vue'
  // const fileData = require('file://Users/patrickryan/Library/Application%20Support/Electron/_data/DoubleNumber.json')

   // using http://animejs.com/documentation/ for animations

  export default {
    props: ['itm', 'uiElem', 'data'], 

    data () {
      return {
        showingStuff: false,
        uiData1: 'nothing',
        uiData2: 'nothing',
        uiData3: 'nothing',
      }
    },
    mounted () {
      window.addEventListener('resize', this.resize); // add an event listener in case you'll need to adjust on resize
      // console.log('in the component',this.itm)
      // console.log('inside component with data', this.data)
      
      // if this is expecting data, make sure we got it.  this.data is an array of data objects (from files)
      //  if there was an error reading in the file, data[n] will be {error: <errorMsg>, filename: <filename>}
      this.data.forEach((d, i) => {
        if(d.error){
          console.error('do something about this!', error)
        }else{
          if(i==0){
            this.uiData1 = d[0].passedValue
          }
          if(i==1){
            this.uiData2 = d[0].passedValue
          }
          if(i==2){
            this.uiData3 = d[0].passedValue
          }
          
        }
      })
      // console.log('set ui data to', this.uiData)
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