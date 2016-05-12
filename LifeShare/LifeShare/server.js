var express = require('express');
var app = express();
var connect = require('connect');

var credentials = require('./credentials.js');


app.set('port', process.env.PORT || 62424);

// app.set('env', 'production');

app.use(function (req, res, next) {
    var domain = require('domain').create();
    domain.on('error', function (err) {
        console.error('DOMAIN ERROR CAUGHT\n', err.stack);
        try {
            // 5초 후 shutdown
            setTimeout(function () {
                console.error('Failsafe shutdown.');
                process.exit(1);
            }, 5000);
            
            // 클러스터 연결 해제
            var worker = require('cluster').worker;
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
*/

// logging 기능 추가
switch (app.get('env')) {
    case 'development':
        app.use(require('morgan')('dev'));
        break;
    case 'production':
        app.use(require('express-logger') ({
            path:__dirname + '/log/requests.log'
        }));
}

var Client = require('mariasql');

var c = new Client({
    host: credentials.dbAuth.host,
    user: credentials.dbAuth.user,
    password: credentials.dbAuth.password
});

c.query('SHOW DATABASES', function (err, rows) {
    if (err)
        throw err;
    console.dir(rows);
});

c.end();


// json, urlencoded 제공하는 미들웨어
app.use(require('body-parser').urlencoded({ extended : true }));

// 서명된 쿠키 시크릿 사용
app.use(require('cookie-parser')(credentials.cookieSecret));

// 세션 사용
app.use(require('express-session')({
    resave : false,
    saveUninitialized: false,
    secret : credentials.cookieSecret
}));

// mocha QA 테스트 코드 - 쿼리스트링 test=1 감지
app.use(function (req, res, next) {
    res.locals.showTests = app.get('env') !== 'production' && req.query.test === '1';
    next();
});

// 페이지 라우팅
app.get('/', function (req, res) {
    res.type('text/plain');
    res.send('home');
});
app.get('/about', function (req, res) {
    res.type('text/plain');
    res.send('about');
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