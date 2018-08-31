
/**
 * Header: Type, Length, EndpointID
 * Body: Payload
 */
//import protocol manager module
const LlProtocol = require('../lib/LlProtocol');
//import state manager module
const LlState = require('../lib/LlState');
//Import gloabal values
const g = require("../config/header");
router.post("/api", function(req, res) {
    logger.debug("receive request: " + JSON.stringify(req.body));
    //var [rcvdMsgType, rcvdEI, rcvdPayload]  = msg.verifyHeader(req.body);
    //rcvdMsgType = 1, rcvdEI = 1, rcvdPayload = ???
    var protocol = new LlProtocol();
    var state = new LlState();

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
/*
    state.setState(g.ENDPOIONT_ID_TYPE.EI_TYPE_SENSOR_TSI, [1, "3c:15:c2:e2:e9:cc"], g.SSR_TSI_STATE_ID.SSR_TSI_HALF_SSN_INFORMED_STATE);
    state.setState(g.ENDPOIONT_ID_TYPE.EI_TYPE_SENSOR_TSI, [2, "3c:15:c2:e2:e9:cc"], g.SSR_TSI_STATE_ID.SSR_TSI_SSN_INFORMED_STATE, 5);
    state.setState(g.ENDPOIONT_ID_TYPE.EI_TYPE_APP_USN, 4, g.CLI_USN_STATE_ID.CLI_USN_IDLE_STATE, 5);

    state.getState(g.ENDPOIONT_ID_TYPE.EI_TYPE_SENSOR_TSI, 1, (res) => {
        console.log(res);
    });
    state.getState(g.ENDPOIONT_ID_TYPE.EI_TYPE_SENSOR_TSI, 2, (res) => {
        console.log(res);
    });
    state.getState(g.ENDPOIONT_ID_TYPE.EI_TYPE_APP_USN, 4, (res) => {
        console.log(res);
    });
 */