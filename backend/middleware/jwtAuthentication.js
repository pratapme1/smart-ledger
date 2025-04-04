// middleware/jwtAuthentication.js
const passport = require('passport');

// Export the JWT authentication middleware
module.exports = passport.authenticate('jwt', { session: false });