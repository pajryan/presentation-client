<!--
  A few notes about presentations and their management
  1. ANY edit to a presentation (or dup of a presentation) results in a BRAND NEW FILE:
      <UUID>.json
  2. In the case of an edit, the original (local) file is deleted thereby replaced by the new UUID.json. 

  This allows me to keep files unique and frequently generated, then just deal with the excess. It also means there's no such thing
  as simultaneous edits because EVERY edit results in a new file.

  When clicking "make active", the _presentationConfig.json file is update to activePresentation:<appropriateUUID>

  When clicking "duplicate", the object is dup'd with a new ID, new Creation date (eventually a new author) and the file is created <UUID>.json

  When clicking "archive", the file is simply renamed with the prefix "deleted_". These can be seen and recovered in the "Show/hide archived presentations" section

  When clicking "publish", the file is simply recreated on the server with metadata.isPublished=true. This will also go thru all the images required in the presentation and publish THEM as well.

  
  When clicking "download published presentations", we go to the server and find any files that have been *published* that do not match local files (regular or archived)
    This works because if an edit is made, a NEW file is created, so there's no such thing as a "new version" of a file. Only new files (though we kind of imitate versions in the UI)

  One side effect of this :(
      If I publish a presentation, <it goes to the server>
      Then edit it <the local version is deleted>
      Then check for published presentations
      I'll see the old version of the file I just created

      This kind of makes sense (there's a published version I don't have). But maybe weird.
      
      If it's too weird, on the downloaded presentations table, could offere the ability to "delete from server forever" which would at least clean things up.
-->
<template>
    <div>
      <table class="table table-sm" >
        <thead>
          <tr>
            <th colspan="8">Presentations&hellip;</th>
          </tr>
          <tr>
            <th @click="sortTableBy('title', 'alph')">title</th>
            <th @click="sortTableBy('version', 'num')">version</th>
            <th @click="sortTableBy('author', 'alph')">author</th>
            <th @click="sortTableBy('creationDate', 'num')">last update</th>
            <th colspan="4"></th>
          </tr>
        </thead>
        <tbody id="presentationTableBody">
          <tr v-for="presentation in presentations" :key="presentation.metadata.id" :class="activePresentationId==presentation.metadata.id?'table-success':''">
            <td :title="presentation.metadata.id">{{presentation.metadata.title}}</td>
            <td class="text-center">{{presentation.metadata.version}}</td>
            <td>{{presentation.metadata.author}}</td>
            <td>{{formatDt(new Date(presentation.metadata.creationDate))}}</td>
            <td><button type="button" class="btn btn-primary btn-sm" @click="makeActive(presentation.metadata.id)" :disabled="activePresentationId==presentation.metadata.id">make active</button></td>
            <td><button type="button" class="btn btn-primary btn-sm" @click="duplicatePresentation(presentation.metadata.id)">duplicate</button></td>
            <td><button type="button" class="btn btn-primary btn-sm" @click="archivePresentation(presentation.metadata.id)" :disabled="activePresentationId==presentation.metadata.id">archive</button></td>
            <td><button type="button" class="btn btn-primary btn-sm" @click="publishPresentation(presentation.metadata.id)" :disabled="presentation.metadata.isPublished" style="width:67px;">publish</button></td>
          </tr>
        </tbody>

        <!-- newly created presentations -->
        <tfoot v-if="newlyPublishedPresentations.length>0">
          <tr style="border-bottom:2px solid #ccc;">
            <th colspan="7" style="height:60px; vertical-align: bottom;">Newly downloaded presentations:</th>
            <td style="text-align:right; vertical-align: bottom;"><button type="button" class="close" aria-label="Close" @click.stop.prevent="newlyPublishedPresentations=[]"><span aria-hidden="true">&times;</span></button></td>
          </tr>
          <tr><td colspan="8" style="height:10px;"></td></tr>
          <tr v-for="(presentation, idx) in newlyPublishedPresentations" :key="presentation.metadata.id" class="bg-warning">
            <td :title="presentation.metadata.id">{{presentation.metadata.title}}</td>
            <td class="text-center">{{presentation.metadata.version}}</td>
            <td>{{presentation.metadata.author}}</td>
            <td>{{formatDt(new Date(presentation.metadata.creationDate))}}</td>
            <td colspan="4"><button type="button" class="btn btn-primary btn-sm" @click="importDownloadedPresentation(idx)">import</button></td>
          </tr>
        </tfoot>
      </table>


      <div>
        <button type="button" class="btn btn-primary btn-sm" @click="downloadPresentations()" style="width:260px">download published presentations</button>
      </div>
      


      <!-- achived presentations -->
      <p style="text-align:right; margin-top: 30px;"><a href="#" @click.stop.prevent="showArchived=!showArchived">show/hide archived presentations</a></p>
      <p v-if="showArchived && archivedPresentations.length==0" style="text-align:center">You have no archived presentations</p>
      <table class="table table-sm" v-if="showArchived && archivedPresentations.length>0">
        <thead>
          <tr>
            <th colspan="8"><i>Archived Presentations</i></th>
          </tr>
          <tr>
            <th @click="sortArchiveTableBy('title', 'alph')">title</th>
            <th @click="sortArchiveTableBy('version', 'num')">version</th>
            <th @click="sortArchiveTableBy('author', 'alph')">author</th>
            <th @click="sortArchiveTableBy('creationDate', 'num')">last update</th>
            <th colspan="2"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="presentation in archivedPresentations" :key="presentation.metadata.id">
            <td :title="presentation.metadata.id">{{presentation.metadata.title}}</td>
            <td class="text-center">{{presentation.metadata.version}}</td>
            <td>{{presentation.metadata.author}}</td>
            <td>{{formatDt(new Date(presentation.metadata.creationDate))}}</td>
            <td><button type="button" class="btn btn-primary btn-sm" @click="unarchivePresentation(presentation.metadata.id)">un-archive</button></td>
            <td><button type="button" class="btn btn-primary btn-sm" @click="deletePresentation(presentation.metadata.id)">delete forever</button></td>
          </tr>
        </tbody>
      </table>
    

    </div>
</template>



<script>
  import Vue from 'vue'
  import * as d3 from 'd3'
  const formatDate = d3.timeFormat('%m/%d/%y %I:%M%p')


  export default {
    props: ['adminObj'],
    data() {
      return {
        presentations: [],
        showArchived: false,
        archivedPresentations: [],
        activePresentationId: '',
        currentSortKey: '',
        newlyPublishedPresentations: []
      }
    },
    mounted() {
      this.getPresentations()
    },
    methods: {
      formatDt(dt) {
        return formatDate(dt)
      },
      getPresentations() {
        // Note that this is ALSO called when the tabs are clicked on the admin interface
        this.presentations = this.adminObj.getPresentations()
        this.archivedPresentations = this.adminObj.getArchivedPresentations()
        this.getActivePresentation()
      },
      getActivePresentation() {
        this.activePresentationId = this.adminObj.getActivePresentationId()
      },
      makeActive(id) {
        this.adminObj.setActivePresentation(id)
        this.getActivePresentation()
      },
      duplicatePresentation(id) {
        const newPresentation = this.adminObj.duplicatePresentation(id)
        // insert the new presentation immediately after the one copied
        const idx = this.presentations.findIndex(p => p.metadata.id === id)
        this.presentations.splice(idx + 1, 0, newPresentation)
        this.getPresentations()  // refresh the list
      },
      archivePresentation(id) {
        this.adminObj.archivePresentation(id)
        this.getPresentations()  // refresh the list
      },
      unarchivePresentation(id) {
        this.adminObj.unarchivePresentation(id)
        this.getPresentations()  // refresh the list
      },
      deletePresentation(id) {
        this.adminObj.deletePresentation('deleted_' + id)
        this.getPresentations()  // refresh the list
      },
      publishPresentation(id) {
        event.target.className = event.target.className.replace('btn-primary', 'btn-warning')
        event.target.innerHTML = '…'
        this.adminObj.publishPresentation(id, this.publishPresentationResult.bind(null, event, id))
      },
      publishPresentationResult(event, id, res, err) {
          if (!err && res && res.status === 200) {
            event.target.className = event.target.className.replace('btn-warning', 'btn-success')
            event.target.className = event.target.className.replace('btn-danger', 'btn-success') // in case it worked the 2nd time
            event.target.innerHTML = 'publish'
            // now update the local file to be published = true
            this.adminObj.markLocalPresentationAsPublished(id)
            this.getPresentations() // refresh the UI
          } else {
            log.error('error publishing presentation', res, err)
            event.target.className = event.target.className.replace('btn-warning', 'btn-danger')
            event.target.innerHTML = 'error'
          }
      },
      highlightBriefly(idx) {
        setTimeout( i => { document.getElementById('presentationTableBody').childNodes[i].className = 'table-warning'}, 200, idx)
        setTimeout( i => { document.getElementById('presentationTableBody').childNodes[i].className = ''}, 2200, idx)
      },
      downloadPresentations() {
        event.target.className = event.target.className.replace('btn-primary', 'btn-warning')
        event.target.innerHTML = '…'
        this.adminObj.downloadPresentations(this.downloadPresentationsResult.bind(null, event))
      },
      downloadPresentationsResult(event, res, err) {
        if (!err && res && res.status === 200) {
            event.target.className = event.target.className.replace('btn-warning', 'btn-primary')
            event.target.className = event.target.className.replace('btn-danger', 'btn-primary') // in case it worked the 2nd time
            event.target.innerHTML = 'download published presentations'
            if (res.data.presentations.length === 0) {
              event.target.className = event.target.className.replace('btn-primary', 'btn-warning') // in case it worked the 2nd time
              event.target.innerHTML = 'no new published presentations'
            } else {
              this.newlyPublishedPresentations = res.data.presentations
            }
        } else {
          log.error('error downloading presentations', res, err)
          event.target.className = event.target.className.replace('btn-warning', 'btn-danger')
          event.target.innerHTML = 'error'
        }
      },
      importDownloadedPresentation(idx) {
        event.target.className = event.target.className.replace('btn-primary', 'btn-warning')
        event.target.innerHTML = '…'
        const presentationToImport = this.newlyPublishedPresentations[idx]
        // download any relevant images
        this.adminObj.downloadPresentationImages(presentationToImport, (data, error) => {
          if (error) {
            log.error('error downloading presentation images', error)
            event.target.className = event.target.className.replace('btn-warning', 'btn-danger')
            event.target.innerHTML = 'error'
          } else if (data && data.status && data.status === 200) {
            // write the file
            event.target.className = event.target.className.replace('btn-warning', 'btn-primary')
            event.target.className = event.target.className.replace('btn-danger', 'btn-primary') // in case it worked the 2nd time
            event.target.innerHTML = 'import'
            this.adminObj.writePresentation(presentationToImport)
            this.presentations.push(presentationToImport)
            // remove from the 'presentations to import'
            const spliceResult = this.newlyPublishedPresentations.splice(idx, 1)[0]
          } else {
            log.error('error downloading presentation images', data)
            event.target.className = event.target.className.replace('btn-warning', 'btn-danger')
            event.target.innerHTML = 'error'
          }
        })

      },
      sortTableBy(key, type) {
        this.presentations = this.presentations.sort((a, b) => {
          if (key === this.currentSortKey) {
            if (type === 'alph') {
              return a.metadata[key] > b.metadata[key] ? -1 : 1
            } else {
              return a.metadata[key] - b.metadata[key]
            }
          } else {
            if (type === 'alph') {
              return a.metadata[key] > b.metadata[key] ? 1 : -1
            } else {
              return b.metadata[key] - a.metadata[key]
            }
          }
        })

        if (key === this.currentSortKey) {
          this.currentSortKey = ''
        } else {
          this.currentSortKey = key
        }
      },
      sortArchiveTableBy(key, type) {
        this.archivedPresentations = this.archivedPresentations.sort((a, b) => {
          if (key === this.currentSortKey) {
            if (type === 'alph') {
              return a.metadata[key] > b.metadata[key] ? -1 : 1
            } else {
              return a.metadata[key] - b.metadata[key]
            }
          } else {
            if (type === 'alph') {
              return a.metadata[key] > b.metadata[key] ? 1 : -1
            } else {
              return b.metadata[key] - a.metadata[key]
            }
          }
        })
        if (key === this.currentSortKey) {
          this.currentSortKey = ''
        } else {
          this.currentSortKey = key
        }
      }
    }
  }


  
</script>

<style  lang="scss">
  th{
    cursor: pointer;
  }

 
</style>