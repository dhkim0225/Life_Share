var credentials = require('./../credentials.js');

var passport = require('passport');
var facebook_strategy = require('passport-facebook').Strategy;


passport.serializeUser(function (user, done) {
    done(null, user.id);
});

passport.deserializeUser(function (id, done) {
    mariadb_connector.query('SELECT userId FROM users WHERE userId = ?', [id], function (err, user) {
        if (err)
            throw err;
        done(err, user);
    });
});

module.exports = function (app, options){
    if (!options.successRedirect)
        options.successRedirect = '/account';
    if (!options.failureRedirect)
        options.failureRedirect = '/login';

    return {
        init: function(){
            var env = app.get('env');
            var config = options.providers;

            passport.use(new facebook_strategy({
                clientID: config.facebook[env].appId,
                clientSecret: config.facebook[env].appSecret,
                callbackURL: (options.baseUrl || '') + '/auth/facebook/callback',
                enableProof: true
            }, function (accessToken, refreshToken, profile, done) {
                mariadb_connector = options.maria_connect;
                var authId = 'facebook:' + profile.id;
                mariadb_connector.query('SELECT userId FROM users WHERE userId = ?', [authId], function (err, user) {
                    if (err)
                        return done(err, null);
                    if (user)
                        return done(null, user);

                    mariadb_connector.query('insert into users (userId,name,created,role) values (?,?,?,?)', [authId, profile.displayName, Date.now(), 'customer'], function (err, user) {
                        if (err)
                            return done(err, null);
                        if (user)
                            return done(null, user);
                    });
                });
            }));
            app.use(passport.initialize());
            app.use(passport.session());
        },
        registerRoutes: function () {
            app.get('/auth/facebook', function (req, res, next) {
                if (req.query.redirect) req.session.authRedirect = req.query.redirect;
                passport.authenticate('facebook')(req, res, next);
            });
            app.get('/auth/facebook/callback', passport.authenticate('facebook',
                { failureRedirect: options.failureRedirect }),
                function (req, res) {
                    var redirect = req.session.authRedirect;
                    if (redirect) delete req.session.authRedirect;
                    res.redirect(303, redirect || options.successRedirect);
                }
            );
            /* 구글
            app.get('/auth/google', function (req, res, next) {
                if (req.query.redirect) req.session.authRedirect = req.query.redirect;
                passport.authenticate('google', { scope: 'profile' })(req, res, next);
            });
            app.get('/auth/google/callback', passport.authenticate('google',
                { failureRedirect: options.failureRedirect }),
                function (req, res) {
                    // we only get here on successful authentication
                    var redirect = req.session.authRedirect;
                    if (redirect) delete req.session.authRedirect;
                    res.redirect(303, req.query.redirect || options.successRedirect);
                }
            );
            */
        }
    };
}

