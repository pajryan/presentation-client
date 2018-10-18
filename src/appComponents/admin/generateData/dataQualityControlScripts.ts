const stats = require('stats-analysis')
const d3 = require('d3')
const dataSourceConfig: DataSourceConfig = require('@/configuration/dataSourceConfig.json') // use this to get the date formatting string (in metadata)
import log from 'electron-log'


import { DataSourceResultHandler, DataSourceQa, DataFileFormat, SparkPlusMetadataOnFieldsResult, DataSourceConfig } from '@/configuration/configurationTypes'

interface QaResult {
  filename: string
  label: string
  value: any  // whatever is returned here is just rendered as html. so svg is ok, as is number or string. TODO: think about this...
}

export class DataQualityControlScripts {
  [index: string]: any  // this allows me (in TS) to reference functions in this class with this['functionNameAsString'] - which I need to do because the functions are named in dataSourceConfig.json

  dataFile: DataFileFormat   // this is lightly typed. data.data is the actual data we care about.  data.date is not typed (depends on the actual data...)
  filename: string
  asOfDateField: string = ''

  // not required, but if we're this far, we have it. So provide defaults to keep the compiler happy
  qa: DataSourceQa = {
    sparkPlusMetadataOnFields: [],
    asOfDateField: '',
    scripts: []
  }

  private fmtDec3 = d3.format('.3f')
  private dateFormat = d3.utcParse(dataSourceConfig.metadata.dbDateFormat)

  constructor(data: any, resultHandle: DataSourceResultHandler) {
    this.dataFile = data
    this.filename = resultHandle.filename
    if (resultHandle.qa) {
      this.qa = resultHandle.qa
      if (resultHandle.qa.asOfDateField) {
        this.asOfDateField = resultHandle.qa.asOfDateField
      }
    }

    return this
  }

  runStandardQaItems(): SparkPlusMetadataOnFieldsResult[] {
    const qaResults: SparkPlusMetadataOnFieldsResult[] = []
    this.qa.sparkPlusMetadataOnFields.forEach((s: string) => {
      // going to generate the sparkline, min, max, median and latest, plus the max date.
      qaResults.push({
        fieldName: s,
        sparklineSvg: this.makeSparkline(s, false).value,
        histogramSvg: this.makeHistogram(s).value,
        endDate: this.findLatestDate(),
        latestValue:  this.findLatestValue(s).value,
        maxValue: this.findMax(s).value,
        minValue:  this.findMin(s).value,
        medianValue: this.findMedian(s).value
      })
    })
    return qaResults
  }

  runQaFunctions() {
    const qaResults: QaResult[] = []
    this.qa.scripts.forEach(s => {
      const qaFunc = this[s.function]
      const qaParams = s.parameters
      if (!qaFunc) {
        log.error('tried to run the following QA function but it does not exist: ',  s.function)
      } else {
        const oneQaResult = qaFunc.bind(this).apply(null, qaParams) // this replaces eval
        qaResults.push(oneQaResult)
      }
    })
    return qaResults
  }


  /*
    The following functions can be called from dataSourceConfig.json (via a string name!!)
  */

  // if no field passed uses the qa.asOfDateField
  findLatestDate(field: string = this.asOfDateField): Date {
    if ( field === '') {
      return new Date(1900, 0, 1)
    }
    // parse to date, and sort
    const extract: Date[] = this.dataFile.data.map((d: any) => this.dateFormat(d[field])).sort( (a: Date, b: Date) => b.getTime() - a.getTime())
    return extract[0]
  }

  // only called from runQaFunctions() - based on parameters in dataSourceConfig.json
  findOutlier(field: string): QaResult {
    const extract = this.dataFile.data.map((d: any) => d[field]) // convert the array of objects to an array of only the value we care about
    let indexOfOutliers = stats.indexOfOutliers(extract)
    indexOfOutliers = indexOfOutliers.map( (n: number) => this.fmtDec3(n))
    return {
      filename: this.filename,
      label: field + ' outliers',
      value: indexOfOutliers.join(',')
    }
  }

