/* tslint:disable */
let stats = require('stats-analysis')
const d3 = require('d3')

module.exports = class QueryRunnerFileWriter {

  constructor(data, resultHandle){ // scriptObj receives one {function: <functionName>, parameters: ["param1, param2.."]}
    this.data = data;
    this.filename = resultHandle.filename
    this.qaItems = resultHandle.qa;
    return this;
    
    // return eval('this.' + scriptString)
  }

  runQaFunctions(){
    let qaResults = []
    this.qaItems.scripts.forEach(s => {
      const qaFunc = this[s.function];
      const qaParams = s.parameters
      let oneQaResult = qaFunc.bind(this).apply(null, qaParams); // this replaces eval  
      qaResults.push(oneQaResult)
    });
    return qaResults;
  }

  // only called from runQaFunctions() - based on parameters in dataSourceConfig.json
  findOutlier(field){
    console.log(' in find outlier', arguments)
    let results = [];
    let extract = this.data.map(d => d[field]); // convert the array of objects to an array of only the value we care about
    let indexOfOutliers = stats.indexOfOutliers(extract)
    return {
      filename: this.filename,
      label: field + ' outliers',
      value: indexOfOutliers.join(',')
    }
  }

  // only called from runQaFunctions() - based on parameters in dataSourceConfig.json
  findMedian(field){
    console.log(' in find median', arguments, this)
    let results = [];
    let extract = this.data.map(d => d[field]); 
    let median = stats.median(extract)
    return {
      filename: this.filename,
      label: field + ' median',
      value: median
    }
  }

  makeSparklines(){
    let svgs = [];
    this.qaItems.sparklineFields.forEach(sl => {
      svgs.push(this.makeOneSparkline(sl))
    })
    return svgs;
    

  }

  makeOneSparkline(field){
    console.log('making an svg')
    const width = 300;
    const height = 15;
    const numFmt = d3.format(",.3f")
    const margin = {top:0, right: 40, bottom:0, left:0}
    const innerWidth = width - margin.right - margin.left;
    const innerHeight = height - margin.top - margin.bottom;
    let svg = d3.select("body").append("svg").attr("width", width).attr("height", height);
    let xScale = d3.scaleLinear().domain([0,this.data.length-1]).range([0, innerWidth]);
    let yScale = d3.scaleLinear().domain(d3.extent(this.data, d => d[field])).range([innerHeight, 0]);
    let valueline = d3.line().x((d,i) => xScale(i)).y(d => yScale(d[field]));
    svg.append("path").data([this.data]).attr("class", "line").attr("d", valueline);
    let lastDataValue = this.data[this.data.length-1][field];
    svg.append("text")
      .text(field + ': ' + numFmt(lastDataValue))
      .attr('text-anchor', 'end')
      .attr('alignment-baseline' , 'hanging')
      .attr("transform", "translate(" + width + "," + (0) + ")")
    return svg.node().outerHTML;
  }
  


}