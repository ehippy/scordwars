require('dotenv').config()
const jwt = require('jsonwebtoken');

const settings = {
  discord_oauth2_client_id: process.env.DISCORD_OAUTH2_CLIENT_ID,
  discord_oauth2_client_secret: process.env.DISCORD_OAUTH2_CLIENT_SECRET,
  discordCallbackURL: '/auth/discord/callback',
  sessionSecret: process.env.SESSION_SECRET,
  uiUrl: 'http://localhost:5173/'
}

const express = require('express')
const app = express()
const port = 3000

const session = require('express-session');
const passport = require('passport');

const disco = require("discord.js")


var DiscordStrategy = require('passport-discord').Strategy;

var scopes = ['identify', 'email', 'guilds'];

app.use(session({
  secret: settings.sessionSecret,
  resave: false,
  saveUninitialized: false
}));
app.use(passport.authenticate('session'));

passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (user, done) {
  done(null, user);
});

passport.use(new DiscordStrategy({
  clientID: settings.discord_oauth2_client_id,
  clientSecret: settings.discord_oauth2_client_secret,
  callbackURL: settings.discordCallbackURL,
  scope: scopes
},
  function (accessToken, refreshToken, profile, cb) {
    console.log(profile)
    const userProfile = {
      username: profile.username,
      avatar: profile.avatar,
      email: profile.email,
      id: profile.id
    }
    return cb(null, userProfile);
  }));

app.get('/auth/discord', passport.authenticate('discord'));
app.get(settings.discordCallbackURL, passport.authenticate('discord', {
  failureRedirect: '/'
}), function (req, res) {
  const jwtPayload = req.session.passport.user
  res.redirect(settings.uiUrl + 'authResponse?jwt=' + jwt.sign(jwtPayload, settings.sessionSecret)) // Successful auth
});

app.use('/', express.static('public'))

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})