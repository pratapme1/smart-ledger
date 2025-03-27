module.exports = function override(config, env) {
    // Add fallbacks for node modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "crypto": require.resolve("crypto-browserify"),
      "stream": require.resolve("stream-browserify"),
      "assert": require.resolve("assert"),
      "zlib": require.resolve("browserify-zlib")
    };
    return config;
  }