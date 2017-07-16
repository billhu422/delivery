var request = require('request');
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

var output = arr.filter(function(x){return x.context=="ccccccc"});

console.log(output);

request.post({
  headers: {'content-type' : 'application/x-www-form-urlencoded'},
  url:     'http://192.168.87.152:3000/inventory/instance',
  form:    {'orderId':1234,'orderItemId':0,'userId':'huxiaowei','provider':'cvm','productName':'cvm','instanceId':'005'}
}, function(error, response, body){
  console.log(body);
});


