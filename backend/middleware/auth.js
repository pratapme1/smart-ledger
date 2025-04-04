const passport = require('passport');

// Middleware to authenticate JWT token
const authenticateJWT = passport.authenticate('jwt', { session: false });

module.exports = authenticateJWT; 