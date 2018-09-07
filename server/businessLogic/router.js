
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

router.post("/serverapi", function (req, res) {
    logger.debug("+--------------------------------------------------------------------------------.................");
    logger.debug("| SERVER Received request on /serverapi: " + JSON.stringify(req.body));
    //var [rcvdMsgType, rcvdEI, rcvdPayload]  = msg.verifyHeader(req.body);
    //rcvdMsgType = 1, rcvdEI = 1, rcvdPayload = ???
    var protocol = new LlProtocol();
    var state = new LlState();
    var request = new LlRequest();
    var codeGen = new LlCodeGenerator();
    //protocol verify
    protocol.setMsg(req.body);
    if(!protocol.verifyHeader()) return;
    var unpackedPayload = protocol.unpackPayload();
    //unpacking
    if (!unpackedPayload) return;
    switch (protocol.getMsgType()) {
        //SGU
        case g.SWP_MSG_TYPE.SWP_SGU_REQ:
            var userInfo = unpackedPayload;
            state.getState(g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI, protocol.getEndpointId(), (resState, searchedKey) => {
                //처음받지 않을경우
                if (resState) {
                    //아이디가 같을경우 재전송, 다를경우 중복
                    if ('c:sta:s:w:tci:' + protocol.getEndpointId() + ':' + userInfo.userId === searchedKey) {
                        state.setState(g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI, [protocol.getEndpointId(), userInfo.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_IDLE_STATE);
                        logger.debug("| SERVER change TCI state to IDLE STATE");

                        var packedSdpSguReq = protocol.packMsg(g.SDP_MSG_TYPE.SDP_SGU_REQ, unpackedPayload);
                        logger.debug("| SERVER send request: " + JSON.stringify(protocol.getPackedMsg()));
                        //update state
                        state.setState(g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI, [protocol.getEndpointId(), userInfo.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_USER_ID_DUPLICATE_REQUESTED_STATE);
                        logger.debug("| SERVER change TCI state to USER ID DUPLICATE REQUESTED STATE");
                        request.send('http://localhost:8080/databaseapi', packedSdpSguReq, (message) => {
                            protocol.setMsg(message);
                            if (!protocol.verifyHeader()) return;
                            var unpackedPayload = protocol.unpackPayload();
                            if (!unpackedPayload) return;
                            switch (unpackedPayload.resultCode) {
                                case g.SDP_MSG_RESCODE.RESCODE_SDP_SGU.RESCODE_SDP_SGU_OK:
                                    state.getState(g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI, protocol.getEndpointId(), (resState) => {
                                        if (g.SERVER_RECV_STATE_BY_MSG.SDP_SGU_RSP.includes(resState)) {
                                            swpSguRspCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SGU.RESCODE_SWP_SGU_OK;
                                            /*
                                            var ac = codeGen.getAuthenticationCode();
                                            var vc = codeGen.getVerificationCode();
                                            */
                                            var ac = "C77749V8M6J0K192B9M8";
                                            var vc = "4580";
                                            var keyhead = "u:temp:" + protocol.getEndpointId() + ":";
                                            var time = g.SERVER_TIMER.T862;
                                            redisCli.multi([
                                                ["set", keyhead + "id", userInfo.userId, 'EX', time],
                                                ["set", keyhead + "pw", userInfo.userPw, 'EX', time],
                                                ["set", keyhead + "fn", userInfo.userFn, 'EX', time],
                                                ["set", keyhead + "bdt", userInfo.birthDate, 'EX', time],
                                                ["set", keyhead + "gen", userInfo.gender, 'EX', time],
                                                ["set", keyhead + "ac", ac, 'EX', time],
                                                ["set", keyhead + "vc", vc, 'EX', time],
                                            ]).exec(function (err, replies) {
                                                if (err) {} else {
                                                    logger.debug("| SERVER stored temporary user info: in " + time + "sec >" + JSON.stringify(userInfo));
                                                }
                                            });
                                            payload = {
                                                "resultCode": swpSguRspCode,
                                                "vc": vc
                                            }
                                            protocol.packMsg(g.SWP_MSG_TYPE.SWP_SGU_RSP, payload)
                                            logger.debug("| Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                            res.send(protocol.getPackedMsg());
                                            state.setState(g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI, [protocol.getEndpointId(), userInfo.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_USER_ID_AVAILABLITY_CONFIRMED_STATE, g.SERVER_TIMER.T862);
                                            logger.debug("| SERVER change TCI state to USER ID AVAILABLITY CONFIRMED_STATE");
                                        }
                                    });
                                    break;

                                 case g.SDP_MSG_RESCODE.RESCODE_SDP_SGU.RESCODE_SDP_SGU_OTHER:
                                     sdpSguRspCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SGU.RESCODE_SWP_SGU_OTHER;
                                     payload = {
                                         "resultCode": swpSguRspCode
                                     }
                                     state.setState(g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI, [protocol.getEndpointId(), userInfo.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_IDLE_STATE);
                                     logger.debug("| SERVER change TCI state to IDLE STATE");
                                     protocol.packMsg(g.SWP_MSG_TYPE.SWP_SGU_RSP, payload)
                                     logger.debug("Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                     res.send(protocol.getPackedMsg());
                                     break;

                                 case g.SDP_MSG_RESCODE.RESCODE_SDP_SGU.RESCODE_SDP_SGU_DUPLICATE_OF_USER_ID:
                                     sdpSguRspCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SGU.RESCODE_SWP_SGU_DUPLICATE_OF_USER_ID;
                                     payload = {
                                         "resultCode": swpSguRspCode
                                     }
                                     state.setState(g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI, [protocol.getEndpointId(), userInfo.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_IDLE_STATE);
                                     logger.debug("| SERVER change TCI state to IDLE STATE");
                                     protocol.packMsg(g.SWP_MSG_TYPE.SWP_SGU_RSP, payload)
                                     logger.debug("| Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                     res.send(protocol.getPackedMsg());
                                     break;
                             }
                         })
                    } else {
                        payload = {
                            "resultCode": g.SWP_MSG_RESCODE.RESCODE_SWP_SGU.RESCODE_SWP_SGU_CONFLICT_OF_TEMPORARY_CLIENT_ID
                        }
                        protocol.packMsg(g.SWP_MSG_TYPE.SWP_SGU_RSP, payload)
                        logger.debug("Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                        res.send(protocol.getPackedMsg());
                    }
                    return;
                } else {
                    resState = g.SERVER_TCI_STATE_ID.SERVER_TCI_IDLE_STATE;
                }
                if (g.SERVER_RECV_STATE_BY_MSG.SWP_SGU_REQ.includes(resState)) {
                    //set state
                    state.setState(g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI, [protocol.getEndpointId(), userInfo.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_IDLE_STATE);
                    logger.debug("| SERVER change TCI state to IDLE STATE");
                    var packedSdpSguReq = protocol.packMsg(g.SDP_MSG_TYPE.SDP_SGU_REQ, unpackedPayload);
                    logger.debug("| SERVER send request: " + JSON.stringify(protocol.getPackedMsg()));
                    //update state
                    state.setState(g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI, [protocol.getEndpointId(), userInfo.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_USER_ID_DUPLICATE_REQUESTED_STATE);
                    logger.debug("| SERVER change TCI state to USER ID DUPLICATE REQUESTED STATE");
                    request.send('http://localhost:8080/databaseapi', packedSdpSguReq, (message) => {
                        protocol.setMsg(message);
                        if (!protocol.verifyHeader()) return;
                        var unpackedPayload = protocol.unpackPayload();
                        if (!unpackedPayload) return;
                        switch (unpackedPayload.resultCode) {
                            case g.SDP_MSG_RESCODE.RESCODE_SDP_SGU.RESCODE_SDP_SGU_OK:
                                state.getState(g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI, protocol.getEndpointId(), (resState) => {
                                if (g.SERVER_RECV_STATE_BY_MSG.SDP_SGU_RSP.includes(resState)) {
                                        swpSguRspCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SGU.RESCODE_SWP_SGU_OK;
                                         /*
                                        var ac = codeGen.getAuthenticationCode();
                                        var vc = codeGen.getVerificationCode();
                                        */
                                        var ac = "C77749V8M6J0K192B9M8";
                                        var vc = "4580";
                                        var keyhead = "u:temp:" + protocol.getEndpointId() + ":";
                                        var time = g.SERVER_TIMER.T862;
                                        redisCli.multi([
                                            ["set", keyhead + "id", userInfo.userId, 'EX', time],
                                            ["set", keyhead + "pw", userInfo.userPw, 'EX', time],
                                            ["set", keyhead + "fn", userInfo.userFn, 'EX', time],
                                            ["set", keyhead + "ln", userInfo.userLn, 'EX', time],
                                            ["set", keyhead + "bdt", userInfo.birthDate, 'EX', time],
                                            ["set", keyhead + "gen", userInfo.gender, 'EX', time],
                                            ["set", keyhead + "ac", ac, 'EX', time],
                                            ["set", keyhead + "vc", vc, 'EX', time],
                                        ]).exec(function (err, replies) {
                                            if (err) {} else {
                                                logger.debug("| SERVER stored temporary user info: in " + time + "sec >" + JSON.stringify(userInfo));
                                            }
                                        });
                                        payload = {
                                            "resultCode": swpSguRspCode,
                                            "vc": vc
                                        }
                                        protocol.packMsg(g.SWP_MSG_TYPE.SWP_SGU_RSP, payload);
                                        state.setState(g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI, [protocol.getEndpointId(), userInfo.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_USER_ID_AVAILABLITY_CONFIRMED_STATE, g.SERVER_TIMER.T862);
                                        logger.debug("| SERVER change TCI state to USER ID AVAILABLITY CONFIRMED STATE");
                                        res.send(protocol.getPackedMsg());
                                        logger.debug("| Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                    }
                                });
                                break;

                            case g.SDP_MSG_RESCODE.RESCODE_SDP_SGU.RESCODE_SDP_SGU_OTHER:
                                sdpSguRspCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SGU.RESCODE_SWP_SGU_OTHER;
                                payload = {
                                    "resultCode": swpSguRspCode
                                }
                                state.setState(g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI, [protocol.getEndpointId(), userInfo.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_IDLE_STATE);
                                logger.debug("| SERVER change TCI state to IDLE STATE");
                                protocol.packMsg(g.SWP_MSG_TYPE.SWP_SGU_RSP, payload)
                                res.send(protocol.getPackedMsg());
                                logger.debug("| Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                break;

                            case g.SDP_MSG_RESCODE.RESCODE_SDP_SGU.RESCODE_SDP_SGU_DUPLICATE_OF_USER_ID:
                                sdpSguRspCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SGU.RESCODE_SWP_SGU_DUPLICATE_OF_USER_ID;
                                payload = {
                                    "resultCode": swpSguRspCode
                                }
                                state.setState(g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI, [protocol.getEndpointId(), userInfo.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_IDLE_STATE);
                                logger.debug("| SERVER change TCI state to IDLE STATE");
                                protocol.packMsg(g.SWP_MSG_TYPE.SWP_SGU_RSP, payload)
                                res.send(protocol.getPackedMsg());
                                logger.debug("| Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                break;
                        }
                    });
                }
            });
            break;
        case g.SWP_MSG_TYPE.SWP_UVC_REQ:
            var codes = unpackedPayload;
            state.getState(g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI, protocol.getEndpointId(), (resState, searchedKey)=>{
                //state exist
                if(resState) {
                    //Receivable state
                    if (g.SERVER_RECV_STATE_BY_MSG.SWP_UVC_REQ.includes(resState)) {
                        var keyhead = "u:temp:" + protocol.getEndpointId() + ":";
                        var swpUvcRspCode = 0;
                        redisCli.get(keyhead+"vc", (err, vc) => {
                            if (err) {
                                swpUvcRspCode = g.SWP_MSG_RESCODE.RESCODE_SWP_UVC.RESCODE_SWP_UVC_OTHER;
                            } else {
                                if (vc === null) {
                                    swpUvcRspCode = g.SWP_MSG_RESCODE.RESCODE_SWP_UVC.RESCODE_SWP_UVC_OTHER;
                                } else {
                                    //correct vc
                                    if(codes.vc === vc){
                                        redisCli.get(keyhead+"ac", (err, ac)=> {
                                            if (err) {
                                                swpUvcRspCode = g.SWP_MSG_RESCODE.RESCODE_SWP_UVC.RESCODE_SWP_UVC_OTHER;
                                            } else {
                                                //correct ac
                                                if(codes.ac === ac) {
                                                    //database에 저장
                                                    redisCli.keys(keyhead+"*", (err, keys) => {
                                                        if(err) {} else {
                                                            redisCli.mget(keys, (err, values) => {
                                                                var payloadSdpUvcReq = new Object();
                                                                for (var index = 0; index < keys.length; index++) {
                                                                    var key = keys[index].substr(keyhead.length);
                                                                    switch (key) {
                                                                        case 'id':
                                                                            payloadSdpUvcReq.userId = values[index];
                                                                            break;
                                                                        case 'pw':
                                                                            payloadSdpUvcReq.userPw = values[index];
                                                                            break;
                                                                        case 'fn':
                                                                            payloadSdpUvcReq.userFn = values[index];
                                                                            break;
                                                                        case 'ln':
                                                                            payloadSdpUvcReq.userLn = values[index];
                                                                            break;
                                                                        case 'bdt':
                                                                            payloadSdpUvcReq.userBdt = values[index];
                                                                            break;
                                                                        case 'gen':
                                                                            payloadSdpUvcReq.userGen = values[index];
                                                                            break;
                                                                    }
                                                                }
                                                                var packedSdpUvcReq = protocol.packMsg(g.SDP_MSG_TYPE.SDP_UVC_REQ, payloadSdpUvcReq);
                                                                request.send('http://localhost:8080/databaseapi', packedSdpUvcReq, (message) => {
                                                                    protocol.setMsg(message);
                                                                    if (!protocol.verifyHeader()) return;
                                                                    var unpackedPayload = protocol.unpackPayload();
                                                                    if (!unpackedPayload) return;
                                                                    switch (unpackedPayload.resultCode) {
                                                                        case 1:
                                                                            break;
                                                                    }
                                                                });
                                                            })
                                                        }
                                                    });
                                                    return;
                                                    /*
                                                    
                                                    
                                                    */
                                                //incorrect ac
                                                } else {
                                                    swpUvcRspCode = g.SWP_MSG_RESCODE.RESCODE_SWP_UVC.RESCODE_SWP_UVC_INCORRECT_AC_UNDER_THE_VC;
                                                }
                                            }
                                            payload = {
                                                "resultCode": swpUvcRspCode
                                            }
                                            protocol.packMsg(g.SWP_MSG_TYPE.SWP_UVC_RSP, payload)
                                            logger.debug("| Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                            res.send(protocol.getPackedMsg());
                                            return;
                                        })
                                    //incorrect vc
                                    } else {
                                        swpUvcRspCode = g.SWP_MSG_RESCODE.RESCODE_SWP_UVC.RESCODE_SWP_UVC_INCORRECT_AC_UNDER_THE_VC;
                                    }
                                }
                            }
                            payload = {
                                "resultCode": swpUvcRspCode
                            }
                            protocol.packMsg(g.SWP_MSG_TYPE.SWP_UVC_RSP, payload)
                            logger.debug("| Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                            res.send(protocol.getPackedMsg());
                        });
                        
                        //인증코드 불일치
                        // error코드 4번 전송
                        };
                        
                //state not exist
                } else {
                    // not exist
                }
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
    logger.debug("| DB Received request on /databaseapi: " + JSON.stringify(req.body));
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
                logger.debug("| DB Send response: " + JSON.stringify(protocol.getPackedMsg()));
                res.send(protocol.getPackedMsg());
            })
            break;
        case g.SDP_MSG_TYPE.SDP_UVC_REQ:
                res.send("OK");
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