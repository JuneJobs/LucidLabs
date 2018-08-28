
/**
 * Header: Type, Length, EndpointID
 * Body: Payload
 */


router.post("/api", function(req, res) {
  // Your code here
  logger.debug(req.body);
  var [rcvdMsgType, rcvdEI, rcvdPayload]  = msg.verifyHeader(req.body);
  //rcvdMsgType = 1, rcvdEI = 1, rcvdPayload = ???
  
  res.send("Ok");
  // 

});
