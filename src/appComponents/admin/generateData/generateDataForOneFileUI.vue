<template>
    <div class="oneDataUpdateComponent" style="padding-left: 6px;">

      <!-- parameters -->
      <div v-for="parameter in dataSource.sqlParameters" class="dataSourceParameter"  :key="parameter.index">
        <label>{{ parameter.label }}: </label>
        <input v-model="parameter.value" />
      </div>
      <button type="button" class="btn btn-primary btn-sm runOneDataButton" @click="queryAndWriteOneDataSource(dataSource)" :disabled="dataSource.isRunning">run</button>
      
      <!-- messages -->
      <label :hidden="dataSource.successMsg==null"  class="alert alert-success"><span v-html="dataSource.successMsg"></span></label>
      <label :hidden="dataSource.errorMsg==null"  class="alert alert-danger">{{ dataSource.errorMsg }}</label>

      <!-- qa component -->
      <dataQualityControlUI v-if="dataSource.succeeded" :dataSource="dataSource" :adminObj="adminObj" />


      <!-- components that use this dataSource -->
      <div v-if="showOtherComponentsThatUseThisData">
        <p class="relatedComponentsLink" @click="dataSource.isExpanded = !dataSource.isExpanded">show/hide related components</p>
        <div v-if="dataSource.isExpanded" class="relatedComponents alert alert-primary">
          Components <b>in the active presentation</b> that use this data:
          <ol v-if="activePresentationComponents.filter(c => c.data.find(f => f===dataSource.name)).length>0">
            <li v-for="component in activePresentationComponents.filter(c => c.data.find(f => f===dataSource.name))" :key="component.index">
              {{component.component}}
            </li>
          </ol>
          <ul v-else>
            <li><i>none found. (but could be in other presentations!)</i></li>
          </ul>
        </div>
      </div>

    </div>
</template>



<script>
  /* tslint:disable */
  import Vue from 'vue'
  import queryRunnerFileWriter from './queryRunnerFileWriter.js'
  let dataSourceConfigImport = require('./dataSourceConfig')
  let componentRunner = require('./../../../components/_componentRunner.js')
  
  import dataQualityControlUI from './dataQualityControlUI.vue'

  export default {
    components: {
      dataQualityControlUI
    },

    // componentIndex is the index of the component on the page that this whole section is reponsible for updating. we'll use it when refreshing components
    props: ['componentIndex', 'itemDataSourceConfig', 'showOtherComponentsThatUseThisData', 'adminObj', 'pageItems', 'state'], 

    data () {
      return {
        dataSource: this.itemDataSourceConfig.dataConfig,
        activePresentationComponents: []
      }
    },
    mounted () {
      // use Vue.set to add new keys (https://vuejs.org/2016/02/06/common-gotchas/)
      Vue.set(this.dataSource, 'isRunning', false)
      Vue.set(this.dataSource, 'attempted', false)
      Vue.set(this.dataSource, 'succeeded', false)

      Vue.set(this.dataSource, 'successMsg', null)
      Vue.set(this.dataSource, 'errorMsg', null)
      Vue.set(this.dataSource, 'isExpanded', false)

      // capture the components used in the active presentation. We'll try to open these up later.
      this.activePresentationComponents = this.adminObj.getActivePresentationItemOfType('component');

      window.addEventListener('resize', this.resize); // add an event listener in case you'll need to adjust on resize
    },
    methods: {
      queryAndWriteOneDataSource (dataSource, callback = this.runResult) {
        dataSource.isRunning=true;
        dataSource.attempted=true;
        dataSource.successMsg = null;
        dataSource.errorMsg = null;
        console.log('running dataSource with', dataSource)
        let qr = new queryRunnerFileWriter(dataSource, this.adminObj.state(), callback)
      },

      // probably don't want to actually return all the results... could be huge
      runResult (result, dataSource){ // result is an object of {success:true, results:..., filesWritten:...} or {success:false, err: error}
        dataSource.isRunning = false;
        console.log('datasource', dataSource)
        // we get here even if we've had an error. So check that the error message hasn't already been populated
        if(result.success && dataSource.errorMsg == null){
          dataSource.succeeded = true;
          dataSource.successMsg = 'received ' + result.result.length + ' record set(s), with a total of ' + result.result.reduce((p,c) => p + c)+ ' records. Wrote ' + result.filesWritten + ' file(s) ';
        }else if(result.error != null){
          dataSource.errorMsg = 'error: ' + result.error
        }

        // would like to refresh the related component(s)
        let itmToRefresh = this.pageItems[this.componentIndex];
        let uiElemToRefresh = itmToRefresh.uiElem;
        // kill anything inside this UI component.  Note that I'm not properly removing the element 
        //  so i'm not removing event listeners etc.  I'm deeming this ok since this is an admin task, but:
        //  TODO: Properly remove the contents of this item
        uiElemToRefresh.innerHTML = '';
        // Vue overwrites the element (see same in page.js). So give it a child div to work with
        componentRunner.build(itmToRefresh, uiElemToRefresh.appendChild(document.createElement('div')), this.state)

        // pass the datasource to the qa mechanism
        

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

  .runOneDataButton{
    padding: 3px;
    line-height: 1;
    position: absolute;
    right: 5px;
    margin-top: -1.8em;
  }

  .dataSourceParameter label{
    font-weight: normal;
  }

  .relatedComponentsLink{
    color: #008edc;
    cursor: pointer;
    font-size: 0.8em;
    text-align: right;
  }

  .relatedComponents{
    margin-left: 14px;
  }
  
</style>