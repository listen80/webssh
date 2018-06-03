const merge = require('webpack-merge')
const common = require('./webpack.common.js')
const webpack = require('webpack')
module.exports = merge(common, {
  plugins: [
    new webpack.optimize.UglifyJsPlugin({
      uglifyOptions: {
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
