const webpack = require('webpack');

module.exports = {
  // Sua configuração de proxy
  devServer: {
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true
      }
    }
  },

  // Configuração completa do Webpack para os polyfills
  configureWebpack: {
    resolve: {
      fallback: {
        "crypto": require.resolve("crypto-browserify"),
        "stream": require.resolve("stream-browserify"),
        "vm": require.resolve("vm-browserify"),
        "buffer": require.resolve("buffer/")
      }
    },
    plugins: [
      new webpack.ProvidePlugin({
        process: 'process/browser', // Garante que 'process' esteja disponível
        Buffer: ['buffer', 'Buffer'], // Garante que 'Buffer' esteja disponível
      }),
    ]
  }
};