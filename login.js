const session = require('express-session');
const jwt = require('jsonwebtoken');

module.exports = function (app, settings, db) {

    var DiscordStrategy = require('passport-discord').Strategy;
    var scopes = ['identify', 'email', 'guilds'];

    const passport = require('passport');

    passport.serializeUser(function (user, done) {
        done(null, user);
    });

    passport.deserializeUser(function (user, done) {
        done(null, user);
    });


    app.use(session({
        secret: settings.sessionSecret,
        resave: false,
        saveUninitialized: false
      }));
      

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

    app.use(passport.authenticate('session'));

    app.get('/auth/discord', passport.authenticate('discord'));

    app.get(settings.discordCallbackURL, passport.authenticate('discord', {
        failureRedirect: '/'
    }), function (req, res) {
        const jwtPayload = req.session.passport.user

        //update user in dynamo
        // db.user.get()

        res.redirect(settings.uiUrl + 'authResponse?jwt=' + jwt.sign(jwtPayload, settings.sessionSecret)) // Successful auth
    });

    const infightLogin = {
        passport: passport
    }

    return infightLogin
}