var express = require('express');
var router = express.Router();
var Capi = require('/opt/qcloudapi-sdk');
var config = require('./config');
var OAuth2 = require('./oauth2').OAuth2;
var assign = require('object-assign');
var request = require('request');
// init oauth2.0 object
var oauth_client = new OAuth2(config.client_id,
                    config.oauth.client_secret,
                    config.oauth.account_server,
                    '/oauth2/authorize',
                    '/oauth2/token',
                    config.callbackURL);



var REGION = [
  { "name" : "北京", "value": 8},
  { "name" : "上海", "value": 4},
  { "name" : "广州", "value": 1},	
];

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
    if(req.get('Authorization') == undefined) {resp.status(400);resp.send('{"code" : -8,"description" : "Need Authorization"}');return;}
    var access_token = req.get('Authorization').split(" ")[1];
    var url = config.oauth.account_server + '/user';
    console.log("url : " + url);
    oauth_client.get(url, access_token,function(e,response){ 
    	if(e) {resp.status(401);resp.send('{"code" : -9,"description" : "invalid auth-token"}');return;}
    	if(JSON.parse(response).id == undefined ) {resp.status(400);resp.send('{"code" : -1,"description" : "not found user id from idm with access_token"}');return;}
	
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
    console.log(req.get('Authorization'));
    if(req.get('Authorization') == undefined) {resp.status(400);resp.send('{"code" : -8,"description" : "Need Authorization"}');console.log('{"code" : -8,"description" : "Need Authorization"}');return;}
    var access_token = req.get('Authorization').split(" ")[1];
    var url = config.oauth.account_server + '/user';
    //1. validte customer access token 
    oauth_client.get(url, access_token,function(e,response){
    console.log(JSON.stringify(response,4,4));
        if(e) {resp.status(401);resp.send('{"code" : -9,"description" : "invalid auth-token"}');return;}
        console.log('Retrieving userid...');
        if(JSON.parse(response).id == undefined ) {resp.status(400);resp.send('{"code" : -1,"description" : "not found user id from idm with access_token"}');console.log('{"code" : -1,"description" : "not found user id from idm with access_token"}');return;}
        //1.0 retrieve userid with access_token
        var userId = JSON.parse(response).id;

        //1.1 retrieve order info(orderItemId,order related partyid, order status)
        console.log('Retrieve order info...');
        var orderId = req.body.orderId;
        var orderItemId;
        var partyId;
        var provider;
        var productName;
        var orderStatus;
        var options = {
                //relatedParty.id=yangrui&&relatedParty.role=Customer
                url: config.eco.baseUrl + config.eco.orderPath + "/?id=" + orderId + "&relatedParty.id=" + userId + "&relatedParty.role=Customer",
                headers: {
                        'Authorization': req.get('Authorization')
                }
        };
	console.log("header:" + JSON.stringify(options,4,4));
        request(options,function(error,response,body){ 
		console.log(body);
                var orders = JSON.parse(body);
                var order = orders[0];
	        console.log(order);	
                if( order == undefined) {resp.status(400);resp.send('{"code" : -2,"description" : "Not found order."}');return;}
 	        
                //validate pay status
                var textObj = order.note.filter(function(x){return x.text=="Paid"})[0];
                if( textObj ==undefined )  {resp.status(400);resp.send('{"code":-3,"description":"The order is not paied, cannot  delivery an instance by the order"}');console.log('{"code":-3,"description":"The order is not paied, cannot  delivery an instance by the order"}');return;}
	
		//delivery instances
                order.orderItem.forEach(function(item){
		//delivery successful Acknowledged,	InProgress -> Completed
                //failed ->hold
			//retrieve itemUserId
			var itemPartyId = item.product.relatedParty.filter(function(x){return x.role=="Customer"})[0].id;	
			if(itemPartyId == undefined) {resp.status(400);resp.send('{"code":-4,"description":"Cannot found itemPartyId"}');console.log('{"code":-4,"description":"Cannot found itemPartyId"}');return;}
			if(item.state != 'Acknowledged' || item.state != "InProgess")  {resp.status(400);resp.send('{"code":-7,"description":"Only Acknowledged or InProgess can be manually modified"}');console.log('{"code":-7,"description":"Only Acknowledged or InProgess can be manually modified"}');return;}
                         
                        var provider = item.product.productCharacteristic.filter(function(x){return x.name=="provider"})[0].value;		        
                        var productName = item.product.productCharacteristic.filter(function(x){return x.name=="productname"})[0].value;

                        var timeSpan = item.product.productCharacteristic.filter(function(x){return x.name=="购买时长"})[0].value; //10 Month
			var timeSpanValue = parseInt(timeSpan.split(' ')[0]);
                        var timeUnit = 'm';
			if( timeSpanValue > 12){  // Yearly
				timeSpanValue = timeSpanValue/12;
                                timeUnit = 'y';
                        }
 
                        var goodsNum = 1;
                  
                        var bandwidth = item.product.productCharacteristic.filter(function(x){return x.name=="保底防护峰值"})[0].value; //10 Gbps
                        var bandwidthValue = parseInt(bandwidth.split(' ')[0]); 
                  
		        var elastic = item.product.productCharacteristic.filter(function(x){return x.name=="弹性防护峰值"})[0].value;//10 Gbps
                        var elasticValue = parseInt(elastic.split(' ')[0]);                  

                        var region = item.product.productCharacteristic.filter(function(x){return x.name=="地域"})[0].value;
                        var regionValue = REGION.filter(function(x){return x.name==region})[0].value;
			console.log("provider: " + provider);
			console.log("productName: " + productName);
                        console.log("timeSpan:" + timeSpanValue);
                        console.log("timeUnit:" + timeUnit);
                        console.log("goodsNum:" + goodsNum);
                        console.log("bandwidthValue:" + bandwidthValue);
                        console.log("elasticValue:" + elasticValue);
                        console.log("regionValue:" + regionValue);
                        
                        //create instance
		    	var capi = new Capi({
                		SecretId: config.qcloud.SecretId,
                		SecretKey: config.qcloud.SecretKey,
                		serviceType: 'account'
        		});
	
			params_in = {
				'region': regionValue,
                                'timeSpan': timeSpanValue,
                                'timeUnit': timeUnit,
                                'goodsNum': goodsNum,
                                'bandwidth':bandwidthValue,
                                'elastic':elasticValue
			};
        
        		var params = assign({    
        			Region: regionValue,
        			Action: 'BgpipCheckCreate'},params_in);

        		capi.request(params, {  
                                serviceType: 'bgpip'
                              }, function(error, data) {
                                   console.log(JSON.stringify(data,4,4));
				    //fetch admin(application) access token
                                   var key = config.oauth.client_id + ':' + config.oauth.client_secret;
                                   var base64 = (new Buffer(key)).toString('base64');
                                   var options = {
                                            url: config.oauth.account_server + '/oauth2/token',
                                            headers: {
                                                    'Authorization' : 'Basic ' + base64,
                                                    'Content-Type' : 'application/x-www-form-urlencoded'
                                                     },
                                            form: {'grant_type':config.oauth.grant_type,'username':config.oauth.username,'password':config.oauth.password}
                                    };
                                    console.log(options); 
                                    request.post(options, function(err,httpResponse,body){
					if(err) {resp.send(err);return;}
                                    	console.log(body);
					var adminAccessToken = JSON.parse(body).access_token;
					console.log("adminAccessToken = " + adminAccessToken);
                                        if(error) {resp.send(error);
						//update order status to Held
                                                                item.state = "Held";
                                                                console.log(JSON.stringify(item));
                                                                var options = {
                                                                        headers: {'content-type' : 'application/json','Authorization': 'Bearer ' + adminAccessToken},
                                                                        url: config.eco.baseUrl + config.eco.orderPath + "/" + orderId,
                                                                        body:    '{ "orderItem":[' + JSON.stringify(item) + ']}'
                                                                        }
                                                                console.log(options);
                                                                request.patch(options, function(patchordererr, response, body){
                                                                                console.log("xxx");
                                                                                console.log(body);
                                                                                if(patchordererr){ resp.send(patchordererr);return; }
										resp.status(500);
                                                                                console.log('{"code":45,description:"Retreive adminAccessToken Error"');
                                                                                resp.send('{"code":-5,description:"Retreive adminAccessToken Error"');
                                                                        });
					}
					else{
						//write db
                                         request.post({
                                                headers: {'content-type' : 'application/x-www-form-urlencoded'},
                                                url:     config.dbRest.baseUrl + '/inventory/instance',
                                                form:    {'orderId':orderId,'orderItemId':item.id,'userId':itemPartyId,'provider':provider,'productName':productName,'instanceId':'bgpip-000000z1','region':regionValue}
                                                }, function(writedberr, response, body){
							if(writedberr) {resp.send(writedberr);
								//update order status to hold	
                                                                item.state = "Held";
                                                                console.log(JSON.stringify(item));
                                                                var options = {
                                                                        headers: {'content-type' : 'application/json','Authorization': 'Bearer ' + adminAccessToken},
                                                                        url: config.eco.baseUrl + config.eco.orderPath + "/" + orderId,
                                                                        body:    '{ "orderItem":[' + JSON.stringify(item) + ']}'
                                                                        }
                                                                console.log(options);
                                                                request.patch(options, function(patchordererr, response, body){
                                                                                console.log(body);
                                                                                if(patchordererr){ resp.send(patchordererr);return; }
										resp.status(500);
                                                                                console.log('{"code":-6,"description":"Write instance to inventory database failed"');
                                                                                resp.send('{"code":-6,"description":"Write instance to inventory database failed"');
                                                                        });								
							}
							else {
								//update order status to completed
								console.log("writedb successfully!");
								item.state = "Completed";
								console.log(JSON.stringify(item));
								var options = {
                                                                        headers: {'content-type' : 'application/json','Authorization': 'Bearer ' + adminAccessToken},
                                                                        url: config.eco.baseUrl + config.eco.orderPath + "/" + orderId,
                                                                        body:    '{ "orderItem":[' + JSON.stringify(item) + ']}'
                                                                        }
								console.log(options);
								request.patch(options, function(patchordererr, response, body){
										console.log(body);
										if(patchordererr){ resp.send(patchordererr);return; } 	
										if(JSON.parse(body).error != undefined){resp.send(body);return;}
										resp.send('{"code":0}');	
									});
							}
                                                });
					}
				    });
                       		});    	
			
		});
       		
	   });
    });
});
module.exports = router;
