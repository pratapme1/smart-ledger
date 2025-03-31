// config/passport.js
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const User = require('../models/User'); // Your User model

// Options for JWT Strategy
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET
};

module.exports = (passport) => {
  // JWT Strategy for token authentication
  passport.use(
    new JwtStrategy(jwtOptions, async (payload, done) => {
      try {
        // Find user by ID from token payload
        const user = await User.findById(payload.id).select('-password');
        
        if (user) {
          return done(null, user);
        }
        
        return done(null, false);
      } catch (error) {
        console.error('JWT Strategy Error:', error);
        return done(error, false);
      }
    })
  );
  
  // Google OAuth Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback',
          proxy: true
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            console.log('Google OAuth: Processing login for:', profile.emails[0].value);
            
            // Check if user exists in database
            let user = await User.findOne({ email: profile.emails[0].value });
            
            if (user) {
              console.log('Google OAuth: User found, updating Google info');
              // Update user's Google info
              user.googleId = profile.id;
              user.avatar = user.avatar || profile.photos[0].value;
              await user.save();
              return done(null, user);
            }
            
            console.log('Google OAuth: Creating new user');
            // Create new user if not exists
            user = new User({
              email: profile.emails[0].value,
              name: profile.displayName,
              googleId: profile.id,
              avatar: profile.photos && profile.photos[0] ? profile.photos[0].value : '',
              // No password required for OAuth users
            });
            
            await user.save();
            return done(null, user);
          } catch (error) {
            console.error('Google Strategy Error:', error);
            return done(error, false);
          }
        }
      )
    );
  } else {
    console.warn('⚠️ Google OAuth is not configured. Missing client ID or secret.');
  }
  
  // GitHub OAuth Strategy
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(
      new GitHubStrategy(
        {
          clientID: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
          callbackURL: process.env.GITHUB_CALLBACK_URL || '/api/auth/github/callback',
          scope: ['user:email'],
          proxy: true
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            // Get primary email from GitHub (profile.emails might be an array)
            const primaryEmail = profile.emails && profile.emails.length > 0 
              ? profile.emails[0].value 
              : null;
              
            if (!primaryEmail) {
              return done(new Error('No email found from GitHub account'), false);
            }
            
            console.log('GitHub OAuth: Processing login for:', primaryEmail);
            
            // Check if user exists in database
            let user = await User.findOne({ email: primaryEmail });
            
            if (user) {
              console.log('GitHub OAuth: User found, updating GitHub info');
              // Update user's GitHub info
              user.githubId = profile.id;
              user.avatar = user.avatar || profile.photos[0].value;
              await user.save();
              return done(null, user);
            }
            
            console.log('GitHub OAuth: Creating new user');
            // Create new user if not exists
            user = new User({
              email: primaryEmail,
              name: profile.displayName || profile.username,
              githubId: profile.id,
              avatar: profile.photos && profile.photos[0] ? profile.photos[0].value : '',
              // No password required for OAuth users
            });
            
            await user.save();
            return done(null, user);
          } catch (error) {
            console.error('GitHub Strategy Error:', error);
            return done(error, false);
          }
        }
      )
    );
  } else {
    console.warn('⚠️ GitHub OAuth is not configured. Missing client ID or secret.');
  }
  
  // Serialize user for session (needed for OAuth)
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  
  // Deserialize user from session
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id).select('-password');
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
};