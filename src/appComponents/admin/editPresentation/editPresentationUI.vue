<template>
    <div>
      select a presentation to edit: 
      <select v-model="selectedPresentationId" @change="presentationSelected" class="form-control">
        <option style="background: red" v-for="presentation in presentations" :key="presentation.metadata.id" :value="presentation.metadata.id" :class="selectedPresentationIsActive?'table-success':''">{{presentation.metadata.title}}, v{{presentation.metadata.version}} {{presentation.metadata.id===currentActivePresentationId?' (currently active)':''}}</option>
      </select>
      <div>
        <ul>
          <li v-for="error in validationErrors" :key="error.num">validation error:<br /><span class="alert-danger">{{error.message}}<br />({{error.path}})</span></li>
        </ul>
      </div>
      <div id="presentationEditorControls" v-if="selectedPresentationId!=''">
        <button type="button" class="btn btn-primary" @click="savePresentation" v-if="!selectedPresentationIsActive">save changes</button>
        <button type="button" class="btn btn-primary" @click="savePresentation" v-if="selectedPresentationIsActive">save changes and make active</button>
        <button type="button" class="btn btn-primary" @click="discardChanges">discard changes</button>
      </div>
      <div id="presentationEditor"></div>
      
    </div>
</template>



<script>
  import Vue from 'vue'

  // note that I had to modify jsoneditor. So I moved it out of node_modules into this diretory.
  require('./jsoneditor.js')  // impacts window object directly (not ideal..), so don't load as module

