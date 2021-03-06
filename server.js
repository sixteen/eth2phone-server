'use strict';

// set up ========================
const express  = require('express');
const app      = express();                               // create our app w/ express
const log = require('./src/libs/log')(module);
const config = require('./src/config/app-config');
const morgan = require('morgan');             // log requests to the console (express4)
const bodyParser = require('body-parser');    // pull information from HTML POST (express4)
const methodOverride = require('method-override'); // simulate DELETE and PUT (express4)
const buildRouter = require('./src/routes');
const https = require('https');
const fs = require('fs');


app.use(morgan('dev'));                                         // log every request to the console
app.use(bodyParser.urlencoded({'extended':'true'}));            // parse application/x-www-form-urlencoded
app.use(bodyParser.json());                                     // parse application/json
app.use(bodyParser.json({ type: 'application/vnd.api+json' })); // parse application/vnd.api+json as json
app.use(methodOverride());

var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header("Cache-Control", "no-cache");
    res.header("Access-Control-Max-Age", "1728000");
    next();
}


// connect to database
require('./src/models/mongoose').connectDB();


// ROUTES
app.use('/api/v1/', allowCrossDomain,
	buildRouter('routes'));

app.use('/hello/', function(req, res) {
    res.json({text: "Hello, Ethereum!"});
});

// redirect to github pages
app.use('/', function(req, res) {
    // log.debug("redirecting request : ", req.url);
    // res.writeHead(302, {'Location': 'https://eth2phone.github.io'});
    // res.end();
    res.redirect('https://eth2phone.github.io'+req.url)
});


// ERROR HANDLING
app.use(function(req, res, next){
    res.status(404);
    log.debug('Not found URL: %s',req.url);
    res.send({ error: 'Not found' });
    return;
});


// allow CORS 
app.use(function(err, req, res, next){
    log.error(err);
    res.status(err.status || 500);
    let message  = "Server error!";
    log.logFullError(err, req.method, req.url);
    if (err.code === 'EBADCSRFTOKEN') {
	message = "Неверный CRSF token. Обновите текущую страницу и повторите действие снова.";
    } else if (err.message && err.name === "BadRequestError") {
	message = err.message;
    };
    
    res.send({ errorMessage: message });
    return;
});



// listen (start app with node server.js) ======================================

if (config.get('HTTPS_ON')) {
// https
    const options = {
	ca: [fs.readFileSync(config.get("CA_BUNDLE"))],
	cert: fs.readFileSync(config.get("CA_CRT")), 
	key: fs.readFileSync(config.get("SSL_CERT_KEY"))
    };
    
    const server = https.createServer(options, app);
    server.listen(443, function(){
	console.log("https server is up at /", 443)
    });

    // redirect to https
    app.get('*',function(req,res){
	res.redirect('https://eth2phone.github.io'+req.url)
    })

    const portNum = config.get('port');    
    app.listen(portNum, function(){
        console.log("http server is up at /", portNum)
    });
    
} else {
    // http (for local)
    const portNum = config.get('port');    
    app.listen(portNum, function(){
        console.log("server is up at /", portNum)
    });

}