  findMedian(field: string): QaResult {
    const extract = this.dataFile.data.map((d: any) => d[field])
    const median = stats.median(extract)
    return {
      filename: this.filename,
      label: field + ' median',
      value: this.fmtDec3(median)
    }
  }

  findMax(field: string): QaResult {
    const extract = this.dataFile.data.map((d: any) => d[field])
    const max = d3.max(extract, (d: any) => d)
    return {
      filename: this.filename,
      label: field + ' max',
      value: this.fmtDec3(max)
    }
  }

  findMin(field: string): QaResult {
    const extract = this.dataFile.data.map((d: any) => d[field])
    const min = d3.min(extract, (d: any) => d)
    return {
      filename: this.filename,
      label: field + ' min',
      value: this.fmtDec3(min)
    }
  }

  findLatestValue(field: string): QaResult {
    const extract = this.dataFile.data.map((d: any) => d[field])
    const latest = extract[extract.length - 1]
    return {
      filename: this.filename,
      label: field + ' latest',
      value: this.fmtDec3(latest)
    }
  }

  makeSparkline(field: string, showLabelAndLastValue: boolean = true): QaResult {
    const width = 200
    const height = 15
    const numFmt = d3.format(',.3f')
    const margin = {top: 0, right: 40, bottom: 0, left: 0}
    margin.right = showLabelAndLastValue ? 40 : 0
    const innerWidth = width - margin.right - margin.left
    const innerHeight = height - margin.top - margin.bottom
    const svg = d3.select('body').append('svg').attr('width', width).attr('height', height)
    const xScale = d3.scaleLinear().domain([0, this.dataFile.data.length - 1]).range([0, innerWidth])
    const yScale = d3.scaleLinear().domain(d3.extent(this.dataFile.data, (d: any) => d[field])).range([innerHeight, 0])
    const valueline = d3.line().x((d: any, i: number) => xScale(i)).y((d: any) => yScale(d[field]))
    svg.append('path').data([this.dataFile.data]).attr('class', 'line').attr('d', valueline)
    if (showLabelAndLastValue) {
      const lastDataValue = this.dataFile.data[this.dataFile.data.length - 1][field]
      svg.append('text')
        .text(numFmt(lastDataValue))
        .attr('text-anchor', 'end')
        .attr('alignment-baseline' , 'hanging')
        .attr('transform', 'translate(' + width + ',' + (0) + ')')
    }
    return {
      filename: this.filename,
      label: field + ' trend',
      value: svg.node().outerHTML
    }
  }

  makeHistogram(field: string): QaResult {
    const width = 200
    const height = 15
    const margin = {top: 0, right: 0, bottom: 0, left: 0}
    const innerWidth = width - margin.right - margin.left
    const innerHeight = height - margin.top - margin.bottom
    const svg = d3.select('body').append('svg').attr('width', width).attr('height', height)
    const extract = this.dataFile.data.map((d: any) => d[field])

    const x = d3.scaleLinear().rangeRound([0, width]).domain([0, d3.max(extract)])
    const bins = d3.histogram().domain(x.domain()).thresholds(x.ticks(10))(extract)
    const y = d3.scaleLinear().domain([0, d3.max(bins, (d: any) => d.length )]).range([height, 0])
    const bar = svg.selectAll('.bar').data(bins).enter().append('g').attr('class', 'bar').attr('transform', (d: any) => 'translate(' + x(d.x0) + ',' + y(d.length) + ')')
    bar.append('rect').attr('x', 1).attr('width', x(bins[0].x1) - x(bins[0].x0) - 1).attr('height', (d: any) => (height - y(d.length)))

    return {
      filename: this.filename,
      label: field + ' histogram',
      value: svg.node().outerHTML
    }
  }


}
