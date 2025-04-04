// middleware/jwtMiddleware.js
const passport = require('passport');

// Export a simple middleware function
module.exports = function(req, res, next) {
  passport.authenticate('jwt', { session: false }, function(err, user, info) {
    if (err) {
      return next(err);
    }
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized: Invalid or expired token' });
    }
    req.user = user;
    next();
  })(req, res, next);
};