/***
 *
 * NOTE NOTE NOTE NOTE NOTE NOTE NOTE NOTE NOTE NOTE NOTE NOTE NOTE NOTE NOTE NOTE NOTE NOTE
 * * NOTE NOTE NOTE NOTE NOTE NOTE NOTE NOTE NOTE NOTE NOTE NOTE NOTE NOTE NOTE NOTE NOTE NOTE
 * * NOTE NOTE NOTE NOTE NOTE NOTE NOTE NOTE NOTE NOTE NOTE NOTE NOTE NOTE NOTE NOTE NOTE NOTE
 * * NOTE NOTE NOTE NOTE NOTE NOTE NOTE NOTE NOTE NOTE NOTE NOTE NOTE NOTE NOTE NOTE NOTE NOTE
 *
 *
 *  the json editor loads super slow with all the base64 images.  But rather than get fancy, just change from base64 to an image path
 *   The images wil be stored in the user directory (in a new folder) by UUID (?)
 *
 * When the user "publishes" a presentation, we just also publish any related images to the server
 *   can later get smart and publish only changed images
 *
 *  This means that all editing still takes place within json editor (KEY GOAL!)
 *
 *
 *
 * * NOTE NOTE NOTE NOTE NOTE NOTE NOTE NOTE NOTE NOTE NOTE NOTE NOTE NOTE NOTE NOTE NOTE NOTE
 *
 */


  const fs = require('fs')
  const zlib = require('zlib')

  // load the json schema for the presentation.
  const schema = require ('./presentationSchema.json')
  //  I want that schema to include enums for the available components and the available data items.
  //    those enums are defined in the #definitions section of presentationSchema.json
  //  but, since it's just JSON, i'm overwriting the definition values with the actual available items (overwriting the enum.)
  //  (I tried using external $ref in the schema, but the library uses ajax, which isn't compatible with the electron package)
  const dataSourceConfig = require('./../generateData/dataSourceConfig.json')   // this defines what data is available
  const validDataValues = dataSourceConfig.dataSources.map(d => d.name)         // just expose the name
  schema.definitions.dataFileValues.enum = validDataValues                      // update the definition of the schema
  // now go get an enum of components from the componentMap
  import components from './../../../pageComponents/_componentMap.ts'
  schema.definitions.componentsList.enum = components



  import SimpleMDE from 'simplemde'
  window.SimpleMDE = SimpleMDE   // set on window object because that's where json-editor looks for it


  export default {
    props: ['adminObj'],
    data() {
      return {
        presentations: [],
        selectedPresentationId: '',
        selectedPresentationObject: {},
        selectedPresentationIsActive: false,
        currentActivePresentationId: '',
        editor: null,
        validationErrors: []
      }
    },
    mounted() {
      // get the available presenations.
      this.getPresentations()

    },
    methods: {
      getPresentations() { // Note that this is ALSO called when the tabs are clicked on the admin interface - to make sure the presentation lists are in sync
        this.presentations = this.adminObj.getPresentations()
        this.currentActivePresentationId = this.adminObj.getActivePresentationId()
      },
      presentationSelected() {
        // kill any existing editor
        if (this.editor) {this.editor.destroy()}
        this.selectedPresentationObject = {}
        // get the new object and load it up
        this.selectedPresentationObject = this.adminObj.getPresentationById(this.selectedPresentationId)
        // see if this presentation (which is being edited) is the active presentation
        this.selectedPresentationIsActive = this.currentActivePresentationId === this.selectedPresentationId
        this.buildEditor(this.selectedPresentationObject)
      },
      buildEditor(presenationObj) {
        // load the json schema and load the data file
        //  note that the markdown editor uses https://simplemde.com/
        const editorElem = document.getElementById('presentationEditor')
        const editorOpts = {
          schema,   // in ES6, this is equivalent to schema: schema
          startval: presenationObj,
          theme: 'bootstrap2',
          // ajax: true,
          disable_edit_json: true, disable_properties: true, disable_collapse: true
        }

        // set the event handling for uploading images
        JSONEditor.defaults.options.upload = this.imageUploadComplete.bind(this)

        this.editor = new JSONEditor(editorElem, editorOpts, 'file:///' + this.adminObj.getAppImagePath())
        this.editor.on('ready', this.validateEditor)
      },

      imageUploadComplete(type, file, cbs) {
          const fileName = this.adminObj.saveImage(file.path)
          cbs.success(fileName)
          // can use the following to manage an automatic progressbar
          // var tick = 0;
          // var tickFunction = function() {
          //   tick += 1;
          //   console.log('progress: ' + tick);
          //   if (tick < 100) {
          //     cbs.updateProgress(tick);
          //     window.setTimeout(tickFunction, 50)
          //   } else if (tick == 100) {
          //     cbs.updateProgress();
          //     window.setTimeout(tickFunction, 500)
          //   } else {
          //     cbs.success('http://www.example.com/images/' + file.name);  // this is what gets returned to the editor to be saved
          //   }
          // };
          // window.setTimeout(tickFunction)

      },


      validateEditor() {
        // Now the api methods will be available
        this.validationErrors = this.editor.validate()
        if (this.validationErrors.length > 0) {
          log.error('error validating presentation flow against schema', this.validationErrors)
          log.error('the schema is', schema)
          log.error('the data is', this.editor.getValue())
        }
        return this.validationErrors.length === 0
      },
      savePresentation() {
        /*
          With every save:
          - increment the version number
            - version number is not user editable
          - update the createdAt date (also not user editable)
          - create an entirely new file (new UUID)

          - this will mean that we never conflict - there is no editing an existing file, only creating a new one

          - then, can decide what to do with the "old" version
            - could delete it locally and remotely
            - could just keep everything and let the user deal with deleting
        */
        if (this.validateEditor) {
          const newValue = this.editor.getValue()
          const newUUID = this.adminObj.getUUID()
          newValue.metadata.version += 1 // increment version #
          newValue.metadata.isPublished = false
          newValue.metadata.creationDate = new Date().getTime()   // update
          newValue.metadata.id = newUUID                          // new UUID
          this.adminObj.writePresentation(newValue)

          // for now, I'm going to delete (archive) the local copy of the "old" presentation
          // however if the current is active, need to mark the new one as active
          if (this.selectedPresentationIsActive) {
            // make the new presentation active
            this.adminObj.setActivePresentation(newUUID)
          }
          this.adminObj.deletePresentation(this.selectedPresentationId)

          // update things on this local page
          this.selectedPresentationObject = newValue
          this.selectedPresentationId = newUUID
          this.getPresentations()
          this.presentationSelected()
        }

      },
      discardChanges() {
        // just kill the existing editor and reload the latest presenation
        if (window.confirm('Clicking OK will discard any edits you may have made')) {
          if (this.editor) {this.editor.destroy()}
          this.buildEditor(this.selectedPresentationObject)
        }
      }
    }
  }


