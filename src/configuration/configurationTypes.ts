/**************************************/
// flat file: _appConfig.json stored on local machine
export interface AppConfig {
  windowLocation?: any       // not using this yet, so not sure what type
  lastDataUpdate?: number      // Date().getTime() result
  userName: string
  userEmail: string
  dataUrl: string           // url used to fetch data
  apiKey: string
  adminPassword?: string
}


/**************************************/
// Presentation(s)
export interface PresentationConfig {
  activePresentation: string
}

export interface Presentation {
  metadata: PresentationMetadata
  sections: PresentationSection[]
}

export interface PresentationMetadata {
  title: string
  version: number
  author: string
  creationDate: Date
  id: string                    // a uuid
  isPublished: boolean
}

export interface PresentationSection {
  title: string
  thumbnail: string             // path to image
  pages: PresentationPage[]
}

export interface PresentationPage {
  title: string
  pageItems: PageItem[]
}

export interface PageItem {
  percentWidth: number
  type: PageItemType
}

// PageItem.type can be an object of {text: 'aaa'} or {image: 'bbb'} or {component: 'ccc', data: ['ddd']}
//                                                                        ^ in this last one, data is not required (can have a component without data)
//  not sure how to type that... but this is in the ballpark:
// https://github.com/Microsoft/TypeScript/issues/15150#issuecomment-293610364
interface PageItemTypeText { text: string }
interface PageItemTypeImage { image: string }
interface PageItemTypeComponent { component: string }
interface PageItemTypeData { data: string }

export interface PageItemType {
  text?: string
  image?: string
  component?: string
  data?: string
}

// export type PageItemType = (PageItemTypeText | PageItemTypeImage | PageItemTypeComponent | PageItemTypeData) &
//                     Partial<PageItemTypeText & PageItemTypeImage & PageItemTypeComponent & PageItemTypeData>

// also want to define a simple enum to type when passed as a parameter
export type PageItemTypes = 'component' | 'text' | 'image'

// export enum PageItemTypes {
//   component = 'component',
//   text = 'text',
//   image = 'image'
// }

// export interface PageItemType {
//   text?: string
//   image?: string
//   component?: string
//   data?: string[]
// }



/**************************************/
// configuration/PASSWORDS.json
export interface Passwords {
  githubToken: string
  appleCertificatePassword: string
  adminPassword: string
  databaseServer: string
  databaseUsername: string
  databasePassword: string
  database: string
}







/**************************************/
// dataSourceConfig
export interface DataSourceConfig {
  metadata: DataSourceMetadata
  globalInputs: DataSourceConfigGlobalInput[]
  dataSources: DataSource[]
}

export interface DataSourceMetadata {
  dbDateFormat: string // this is the D3 format string used to parse dates from the DB. (e.g. d3.utcParse("%Y-%m-%dT%H:%M:%S.%LZ") )
}

export interface DataSourceConfigGlobalInput {
  referenceId: string   // id used elsewhere in dataSourceConfig.dataSources to identify this input field
  label: string         // label that the user sees
  type: InputFieldType
  value?: string         // default value
}

enum InputFieldType {
  datetime = 'datetime',
  int = 'int',
  float = 'float',
  varchar = 'varchar'
}

export interface DataSource {
  name: string        // name of data source. this is assigned to components (so components recieve this data)
  isStoredProcedure: boolean
  query: string       // query string that is run
  sqlParameters?: DataSourceSqlParameter[]
  resultHandling: DataSourceResultHandler[]
}

export interface DataSourceSqlParameter {
  label: string       // label that the user sees
  type: InputFieldType
  value?: string       // default value
}

export interface DataSourceResultHandler {
  filename: string  // name of flatfile that gets generated (including file extension)
  qa?: DataSourceQa
}

export interface DataSourceQa {
  sparkPlusMetadataOnFields: string[]
  asOfDateField: string
  scripts: DataSourceQaScript[]
}

interface DataSourceQaScript {
  function: string            // name of the function
  parameters: string|number[] // parameter(s) passed to the function
}

export interface SparkPlusMetadataOnFieldsResult {
  fieldName: string
  sparklineSvg: HTMLElement
  histogramSvg: HTMLElement
  medianValue: number
  minValue: number
  maxValue: number
  latestValue: number
  endDate: Date
}



/**************************************/
// individual Data FILES
export interface DataFileFormat {
  metadata: DataFileFormatMetadata
  data: any
}
interface DataFileFormatMetadata {
  query: string
  filename: string
  runTime: string
}


/**************************************/
// _dataLog.json file -- this file is stored on the SERVER side. So typing incoming JSON!
export interface DataLogFile {
  dataLog: DataLogFileItem[]
}

export interface DataLogFileItem {
  timeStamp: number,  // result of Date().getTime()
  file: string        // e.g.  "DoubleNumber.json"
}


/**************************************/
// generics
export type CallbackObjErr = (result: any, error?: ErrorObject) => void

export interface ErrorObject {
  error: any
}
