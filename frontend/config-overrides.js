module.exports = function override(config, env) {
    // Remove the workbox plugin to avoid Node.js polyfill issues
    config.plugins = config.plugins.filter(plugin => 
      !plugin.constructor.name.includes('WorkboxWebpackPlugin')
    );
    
    return config;
  }