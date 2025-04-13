const passport = require('passport');

// Middleware to authenticate JWT token
const authenticateJWT = (req, res, next) => {
  console.log('Auth middleware - Headers:', req.headers);
  console.log('Auth middleware - Cookies:', req.cookies);
  
  passport.authenticate('jwt', { session: false }, (err, user, info) => {
    console.log('Auth middleware - Error:', err);
    console.log('Auth middleware - User:', user);
    console.log('Auth middleware - Info:', info);
    
    if (err) {
      return next(err);
    }
    
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized - Invalid token' });
    }
    
    req.user = user;
    next();
  })(req, res, next);
};

module.exports = authenticateJWT; 