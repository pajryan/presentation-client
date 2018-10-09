'use strict';

/*
  A note about this file
  The following code is called from slideshow/page.js. It could logically have simply been run from there, eliminating this file altogether.

  However page.js uses google's `module.exports = class<>` pattern
  That is incompatible with import statements (e.g. `import Vue from 'vue'`)
  One could instead use require (e.g. `require('vue')`) but Vue is picky and require doesn't work

  One solution is to change webpack to a vue alias (the common solution).  But webpack in electron is a bit of different beast, and wasn't obvious how to get that to work.

  So rather than make infrastructure changes, page.js simply calls this file, which is constructed with the `export function<>` pattern. 
  This is compatible with import statements and all is well.

*/

/* tslint:disable */

import Vue from 'vue'
import generateDataUI from './generateDataForOnePageUI.vue'

export function build(admin, pageItems, pageData, uiElem, state){
  new Vue({
    el: uiElem,
    render: h => h(generateDataUI, {
      props: {pageData: pageData, adminObj: admin, pageItems: pageItems, state: state}
    })
  })

}



