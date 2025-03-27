const path = require('path');

module.exports = function override(config) {
  // Completely disable any service worker plugin
  config.plugins = config.plugins.filter(plugin => {
    return plugin.constructor && 
      !plugin.constructor.name.includes('WorkboxWebpackPlugin') &&
      !plugin.constructor.name.includes('GenerateSW');
  });
  
  // Provide empty modules for Node.js core modules
  config.resolve.fallback = {
    ...config.resolve.fallback,
    crypto: false,
    path: false,
    fs: false,
    os: false,
    util: false,
    zlib: false,
    stream: false,
    assert: false,
    buffer: false,
    process: false
  };
  
  return config;
}