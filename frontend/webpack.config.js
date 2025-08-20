const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: './src/app.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    clean: true, // Limpa a pasta dist antes de cada build
    publicPath: '/'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(png|jpg|gif|svg)$/i,
        type: 'asset/resource', // Webpack 5 asset modules (substitui file-loader)
        generator: {
          filename: 'images/[name][ext]'
        }
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html',
      favicon: './src/assets/images/logo/crisp_logo.png'
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'src/assets/html', to: 'html' },
        { from: 'src/assets/images', to: 'images' },
        { from: 'src/assets/images/logo/crisp_logo.png', to: 'crisp_logo.png' }
      ],
    }),
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'),
    },
    port: 8080,
    open: true,
    hot: true, // Hot Module Replacement
    historyApiFallback: true,
  },
  resolve: {
    extensions: ['.js', '.json']
  },
  // Adicione isso se estiver usando Webpack 5 com Babel
  target: ['web', 'es5']
};