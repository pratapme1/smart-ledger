module.exports = function override(config, env) {
    // Find and remove the WorkboxWebpackPlugin which is causing the crypto polyfill issue
    config.plugins = config.plugins.filter(plugin => {
      return !plugin.constructor || plugin.constructor.name !== 'GenerateSW';
    });
    
    return config;
  }