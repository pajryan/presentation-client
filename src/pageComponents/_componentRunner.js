'use strict';
/* tslint:disable */
/*
  A note about this file
  The following code is called from slideshow/page.js. It could logically have simply been run from there, eliminating this file altogether.

  However page.js uses google's `module.exports = class<>` pattern
  That is incompatible with import statements (e.g. `import Vue from 'vue'`)
  One could instead use require (e.g. `require('vue')`) but Vue is picky and require doesn't work

  One solution is to change webpack to a vue alias (the common solution).  But webpack in electron is a bit of different beast, and wasn't obvious how to get that to work.

  So rather than make infrastructure changes, page.js simply calls this file, which is constructed with the `export function<>` pattern. 
  This is compatible with import statements and all is well.


  Will also use this to fetch data needed for the component
*/


import Vue from 'vue'

const path = require('path');
const fs = require('fs')

let componentMap = require('../components/_componentMap');  // this draws in ALL components
let dataSourceConfig = require('./../admin/adminUI/generateData/dataSourceConfig')

export function build(itm, uiElem, _state){
  // get the right component
  let component = componentMap(itm.type.component)
  

  // console.log('Building Component', itm, _state)

  let data = [];
  let dataOk = false;
  let errorMsg = 'unknown'
  if(itm.type.data){
    let appDataPath = path.join(_state.appPath, _state.appDataStorePath);
    let dataFiles = itm.type.data;
    dataFiles.forEach((dataSourceName, i) => {
      //get the datasource details for this datasource
      let dataSource = dataSourceConfig.dataSources.filter(d => d.name === dataSourceName)[0];
      dataSource.resultHandling.forEach(rh => {
        // get the data and store, to be passed to the component
        let filename = rh.filename
        try{
          data.push( JSON.parse(fs.readFileSync(path.join(appDataPath, filename))) )
          dataOk = true;
        }catch(err){
          console.error('unable to fetch data file ' + filename, err)
          errorMsg = 'unable to fetch data file ' + filename
        }
      })
    })
  }else{
    // no data needed
    dataOk = true;
  }

  let componentVue = null;
  if(dataOk){
    // loaded the requested component with data etc
    componentVue = new Vue({
      el: uiElem,
      render: h => h(component, {
        props: {itm: itm, uiElem: uiElem, data: data}
      })
    })
  }else{
    // error loading the component, say so.
    component = componentMap('ErrorComponent')
    componentVue = new Vue({
      el: uiElem,
      render: h => h(component, {
        props: {itm: itm, uiElem: uiElem, data: {errorMsg: errorMsg}}
      })
    })
  }


}



