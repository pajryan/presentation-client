/**************************************/
// flat file: _appConfig.json stored on local machine
export interface AppConfig {
  windowLocation?: any       // not using this yet, so not sure what type
  lastDataUpdate?: Date      // this probably won't actually be a date? (but instead a number e.g. .getTime() result)
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

interface PresentationMetadata {
  title: string
  version: number
  author: string
  creationDate: Date
  id: string                    // a uuid
  isPublished: boolean
}

interface PresentationSection {
  title: string
  thumbnail: string             // path to image
  pages: PresentationPage[]
}

interface PresentationPage {
  title: string
  pageItems: PageItem[]
}

interface PageItem {
  percentWidth: number
  type: PageItemTypes
}

interface PageItemTypes {
  text?: string
  image?: string
  component?: string
  data?: string[]
}



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
  globalInputs: DataSourceConfigGlobalInput[]
  dataSources: DataSource[]
}

interface DataSourceConfigGlobalInput {
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

interface DataSource {
  name: string        // name of data source. this is assigned to components (so components recieve this data)
  isStoredProcedure: boolean
  query: string       // query string that is run
  sqlParameters?: SqlParameter[]
  resultHandling: ResultHandler[]
}

interface SqlParameter {
  label: string       // label that the user sees
  type: InputFieldType
  value?: string       // default value
}

interface ResultHandler {
  filename: string  // name of flatfile that gets generated (including file extension)
  qa?: Qa
}

interface Qa {
  scripts: QaScript[]
  asOfDateScript: string
  sparklineFields: string[]
}

interface QaScript {
  function: string            // name of the function
  parameters: string|number[] // parameter(s) passed to the function
}
