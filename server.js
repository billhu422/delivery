var Capi = require('/opt/qcloudapi-sdk')
var assign = require('object-assign')
var config = require('./config')
var OAuth2 = require('./oauth2').OAuth2
var express = require('express')
var qcloud = require('./qcloud');
var aliyun = require('./aliyun');

var app = express();

//load common package
app.use(require('morgan')('short'));
app.use(require('cookie-parser')());
app.use(require('body-parser').urlencoded({ extended: true }));
app.use(require('express-session')({ secret: 'keyboard cat', resave: false, saveUninitialized: false }));

//init oauth2 object
var oauth_client = new OAuth2(config.client_id,
                    config.client_secret,
                    config.account_server,
                    '/oauth2/authorize',
                    '/oauth2/token',
                    config.callbackURL);

/*
var url = config.account_server + '/user';

    // Using the access token asks the IDM for the user info
    oauth_client.get(url, "ZDNHFgTNigqpktQwx6Ci5xvkIaRDCd", function (e, response) {

        var user = JSON.parse(response);
        console.log(user);
    });

*/

app.get('/v1',function(req, res) {
    res.send("Delivery service is running");
  });

app.use('/v1/hybrid/*',function(req, res, next){
  console.log('%s %s', req.method, req.url);
  next();
});

app.use('/v1/hybrid/qcloud',qcloud);
app.use('/v1/hybrid/aliyun',aliyun);

var server = app.listen(3000,function(){
	console.log("listening in " + server.address().address + ":" + server.address().port);
});
