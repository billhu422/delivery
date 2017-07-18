var request = require('request');
var config = require('./config');
var arr = [
   {
   "event_id": 111111,
   "date_time": "2012-11-16T01:59:07.000Z",
   "agent_addr": "127.0.0.1",
   "priority": 6,
   "message": "aaaaaaaaa",
   "up_time": 9015040,
   "hostname": "bbbbbbb",
   "context": "ccccccc"
},
   {
   "event_id": 111112,
   "date_time": "2012-11-16T01:59:07.000Z",
   "agent_addr": "127.0.0.1",
   "priority": 6,
   "message": "aaaaaaaaa",
   "up_time": 9015040,
   "hostname": "bbbbbbb",
   "context": "ddddddd"
},
]

arr.forEach(function(a){
     
     
     console.log(a);
     
 });

var output = arr.filter(function(x){return x.context=="ccccccc"});

console.log(output);

                request.get({
                            headers: {'content-type' : 'application/json'},
                            url:     config.dbRest.baseUrl + '/inventory/instance?orderId=4072',
                                                }, function(writedberr, response, body){
							console.log(body);
							var instances=[]
							JSON.parse(body).forEach(function(el){
								var item = {
									"orderId": el.orderId,
									"orderItemId": el.orderItemId,
									"userId": el.userId,
									"provider":el.provider,
									"productName":el.productName,
									"instanceId":el.instanceId
								}

								instances.push(item);
							});					
							console.log('{"code":0,"instances":['+ JSON.stringify(instances)   +  ']}');
	
						});
