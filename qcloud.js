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
router.post('/bipip/create',function(req,resp){
    console.log(req.body);
    var access_token = req.get('Authorization').split(" ")[1];
    var url = config.oauth.account_server + '/user';
    //1. validte customer access token 
    oauth_client.get(url, access_token,function(e,response){
    console.log(JSON.stringify(response,4,4));
        if(e) {resp.send(e);return;}
        console.log('Retrieving userid...');
        if(JSON.parse(response).id == undefined ) {resp.send('{"code" : -1,"description" : "not found user id from idm with access_token"}');return;}
        //1.0 retrieve userid with access_token
        var userId = response.id;

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
                url: config.eco.baseUrl + config.eco.orderPath + "/?id=" + idorderId + "&relatedParty.id=" + userId + "&relatedParty.role=Customer",
                headers: {
                        'Authorization': req.get('Authorization')
                }
        };

       request(options,function(error,response,body){ 
                var order = JSON.parse(body);
                if(order.id == undefined) {resp.send('{"code" : -2,"description" : "Not found order."}');return;}
 	        
                //validate pay status
	        for(note in order.notes) {
                        if(note.text == "Paid") {orderStatus = note.text; break;}
                }
                if(orderStatus != "Paid") {resp.send('{"code":-3,"description":"The order is not paied, cannot  delivery an instance by the order"}');return;}
	
		//delivery instances
		for(item in orderItem){
		//delivery successful Acknowledged,	InProgress -> Completed
                //failed ->hold
			//retrieve itemUserId
			for(itemParty in item.relatedParty){
				if(itemParty.role == "Customer") { itemPartyId = itemParty.id; break;} 
			}
		
			if(itemPartyId == undefined) {resp.send('{"code":-4,"description":"Cannot found itemPartyId"}');continue;}
                         
                        var provider = item.product.productCharacteristic.filter(function(x){return x.name=="provider"}).value;		        
                        var productName = item.product.productCharacteristic.filter(function(x){return x.name=="productname"}).value;
                        
                        	
                }
			
		
                 
       });


    });


});
router.post('/bgpip/create1',function(req,resp){
    console.log(req.body);
    var access_token = req.get('Authorization').split(" ")[1];
    var url = config.oauth.account_server + '/user';
    //1. validte customer access token 
    oauth_client.get(url, access_token,function(e,response){ 
	console.log(JSON.stringify(response,4,4));
    	if(e) {resp.send(e);return;}
	console.log('Retrieving userid...');
    	if(JSON.parse(response).id == undefined ) {resp.send('{"code" : -1,"description" : "not found user id from idm with access_token"}');return;}
        //1.0 retrieve userid with access_token
        var userId = response.id; 
	//1.1 retrieve order info(orderItemId,order related partyid, order status)
        console.log('Retrieve order info...');
        var orderId = req.body.orderId;
        var orderItemId = req.body.orderItemId;
        var partyId;
        var provider;
        var productName;
        var orderStatus;
        var options = {
                url: config.eco.baseUrl + config.eco.orderPath + "/" + orderId + "?" + "orderItemId=" + orderItemId,
                headers: {
                        'Authorization': req.get('Authorization')
                }
        };
        request(options,function(error,response,body){
		console.log(JSON.stringify(body,4,4));
                if(error) {resp.send(error);return;}
	        	
		//retrieve order property
                //a.partyId
                var order = JSON.parse(body);
                orderId = order.id;
                for(party in order.relatedParty) {
                	if(party.role == "Customer") {paryId = party.id; break;}
                }
                //b.provider
                provider = "qcloud";
                //c.productName
                productName = "gaofangip";
                //d.orderStatus;
                orderStatus = "paied";
               	
                //2. validate userid with order's related partyid
                console.log("Validating userid with order's related partyid..."); 
        	if( userId != partyId) {resp.send('{"code":-2,"description":"The User is not the customer in order, so cannot  delivery   instance by the order"}');return;}
                console.log("Validate userid successfully!");
        	//3. check order status whether or not paid
                console.log("Checking order status...");
        	if( orderStatus != "paied") {resp.send('{"code":-3,"description":"The order  is not paied, so cannot  delivery   instance by the order"}');return;}
                console.log("Check order status successfully!");
        	console.log("Delivery now!");
        	//5. if delievery successfully, then write instance info into inventory database, or not return error.
                request.post({
  			headers: {'content-type' : 'application/x-www-form-urlencoded'},
  			url:     config.dbRest.baseUrl + '/inventory/instance',
  			form:    {'orderId':orderId,'orderItemId':orderItemId,'userId':'huxiaowei','provider':'cvm','productName':'cvm','instanceId':'005'}
		}, function(error, response, body){
			if(error) {resp.send(error);return;}
                	
			//6. update order status to completed.
                        //6.1 retrieve seller access_token
                        console.log("write database successfully!");
			//request.patch();
			resp.send("write database successfully!");
                          
		});

                 
                
        });


        //4. delivery product
/*	var capi = new Capi({
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
                                            //5. if delievery successfully, then write instance info into inventory database, or not return error.
        				    //6. update order status to completed.
                     			    }
				});
*/
     });
});

router.get('/order',function(req,resp){
        var options = {
  		url: config.eco.baseUrl + config.eco.orderPath,
  		headers: {
    			'Authorization': req.get('Authorization')
  		}
	};
	request(options,function(error,response,body){
                if(error) {resp.send(error);return;}
                console.log(body);
        });
});


module.exports = router;
