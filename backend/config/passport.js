// config/passport.js
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const config = require('./env');
module.exports = function(passport) {
  // JWT Strategy
  passport.use(new JwtStrategy({
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET
  }, async (jwtPayload, done) => {
    try {
      const user = await User.findById(jwtPayload.id);
      return user ? done(null, user) : done(null, false);
    } catch (err) {
      return done(err, false);
    }
  }));

  // Local Strategy
  passport.use(new LocalStrategy({ usernameField: 'email' },
    async (email, password, done) => {
      try {
        const user = await User.findOne({ email });
        if (!user) {
          return done(null, false, { message: 'Email not registered' });
        }
        
        if (user.authMethod === 'local') {
          const isMatch = await bcrypt.compare(password, user.password);
          if (!isMatch) {
            return done(null, false, { message: 'Incorrect password' });
          }
        } else {
          return done(null, false, { message: `Please login with ${user.authMethod}` });
        }
        
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  ));

  // Google Strategy
  passport.use(new GoogleStrategy({
    clientID: config.GOOGLE_CLIENT_ID,
    clientSecret: config.GOOGLE_CLIENT_SECRET,
    callbackURL: config.GOOGLE_CALLBACK_URL
  },async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ googleId: profile.id });
      if (user) return done(null, user);
      
      user = await User.findOne({ email: profile.emails[0].value });
      if (user) {
        user.googleId = profile.id;
        user.authMethod = 'google';
        await user.save();
        return done(null, user);
      }
      
      user = new User({
        name: profile.displayName,
        email: profile.emails[0].value,
        googleId: profile.id,
        authMethod: 'google'
      });
      
      await user.save();
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }));

  // GitHub Strategy
  passport.use(new GitHubStrategy({
    clientID: config.GITHUB_CLIENT_ID,
    clientSecret: config.GITHUB_CLIENT_SECRET,
    callbackURL: config.GITHUB_CALLBACK_URL,
    scope: ['user:email']
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ githubId: profile.id });
      if (user) return done(null, user);
      
      const primaryEmail = profile.emails && profile.emails[0].value;
      if (!primaryEmail) {
        return done(null, false, { message: 'Email required for registration' });
      }
      
      user = await User.findOne({ email: primaryEmail });
      if (user) {
        user.githubId = profile.id;
        user.authMethod = 'github';
        await user.save();
        return done(null, user);
      }
      
      user = new User({
        name: profile.displayName || profile.username,
        email: primaryEmail,
        githubId: profile.id,
        authMethod: 'github'
      });
      
      await user.save();
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }));
};