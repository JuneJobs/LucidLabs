
/**
 * Header: Type, Length, EndpointID
 * Body: Payload
 */
const LlProtocol = require("../lib/LlProtocol");
const g = require("../config/header");
router.post("/api", function(req, res) {
    logger.debug("receive request: " + JSON.stringify(req.body));
    //var [rcvdMsgType, rcvdEI, rcvdPayload]  = msg.verifyHeader(req.body);
    //rcvdMsgType = 1, rcvdEI = 1, rcvdPayload = ???
    var protocol = new LlProtocol();
    protocol.setMsg(req.body);
    if(!protocol.verifyHeader()) return;
    if(!protocol.unpackPayload()) return;
    switch (protocol.getMsgType()) {
        case g.SSP_MSG_TYPE.SSP_SIR_REQ:
            //payload = obejct
            var payload = { "resultCode": 1 }
            protocol.packMsg(g.SSP_MSG_TYPE.SSP_SIR_RSP, payload);
            logger.debug("receive response: " + JSON.stringify(protocol.getPackedMsg()));
            res.send(protocol.getPackedMsg());
            break;

        default:
            break;
    }
  
  
    //res.send("Ok");
});
