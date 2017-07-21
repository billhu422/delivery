var Capi = require('/opt/qcloudapi-sdk')
var assign = require('object-assign')
var config = require('./config')
var OAuth2 = require('./oauth2').OAuth2
var express = require('express')
var qcloud = require('./qcloud');
var aliyun = require('./aliyun');
var  http = require('http');
var request = require('request');
var querystring = require('querystring');

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

app.get('/v1/hybrid/instance',function(req, res){
    var access_token = req.get('Authorization').split(" ")[1];
    var url = config.oauth.account_server + '/user';
    oauth_client.get(url, access_token,function(e,response){
	if(e) {resp.status(401);resp.send('{"code" : -9,"description" : "invalid auth-token"}');return;}
	var userId = JSON.parse(response).id;
	if(userId == undefined ) {resp.status(400);resp.send('{"code" : -1,"description" : "not found user id from idm with access_token"}');return;}
	request.get({
		headers: {'content-type' : 'application/json'},
		url:     config.dbRest.baseUrl + '/inventory/instance?userId=' + userId + "&" + querystring.stringify(req.query),
		}, function(readdberr, response, body){
			if(readdberr){resp.status(500);resp.send(readdberr);return;}
			var instances=[]
			JSON.parse(body).forEach(function(el){
				var item = {
						"orderId": el.orderId,
						"orderItemId": el.orderItemId,
						"userId": el.userId,
						"provider":el.provider,
						"productName":el.productName,
						"instanceId":el.instanceId,
						"region":el.region
				}

				instances.push(item);
			});
			res.send('{"code":0,"instances":'+ JSON.stringify(instances)   +  '}');
		});
       });
});

http.globalAgent.maxSockets = Infinity;
var server = app.listen(3000,function(){
	console.log("listening in " + server.address().address + ":" + server.address().port);
});
//handle qcloud/function CONNRESET  error
//reference:http://www.cnblogs.com/lienhua34/p/6057662.html
server.setTimeout(0);
