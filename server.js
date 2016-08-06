const express = require('express');
const app = express();
const connect = require('connect');
const path    = require("path");
const request = require('request');
const credentials = require('../../credentials.js');
const user = require('./models/user.js');    // DB 끌어오기


app.set('port', process.env.PORT || 62424);

// app.set('env', 'production');

app.use(function (req, res, next) {
    const domain = require('domain').create();
    domain.on('error', function (err) {
        console.error('DOMAIN ERROR CAUGHT\n', err.stack);
        try {
            // 5초 후 shutdown
            setTimeout(function () {
                console.error('Failsafe shutdown.');
                process.exit(1);
            }, 5000);

            // 클러스터 연결 해제
            const worker = require('cluster').worker;
            if (worker) worker.disconnect();

            // req를 그만 받음
            server.close();

            try {
                next(err);
            } catch (error) {
                console.error('Express error mechanism failed.\n', error.stack);
                res.statusCode = 500;
                res.setHeader('content-type', 'text/plain');
                res.end('Server error.');
            }
        } catch (error) {
            console.error('Unable to send 500 response.\n', error.stack);
        }
    });

    domain.add(req);
    domain.add(res);

    domain.run(next);
});
// static - public 폴더
app.use(express.static(__dirname + '/public'));

/* csurf 공격 방어
app.use(require('csurf')());
app.use(function (req, res, next) {
    res.locals._csrfToken = req.csrfToken();
    next();
});
*/

// logging 기능 추가
switch (app.get('env')) {
    case 'development':
        app.use(require('morgan')('dev'));
        break;
    case 'production':
        app.use(require('express-logger')({
            path: __dirname + '/log/requests.log'
        }));
}



// json, urlencoded 제공하는 미들웨어
app.use(require('body-parser').urlencoded({ extended : true }));

// 서명된 쿠키 시크릿 사용
app.use(require('cookie-parser')(credentials.cookieSecret));

// 세션 사용 - 저장소 : MongoDB
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const sessionStore = new MongoStore({
    url:credentials.mongo[app.get('env')].sessionString,
    ttl:7 * 24 * 60 * 60
});

app.use(session({
    resave : false,
    saveUninitialized: false,
    secret : credentials.cookieSecret,
    store : sessionStore,
    cookie : {
        httpOnly :true, //서버에서만 쿠키 수정 가능
        secure : false, //https 연결에서만 보냄
        maxAge : 1000 * 60 * 60 * 24 * 7,
        signed : true
    }
}));



// mocha QA 테스트 코드 - 쿼리스트링 test=1 감지
app.use(function (req, res, next) {
    res.locals.showTests = app.get('env') !== 'production' && req.query.test === '1';
    next();
});


// DB 연동 - mongoose 모듈 사용(mongoDB)
const mongoose = require('mongoose');
const options = {
    server: {
       socketOptions: { keepAlive: 1 } 
    }
};
switch(app.get('env')){
    case 'development':
        mongoose.connect(credentials.mongo.development.userString, options);
        break;
    case 'production':
        mongoose.connect(credentials.mongo.production.userString, options);
        break;
    default:
        throw new Error('Unknown execution environment: ' + app.get('env'));
}


// 인증
app.set('BASE_URL', process.env.BASE_URL || 'localhost:62424');

const auth = require('./lib/auth.js')(app, {
    baseUrl: process.env.BASE_URL,
    providers: credentials.authProviders,
    successRedirect: '/account',
    failureRedirect: '/unauthorized'
});
auth.init();
auth.registerRoutes();



// 고객 사용 가능 페이지
// >> 라우팅 시 app.get('/account',customerOnly,function ... ) 식으로 사용
function customerOnly(req, res, next) {
    if (req.user && req.user.role === 'customer') return next();
    res.redirect(303, '/unauthorized');
}

// 직원 사용 가능 페이지
function employeeOnly(req, res, next) {
    if (req.user && req.user.role === 'employee') return next();
    next('route');
}

// 여러 역할 사용 가능 페이지
function allow(roles) {
    return function (req, res, next) {
        if (req.user && roles.split(',').indexOf(req.user.role) !== -1) return next();
        res.redirect(303, '/unauthorized');
    };
}

// unauthorized 라우팅
app.get('/unauthorized', function (req, res) {
    res.status(403).render('unauthorized');
});


function confirm_login(req,res,user){
    if(req.session.passport.user){
        user.findOne({_id:req.session.passport.user},function(err,data){
            if(err){
                console.log('login Error occured');
            }else{
                // client에 데이터 담아서 쏴주기
                console.log('로그인 굿');
            }
        });
    }
    else
        console.log('ㅇㅅㅇ');
}




// 페이지 라우팅
app.get('/', function (req, res) {
    confirm_login(req,res,user);
    res.type('text/plain');
    res.send('home');
});
app.get('/about', function (req, res) {
    res.type('text/plain');
    res.send('about');
});
app.get('/account', function (req, res) {
    res.type('text/plain');
    res.send('account');
});
app.get('/unauthorized', function (req, res) {
    res.type('text/plain');
    res.send('unauthorized');
});
app.get('/logout', function (req, res) {
    req.session.passport.user = null;
    delete req.session.passport.user;
    res.redirect('/');
});

// 와우자 연동 테스트
app.get('/requesting',function(req,res){
    request.get({
        url:'http://localhost:8087/v2/servers/_defaultServer_/vhosts/_defaultVHost_/applications',
        headers:{
            Accept:'application/json',
            charset:'utf-8'
        }
    },function (error, response, body) {
        if (!error && response.statusCode == 200) {
            const info = JSON.parse(body);
            console.log(info);
        }
        else
            console.log('error on wowza');
    }).auth(credentials.wowza.userid,credentials.wowza.userpw, false);
    res.redirect('/');
});

// 와우자 앱 추가테스트
app.get('/requesting2',function(req,res){
    request.post({
        url:'http://localhost:8087/v2/servers/_defaultServer_/vhosts/_defaultVHost_/applications',
        form:{
            ApplicationConfig : {
                restURI: "http://localhost:8087/v2/servers/_defaultServer_/vhosts/_defaultVHost_/applications/testlive",
                name: "testlive",
                appType: "Live",
                clientStreamReadAccess: "*",
                clientStreamWriteAccess: "*",
                description: "Testing our Rest Service"
                
            },
            securityConfig : {
                
            }
        },
        headers:{
            Accept:'application/json',
            charset:'utf-8'
        },function (error, response, body) {
            if (!error && response.statusCode == 200) {
                const info = JSON.parse(body);
                console.log(info);
            }
            else
                console.log('error on wowza');
        }
    }).auth(credentials.wowza.userid,credentials.wowza.userpw, false);
    res.redirect('/');
});

// 404 오류처리
app.use(function (req, res, next) {
    res.type('text/plain');
    res.status(404);
    res.send('404 Not Found');
});

// 500 오류처리
app.use(function (err, req, res, next) {
    console.error(err.stack);
    res.type('text/plain');
    res.status(500);
    res.send('500 Server Error');
});


function startServer() {
    app.listen(app.get('port'), function () {
        console.log('Express started in ' + app.get('env') +
        ' mode on http://localhost:' +
        app.get('port') + '; press Ctrl-C to terminate.');
    });
}
if (require.main === module) {
    startServer();
} else {
    module.exports = startServer;
}