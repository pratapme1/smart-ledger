module.exports = function override(config, env) {
    // Add fallbacks for node modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "crypto": require.resolve("crypto-browserify"),
      "stream": require.resolve("stream-browserify"),
      "assert": require.resolve("assert"),
      "zlib": require.resolve("browserify-zlib"),
      "path": require.resolve("path-browserify"),
      "buffer": require.resolve("buffer/"),
      "process": require.resolve("process/browser"),
      "util": require.resolve("util/"),
      "os": require.resolve("os-browserify/browser")
    };
    
    // Add process and buffer polyfills
    const webpack = require('webpack');
    config.plugins.push(
      new webpack.ProvidePlugin({
        process: 'process/browser',
        Buffer: ['buffer', 'Buffer'],
      }),
    );
    
    return config;
  }