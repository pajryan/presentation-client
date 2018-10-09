<template>
    <div>
      <p>Data QA: </p>
      <ul>
        <li v-for="(qaMessage, i) in qaMessages" :key="'qamessage='+i">
          {{qaMessage.filename}}:  {{qaMessage.label}}: {{qaMessage.value}}
        </li>
        <p v-for="(svg, i) in sparkSVGs" :key="'sparkline-'+i" class="sparkHolder">
          <span v-html="svg"></span>
        </p>
      </ul>
    </div>
</template>



<script>
  /* tslint:disable */
  import Vue from 'vue'
  import fs from 'fs'
  import path from 'path'
  let qa = require('./dataQualityControlScripts')

  export default {
    props: ['dataSource', 'adminObj'], 

    data () {
      return {
        resultHandling: [],
        qaMessages: [],
        sparkSVGs: []
      }
    },
    mounted () {
      // goal here is to run the various QA queries and report back results
      //  all it needs is a datasource. It grabs the flat files (assumes they exist), and runs the qa
      this.resultHandling = this.dataSource.resultHandling;
      this.resultHandling.forEach(rh => {
        this.runOneQA(rh);
      })


      window.addEventListener('resize', this.resize); // add an event listener in case you'll need to adjust on resize
    },
    methods: {
      runOneQA: function(resultHandle){
        if(!resultHandle.qa){return;}
        // get the file associated with this result
        let data = JSON.parse(fs.readFileSync(path.join(this.adminObj.getAppDataPath(), resultHandle.filename)))
        console.log('data for qa', data)

        let qaObj = new qa(data, resultHandle) 

        // run qa scripts against the data
        if(resultHandle.qa.scripts){
          let scriptResults = qaObj.runQaFunctions();
          this.qaMessages = this.qaMessages.concat(scriptResults); // add to the existing array
        }
        

        // build sparkline
        if(resultHandle.qa.sparklineFields){
          let svgs = qaObj.makeSparklines();
          console.log('got sparklines:', svgs)
          this.sparkSVGs = this.sparkSVGs.concat(svgs)
        }

        // get asof date
        if(resultHandle.qa.asOfDateScript){

        }

        

      },

      beforeDestroy: function () {
        window.removeEventListener('resize', this.resize) 
      },
      resize(event) { 
        // deal with resizing here
       },

    }
  }


  
</script>

<style scoped lang="less">
  .sparkHolder /deep/ svg path.line{
    fill: none;
    stroke: blue
  }
  .sparkHolder /deep/ svg text{
    fill: blue;
  }
</style>