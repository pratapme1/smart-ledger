// config/passport.js
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const User = require('../models/User'); // Your User model

// Options for JWT Strategy - Update to extract from cookies first, then header
const jwtOptions = {
  // Custom extractor that tries cookie first, then header
  jwtFromRequest: req => {
    // Try to get from signed cookie first
    if (req && req.signedCookies) {
      const token = req.signedCookies['auth_token'];
      if (token) {
        return token;
      }
    }
    
    // Fallback to Authorization header
    return ExtractJwt.fromAuthHeaderAsBearerToken()(req);
  },
  secretOrKey: process.env.JWT_SECRET,
};

console.log('JWT Strategy configured with cookie/header extraction');

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
    const googleCallbackURL = process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback';
    console.log(`Setting up Google strategy with callback URL: ${googleCallbackURL}`);
    
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: googleCallbackURL,
          proxy: true
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            console.log('Google OAuth: Processing login for profile:', { 
              id: profile.id,
              displayName: profile.displayName,
              emails: profile.emails ? profile.emails.map(e => e.value) : 'No emails'
            });
            
            if (!profile.emails || profile.emails.length === 0) {
              console.error('Google OAuth: No email found in profile');
              return done(new Error('No email found from Google account'), false);
            }
            
            const email = profile.emails[0].value;
            console.log(`Google OAuth: Using email ${email}`);
            
            // Check if user exists in database
            let user = await User.findOne({ email });
            
            if (user) {
              console.log(`Google OAuth: User found with ID ${user._id}`);
              
              // If user exists but doesn't have Google ID, link accounts
              if (!user.googleId) {
                console.log('Google OAuth: Linking Google account to existing user');
                user.googleId = profile.id;
                
                // Update avatar if user doesn't have one
                if (!user.avatar && profile.photos && profile.photos[0]) {
                  user.avatar = profile.photos[0].value;
                }
                
                // Update auth methods
                if (!user.authMethods) user.authMethods = [];
                if (!user.authMethods.includes('google')) {
                  user.authMethods.push('google');
                }
                if (user.password && !user.authMethods.includes('local')) {
                  user.authMethods.push('local');
                }
                
                await user.save();
                console.log('Google OAuth: Account linked successfully');
              } else {
                console.log('Google OAuth: User already has Google linked');
              }
              
              return done(null, user);
            }
            
            console.log('Google OAuth: Creating new user');
            // Create new user if not exists
            user = new User({
              email: profile.emails[0].value,
              name: profile.displayName,
              googleId: profile.id,
              avatar: profile.photos && profile.photos[0] ? profile.photos[0].value : '',
              authMethods: ['google']
            });
            
            await user.save();
            console.log(`Google OAuth: New user created with ID ${user._id}`);
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
    const githubCallbackURL = process.env.GITHUB_CALLBACK_URL || '/api/auth/github/callback';
    console.log(`Setting up GitHub strategy with callback URL: ${githubCallbackURL}`);
    
    passport.use(
      new GitHubStrategy(
        {
          clientID: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
          callbackURL: githubCallbackURL,
          scope: ['user:email'],
          proxy: true
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            console.log('GitHub OAuth: Processing login for profile:', { 
              id: profile.id,
              displayName: profile.displayName || profile.username,
              emails: profile.emails ? profile.emails.map(e => e.value) : 'No emails'
            });
            
            // Get primary email from GitHub (profile.emails might be an array)
            const primaryEmail = profile.emails && profile.emails.length > 0 
              ? profile.emails[0].value 
              : null;
              
            if (!primaryEmail) {
              console.error('GitHub OAuth: No email found in profile');
              return done(new Error('No email found from GitHub account'), false);
            }
            
            console.log(`GitHub OAuth: Using email ${primaryEmail}`);
            
            // Check if user exists in database
            let user = await User.findOne({ email: primaryEmail });
            
            if (user) {
              console.log(`GitHub OAuth: User found with ID ${user._id}`);
              
              // If user exists but doesn't have GitHub ID, link accounts
              if (!user.githubId) {
                console.log('GitHub OAuth: Linking GitHub account to existing user');
                user.githubId = profile.id;
                
                // Update avatar if user doesn't have one
                if (!user.avatar && profile.photos && profile.photos[0]) {
                  user.avatar = profile.photos[0].value;
                }
                
                // Update auth methods
                if (!user.authMethods) user.authMethods = [];
                if (!user.authMethods.includes('github')) {
                  user.authMethods.push('github');
                }
                if (user.password && !user.authMethods.includes('local')) {
                  user.authMethods.push('local');
                }
                
                await user.save();
                console.log('GitHub OAuth: Account linked successfully');
              } else {
                console.log('GitHub OAuth: User already has GitHub linked');
              }
              
              return done(null, user);
            }
            
            console.log('GitHub OAuth: Creating new user');
            // Create new user if not exists
            user = new User({
              email: primaryEmail,
              name: profile.displayName || profile.username,
              githubId: profile.id,
              avatar: profile.photos && profile.photos[0] ? profile.photos[0].value : '',
              authMethods: ['github']
            });
            
            await user.save();
            console.log(`GitHub OAuth: New user created with ID ${user._id}`);
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
    console.log(`Serializing user: ${user.id}`);
    done(null, user.id);
  });
  
  // Deserialize user from session
  passport.deserializeUser(async (id, done) => {
    try {
      console.log(`Deserializing user ID: ${id}`);
      const user = await User.findById(id).select('-password');
      done(null, user);
    } catch (error) {
      console.error('Error deserializing user:', error);
      done(error, null);
    }
  });
  
  console.log('Passport configuration complete!');
};