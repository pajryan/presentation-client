<template>
    <div id="root">
      <p>Value over time</p>
      <div id="chartHolder">
      </div>
      
      
    </div>
</template>



<script>
  /* tslint:disable */
  import Vue from 'vue'
  const d3 = require('d3')

  export default {
    props: ['itm', 'uiElem', 'data'], 

    data () {
      return {
        chartData:[],
        chartHolder: null // will be populated on load
      }
    },
    mounted () {
      window.addEventListener('resize', this.resize); // add an event listener in case you'll need to adjust on resize
      // console.log('in the component',this.itm)
      
      // if this is expecting data, make sure we got it.  this.data is an array of data objects (from files)
      //  if there was an error reading in the file, data[n] will be {error: <errorMsg>, filename: <filename>}
      this.data.forEach(d => {
        if(d.error){
          console.error('do something about this!', error)
        }else{
          this.$nextTick(function () {
            // Code that will run only after the entire view has been rendered
            this.chartHolder = this.$el.querySelector('#chartHolder') // gets the element as a child of THIS COMPONENT
            this.chartData = this.data[0];
            this.chartData.forEach(function(d) {
              d.date = d3.timeParse("%m/%d/%Y")(d.date);
              d["marketSpread"] = +d["marketSpread"];
            });
            this.buildChart()
          })
          
        }
      })
    },
    methods: {
      buildChart(){
        const xFld = "date";
        const yFld = "marketSpread";
        const width = this.chartHolder.offsetWidth;
        const height = this.chartHolder.offsetHeight;
        const margin = {top:0, right:0, bottom:20, left:30}
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;

        var svg = d3.select(this.chartHolder).append("svg").attr("width", width).attr("height", height);
        var xScale = d3.scaleTime().domain(d3.extent(this.chartData, d => d[xFld])).range([0, innerWidth]);
        var yScale = d3.scaleLinear().domain(d3.extent(this.chartData, d => d[yFld])).range([innerHeight, 0]);
        var valueline = d3.line().x(d => xScale(d[xFld])).y(d => yScale(d[yFld]));
        svg.append("path").data([this.chartData]).attr("class", "line").attr("d", valueline).attr("transform", "translate(" + margin.left + "," + margin.top + ")");
        svg.append("g").attr("transform", "translate(" + margin.left + "," + (innerHeight + margin.top) + ")").call(d3.axisBottom(xScale));
        svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")").call(d3.axisLeft(yScale));
      },



      beforeDestroy: function () {
        // REMOVE all event listeners!
        window.removeEventListener('resize', this.resize) 
      },
      resize(event) { 
        // deal with resizing here
        this.chartHolder.innerHTML = '';
        this.buildChart();
       },

    }
  }


  
</script>

<style scoped lang="scss">
  //https://vue-loader.vuejs.org/guide/scoped-css.html#deep-selectors
  #root /deep/ {
    height: 100%
  }
  #chartHolder /deep/ {
    height: 50%
  }
  #chartHolder /deep/  path.line{
    fill: none;
    stroke: blue
  }
</style>