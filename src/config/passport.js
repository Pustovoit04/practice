const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const OAuth2Strategy = require('passport-oauth2').Strategy;
const pool = require('../db');

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    done(null, result.rows[0]);
  } catch (error) {
    done(error);
  }
});

// Facebook Strategy (вже є)
passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_APP_ID,
  clientSecret: process.env.FACEBOOK_APP_SECRET,
  callbackURL: 'http://localhost:5000/api/auth/facebook/callback',
  profileFields: ['id', 'displayName', 'email']
},
async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await pool.query('SELECT * FROM users WHERE facebook_id = $1', [profile.id]);
    if (user.rows.length === 0) {
      const newUser = await pool.query(
        'INSERT INTO users (facebook_id, name, email) VALUES ($1, $2, $3) RETURNING *',
        [profile.id, profile.displayName, profile.emails[0].value]
      );
      user = newUser;
    }
    return done(null, user.rows[0]);
  } catch (error) {
    return done(error);
  }
}));



// Google Strategy (вже є)
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: 'https://practice-trly.onrender.com/api/auth/google/callback'
},
async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await pool.query('SELECT * FROM users WHERE google_id = $1', [profile.id]);
    if (user.rows.length === 0) {
      const newUser = await pool.query(
        'INSERT INTO users (google_id, name, email) VALUES ($1, $2, $3) RETURNING *',
        [profile.id, profile.displayName, profile.emails[0].value]
      );
      user = newUser;
    }
    return done(null, user.rows[0]);
  } catch (error) {
    return done(error);
  }
}));

const TwitterStrategy = require('passport-twitter-oauth2').Strategy;

passport.use(new TwitterStrategy({
  clientID: process.env.TWITTER_CLIENT_ID,
  clientSecret: process.env.TWITTER_CLIENT_SECRET,
  callbackURL: 'http://localhost:5000/api/auth/twitter/callback',
  scope: ['tweet.read', 'users.read', 'offline.access'],
},
async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await pool.query('SELECT * FROM users WHERE twitter_id = $1', [profile.id]);
    if (user.rows.length === 0) {
      const email = profile.emails?.[0]?.value || null;
      const newUser = await pool.query(
        'INSERT INTO users (twitter_id, name, email) VALUES ($1, $2, $3) RETURNING *',
        [profile.id, profile.displayName, email]
      );
      user = newUser;
    }
    return done(null, user.rows[0]);
  } catch (error) {
    return done(error);
  }
}));



// Instagram Strategy (через OAuth 2.0)
passport.use('instagram', new OAuth2Strategy({
  authorizationURL: 'https://api.instagram.com/oauth/authorize',
  tokenURL: 'https://api.instagram.com/oauth/access_token',
  clientID: process.env.INSTAGRAM_CLIENT_ID,
  clientSecret: process.env.INSTAGRAM_CLIENT_SECRET,
  callbackURL: 'http://localhost:5000/auth/instagram/callback',
  scope: ['user_profile', 'user_media']
},
async (accessToken, refreshToken, profile, done) => {
  try {
    // Instagram не повертає email напряму, тому використовуємо ID
    let user = await pool.query('SELECT * FROM users WHERE instagram_id = $1', [profile.id]);
    if (user.rows.length === 0) {
      const newUser = await pool.query(
        'INSERT INTO users (instagram_id, name) VALUES ($1, $2) RETURNING *',
        [profile.id, profile.displayName || 'Instagram User']
      );
      user = newUser;
    }
    return done(null, user.rows[0]);
  } catch (error) {
    return done(error);
  }
}));

const GitHubStrategy = require('passport-github2').Strategy;

passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: 'http://localhost:5000/api/auth/github/callback'
},
async (accessToken, refreshToken, profile, done) => {
  try {
    // 1. Перевіряємо, чи існує користувач із таким GitHub ID
    let user = await pool.query('SELECT * FROM users WHERE github_id = $1', [profile.id]);

    // 2. Якщо не існує — створюємо
    if (user.rows.length === 0) {
      const newUser = await pool.query(
        'INSERT INTO users (github_id, name, email) VALUES ($1, $2, $3) RETURNING *',
        [
          profile.id,
          profile.displayName || profile.username,
          profile.emails?.[0]?.value || null // email може бути недоступним
        ]
      );
      user = newUser;
    }

    // 3. Повертаємо користувача
    return done(null, user.rows[0]);

  } catch (err) {
    return done(err);
  }
}));



module.exports = passport;
