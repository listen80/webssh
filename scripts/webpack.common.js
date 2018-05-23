const path = require('path')
const CleanWebpackPlugin = require('clean-webpack-plugin')
const ExtractTextPlugin = require('extract-text-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin');
module.exports = {
  context: path.resolve(__dirname, '../'),
  entry: {
    webssh2: './client/src/js/index.js'
  },
  plugins: [
    new CleanWebpackPlugin(['client/public'], {
      root: path.resolve(__dirname, '../'),
      verbose: true
    }),
    new HtmlWebpackPlugin({
        template: './client/src/client.htm',
        filename: 'client.htm',
        favicon: './client/src/favicon.ico',
        inject: 'body',
        minify: {
            "removeAttributeQuotes": true,
            "removeComments": true,
            "removeEmptyAttributes": false,
            "collapseWhitespace": true
        }
    }),
    new ExtractTextPlugin('[name].css')
  ],
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, '../client/public')
  },
  module: {
    loaders: [{
      test: /\.css$/,
      loader: ExtractTextPlugin.extract("style-loader", "css-loader")
    }, {
      test: /\.(png|jpg|gif)$/,
      loader: 'url-loader?limit=10240&name=img/[name].[hash:8].[ext]'
    }]
  },
  devtool: 'source-map'
}