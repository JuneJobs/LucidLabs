
/**
 * Header: Type, Length, EndpointID
 * Body: Payload
 */
//import protocol manager module
const LlProtocol = require('../lib/LlProtocol');
//import state manager module
const LlState = require('../lib/LlState');
//Import request manager module
const LlRequest = require("../lib/LlRequest");
//Import gloabal values
const g = require("../config/header");

const redis = require("redis");
//Connect with Redis client
const redisCli = redis.createClient();

router.post("/serverapi", function(req, res) {
    logger.debug("Received request on /serverapi: " + JSON.stringify(req.body));
    //var [rcvdMsgType, rcvdEI, rcvdPayload]  = msg.verifyHeader(req.body);
    //rcvdMsgType = 1, rcvdEI = 1, rcvdPayload = ???
    var protocol = new LlProtocol();
    var state = new LlState();
    var request = new LlRequest();

    protocol.setMsg(req.body);
    if(!protocol.verifyHeader()) return;
    var unpackedPayload = protocol.unpackPayload();
    if (!unpackedPayload) return;
    switch (protocol.getMsgType()) {
        case g.SWP_MSG_TYPE.SWP_SGU_REQ:
            var packedSdpSguReq = protocol.packMsg(g.SDP_MSG_TYPE.SDP_SGU_REQ, unpackedPayload);
            /*
            var options = {
                method: 'POST',
                url: 'http://localhost:8080/databaseapi',
                headers: {
                    'Cache-Control': 'no-cache',
                    'Content-Type': 'application/json'
                },
                body: packedSdpSguReq,
                json: true
            };

            request(options, function (error, response, body) {
                if (error) throw new Error(error);

                console.log(body);
            });
            */
            request.send('http://localhost:8080/databaseapi', packedSdpSguReq, (response, body) => {
                console.log(body);
            })
            break;
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
router.post("/databaseapi", function(req, res){
    logger.debug("Received request on /databaseapi: " +JSON.stringify(req.body));
    var protocol = new LlProtocol();
    var state = new LlState();
    protocol.setMsg(req.body);
    if (!protocol.verifyHeader()) return;
    //여기가 문제다..
    var unpackedPayload = protocol.unpackPayload();
    if (!unpackedPayload) return;
    switch (protocol.getMsgType()) {
        case g.SDP_MSG_TYPE.SDP_SGU_REQ:
            //state check
            redisCli.get("u:info:id:"+unpackedPayload.userId, (err,reply)=>{
                if (err){
                        resultCode = 1;
                } else {
                    if(reply === null){
                        resultCode = 0;
                    } else {
                        resultCode = 2;
                    }
                }
                res.send("No");
            })
        default:
            break;
           
    }
})
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