</script>

<style  lang="scss">
  #presentationEditorControls{
    float:right;
  }


  $textColor:#666;
  $borderColor:#dee2e6;

  #presentationEditor{
    margin-top: 70px; // this needs to be pushed down to not cover the buttons
  }

  #presentationEditor h3{
    font-size: 1.1em;
    margin-top: 15px;
  }

  #presentationEditor h3 span{
    padding-right:15px
  }

  #presentationEditor .card{
    border: 0px;
  }

  #presentationEditor .row{
    float:left;
    margin-right: 20px;
  }
  #presentationEditor .form-control-label{
    color: $textColor;
  }
  #presentationEditor .form-group input{
    width:130px;
  }
  #presentationEditor .form-text{
    color: $textColor;
    font-size: 0.9em;
  }

  #presentationEditor .nav{
    height: 23px;
  }
  #presentationEditor .nav li{
    border-top: 1px solid $borderColor;
    border-left: 1px solid $borderColor;
    border-right: 1px solid $borderColor;
  }
  #presentationEditor .nav li a{
    padding: 2px 6px;
    background: $borderColor;
    color: $textColor;
  }
  #presentationEditor .nav li a:hover{
    text-decoration:none;
  }
  #presentationEditor .nav li.active a{
    border-bottom:1px solid #fff;
    background: #fff;
    color: #000;
  }

  #presentationEditor .col-md-10{
    margin-left:110px;
  }
  
  #presentationEditor div[data-schemapath*="root.metadata"] .control-label{
    margin-top: 15px;
  }
  #presentationEditor div[data-schemapath*=".thumbnail"] .control-label{
    margin-top: 15px;
  }

  #presentationEditor div[data-schemapath*=".pages."]{
    padding-bottom:12px;
    margin-bottom:22px;
  }

  #presentationEditor div[data-schemapath*=".pages"]{
    margin-left:12px;
  }

  #presentationEditor div[data-schemapath*=".pages"] ul.nav{
    // margin-left:12px;
  }

 #presentationEditor div[data-schemapath*=".pageItems"] table{
    width: 100% !important;
  }

  #presentationEditor td[data-schemapath*=".type"] select{
    font-style: normal !important;
  }


  #presentationEditor .btn{
    border-radius: 0.25rem;
    margin-right: 3px;
    width: 24px;
    height: 24px;
    padding: 0px;
    background: #ccc;
    color: $textColor
  }

  // the following try to style the default "upload button"
  #presentationEditor input[type=file] {
    position: relative;
    -webkit-appearance: textfield;
    width: 60% !important;
    // border: 1px solid red;
    -webkit-box-sizing: border-box;
    left: 85px;
    
  }
  #presentationEditor input[type=file]::-webkit-file-upload-button {
    border: none;
    margin: 0;
    padding: 0;
    -webkit-appearance: none;
    width: 0;
    // width: 60% !important;
  }
  /* "x::-webkit-file-upload-button" forces the rules to only apply to browsers that support this pseudo-element */
  #presentationEditor x::-webkit-file-upload-button, input[type=file]:before {
    content: 'Browse...';
    display: inline-block;
    // left: 100%;
    left: -85px;
    padding: 3px 8px 2px;
    position: relative;
    -webkit-appearance: button;
  }



  #presentationEditor .json-editor-btn-upload{
    width: 70px;
    height: 26px;
    margin-top: 3px;
    background: #bddce8;
    color: white;
    background: #007bff;
  }

  #presentationEditor .json-editor-btn-upload:hover{
    background:#0069d9 !important;
  }

  #presentationEditor div.progress{
    margin-top: 3px;
  }

  #presentationEditor div.progress div.bar{
    background: #008eec;
  }

  //force the preview image to not be too large
  a.inlineImagePreview img{
    width: 80%;
    max-width: 600px;
    max-height: 600px;
    border: 1px solid #ddd;
  }



  #presentationEditor .btn:hover{
    background: #bddce8;
  }

  
  #presentationEditor input[name*="root[metadata][version]"]{
    background:#bddce8;
    border: 0;
    width: 40px !important;
    position: relative;
    top: -29px;
    left: 60px;
    text-align: center;
  }

  // drop downs used to select a component and the component's data items
  #presentationEditor tbody td:nth-of-type(2) select[name*="[type][component]"]{
    width: 300px !important;
  }
   #presentationEditor tbody td:nth-of-type(2) select[name*="[type][data]"]{
    width: 300px !important;
  }

  

  // hack to change all the buttons to "icons"
  #presentationEditor .json-editor-btn-add{
    text-indent: -9999px;
    line-height:0;
  }
  #presentationEditor .json-editor-btn-add:after{
    content: "+";
    text-indent: 0;
    display: block;
    line-height: initial;
  }

  #presentationEditor .json-editor-btn-delete{
    text-indent: -9999px;
    line-height:0;
  }
  #presentationEditor .json-editor-btn-delete:after{
    content: "×";
    text-indent: 0;
    display: block;
    line-height: initial;
  }

  #presentationEditor .json-editor-btn-movedown{
    text-indent: -9999px;
    line-height:0;
  }
  #presentationEditor .json-editor-btn-movedown:after{
    content: "↓";
    text-indent: 0;
    display: block;
    line-height: initial;
  }

  #presentationEditor .json-editor-btn-moveup{
    text-indent: -9999px;
    line-height:0;
  }
  #presentationEditor .json-editor-btn-moveup:after{
    content: "↑";
    text-indent: 0;
    display: block;
    line-height: initial;
  }


  //this gets rid of the "delete all" buttons (3rd button in the group, with the class json-editor-btn-delete)
  #presentationEditor .btn-group button:nth-of-type(3).json-editor-btn-delete{
    background: pink;
    display:none;
  }
   //this gets rid of the "delete" buttons (2rd button in the group, with the class json-editor-btn-delete, after the add button)
   //  this button is confusing becuase it deletes the "child" from the parent level. (when you can just delete the child directly)
  #presentationEditor .btn-group button.json-editor-btn-add + button:nth-of-type(2){
    background: pink;
    display:none;
  }

  //This targets the add ssection button at the very top
  #presentationEditor h3>div>button.json-editor-btn-add:nth-of-type(1){
    margin-left:-66px;
    margin-top: 14px;
    position: absolute;;
  }

  //This targets the add buttons for adding items to pages
  #presentationEditor div[data-schemapath*=".pageItems"]>div>div>button.json-editor-btn-add:nth-of-type(1){
    margin-top: -20px; 
    width:40px !important;
    margin-left:15px !important;
  }
  
  #presentationEditor div[data-schemapath*=".pages"]>div>div>button.json-editor-btn-add:nth-of-type(1){
    width:80px;
    margin-left:0%;
  }

  // data-schemapath="root.presentation.sections.0.pages.0.pageItems.2.type.data"
  #presentationEditor div[data-schemapath*=".type.data"] .table thead{
    display: none;
  }



  #presentationEditor tbody td:nth-of-type(1) input{
    width: 50px !important;
  }
  #presentationEditor tbody td:nth-of-type(2) select{
    width: 140px !important;
  }
  #presentationEditor tbody td:nth-of-type(3) input{
    width: 200px !important;
  }
  #presentationEditor tbody td:nth-of-type(4) input{
    width: 200px !important;
  }

  // these are the styles for the markdown editor. They're available in the SimpleMDE folder under node_modules, but haven't tried to load them from there yet.
  .CodeMirror{color:#000}.CodeMirror-lines{padding:4px 0}.CodeMirror pre{padding:0 4px}.CodeMirror-gutter-filler,.CodeMirror-scrollbar-filler{background-color:#fff}.CodeMirror-gutters{border-right:1px solid #ddd;background-color:#f7f7f7;white-space:nowrap}.CodeMirror-linenumber{padding:0 3px 0 5px;min-width:20px;text-align:right;color:#999;white-space:nowrap}.CodeMirror-guttermarker{color:#000}.CodeMirror-guttermarker-subtle{color:#999}.CodeMirror-cursor{border-left:1px solid #000;border-right:none;width:0}.CodeMirror div.CodeMirror-secondarycursor{border-left:1px solid silver}.cm-fat-cursor .CodeMirror-cursor{width:auto;border:0!important;background:#7e7}.cm-fat-cursor div.CodeMirror-cursors{z-index:1}.cm-animate-fat-cursor{width:auto;border:0;-webkit-animation:blink 1.06s steps(1) infinite;-moz-animation:blink 1.06s steps(1) infinite;animation:blink 1.06s steps(1) infinite;background-color:#7e7}@-moz-keyframes blink{50%{background-color:transparent}}@-webkit-keyframes blink{50%{background-color:transparent}}@keyframes blink{50%{background-color:transparent}}.cm-tab{display:inline-block;text-decoration:inherit}.CodeMirror-ruler{border-left:1px solid #ccc;position:absolute}.cm-s-default .cm-header{color:#00f}.cm-s-default .cm-quote{color:#090}.cm-negative{color:#d44}.cm-positive{color:#292}.cm-header,.cm-strong{font-weight:700}.cm-em{font-style:italic}.cm-link{text-decoration:underline}.cm-strikethrough{text-decoration:line-through}.cm-s-default .cm-keyword{color:#708}.cm-s-default .cm-atom{color:#219}.cm-s-default .cm-number{color:#164}.cm-s-default .cm-def{color:#00f}.cm-s-default .cm-variable-2{color:#05a}.cm-s-default .cm-variable-3{color:#085}.cm-s-default .cm-comment{color:#a50}.cm-s-default .cm-string{color:#a11}.cm-s-default .cm-string-2{color:#f50}.cm-s-default .cm-meta,.cm-s-default .cm-qualifier{color:#555}.cm-s-default .cm-builtin{color:#30a}.cm-s-default .cm-bracket{color:#997}.cm-s-default .cm-tag{color:#170}.cm-s-default .cm-attribute{color:#00c}.cm-s-default .cm-hr{color:#999}.cm-s-default .cm-link{color:#00c}.cm-invalidchar,.cm-s-default .cm-error{color:red}.CodeMirror-composing{border-bottom:2px solid}div.CodeMirror span.CodeMirror-matchingbracket{color:#0f0}div.CodeMirror span.CodeMirror-nonmatchingbracket{color:#f22}.CodeMirror-matchingtag{background:rgba(255,150,0,.3)}.CodeMirror-activeline-background{background:#e8f2ff}.CodeMirror{position:relative;overflow:hidden;background:#fff}.CodeMirror-scroll{overflow:scroll!important;margin-bottom:-30px;margin-right:-30px;padding-bottom:30px;height:100%;outline:0;position:relative}.CodeMirror-sizer{position:relative;border-right:30px solid transparent}.CodeMirror-gutter-filler,.CodeMirror-hscrollbar,.CodeMirror-scrollbar-filler,.CodeMirror-vscrollbar{position:absolute;z-index:6;display:none}.CodeMirror-vscrollbar{right:0;top:0;overflow-x:hidden;overflow-y:scroll}.CodeMirror-hscrollbar{bottom:0;left:0;overflow-y:hidden;overflow-x:scroll}.CodeMirror-scrollbar-filler{right:0;bottom:0}.CodeMirror-gutter-filler{left:0;bottom:0}.CodeMirror-gutters{position:absolute;left:0;top:0;min-height:100%;z-index:3}.CodeMirror-gutter{white-space:normal;height:100%;display:inline-block;vertical-align:top;margin-bottom:-30px}.CodeMirror-gutter-wrapper{position:absolute;z-index:4;background:0 0!important;border:none!important;-webkit-user-select:none;-moz-user-select:none;user-select:none}.CodeMirror-gutter-background{position:absolute;top:0;bottom:0;z-index:4}.CodeMirror-gutter-elt{position:absolute;cursor:default;z-index:4}.CodeMirror-lines{cursor:text;min-height:1px}.CodeMirror pre{-moz-border-radius:0;-webkit-border-radius:0;border-radius:0;border-width:0;background:0 0;font-family:inherit;font-size:inherit;margin:0;white-space:pre;word-wrap:normal;line-height:inherit;color:inherit;z-index:2;position:relative;overflow:visible;-webkit-tap-highlight-color:transparent;-webkit-font-variant-ligatures:none;font-variant-ligatures:none}.CodeMirror-wrap pre{word-wrap:break-word;white-space:pre-wrap;word-break:normal}.CodeMirror-linebackground{position:absolute;left:0;right:0;top:0;bottom:0;z-index:0}.CodeMirror-linewidget{position:relative;z-index:2;overflow:auto}.CodeMirror-code{outline:0}.CodeMirror-gutter,.CodeMirror-gutters,.CodeMirror-linenumber,.CodeMirror-scroll,.CodeMirror-sizer{-moz-box-sizing:content-box;box-sizing:content-box}.CodeMirror-measure{position:absolute;width:100%;height:0;overflow:hidden;visibility:hidden}.CodeMirror-cursor{position:absolute}.CodeMirror-measure pre{position:static}div.CodeMirror-cursors{visibility:hidden;position:relative;z-index:3}.CodeMirror-focused div.CodeMirror-cursors,div.CodeMirror-dragcursors{visibility:visible}.CodeMirror-selected{background:#d9d9d9}.CodeMirror-focused .CodeMirror-selected,.CodeMirror-line::selection,.CodeMirror-line>span::selection,.CodeMirror-line>span>span::selection{background:#d7d4f0}.CodeMirror-crosshair{cursor:crosshair}.CodeMirror-line::-moz-selection,.CodeMirror-line>span::-moz-selection,.CodeMirror-line>span>span::-moz-selection{background:#d7d4f0}.cm-searching{background:#ffa;background:rgba(255,255,0,.4)}.cm-force-border{padding-right:.1px}@media print{.CodeMirror div.CodeMirror-cursors{visibility:hidden}}.cm-tab-wrap-hack:after{content:''}span.CodeMirror-selectedtext{background:0 0}.CodeMirror{height:auto;min-height:300px;border:1px solid #ddd;border-bottom-left-radius:4px;border-bottom-right-radius:4px;padding:10px;font:inherit;z-index:1}.CodeMirror-scroll{min-height:300px}.CodeMirror-fullscreen{background:#fff;position:fixed!important;top:50px;left:0;right:0;bottom:0;height:auto;z-index:9}.CodeMirror-sided{width:50%!important}.editor-toolbar{position:relative;opacity:.6;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;-o-user-select:none;user-select:none;padding:0 10px;border-top:1px solid #bbb;border-left:1px solid #bbb;border-right:1px solid #bbb;border-top-left-radius:4px;border-top-right-radius:4px}.editor-toolbar:after,.editor-toolbar:before{display:block;content:' ';height:1px}.editor-toolbar:before{margin-bottom:8px}.editor-toolbar:after{margin-top:8px}.editor-toolbar:hover,.editor-wrapper input.title:focus,.editor-wrapper input.title:hover{opacity:.8}.editor-toolbar.fullscreen{width:100%;height:50px;overflow-x:auto;overflow-y:hidden;white-space:nowrap;padding-top:10px;padding-bottom:10px;box-sizing:border-box;background:#fff;border:0;position:fixed;top:0;left:0;opacity:1;z-index:9}.editor-toolbar.fullscreen::before{width:20px;height:50px;background:-moz-linear-gradient(left,rgba(255,255,255,1) 0,rgba(255,255,255,0) 100%);background:-webkit-gradient(linear,left top,right top,color-stop(0,rgba(255,255,255,1)),color-stop(100%,rgba(255,255,255,0)));background:-webkit-linear-gradient(left,rgba(255,255,255,1) 0,rgba(255,255,255,0) 100%);background:-o-linear-gradient(left,rgba(255,255,255,1) 0,rgba(255,255,255,0) 100%);background:-ms-linear-gradient(left,rgba(255,255,255,1) 0,rgba(255,255,255,0) 100%);background:linear-gradient(to right,rgba(255,255,255,1) 0,rgba(255,255,255,0) 100%);position:fixed;top:0;left:0;margin:0;padding:0}.editor-toolbar.fullscreen::after{width:20px;height:50px;background:-moz-linear-gradient(left,rgba(255,255,255,0) 0,rgba(255,255,255,1) 100%);background:-webkit-gradient(linear,left top,right top,color-stop(0,rgba(255,255,255,0)),color-stop(100%,rgba(255,255,255,1)));background:-webkit-linear-gradient(left,rgba(255,255,255,0) 0,rgba(255,255,255,1) 100%);background:-o-linear-gradient(left,rgba(255,255,255,0) 0,rgba(255,255,255,1) 100%);background:-ms-linear-gradient(left,rgba(255,255,255,0) 0,rgba(255,255,255,1) 100%);background:linear-gradient(to right,rgba(255,255,255,0) 0,rgba(255,255,255,1) 100%);position:fixed;top:0;right:0;margin:0;padding:0}.editor-toolbar a{display:inline-block;text-align:center;text-decoration:none!important;color:#2c3e50!important;width:30px;height:30px;margin:0;border:1px solid transparent;border-radius:3px;cursor:pointer}.editor-toolbar a.active,.editor-toolbar a:hover{background:#fcfcfc;border-color:#95a5a6}.editor-toolbar a:before{line-height:30px}.editor-toolbar i.separator{display:inline-block;width:0;border-left:1px solid #d9d9d9;border-right:1px solid #fff;color:transparent;text-indent:-10px;margin:0 6px}.editor-toolbar a.fa-header-x:after{font-family:Arial,"Helvetica Neue",Helvetica,sans-serif;font-size:65%;vertical-align:text-bottom;position:relative;top:2px}.editor-toolbar a.fa-header-1:after{content:"1"}.editor-toolbar a.fa-header-2:after{content:"2"}.editor-toolbar a.fa-header-3:after{content:"3"}.editor-toolbar a.fa-header-bigger:after{content:"▲"}.editor-toolbar a.fa-header-smaller:after{content:"▼"}.editor-toolbar.disabled-for-preview a:not(.no-disable){pointer-events:none;background:#fff;border-color:transparent;text-shadow:inherit}@media only screen and (max-width:700px){.editor-toolbar a.no-mobile{display:none}}.editor-statusbar{padding:8px 10px;font-size:12px;color:#959694;text-align:right}.editor-statusbar span{display:inline-block;min-width:4em;margin-left:1em}.editor-preview,.editor-preview-side{padding:10px;background:#fafafa;overflow:auto;display:none;box-sizing:border-box}.editor-statusbar .lines:before{content:'lines: '}.editor-statusbar .words:before{content:'words: '}.editor-statusbar .characters:before{content:'characters: '}.editor-preview{position:absolute;width:100%;height:100%;top:0;left:0;z-index:7}.editor-preview-side{position:fixed;bottom:0;width:50%;top:50px;right:0;z-index:9;border:1px solid #ddd}.editor-preview-active,.editor-preview-active-side{display:block}.editor-preview-side>p,.editor-preview>p{margin-top:0}.editor-preview pre,.editor-preview-side pre{background:#eee;margin-bottom:10px}.editor-preview table td,.editor-preview table th,.editor-preview-side table td,.editor-preview-side table th{border:1px solid #ddd;padding:5px}.CodeMirror .CodeMirror-code .cm-tag{color:#63a35c}.CodeMirror .CodeMirror-code .cm-attribute{color:#795da3}.CodeMirror .CodeMirror-code .cm-string{color:#183691}.CodeMirror .CodeMirror-selected{background:#d9d9d9}.CodeMirror .CodeMirror-code .cm-header-1{font-size:200%;line-height:200%}.CodeMirror .CodeMirror-code .cm-header-2{font-size:160%;line-height:160%}.CodeMirror .CodeMirror-code .cm-header-3{font-size:125%;line-height:125%}.CodeMirror .CodeMirror-code .cm-header-4{font-size:110%;line-height:110%}.CodeMirror .CodeMirror-code .cm-comment{background:rgba(0,0,0,.05);border-radius:2px}.CodeMirror .CodeMirror-code .cm-link{color:#7f8c8d}.CodeMirror .CodeMirror-code .cm-url{color:#aab2b3}.CodeMirror .CodeMirror-code .cm-strikethrough{text-decoration:line-through}.CodeMirror .CodeMirror-placeholder{opacity:.5}.CodeMirror .cm-spell-error:not(.cm-url):not(.cm-comment):not(.cm-tag):not(.cm-word){background:rgba(255,0,0,.15)}


</style>