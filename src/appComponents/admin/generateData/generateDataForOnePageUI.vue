<template>
    <div>
      <p>this page has {{components.length}} component(s)</p>
      <ul v-if="components.length>0">
        <li v-for="(component, i) in components" :key="i">
          {{component.component}} ({{component.data.length}} data source(s))
          <ul v-if="component.data.length>0">
            <li v-for="(data, j) in component.data" :key="j">
              {{data.dataFile}} ({{data.linksToData.length}} data file(s))
              <ul>
                <li v-for="(file, f) in data.linksToData" :key="f">
                  <span v-html="file"></span><br />
                </li>
              </ul>
              <generateDataItemUI name="data.dataFile" :componentIndex="i" :adminObj="adminObj" :itemDataSourceConfig="data" :showOtherComponentsThatUseThisData="false" :pageItems="pageItems" :state="state" />
            </li>
          </ul>
        </li>
      </ul>
    </div>
</template>



<script>
  /* tslint:disable */
  import Vue from 'vue'
  import path from 'path'
  let dataSourceConfigImport = require('./dataSourceConfig')
  import generateDataItemUI from './generateDataForOneFileUI.vue'

  export default {
    components: {
      generateDataItemUI
    },
    props: ['pageData', 'adminObj', 'pageItems', 'state'], 

    data () {
      return {
        Vue: Vue,
        components: [],
        dataSourceConfig: dataSourceConfigImport.dataSources
      }
    },
    mounted () {
      window.addEventListener('resize', this.resize); // add an event listener in case you'll need to adjust on resize

      let pageItems = this.pageData.pageItems;
      let pageItemTypes = pageItems.map(pi => pi.type);
      this.components = pageItemTypes.filter(pit => pit['component']);
      this.components = this.components.map(c => {
        let o = {
          component: c.component,
          data: []
        }
        c.data.forEach(d => {
          // get the actual data files associated with the data source
          let dataSourceInfo = this.dataSourceConfig.filter(dc => dc.name === d)[0];
          let files = dataSourceInfo.resultHandling.map(d => d.filename);
          let fileLinks = files.map(f => '<a href="file://'+path.join(this.adminObj.getAppDataPath(), f)+'" target="_blank">'+f+'</a> ')

          o.data.push({
            dataFile: d,
            dataConfig: this.dataSourceConfig.filter(dc => dc.name === d)[0],
            linksToData: fileLinks
          })
        })
        return o;
      })
    },
    methods: {
      showDataFile(dataFilename){

      },

      beforeDestroy: function () {
        window.removeEventListener('resize', this.resize) 
      },
      resize(event) { 
        // deal with resizing here
      }

    }
  }


  
</script>

<style scoped lang="less">
</style>