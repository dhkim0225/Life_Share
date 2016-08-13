const User = require('../models/user.js'),    // DB 끌어오기
	passport = require('passport'),
	FacebookStrategy = require('passport-facebook').Strategy;
	GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

// 직렬화
passport.serializeUser(function(user, done){
	done(null, user._id);
});

// 역직렬화
passport.deserializeUser(function(id, done){
	User.findById(id, function(err, user){
		if(err || !user) return done(err, null);
		done(null, user);
	});
});

module.exports = function(app, options){
	let clientIP;
	app.use(function(req,res,next){
		clientIP = (req.headers['x-forwarded-for'] || '').split(',')[0] || req.connection.remoteAddress;
		next();
	});
	if(!options.successRedirect)
		options.successRedirect = '/account';
	if(!options.failureRedirect)
		options.failureRedirect = '/login';

	return {

		init: function() {
			const env = app.get('env');
			const config = options.providers;

			// 페이스북 인증 전략(대부분 보일러플레이트)
			passport.use(new FacebookStrategy({
				clientID: config.facebook[env].appId,
				clientSecret: config.facebook[env].appSecret,
				callbackURL: (options.baseUrl || '') + '/auth/facebook/callback',
			}, function(accessToken, refreshToken, profile, done){
				const authId = 'facebook:' + profile.id;      // id 저장할 때 페북사용자는 앞에 facebook 추가로 붙임
				User.findOne({ authId: authId }, function(err, user){ 
					if(err) return done(err, null);
					if(user) return done(null, user);  
					user = new User({       // 인증 성공 시 저장할 내용
						authId: authId,
						name: profile.displayName,
						created: Date.now(),
						role: 'customer',
						ip: clientIP
					});					
					user.save(function(err){    // DB에 저장
						if(err) return done(err, null);
						done(null, user);
					});
				});
			}));

            // 구글 인증 전략
			passport.use(new GoogleStrategy({
				clientID: config.google[env].clientID,
				clientSecret: config.google[env].clientSecret,
				callbackURL: (options.baseUrl || '') + '/auth/google/callback',
			}, function(token, tokenSecret, profile, done){
				const authId = 'google:' + profile.id;
				User.findOne({ authId: authId }, function(err, user){
					if(err) return done(err, null);
					if(user) return done(null, user);
					user = new User({
						authId: authId,
						name: profile.displayName,
						created: Date.now(),
						role: 'customer',
						ip: clientIP
					});
					req.session.name = authId;
					user.save(function(err){
						if(err) return done(err, null);
						done(null, user);
					});

				});
			}));
            

			app.use(passport.initialize());
			app.use(passport.session());
		},

		registerRoutes: function(){
            // 페이스북 라우팅
			app.get('/auth/facebook', function(req, res, next){
				if(req.query.redirect) 
                    req.session.authRedirect = req.query.redirect;
				passport.authenticate('facebook')(req, res, next);
			});

            // 페이스북 콜백 라우팅
			app.get('/auth/facebook/callback', passport.authenticate('facebook', 
				{ failureRedirect: options.failureRedirect }),
				function(req, res){
					
					// 인증 성공 라우팅
					const redirect = req.session.authRedirect;
					if(redirect) 
                        delete req.session.authRedirect;
					res.redirect(303, redirect || options.successRedirect);
				}
			);

			
            // 구글 라우팅
			app.get('/auth/google', function(req, res, next){
				if(req.query.redirect) req.session.authRedirect = req.query.redirect;
				passport.authenticate('google', { scope: 'profile' })(req, res, next);
			});

            // 구글 콜백 라우팅
			app.get('/auth/google/callback', passport.authenticate('google', 
				{ failureRedirect: options.failureRedirect }),
				function(req, res){
                    // 인증 성공 라우팅
					const redirect = req.session.authRedirect;
					if(redirect) 
						delete req.session.authRedirect;
					res.redirect(303, req.query.redirect || options.successRedirect);
				}
			);
            
		},

	};
};