// middleware/auth.js
const passport = require('passport');

module.exports = {
  authenticateJWT: passport.authenticate('jwt', { session: false })
};