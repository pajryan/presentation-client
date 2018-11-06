const path = require("path");

module.exports = {
  pluginOptions: {
    'style-resources-loader': {
      preProcessor: 'scss',
      patterns: [
        path.resolve(__dirname, './src/assets/css/main.scss'),
        path.resolve(__dirname, './src/assets/css/print.scss'),
        path.resolve(__dirname, './src/assets/css/admin.scss'),
        path.resolve(__dirname, './src/assets/css/globalNavigation.scss'),
        path.resolve(__dirname, './src/assets/css/slideshow.scss'),
        path.resolve(__dirname, './src/assets/css/tableOfContents.scss')
      ]
    }
  },
  configureWebpack: {
    externals: {
      "mssql": "require('mssql')",        // this solves the nasty __webpack__ require (...) error
      "archiver": "require('archiver')"   // solved problem where archiver thought the input was invalid. Similar: https://github.com/webpack/webpack/issues/1815
    }
  }
}
