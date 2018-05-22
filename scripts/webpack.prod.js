const merge = require('webpack-merge')
const common = require('./webpack.common.js')
const webpack = require('webpack')
module.exports = merge(common, {
  plugins: [
    new webpack.optimize.UglifyJsPlugin({
      uglifyOptions: {
        ie8: false,
        dead_code: true,
        sourceMap: true,
        output: {
          comments: false,
          beautify: false
        }
      }
    })
  ]
})
