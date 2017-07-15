var express = require('express');
var router = express.Router();
var Capi = require('/opt/qcloudapi-sdk');
var config = require('./config');
var OAuth2 = require('./oauth2').OAuth2;
var assign = require('object-assign');

// init oauth2.0 object
var oauth_client = new OAuth2(config.client_id,
                    config.oauth.client_secret,
                    config.oauth.account_server,
                    '/oauth2/authorize',
                    '/oauth2/token',
                    config.callbackURL);


// define the home page route
router.get('/', function(req, res) {
  res.send('Qcloud resource interface');
});
// define the about route

router.post('/cvm',function(req, res) {
        var capi = new Capi({
                SecretId: config.qcloud.SecretId,
                SecretKey: config.qcloud.SecretKey,
                serviceType: 'account'
        })

        capi.request({
                Region: 'bj',
                Action: 'DescribeInstances'
        }, {
                serviceType: 'cvm'
        }, function(error, data) {
                console.log(data);
                res.send(data);
        })
});

router.post('/bgpip/checkCreate',function(req,resp){
    console.log(req.body);
    var access_token = req.get('Authorization').split(" ")[1];
    var url = config.oauth.account_server + '/user';
    console.log("url : " + url);
    oauth_client.get(url, access_token,function(e,response){ 
    	if(e) {resp.send(e);return;}
    	if(JSON.parse(response).id == undefined ) {resp.send('{"code" : -1,"description" : "not found user id from idm with access_token"}');return;}
	
	var capi = new Capi({
    		SecretId: config.qcloud.SecretId,
    		SecretKey: config.qcloud.SecretKey,
    		serviceType: 'account'
    	});
     	
	var params = assign({    
     	Region: req.query.region,
        Action: 'BgpipCheckCreate'},req.body);

     	capi.request(params, {
    				serviceType: 'bgpip'
				}, function(error, data) {
    					console.log(JSON.stringify(data,4,4));
                			if(error) resp.send(error);
                			else {
                     				if(data.code == 0 && data.data.status == 0){ 
	                				resp.send(data);
                     				}
                			}

				});
     });
});

router.post('/bgpip/create',function(req,resp){
    console.log(req.body);
    var capi = new Capi({
        SecretId: config.qcloud.SecretId,
        SecretKey: config.qcloud.SecretKey,
        serviceType: 'account'
    });

/*
     example for body
     var body = {
        'region': 4,
        'timeSpan' : 1,
        'timeUnit' : 'm',
        'goodsNum' : 1,
        'bandwidth' : 10,
        'elastic' : 1
     }
*/
     var params = assign({
        Region: req.query.region,
        Action: 'BgpipCreateResource'},req.body);

     capi.request(params, {
        serviceType: 'bgpip'
        }, function(error, data) {
                console.log(JSON.stringify(data,4,4));
                if(error) resp.send(error);
                else {
                     console.log(data.code);
                     resp.send(data);
                }
		 
        });
});



module.exports = router;
