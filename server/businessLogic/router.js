
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

//Import codegenerator manager module
const LlCodeGenerator = require("../lib/LlCodeGenerator")

//Import gloabal values
const g = require("../config/header");

const redis = require("redis");
//Connect with Redis client
const redisCli = redis.createClient();

router.post("/serverapi", function(req, res) {
    logger.debug("SERVER Received request on /serverapi: " + JSON.stringify(req.body));
    //var [rcvdMsgType, rcvdEI, rcvdPayload]  = msg.verifyHeader(req.body);
    //rcvdMsgType = 1, rcvdEI = 1, rcvdPayload = ???
    var protocol = new LlProtocol();
    var state = new LlState();
    var request = new LlRequest();
    var codeGen = new LlCodeGenerator();

    protocol.setMsg(req.body);
    if(!protocol.verifyHeader()) return;
    var unpackedPayload = protocol.unpackPayload();
    if (!unpackedPayload) return;
    switch (protocol.getMsgType()) {
        case g.SWP_MSG_TYPE.SWP_SGU_REQ:
            var userInfo = unpackedPayload;
            state.getState(g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI, protocol.getEndpointId(), (res) => {
                console.log(res);
                //if()
                //g.SERVER_RECV_MSG_BY_STATE.TCI.USER_ID_DUPLICATE_REQUESTED_STATE
            });
            var packedSdpSguReq = protocol.packMsg(g.SDP_MSG_TYPE.SDP_SGU_REQ, unpackedPayload);
            logger.debug("SERVER send request: " + JSON.stringify(protocol.getPackedMsg()));
            state.setState(g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI, [protocol.getEndpointId(), userInfo.userId], g.CLI_TCI_STATE_ID.CLI_TCI_USER_ID_DUPLICATE_REQUESTED_STATE);
            request.send('http://localhost:8080/databaseapi', packedSdpSguReq, (message) => {
                var sdpSguRspCode = 0;
                protocol.setMsg(message);
                if (!protocol.verifyHeader()) return;
                var unpackedPayload = protocol.unpackPayload();
                if (!unpackedPayload) return;
                switch (unpackedPayload.resultCode) {
                    case g.SDP_MSG_RESCODE.RESCODE_SDP_SGU.RESCODE_SDP_SGU_OK:
                        swpSguRspCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SGU.RESCODE_SWP_SGU_OK;
                        var ac = codeGen.getAuthenticationCode();
                        var vc = codeGen.getVerificationCode();
                        var keyhead = "u:temp:" + protocol.getEndpointId() + ":";
                        var time = 30;
                        redisCli.multi([
                            ["set", keyhead + "id", userInfo.userId, 'EX', time],
                            ["set", keyhead + "pw", userInfo.userPw, 'EX', time],
                            ["set", keyhead + "fn", userInfo.userFn, 'EX', time],
                            ["set", keyhead + "bdt", userInfo.birthDate, 'EX', time],
                            ["set", keyhead + "gen", userInfo.gender, 'EX', time],
                            ["set", keyhead + "ac", ac, 'EX', time],
                            ["set", keyhead + "vc", vc, 'EX', time],
                        ]).exec(function (err, replies) {
                            if(err){} else {
                                logger.debug("SERVER stored temporary user info: in "+ time +"sec >" + JSON.stringify(userInfo));
                            }
                        });
                        payload = {
                            "resultCode": swpSguRspCode,
                            "vc": vc
                        }
                        break;
                    case g.SDP_MSG_RESCODE.RESCODE_SDP_SGU.RESCODE_SDP_SGU_OTHER:
                        sdpSguRspCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SGU.RESCODE_SWP_SGU_OTHER;
                        payload = {
                            "resultCode": swpSguRspCode
                        }
                        break;
                    case g.SDP_MSG_RESCODE.RESCODE_SDP_SGU.RESCODE_SDP_SGU_DUPLICATE_OF_USER_ID:
                        sdpSguRspCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SGU.RESCODE_SWP_SGU_DUPLICATE_OF_USER_ID;
                        payload = {
                            "resultCode": swpSguRspCode
                        }
                        break;
                }
                
                protocol.packMsg(g.SDP_MSG_TYPE.SDP_SGU_RSP, payload)
                logger.debug("Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                res.send(protocol.getPackedMsg());
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
    logger.debug("DB Received request on /databaseapi: " +JSON.stringify(req.body));
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
                var payload = null;
                var sdpSguRspCode = 0;
                if (err){
                        sdpSguRspCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SGU.RESCODE_SDP_SGU_OTHER;
                } else {
                    if(reply === null){
                        sdpSguRspCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SGU.RESCODE_SDP_SGU_OK;
                    } else {
                        sdpSguRspCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SGU.RESCODE_SDP_SGU_DUPLICATE_OF_USER_ID;
                    }
                }
                payload = {
                    "resultCode": sdpSguRspCode
                }
                protocol.packMsg(g.SDP_MSG_TYPE.SDP_SGU_RSP, payload)
                logger.debug("DB Send response: " + JSON.stringify(protocol.getPackedMsg()));
                res.send(protocol.getPackedMsg());
            })
            break;
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