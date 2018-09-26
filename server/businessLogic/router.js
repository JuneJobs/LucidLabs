'use strict';
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

//Import hash manager module
const LlHash = require('../lib/LlHash');

const userModule = require('./userModule');
const sensorModule = require('./sensorModule');
const commonModule = require('./commonModule');

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
    var uModule = new userModule();
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
            state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI, protocol.getEndpointId(), (resState, searchedKey) => {
                //처음받지 않을경우
                if (resState) {
                    var payload = new Object();
                    var sdpSguRspCode = 0;
                    //아이디가 같을경우 재전송, 다를경우 중복
                    if ('c:sta:s:w:tci:' + protocol.getEndpointId() + ':' + userInfo.userId === searchedKey) {
                        state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI, [protocol.getEndpointId(), userInfo.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_IDLE_STATE);
                        logger.debug("| SERVER change TCI state to IDLE STATE");

                        var packedSdpSguReq = protocol.packMsg(g.SDP_MSG_TYPE.SDP_SGU_REQ, unpackedPayload);
                        logger.debug("| SERVER send request: " + JSON.stringify(protocol.getPackedMsg()));
                        //update state
                        state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI, [protocol.getEndpointId(), userInfo.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_USER_ID_DUPLICATE_REQUESTED_STATE);
                        logger.debug("| SERVER change TCI state to USER ID DUPLICATE REQUESTED STATE");
                        request.send('http://localhost:8080/databaseapi', packedSdpSguReq, (message) => {
                            var swpSguRspCode = "0";
                            protocol.setMsg(message);
                            if (!protocol.verifyHeader()) return;
                            var unpackedPayload = protocol.unpackPayload();
                            if (!unpackedPayload) return;
                            switch (unpackedPayload.resultCode) {
                                case g.SDP_MSG_RESCODE.RESCODE_SDP_SGU.RESCODE_SDP_SGU_OK:
                                    state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI, protocol.getEndpointId(), (resState) => {
                                        if (g.SERVER_RECV_STATE_BY_MSG.SDP_SGU_RSP.includes(resState)) {
                                            swpSguRspCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SGU.RESCODE_SWP_SGU_OK;
                                            /* ###
                                            var ac = codeGen.getAuthenticationCode();
                                            var vc = codeGen.getVerificationCode();
                                            */
                                            var ac = "C77749V8M6J0K192B9M8";
                                            var vc = "4580";
                                            var keyHead = "u:temp:" + protocol.getEndpointId() + ":";
                                            var time = g.SERVER_TIMER.T862;
                                            redisCli.multi([
                                                ["set", keyHead + "id", userInfo.userId, 'EX', time],
                                                ["set", keyHead + "pw", userInfo.userPw, 'EX', time],
                                                ["set", keyHead + "fn", userInfo.userFn, 'EX', time],
                                                ["set", keyHead + "bdt", userInfo.birthDate, 'EX', time],
                                                ["set", keyHead + "gen", userInfo.gender, 'EX', time],
                                                ["set", keyHead + "ac", ac, 'EX', time],
                                                ["set", keyHead + "vc", vc, 'EX', time],
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
                                            state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI, [protocol.getEndpointId(), userInfo.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_USER_ID_AVAILABLITY_CONFIRMED_STATE, g.SERVER_TIMER.T862);
                                            logger.debug("| SERVER change TCI state to USER ID AVAILABLITY CONFIRMED_STATE");
                                        }
                                    });
                                    break;

                                 case g.SDP_MSG_RESCODE.RESCODE_SDP_SGU.RESCODE_SDP_SGU_OTHER:
                                     sdpSguRspCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SGU.RESCODE_SWP_SGU_OTHER;
                                     payload = {
                                         "resultCode": swpSguRspCode
                                     }
                                     state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI, [protocol.getEndpointId(), userInfo.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_IDLE_STATE);
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
                                     state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI, [protocol.getEndpointId(), userInfo.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_IDLE_STATE);
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
                        return res.send(protocol.getPackedMsg());
                    }
                    return;
                } else {
                    resState = g.SERVER_TCI_STATE_ID.SERVER_TCI_IDLE_STATE;
                }
                if (g.SERVER_RECV_STATE_BY_MSG.SWP_SGU_REQ.includes(resState)) {
                    //set state
                    state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI, [protocol.getEndpointId(), userInfo.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_IDLE_STATE);
                    logger.debug("| SERVER change TCI state to IDLE STATE");
                    var packedSdpSguReq = protocol.packMsg(g.SDP_MSG_TYPE.SDP_SGU_REQ, unpackedPayload);
                    logger.debug("| SERVER send request: " + JSON.stringify(protocol.getPackedMsg()));
                    //update state
                    state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI, [protocol.getEndpointId(), userInfo.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_USER_ID_DUPLICATE_REQUESTED_STATE);
                    logger.debug("| SERVER change TCI state to USER ID DUPLICATE REQUESTED STATE");
                    request.send('http://localhost:8080/databaseapi', packedSdpSguReq, (message) => {
                        protocol.setMsg(message);
                        if (!protocol.verifyHeader()) return;
                        var unpackedPayload = protocol.unpackPayload();
                        if (!unpackedPayload) return;
                        var swpSguRspCode = null;
                        switch (unpackedPayload.resultCode) {
                            case g.SDP_MSG_RESCODE.RESCODE_SDP_SGU.RESCODE_SDP_SGU_OK:
                                state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI, protocol.getEndpointId(), (resState) => {
                                if (g.SERVER_RECV_STATE_BY_MSG.SDP_SGU_RSP.includes(resState)) {
                                        swpSguRspCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SGU.RESCODE_SWP_SGU_OK;
                                         /* ###
                                        var ac = codeGen.getAuthenticationCode();
                                        var vc = codeGen.getVerificationCode();
                                        */
                                        var ac = "C77749V8M6J0K192B9M8";
                                        var vc = "4580";
                                        var keyHead = "u:temp:" + protocol.getEndpointId() + ":";
                                        var time = g.SERVER_TIMER.T862;
                                        redisCli.multi([
                                            ["set", keyHead + "id", userInfo.userId, 'EX', time],
                                            ["set", keyHead + "pw", userInfo.userPw, 'EX', time],
                                            ["set", keyHead + "fn", userInfo.userFn, 'EX', time],
                                            ["set", keyHead + "ln", userInfo.userLn, 'EX', time],
                                            ["set", keyHead + "bdt", userInfo.birthDate, 'EX', time],
                                            ["set", keyHead + "gen", userInfo.gender, 'EX', time],
                                            ["set", keyHead + "ac", ac, 'EX', time],
                                            ["set", keyHead + "vc", vc, 'EX', time],
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
                                        state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI, [protocol.getEndpointId(), userInfo.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_USER_ID_AVAILABLITY_CONFIRMED_STATE, g.SERVER_TIMER.T862);
                                        logger.debug("| SERVER change TCI state to USER ID AVAILABLITY CONFIRMED STATE");
                                        logger.debug("| Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                        return res.send(protocol.getPackedMsg());
                                    }
                                });
                                break;

                            case g.SDP_MSG_RESCODE.RESCODE_SDP_SGU.RESCODE_SDP_SGU_OTHER:
                                swpSguRspCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SGU.RESCODE_SWP_SGU_OTHER;
                                payload = {
                                    "resultCode": swpSguRspCode
                                }
                                state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI, [protocol.getEndpointId(), userInfo.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_IDLE_STATE);
                                logger.debug("| SERVER change TCI state to IDLE STATE");
                                protocol.packMsg(g.SWP_MSG_TYPE.SWP_SGU_RSP, payload);
                                logger.debug("| Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                return res.send(protocol.getPackedMsg());
                                break;

                            case g.SDP_MSG_RESCODE.RESCODE_SDP_SGU.RESCODE_SDP_SGU_DUPLICATE_OF_USER_ID:
                                swpSguRspCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SGU.RESCODE_SWP_SGU_DUPLICATE_OF_USER_ID;
                                payload = {
                                    "resultCode": swpSguRspCode
                                }
                                state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI, [protocol.getEndpointId(), userInfo.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_IDLE_STATE);
                                logger.debug("| SERVER change TCI state to IDLE STATE");
                                protocol.packMsg(g.SWP_MSG_TYPE.SWP_SGU_RSP, payload)
                                logger.debug("| Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                return res.send(protocol.getPackedMsg());
                                break;
                        }
                    });
                }
            });
            break;
        
        //UVC    
        case g.SWP_MSG_TYPE.SWP_UVC_REQ:
            var codes = unpackedPayload;
            state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI, protocol.getEndpointId(), (resState, searchedKey) => {
                //state exist
                if(resState) {
                    //Receivable state
                    if (g.SERVER_RECV_STATE_BY_MSG.SWP_UVC_REQ.includes(resState)) {
                        var keyHead = "u:temp:" + protocol.getEndpointId() + ":";
                        var swpUvcRspCode = 0;
                        var payload = new Object();
                        redisCli.get(keyHead+"vc", (err, vc) => {
                            if (err) {
                                swpUvcRspCode = g.SWP_MSG_RESCODE.RESCODE_SWP_UVC.RESCODE_SWP_UVC_OTHER;
                            } else {
                                if (vc === null) {
                                    swpUvcRspCode = g.SWP_MSG_RESCODE.RESCODE_SWP_UVC.RESCODE_SWP_UVC_OTHER;
                                    payload = {
                                        "resultCode": swpUvcRspCode
                                    }
                                    protocol.packMsg(g.SWP_MSG_TYPE.SWP_UVC_RSP, payload)
                                    logger.debug("| Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                    return res.send(protocol.getPackedMsg());
                                } else {
                                    //correct vc
                                    if(codes.vc === vc){
                                        redisCli.get(keyHead+"ac", (err, ac)=> {
                                            if (err) {
                                                swpUvcRspCode = g.SWP_MSG_RESCODE.RESCODE_SWP_UVC.RESCODE_SWP_UVC_OTHER;
                                            } else {
                                                //correct ac
                                                if(codes.ac === ac) {
                                                    //database에 저장
                                                    redisCli.keys(keyHead+"*", (err, keys) => {
                                                        if(err) {} else {
                                                            redisCli.mget(keys, (err, values) => {
                                                                var payloadSdpUvcReq = new Object();
                                                                
                                                                for (var index = 0; index < keys.length; index++) {
                                                                    var key = keys[index].substr(keyHead.length);
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
                                                                            payloadSdpUvcReq.birthDate = values[index];
                                                                            break;
                                                                        case 'gen':
                                                                            payloadSdpUvcReq.gender = values[index];
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
                                                                        case g.SDP_MSG_RESCODE.RESCODE_SDP_UVC.RESCODE_SDP_UVC_OK:
                                                                            state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI, [protocol.getEndpointId(), packedSdpUvcReq.payload.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_USN_ALLOCATED_STATE, g.SERVER_TIMER.T832);
                                                                            logger.debug("| SERVER change TCI state to USN ALLOCATED STATE");
                                                                            swpUvcRspCode = g.SWP_MSG_RESCODE.RESCODE_SWP_UVC.RESCODE_SWP_UVC_OK;
                                                                            //remove temp Data
                                                                            var keyHead = "u:temp:" + protocol.getEndpointId() + ":";
                                                                            redisCli.multi([
                                                                                ["del", keyHead + "id"],
                                                                                ["del", keyHead + "pw"],
                                                                                ["del", keyHead + "fn"],
                                                                                ["del", keyHead + "ln"],
                                                                                ["del", keyHead + "bdt"],
                                                                                ["del", keyHead + "gen"],
                                                                                ["del", keyHead + "ac"],
                                                                                ["del", keyHead + "vc"],
                                                                            ]).exec(function (err, replies) {
                                                                                if (err) {} else {
                                                                                    logger.debug("| SERVER deleted temporary user info: " + JSON.stringify(userInfo));
                                                                                }
                                                                            });
                                                                            break;
                                                                        case g.SDP_MSG_RESCODE.RESCODE_SDP_UVC.RESCODE_SDP_UVC_OTHER:
                                                                            swpUvcRspCode = g.SWP_MSG_RESCODE.RESCODE_SWP_UVC.RESCODE_SWP_UVC_OTHER;
                                                                            break;
                                                                        case g.SDP_MSG_RESCODE.RESCODE_SDP_UVC.RESCODE_SDP_UVC_DUPLICATE_OF_USER_ID:
                                                                            swpUvcRspCode = g.SWP_MSG_RESCODE.RESCODE_SWP_UVC.RESCODE_SWP_UVC_DUPLICATE_OF_USER_ID;
                                                                            break;
                                                                    }
                                                                    payload = {
                                                                        "resultCode": swpUvcRspCode
                                                                    }
                                                                    protocol.packMsg(g.SWP_MSG_TYPE.SWP_UVC_RSP, payload)
                                                                    logger.debug("| Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                                                    return res.send(protocol.getPackedMsg());
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
                                            return res.send(protocol.getPackedMsg());
                                        })
                                    //incorrect vc
                                    } else {
                                        //인증코드 불일치 - error코드 4번 전송
                                        swpUvcRspCode = g.SWP_MSG_RESCODE.RESCODE_SWP_UVC.RESCODE_SWP_UVC_INCORRECT_AC_UNDER_THE_VC;
                                        payload = {
                                            "resultCode": swpUvcRspCode
                                        }
                                        protocol.packMsg(g.SWP_MSG_TYPE.SWP_UVC_RSP, payload)
                                        logger.debug("| Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                        return res.send(protocol.getPackedMsg());
                                    }
                                }
                            }
                        });
                        };
                        
                //state not exist
                } else {
                    // not exist
                    swpUvcRspCode = g.SWP_MSG_RESCODE.RESCODE_SWP_UVC.RESCODE_SWP_UVC_NOT_EXIST_TEMPORARY_CLIENT_ID;
                    //인증코드 불일치
                    payload = {
                        "resultCode": swpUvcRspCode
                    }
                    protocol.packMsg(g.SWP_MSG_TYPE.SWP_UVC_RSP, payload)
                    logger.debug("| Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                    return res.send(protocol.getPackedMsg());
                    // error코드 4번 전송
                };
            });
            break;

        //SGI
        case g.SWP_MSG_TYPE.SWP_SGI_REQ:
            //스테이트를 가져와 비교한다.
            var signInInfo = unpackedPayload;
            var payload = new Object();
            state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI, protocol.getEndpointId(), (resState, searchedKey) => {
                //idle state이거나, 재전송인 경우 데이터베이스로 연결하는 로직
                if (resState === false || (resState === g.SERVER_TCI_STATE_ID.SERVER_TCI_HALF_USN_INFORMED_STATE && searchedKey.includes(unpackedPayload.userId))) {
                    //state변경
                    state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI, [protocol.getEndpointId(), unpackedPayload.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_HALF_USN_INFORMED_STATE);
                    logger.debug("| SERVER change TCI state (IDLE) -> (HALF USN INFORMED STATE)");
                    //Database verify request
                    var packedSdpSgiReq = protocol.packMsg(g.SDP_MSG_TYPE.SDP_SGI_REQ, unpackedPayload);
                    request.send('http://localhost:8080/databaseapi', packedSdpSgiReq, (message) => {
                        //unpack
                        protocol.setMsg(message);
                        if (!protocol.verifyHeader()) return;
                        var unpackedPayload = protocol.unpackPayload();
                        if (!unpackedPayload) return;
                        var payload = new Object();
                        switch (unpackedPayload.resultCode) { 
                            case g.SDP_MSG_RESCODE.RESCODE_SDP_SGI.RESCODE_SDP_SGI_OK:
                                //make buffer data
                                uModule.getNewNumOfSignedInCompls(g.ENTITY_TYPE.WEBCLIENT, unpackedPayload.usn, (nsc) => {
                                    //---->>>here.
                                    var keyHead = "c:act:s:" + g.ENTITY_TYPE.WEBCLIENT + ":" + unpackedPayload.usn + ":";
                                    var expTime = g.SERVER_TIMER.T863;
                                    redisCli.multi([
                                        ["set", keyHead + "signf", '1', 'EX', expTime],
                                        ["set", keyHead + "nsc", nsc, 'EX', expTime],
                                        ["set", keyHead + "ml", unpackedPayload.ml, 'EX', expTime]
                                    ]).exec(function (err, replies) {
                                        if (err) {
                                            loger.debug(err);
                                        } else {
                                            logger.debug("| SERVER stored active user" + JSON.stringify(userInfo));
                                            state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_USN, unpackedPayload.usn, g.SERVER_USN_STATE_ID.SERVER_USN_USN_INFORMED_STATE, g.SERVER_TIMER.T863);
                                            state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI, [protocol.getEndpointId(), signInInfo.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_IDLE_STATE);
                                            logger.debug("| SERVER change USN state (IDLE) -> (USN INFORMED)");
                                            payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SGI.RESCODE_SWP_SGI_OK;
                                            payload.usn = unpackedPayload.usn;
                                            payload.nsc = nsc;
                                            protocol.packMsg(g.SWP_MSG_TYPE.SWP_SGI_RSP, payload)
                                            return res.send(protocol.getPackedMsg());
                                        }
                                    });
                                })
                                break;
                            //reject cases
                            case g.SDP_MSG_RESCODE.RESCODE_SDP_SGI.RESCODE_SDP_SGI_OTHER:
                                payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SGI.RESCODE_SWP_SGI_OTHER;
                                state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI, [protocol.getEndpointId(), signInInfo.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_IDLE_STATE);
                                logger.debug("| SERVER change TCI state (HALF USN INFORMED STATE) ->  (IDLE)");
                                protocol.packMsg(g.SWP_MSG_TYPE.SWP_SGI_RSP, payload)
                                logger.debug("Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                return res.send(protocol.getPackedMsg());
                            case g.SDP_MSG_RESCODE.RESCODE_SDP_SGI.RESCODE_SDP_SGI_NOT_EXIST_USER_ID:
                                payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SGI.RESCODE_SWP_SGI_NOT_EXIST_USER_ID;
                                state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI, [protocol.getEndpointId(), signInInfo.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_IDLE_STATE);
                                logger.debug("| SERVER change TCI state (HALF USN INFORMED STATE) ->  (IDLE)");
                                protocol.packMsg(g.SWP_MSG_TYPE.SWP_SGI_RSP, payload)
                                logger.debug("Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                return res.send(protocol.getPackedMsg());
                            case g.SDP_MSG_RESCODE.RESCODE_SDP_SGI.RESCODE_SDP_SGI_INCORRECT_CURRENT_USER_PASSWORD:
                                payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SGI.RESCODE_SWP_SGI_INCORRECT_CURRENT_USER_PASSWORD;
                                state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI, [protocol.getEndpointId(), signInInfo.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_IDLE_STATE);
                                logger.debug("| SERVER change TCI state (HALF USN INFORMED STATE) ->  (IDLE)");
                                protocol.packMsg(g.SWP_MSG_TYPE.SWP_SGI_RSP, payload)
                                logger.debug("Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                return res.send(protocol.getPackedMsg());
                        }
                    });
                //TCI 충돌 (테스트 필요)
                } else {
                    payload = {
                        "resultCode": g.SWP_MSG_RESCODE.RESCODE_SWP_SGI.RESCODE_SWP_SGI_CONFLICT_OF_TEMPORARY_CLIENT_ID
                    }
                    protocol.packMsg(g.SWP_MSG_TYPE.SWP_SGI_RSP, payload);
                    logger.debug("Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                    return res.send(protocol.getPackedMsg());
                }
            });
            break;

        //SGO
        case g.SWP_MSG_TYPE.SWP_SGO_NOT:
            state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_USN, protocol.getEndpointId(), (resState, searchedKey) => {
                //스테이트가 있으면
                var payload = new Object();
                if (resState) {
                    //데이터베이스로 가서 유저시퀀스 -> 유저 업데이트 치기
                    uModule.checkUserSignedInState(g.ENTITY_TYPE.SERVER, protocol.getEndpointId(), unpackedPayload.nsc, (result) => {
                        if(result === 1) {
                            //일치
                            payload.usn = unpackedPayload.usn;
                            var packedSdpSgoNot = protocol.packMsg(g.SDP_MSG_TYPE.SDP_SGO_NOT, payload);
                            state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_USN, protocol.getEndpointId(), g.SERVER_USN_STATE_ID.SERVER_USN_HALF_IDLE_STATE);
                            logger.debug("| SERVER change USN state (USN INFORMED STATE) ->  (HALF IDLE IDLE)");
                            request.send('http://localhost:8080/databaseapi', packedSdpSgoNot, (message) => {
                                protocol.setMsg(message);
                                if (!protocol.verifyHeader()) return;
                                var unpackedPayload = protocol.unpackPayload();
                                if (!unpackedPayload) return;
                                switch (unpackedPayload.resultCode) {
                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_SGO.RESCODE_SDP_SGO_OK:
                                        //유저버퍼 지우기
                                        uModule.removeActiveUserInfo(g.ENTITY_TYPE.WEBCLIENT, protocol.getEndpointId(), (result) => {
                                            if (result) {
                                                // here!!
                                                payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SGO.RESCODE_SWP_SGO_OK;
                                                protocol.packMsg(g.SWP_MSG_TYPE.SWP_SGO_ACK, payload);
                                                state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_USN, protocol.getEndpointId(), g.SERVER_USN_STATE_ID.SERVER_USN_IDLE_STATE);
                                                logger.debug("| SERVER change USN state (HALF IDLE STATE) ->  (IDLE)");
                                                logger.debug("Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                                return res.send(protocol.getPackedMsg());
                                            }
                                        });
                                        break;
                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_SGO.RESCODE_SDP_SGO_OTHER:
                                        payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SGO.RESCODE_SWP_SGO_OTHER;
                                        protocol.packMsg(g.SWP_MSG_TYPE.SWP_SGO_ACK, payload)
                                        logger.debug("Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                        return res.send(protocol.getPackedMsg());
                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_SGO.RESCODE_SDP_SGO_UNALLOCATED_USER_SEQUENCE_NUMBER:
                                        payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SGO.RESCODE_SWP_SGO_UNALLOCATED_USER_SEQUENCE_NUMBER;
                                        protocol.packMsg(g.SWP_MSG_TYPE.SWP_SGO_ACK, payload)
                                        logger.debug("Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                        return res.send(protocol.getPackedMsg());
                                    default:
                                        break;
                                }
                            })
                        } else if(result === 3) {
                            //시퀀스
                            payload ={};
                            payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SGO.RESCODE_SWP_SGO_INCORRECT_NUMBER_OF_SIGNED_IN_COMPLETIONS;
                            protocol.packMsg(g.SWP_MSG_TYPE.SWP_SGO_ACK, payload)
                            logger.debug("Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                            return res.send(protocol.getPackedMsg());
                        }
                    });
                } else {
                    //할당되지 않은 유저
                    payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SGO.RESCODE_SWP_SGO_UNALLOCATED_USER_SEQUENCE_NUMBER;
                    logger.debug("| SERVER change TCI state (HALF USN INFORMED STATE) ->  (IDLE)");
                    protocol.packMsg(g.SWP_MSG_TYPE.SWP_SGO_ACK, payload)
                    logger.debug("Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                    return res.send(protocol.getPackedMsg());
                    //스테이트가 없으면
                    //리젝트 아더
                }
            })
            break;

        //ASR
        case g.SWP_MSG_TYPE.SWP_ASR_REQ:
            state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_USN, protocol.getEndpointId(), (resState, searchedKey) => {
                //권한체크 필요 없음
                var payload = new Object();
                if(resState){
                    uModule.checkUserSignedInState(g.ENTITY_TYPE.WEBCLIENT, protocol.getEndpointId(), unpackedPayload.nsc, (result) =>{
                        if(result ===1){
                            payload.wmac = unpackedPayload.wmac;
                            payload.cmac = unpackedPayload.cmac;
                      
                            var packedSdpAsr = protocol.packMsg(g.SDP_MSG_TYPE.SDP_ASR_REQ, payload);
                            //여기
                            request.send('http://localhost:8080/databaseapi', packedSdpAsr, (message) => {
                                protocol.setMsg(message);
                                if (!protocol.verifyHeader()) return;
                                var unpackedPayload = protocol.unpackPayload();
                                if (!unpackedPayload) return;
                                switch (unpackedPayload.resultCode) {
                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_ASR.RESCODE_SDP_ASR_OK:
                                        //유저버퍼 업데이트
                                        uModule.updateUserSignedInState(g.ENTITY_TYPE.WEBCLIENT, protocol.getEndpointId(), (result)=> {
                                            if (result) {
                                                // here!!
                                                payload = {};
                                                payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_ASR.RESCODE_SWP_ASR_OK;
                                                protocol.packMsg(g.SWP_MSG_TYPE.SWP_ASR_RSP, payload);
                                                state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_USN, protocol.getEndpointId(), g.SERVER_USN_STATE_ID.SERVER_USN_USN_INFORMED_STATE, g.SERVER_TIMER.T863);
                                                logger.debug("| SERVER change USN state (USN INFORMED) ->  (USN INFORMED)");
                                                logger.debug("Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                                return res.send(protocol.getPackedMsg());
                                            }
                                        });
                                        break;
                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_ASR.RESCODE_SDP_ASR_OTHER:
                                        payload = {};
                                        payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_ASR.RESCODE_SWP_ASR_OTHER;
                                        protocol.packMsg(g.SWP_MSG_TYPE.SWP_ASR_RSP, payload);
                                        logger.debug("Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                        return res.send(protocol.getPackedMsg());
                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_ASR.RESCODE_SDP_ASR_UNALLOCATED_USER_SEQUENCE_NUMBER:
                                        payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_ASR.RESCODE_SWP_ASR_UNALLOCATED_USER_SEQUENCE_NUMBER;
                                        payload = {};
                                        protocol.packMsg(g.SWP_MSG_TYPE.SWP_ASR_RSP, payload);
                                        logger.debug("Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                        return res.send(protocol.getPackedMsg());
                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_ASR.RESCODE_SDP_ASR_UNAUTHORIZED_USER_SEQUENCE_NUMBER:
                                        payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_ASR.RESCODE_SWP_ASR_UNAUTHORIZED_USER_SEQUENCE_NUMBER;
                                        payload = {};
                                        protocol.packMsg(g.SWP_MSG_TYPE.SWP_ASR_RSP, payload);
                                        logger.debug("Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                        return res.send(protocol.getPackedMsg());
                                    default:
                                        break;
                                }
                            })
                        } else if (result === 3) {
                            //시퀀스
                            payload = {};
                            payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_ASR.RESCODE_SWP_ASR_INCORRECT_NUMBER_OF_SIGNED_IN_COMPLETIONS;
                            protocol.packMsg(g.SWP_MSG_TYPE.SWP_ASR_RSP, payload)
                            logger.debug("Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                            return res.send(protocol.getPackedMsg());
                        }
                    });
                } else {
                    //할당되지 않은 유저
                    payload = {};
                    payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_ASR.RESCODE_SWP_ASR_OTHER;
                    protocol.packMsg(g.SWP_MSG_TYPE.SWP_ASR_RSP, payload)
                    logger.debug("Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                    return res.send(protocol.getPackedMsg());
                    //스테이트가 없으면
                    //리젝트 아더
                }
            });
            break;

        //ASD
        case g.SWP_MSG_TYPE.SWP_ASD_REQ: 
            state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_USN, protocol.getEndpointId(), (resState, searchedKey) => {
                var payload = {};
                //State exist
                if (resState) {
                    uModule.checkUserSignedInState(g.ENTITY_TYPE.WEBCLIENT, protocol.getEndpointId(), unpackedPayload.nsc, (result)=>{
                        if(result === 1){
                            payload.wmac = unpackedPayload.wmac;
                            payload.drgcd = unpackedPayload.drgcd;
                            payload.userId = unpackedPayload.userId;
                            var packedSdpAsd = protocol.packMsg(g.SDP_MSG_TYPE.SDP_ASD_REQ, payload)
                            request.send('http://localhost:8080/databaseapi', packedSdpAsd, (message) => {
                                payload = {};
                                protocol.setMsg(message);
                                if (!protocol.verifyHeader()) return;
                                var unpackedPayload = protocol.unpackPayload();
                                if (!unpackedPayload) return;
                                switch (unpackedPayload.resultCode) {
                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_ASD.RESCODE_SDP_ASD_OK:
                                        //유저버퍼 업데이트
                                        uModule.updateUserSignedInState(g.ENTITY_TYPE.WEBCLIENT, protocol.getEndpointId(), (result) => {
                                            if (result) {
                                                // here!!
                                                payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_ASD.RESCODE_SWP_ASD_OK;
                                                protocol.packMsg(g.SWP_MSG_TYPE.SWP_ASD_RSP, payload);
                                                state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_USN, protocol.getEndpointId(), g.SERVER_USN_STATE_ID.SERVER_USN_USN_INFORMED_STATE, g.SERVER_TIMER.T863);
                                                logger.debug("| SERVER change USN state (USN INFORMED) ->  (USN INFORMED)");
                                                logger.debug("Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                                return res.send(protocol.getPackedMsg());
                                            }
                                        });
                                        break;
                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_ASD.RESCODE_SDP_ASD_OTHER:
                                        payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_ASD.RESCODE_SWP_ASD_OTHER;
                                        protocol.packMsg(g.SWP_MSG_TYPE.SWP_ASD_RSP, payload);
                                        logger.debug("Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                        return res.send(protocol.getPackedMsg());
                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_ASD.RESCODE_SDP_ASD_UNALLOCATED_USER_SEQUENCE_NUMBER:
                                        payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_ASD.RESCODE_SWP_ASD_UNALLOCATED_USER_SEQUENCE_NUMBER;
                                        protocol.packMsg(g.SWP_MSG_TYPE.SWP_ASD_RSP, payload);
                                        logger.debug("Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                        return res.send(protocol.getPackedMsg());
                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_ASD.RESCODE_SDP_ASD_UNAUTHORIZED_USER_SEQUENCE_NUMBER:
                                        payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_ASD.RESCODE_SWP_ASD_UNAUTHORIZED_USER_SEQUENCE_NUMBER;
                                        protocol.packMsg(g.SWP_MSG_TYPE.SWP_ASD_RSP, payload);
                                        logger.debug("Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                        return res.send(protocol.getPackedMsg());
                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_ASD.RESCODE_SDP_ASD_NOT_EXIST_USER_ID:
                                        payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_ASD.RESCODE_SWP_ASD_NOT_EXIST_USER_ID;
                                        protocol.packMsg(g.SWP_MSG_TYPE.SWP_ASD_RSP, payload);
                                        logger.debug("Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                        return res.send(protocol.getPackedMsg());
                                    default:
                                        break;
                                }
                            });
                        } else if (result === 3){
                            //시퀀스
                            payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_ASD.RESCODE_SWP_ASD_INCORRECT_NUMBER_OF_SIGNED_IN_COMPLETIONS;
                            protocol.packMsg(g.SWP_MSG_TYPE.SWP_ASD_RSP, payload)
                            logger.debug("Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                            return res.send(protocol.getPackedMsg());
                        }
                    });
                //State not exist
                } else {
                    payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_ASD.RESCODE_SWP_ASD_OTHER;
                    logger.debug("Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                    protocol.packMsg(g.SWP_MSG_TYPE.SWP_ASD_RSP, payload);
                    return res.send(protocol.getPackedMsg());
                }
            });
            break;

        //ASV
        case g.SWP_MSG_TYPE.SWP_ASV_REQ:
            state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_USN, protocol.getEndpointId(), (resState, searchedKey) => {
                var payload = {};
                //state exist
                if(resState) {
                    uModule.checkUserSignedInState(g.ENTITY_TYPE.WEBCLIENT, protocol.getEndpointId(), unpackedPayload.nsc, (result) => {
                        if(result === 1){
                            //payload 생성
                            if (typeof unpackedPayload.wmac !== 'undefined') payload.wmac = unpackedPayload.wmac;
                            if (typeof unpackedPayload.actf !== 'undefined') payload.actf = unpackedPayload.actf;
                            if (typeof unpackedPayload.mobf !== 'undefined') payload.mobf = unpackedPayload.mobf;
                            if (typeof unpackedPayload.nat !== 'undefined') payload.nat = unpackedPayload.nat;
                            if (typeof unpackedPayload.state !== 'undefined') payload.state = unpackedPayload.state;
                            if (typeof unpackedPayload.city !== 'undefined') payload.city = unpackedPayload.city;
                            if (typeof unpackedPayload.userId !== 'undefined') payload.userId = unpackedPayload.userId;

                            var packedSdpAsv = protocol.packMsg(g.SDP_MSG_TYPE.SDP_ASV_REQ, payload)
                            request.send('http://localhost:8080/databaseapi', packedSdpAsv, (message) => {
                                payload = {};
                                protocol.setMsg(message);
                                if (!protocol.verifyHeader()) return;
                                var unpackedPayload = protocol.unpackPayload();
                                if (!unpackedPayload) return;
                                switch (unpackedPayload.resultCode) {
                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_ASV.RESCODE_SDP_ASV_OK:
                                        //유저버퍼 업데이트
                                        uModule.updateUserSignedInState(g.ENTITY_TYPE.WEBCLIENT, protocol.getEndpointId(), (result) => {
                                            if (result) {
                                                // here!!
                                                payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_ASV.RESCODE_SWP_ASV_OK;
                                                payload.selectedSensorInformationList = unpackedPayload.selectedSensorInformationList;
                                                protocol.packMsg(g.SWP_MSG_TYPE.SWP_ASV_RSP, payload);
                                                state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_USN, protocol.getEndpointId(), g.SERVER_USN_STATE_ID.SERVER_USN_USN_INFORMED_STATE, g.SERVER_TIMER.T863);
                                                logger.debug("| SERVER change USN state (USN INFORMED) ->  (USN INFORMED)");
                                                logger.debug("Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                                return res.send(protocol.getPackedMsg());
                                            }
                                        });
                                        break;
                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_ASV.RESCODE_SDP_ASV_OTHER:
                                        payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_ASV.RESCODE_SWP_ASV_OTHER;
                                        protocol.packMsg(g.SWP_MSG_TYPE.SWP_ASV_RSP, payload);
                                        logger.debug("Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                        return res.send(protocol.getPackedMsg());
                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_ASV.RESCODE_SDP_ASV_UNALLOCATED_USER_SEQUENCE_NUMBER:
                                        payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_ASV.RESCODE_SWP_ASV_UNALLOCATED_USER_SEQUENCE_NUMBER;
                                        protocol.packMsg(g.SWP_MSG_TYPE.SWP_ASV_RSP, payload);
                                        logger.debug("Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                        return res.send(protocol.getPackedMsg());
                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_ASV.RESCODE_SDP_ASV_UNAUTHORIZED_USER_SEQUENCE_NUMBER:
                                        payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_ASV.RESCODE_SWP_ASV_UNAUTHORIZED_USER_SEQUENCE_NUMBER;
                                        protocol.packMsg(g.SWP_MSG_TYPE.SWP_ASV_RSP, payload);
                                        logger.debug("Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                        return res.send(protocol.getPackedMsg());
                                    default:
                                        break;
                                }
                            })
                        } else {
                            payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_ASV.RESCODE_SWP_ASV_INCORRECT_NUMBER_OF_SIGNED_IN_COMPLETIONS;
                            protocol.packMsg(g.SWP_MSG_TYPE.SWP_ASV_RSP, payload)
                            logger.debug("Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                            return res.send(protocol.getPackedMsg());
                        }
                    });
                //state not exist
                } else {
                    payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_ASV.RESCODE_SWP_ASV_OTHER;
                    logger.debug("Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                    protocol.packMsg(g.SWP_MSG_TYPE.SWP_ASV_RSP, payload);
                    return res.send(protocol.getPackedMsg());
                }
            });
            break;
            
        //SRG
        case g.SWP_MSG_TYPE.SWP_SRG_REQ: //State check
            state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_USN, protocol.getEndpointId(), (resState, searchedKey) => {
                //권한체크 필요 없음
                var payload = new Object();
                if (resState) {
                    uModule.checkUserSignedInState(g.ENTITY_TYPE.WEBCLIENT, protocol.getEndpointId(), unpackedPayload.nsc, (result) => {
                        if (result === 1) {
                            payload.wmac = unpackedPayload.wmac;
                            payload.cmac = unpackedPayload.cmac;

                            var packedSdpSrg = protocol.packMsg(g.SDP_MSG_TYPE.SDP_SRG_REQ, payload);
                            //여기
                            request.send('http://localhost:8080/databaseapi', packedSdpSrg, (message) => {
                                protocol.setMsg(message);
                                if (!protocol.verifyHeader()) return;
                                var unpackedPayload = protocol.unpackPayload();
                                if (!unpackedPayload) return;
                                switch (unpackedPayload.resultCode) {
                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_SRG.RESCODE_SDP_SRG_OK:
                                        //유저버퍼 업데이트
                                        uModule.updateUserSignedInState(g.ENTITY_TYPE.WEBCLIENT, protocol.getEndpointId(), (result) => {
                                            if (result) {
                                                // here!!
                                                payload = {};
                                                payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SRG.RESCODE_SWP_SRG_OK;
                                                protocol.packMsg(g.SWP_MSG_TYPE.SWP_SRG_RSP, payload);
                                                state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_USN, protocol.getEndpointId(), g.SERVER_USN_STATE_ID.SERVER_USN_USN_INFORMED_STATE, g.SERVER_TIMER.T863);
                                                logger.debug("| SERVER change USN state (USN INFORMED) ->  (USN INFORMED)");
                                                logger.debug("Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                                return res.send(protocol.getPackedMsg());
                                            }
                                        });
                                        break;

                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_SRG.RESCODE_SDP_SRG_OTHER:
                                        payload = {};
                                        payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SRG.RESCODE_SWP_SRG_OTHER;
                                        protocol.packMsg(g.SWP_MSG_TYPE.SWP_SRG_RSP, payload);
                                        logger.debug("Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                        return res.send(protocol.getPackedMsg());

                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_SRG.RESCODE_SDP_SRG_UNALLOCATED_USER_SEQUENCE_NUMBER:
                                        payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SRG.RESCODE_SWP_SRG_UNALLOCATED_USER_SEQUENCE_NUMBER;
                                        payload = {};
                                        protocol.packMsg(g.SWP_MSG_TYPE.SWP_SRG_RSP, payload);
                                        logger.debug("Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                        return res.send(protocol.getPackedMsg());
                                    default:
                                        break;
                                }
                            })
                        } else if (result === 3) {
                            //시퀀스
                            payload = {};
                            payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SRG.RESCODE_SWP_SRG_INCORRECT_NUMBER_OF_SIGNED_IN_COMPLETIONS;
                            protocol.packMsg(g.SWP_MSG_TYPE.SWP_SRG_RSP, payload)
                            logger.debug("Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                            return res.send(protocol.getPackedMsg());
                        }
                    });
                } else {
                    payload = {};
                    payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SRG.RESCODE_SWP_SRG_OTHER;
                    protocol.packMsg(g.SWP_MSG_TYPE.SWP_SRG_RSP, payload)
                    logger.debug("Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                    return res.send(protocol.getPackedMsg());
                }
            });
            break;

        //SAS
        case g.SWP_MSG_TYPE.SWP_SAS_REQ:
            state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_USN, protocol.getEndpointId(), (resState, searchedKey) => {
                var payload = {};
                if(resState){
                    uModule.checkUserSignedInState(g.ENTITY_TYPE.WEBCLIENT, protocol.getEndpointId(), unpackedPayload.nsc, (result) => {
                        if (result === 1) {
                            payload.wmac = unpackedPayload.wmac;
                            payload.mob = unpackedPayload.mob;
                            var packedSdpSas = protocol.packMsg(g.SDP_MSG_TYPE.SDP_SAS_REQ, payload);
                            //여기
                            request.send('http://localhost:8080/databaseapi', packedSdpSas, (message) => {
                                protocol.setMsg(message);
                                if (!protocol.verifyHeader()) return;
                                var unpackedPayload = protocol.unpackPayload();
                                if (!unpackedPayload) return;
                                switch (unpackedPayload.resultCode) {
                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_SAS.RESCODE_SDP_SAS_OK:
                                        //유저버퍼 업데이트
                                        uModule.updateUserSignedInState(g.ENTITY_TYPE.WEBCLIENT, protocol.getEndpointId(), (result) => {
                                            if (result) {
                                                payload = {};
                                                payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SAS.RESCODE_SWP_SAS_OK;
                                                protocol.packMsg(g.SWP_MSG_TYPE.SWP_SAS_RSP, payload);
                                                state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_USN, protocol.getEndpointId(), g.SERVER_USN_STATE_ID.SERVER_USN_USN_INFORMED_STATE, g.SERVER_TIMER.T863);
                                                logger.debug("| SERVER change USN state (USN INFORMED) ->  (USN INFORMED)");
                                                logger.debug("Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                                return res.send(protocol.getPackedMsg());
                                            }
                                        });
                                        break;

                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_SAS.RESCODE_SDP_SAS_OTHER:
                                        payload = {};
                                        payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SAS.RESCODE_SWP_SAS_OTHER;
                                        protocol.packMsg(g.SWP_MSG_TYPE.SWP_SAS_RSP, payload);
                                        logger.debug("Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                        return res.send(protocol.getPackedMsg());
                                        
                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_SAS.RESCODE_SDP_SAS_UNALLOCATED_USER_SEQUENCE_NUMBER:
                                        payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SAS.RESCODE_SWP_SAS_UNALLOCATED_USER_SEQUENCE_NUMBER;
                                        payload = {};
                                        protocol.packMsg(g.SWP_MSG_TYPE.SWP_SAS_RSP, payload);
                                        logger.debug("Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                        return res.send(protocol.getPackedMsg());

                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_SAS.RESCODE_SDP_SAS_NOT_EXIST_WIFI_MAC_ADDRESS:
                                        payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SAS.RESCODE_SDP_SAS_NOT_EXIST_WIFI_MAC_ADDRESS;
                                        payload = {};
                                        protocol.packMsg(g.SWP_MSG_TYPE.SWP_SAS_RSP, payload);
                                        logger.debug("Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                        return res.send(protocol.getPackedMsg());

                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_SAS.RESCODE_SDP_SAS_THE_REQUESTED_WIFI_MAC_WAS_ALREADY_ASSOCIATED_WITH_OWN_USN:
                                        payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SAS.RESCODE_SWP_SAS_THE_REQUESTED_WIFI_MAC_WAS_ALREADY_ASSOCIATED_WITH_OWN_USN;
                                        payload = {};
                                        protocol.packMsg(g.SWP_MSG_TYPE.SWP_SAS_RSP, payload);
                                        logger.debug("Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                        return res.send(protocol.getPackedMsg());

                                    default:
                                        break;
                                }
                            })
                        } else if (result === 3) {
                            //시퀀스
                            payload = {};
                            payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SAS.RESCODE_SWP_SAS_INCORRECT_NUMBER_OF_SIGNED_IN_COMPLETIONS;
                            protocol.packMsg(g.SWP_MSG_TYPE.SWP_SAS_RSP, payload)
                            logger.debug("Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                            return res.send(protocol.getPackedMsg());
                        }
                    });
                } else {
                    payload = {};
                    payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SAS.RESCODE_SWP_SAS_OTHER;
                    protocol.packMsg(g.SWP_MSG_TYPE.SWP_SAS_RSP, payload)
                    logger.debug("Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                    return res.send(protocol.getPackedMsg());
                }
            });
            break;

        //SDD
        case g.SWP_MSG_TYPE.SWP_SDD_REQ:
            //check state
            state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_USN, protocol.getEndpointId(), (resState, searchedKey) => {
                var payload = {};
                //State exist
                if (resState) {
                    uModule.checkUserSignedInState(g.ENTITY_TYPE.WEBCLIENT, protocol.getEndpointId(), unpackedPayload.nsc, (result) => {
                        if (result === 1) {
                            payload.wmac = unpackedPayload.wmac;
                            payload.drgcd = unpackedPayload.drgcd;
                            var packedSdpSdd = protocol.packMsg(g.SDP_MSG_TYPE.SDP_SDD_REQ, payload)
                            request.send('http://localhost:8080/databaseapi', packedSdpSdd, (message) => {
                                payload = {};
                                protocol.setMsg(message);
                                if (!protocol.verifyHeader()) return;
                                var unpackedPayload = protocol.unpackPayload();
                                if (!unpackedPayload) return;
                                switch (unpackedPayload.resultCode) {
                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_SDD.RESCODE_SDP_SDD_OK:
                                        //유저버퍼 업데이트
                                        uModule.updateUserSignedInState(g.ENTITY_TYPE.WEBCLIENT, protocol.getEndpointId(), (result) => {
                                            if (result) {
                                                // here!!
                                                payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SDD.RESCODE_SWP_SDD_OK;
                                                protocol.packMsg(g.SWP_MSG_TYPE.SWP_SDD_RSP, payload);
                                                state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_USN, protocol.getEndpointId(), g.SERVER_USN_STATE_ID.SERVER_USN_USN_INFORMED_STATE, g.SERVER_TIMER.T863);
                                                logger.debug("| SERVER change USN state (USN INFORMED) ->  (USN INFORMED)");
                                                logger.debug("Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                                return res.send(protocol.getPackedMsg());
                                            }
                                        });
                                        break;
                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_SDD.RESCODE_SDP_SDD_OTHER:
                                        payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SDD.RESCODE_SWP_SDD_OTHER;
                                        protocol.packMsg(g.SWP_MSG_TYPE.SWP_SDD_RSP, payload);
                                        logger.debug("Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                        return res.send(protocol.getPackedMsg());
                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_SDD.RESCODE_SDP_SDD_UNALLOCATED_USER_SEQUENCE_NUMBER:
                                        payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SDD.RESCODE_SWP_SDD_UNALLOCATED_USER_SEQUENCE_NUMBER;
                                        protocol.packMsg(g.SWP_MSG_TYPE.SWP_SDD_RSP, payload);
                                        logger.debug("Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                        return res.send(protocol.getPackedMsg());
                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_SDD.RESCODE_SDP_SDD_NOT_EXIST_USER_ID:
                                        payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SDD.RESCODE_SWP_SDD_NOT_EXIST_USER_ID;
                                        protocol.packMsg(g.SWP_MSG_TYPE.SWP_SDD_RSP, payload);
                                        logger.debug("Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                        return res.send(protocol.getPackedMsg());
                                    default:
                                        break;
                                }
                            });
                        } else if (result === 3) {
                            //시퀀스
                            payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SDD.RESCODE_SWP_SDD_INCORRECT_NUMBER_OF_SIGNED_IN_COMPLETIONS;
                            protocol.packMsg(g.SWP_MSG_TYPE.SWP_SDD_RSP, payload)
                            logger.debug("Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                            return res.send(protocol.getPackedMsg());
                        }
                    });
                    //State not exist
                } else {
                    payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SDD.RESCODE_SWP_SDD_OTHER;
                    logger.debug("Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                    protocol.packMsg(g.SWP_MSG_TYPE.SWP_SDD_RSP, payload);
                    return res.send(protocol.getPackedMsg());
                }
            });
            break;
        
        //SLV
        case g.SWP_MSG_TYPE.SWP_SLV_REQ:
            state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_USN, protocol.getEndpointId(), (resState, searchedKey) => {
                var payload = {};
                //state exist
                if(resState) {
                    uModule.checkUserSignedInState(g.ENTITY_TYPE.WEBCLIENT, protocol.getEndpointId(), unpackedPayload.nsc, (result) => {
                        if(result === 1){
                            var packedSdpSlv = protocol.packMsg(g.SDP_MSG_TYPE.SDP_SLV_REQ, payload)
                            request.send('http://localhost:8080/databaseapi', packedSdpSlv, (message) => {
                                payload = {};
                                protocol.setMsg(message);
                                if (!protocol.verifyHeader()) return;
                                var unpackedPayload = protocol.unpackPayload();
                                if (!unpackedPayload) return;
                                switch (unpackedPayload.resultCode) {
                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_SLV.RESCODE_SDP_SLV_OK:
                                        //유저버퍼 업데이트
                                        uModule.updateUserSignedInState(g.ENTITY_TYPE.WEBCLIENT, protocol.getEndpointId(), (result) => {
                                            if (result) {
                                                // here!!
                                                payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SLV.RESCODE_SWP_SLV_OK;
                                                payload.selectedSensorInformationList = unpackedPayload.selectedSensorInformationList;
                                                protocol.packMsg(g.SWP_MSG_TYPE.SWP_SLV_RSP, payload);
                                                state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_USN, protocol.getEndpointId(), g.SERVER_USN_STATE_ID.SERVER_USN_USN_INFORMED_STATE, g.SERVER_TIMER.T863);
                                                logger.debug("| SERVER change USN state (USN INFORMED) ->  (USN INFORMED)");
                                                logger.debug("Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                                return res.send(protocol.getPackedMsg());
                                            }
                                        });
                                        break;
                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_SLV.RESCODE_SDP_SLV_OTHER:
                                        payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SLV.RESCODE_SWP_SLV_OTHER;
                                        protocol.packMsg(g.SWP_MSG_TYPE.SWP_SLV_RSP, payload);
                                        logger.debug("Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                        return res.send(protocol.getPackedMsg());
                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_SLV.RESCODE_SDP_SLV_UNALLOCATED_USER_SEQUENCE_NUMBER:
                                        payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SLV.RESCODE_SWP_SLV_UNALLOCATED_USER_SEQUENCE_NUMBER;
                                        protocol.packMsg(g.SWP_MSG_TYPE.SWP_SLV_RSP, payload);
                                        logger.debug("Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                        return res.send(protocol.getPackedMsg());
                                    default:
                                        break;
                                }
                            });
                        } else {
                            payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SLV.RESCODE_SWP_SLV_INCORRECT_NUMBER_OF_SIGNED_IN_COMPLETIONS;
                            protocol.packMsg(g.SWP_MSG_TYPE.SWP_SLV_RSP, payload)
                            logger.debug("Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                            return res.send(protocol.getPackedMsg());
                        }
                    });
                //state not exist
                } else {
                    payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SLV.RESCODE_SWP_SLV_OTHER;
                    logger.debug("Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                    protocol.packMsg(g.SWP_MSG_TYPE.SWP_SLV_RSP, payload);
                    return res.send(protocol.getPackedMsg());
                }
            });
            break;
        
        //SIR
        case g.SSP_MSG_TYPE.SSP_SIR_REQ:
            //TSI가 중복인지 판단
            //  중복일 경우
            //  중복이 아닌경우
            //      데이터베이스 요청
            //          if ok
            //              응답 결과 전달
            //              SSN스테이트 생성
            //          else
            //              응답결과 전달
            //          
            //key c:sta:s:s:(tsi):(wmac)
            /**
             * 1.~ Check complict tsi in server
             * 1.1.~ If not complict
             * 1.1.1.~ Request to database
             * 1.1.1.1.~ If result ok
             * 1.1.1.1.1.~ send ok code with ssn
             * 1.1.1.1.2.~ update SSN state for server
             * 1.1.1.2.~ Else result
             * 1.1.1.2.1.~ send error for each
             * 1.2.~ if Complict
             * 1.2.1.~ Send 2. complict
             */
            // 1.~
            var payload = {};
            redisCli.keys("c:sta:s:s:" + unpackedPayload.tsi + ":*", (err, keys) => {
                if(err){
                    logger.error("| DATABASE ERROR keys" + "c:sta:s:s:" + unpackedPayload.tsi + ":*");
                } else {
                    // 1.1.~
                    if(keys.length === 0){
                        state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_SENSOR_TSI, protocol.getEndpointId, g.SERVER_TSI_STATE_ID.SERVER_TSI_HALF_SSN_INFORMED_STATE);
                        payload.wmac = unpackedPayload.wmac;
                        var packedSdpSirReq = protocol.packMsg(g.SDP_MSG_TYPE.SDP_SIR_REQ, payload);
                        //1.1.1.~
                        request.send('http://localhost:8080/databaseapi', packedSdpSirReq, (message) => {
                            protocol.setMsg(message);
                            if (!protocol.verifyHeader()) return;
                            var unpackedPayload = protocol.unpackPayload();
                            if (!unpackedPayload) return;
                            switch (unpackedPayload.resultCode) {
                                // 1.1.1.1.~
                                case g.SDP_MSG_RESCODE.RESCODE_SDP_SIR.RESCODE_SDP_SIR_OK:
                                    payload = {};
                                    payload.resultCode = g.SSP_MSG_RESCODE.RESCODE_SSP_SIR.RESCODE_SSP_SIR_OK;
                                    payload.ssn = unpackedPayload.ssn;
                                    protocol.packMsg(g.SSP_MSG_TYPE.SSP_SIR_RSP, payload);
                                    state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_SENSOR_TSI, protocol.getEndpointId(), g.SERVER_TSI_STATE_ID.SERVER_TSI_SSN_INFORMED_STATE, g.SERVER_TIMER.T801);
                                    logger.debug("| SERVER change SSN state (HALF SSN INFORMED) ->  (SSN INFORMED)");
                                    logger.debug("Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                    return res.send(protocol.getPackedMsg());
                                // 1.1.1.2.~
                                case g.SDP_MSG_RESCODE.RESCODE_SDP_SIR.RESCODE_SDP_SIR_NOT_EXIST_WIFI_MAC_ADDRESS:
                                    payload = {};
                                    payload.resultCode = g.SSP_MSG_RESCODE.RESCODE_SSP_SIR.RESCODE_SSP_SIR_NOT_EXIST_WIFI_MAC_ADDRESS;
                                    protocol.packMsg(g.SSP_MSG_TYPE.SSP_SIR_RSP, payload)
                                    logger.debug("Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                    return res.send(protocol.getPackedMsg());
                                case g.SDP_MSG_RESCODE.RESCODE_SDP_SIR.RESCODE_SDP_SIR_NOT_AN_ASSOCIATED_SENSOR_WITH_ANY_USER:
                                    payload = {};
                                    payload.resultCode = g.SSP_MSG_RESCODE.RESCODE_SSP_SIR.RESCODE_SSP_SIR_NOT_AN_ASSOCIATED_SENSOR_WITH_ANY_USER;
                                    protocol.packMsg(g.SSP_MSG_TYPE.SSP_SIR_RSP, payload)
                                    logger.debug("Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                    return res.send(protocol.getPackedMsg());

                            }
                        });
                    // 1.2.~
                    } else {
                        var payload = {};
                        payload.resultCode = g.SSP_MSG_RESCODE.RESCODE_SSP_SIR.RESCODE_SSP_SIR_CONFLICT_OF_TEMPORARY_SENSOR_ID
                        protocol.packMsg(g.SSP_MSG_TYPE.SSP_SIR_RSP, payload)
                        logger.debug("Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                        return res.send(protocol.getPackedMsg());
                    }
                }
            });
            break;
        
        default:
            break;
    }
  
  
    //res.send("Ok");
});
router.post("/databaseapi", (req, res) => {
    logger.debug("| DB Received request on /databaseapi: " + JSON.stringify(req.body));
    var protocol = new LlProtocol();
    var state = new LlState();
    var hash = new LlHash();
    var uModule = new userModule();
    var sModule = new sensorModule();
    var cModule = new commonModule();
    protocol.setMsg(req.body);
    if (!protocol.verifyHeader()) return;
    //여기가 문제다..
    var unpackedPayload = protocol.unpackPayload();
    if (!unpackedPayload) return;
    switch (protocol.getMsgType()) {
        //SGU
        case g.SDP_MSG_TYPE.SDP_SGU_REQ:
            //state check
            state.setState(g.ENTITY_TYPE.DATABASE, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI, [protocol.getEndpointId(), unpackedPayload.userId], g.DATABASE_TCI_STATE_ID.DATABASE_TCI_IDLE_STATE);
            logger.debug("| DATABASE change TCI state to IDLE STATE");
            redisCli.get("u:info:id:" + unpackedPayload.userId, (err, reply) => {
                var payload = null;
                var sdpSguRspCode = 0;
                if (err) {
                    sdpSguRspCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SGU.RESCODE_SDP_SGU_OTHER;
                } else {
                    if (reply === null) {
                        sdpSguRspCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SGU.RESCODE_SDP_SGU_OK;
                    } else {
                        sdpSguRspCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SGU.RESCODE_SDP_SGU_DUPLICATE_OF_USER_ID;
                    }
                }
                payload = {
                    "resultCode": sdpSguRspCode
                }
                protocol.packMsg(g.SDP_MSG_TYPE.SDP_SGU_RSP, payload)
                logger.debug("| DATABASE Send response: " + JSON.stringify(protocol.getPackedMsg()));
                state.setState(g.ENTITY_TYPE.DATABASE, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI, [protocol.getEndpointId(), unpackedPayload.userId], g.DATABASE_TCI_STATE_ID.DATABASE_TCI_UNIQUE_USER_ID_CONFIRMED_STATE, g.DATABASE_TIMER.T954);
                logger.debug("| DATABASE change TCI state to UNIQUE USER CONFIRMED STATE");
                return res.send(protocol.getPackedMsg());
            });
            break;
        
        //UVC
        case g.SDP_MSG_TYPE.SDP_UVC_REQ:
            state.getState(g.ENTITY_TYPE.DATABASE, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI, protocol.getEndpointId(), (resState, searchedKey) => {
                if (g.DATABASE_RECV_STATE_BY_MSG.SDP_SGU_REQ.includes(resState)) {
                    //Initial state
                    if(resState === g.DATABASE_TCI_STATE_ID.DATABASE_TCI_UNIQUE_USER_ID_CONFIRMED_STATE){
                        //Insert user info
                        redisCli.keys("u:info:" + unpackedPayload.userId, (err, reply) => {
                            if (err) {
                                payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SGU.RESCODE_SDP_SGU_OTHER;
                                protocol.packMsg(g.SDP_MSG_TYPE.SDP_UVC_RSP, payload)
                                logger.debug("| DATABASE Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                return res.send(protocol.getPackedMsg());
                            } else {
                                if (reply.length === 0) {
                                    uModule.getNewUserSeqNum((newUsn)=> {
                                        var payload = null;
                                        var userInfo = unpackedPayload;
                                        userInfo.regf = 0;
                                        userInfo.ml = 0;
                                        userInfo.mti = 0;
                                        userInfo.tti = 0;
                                        userInfo.ass = 0;
                                        userInfo.expd = 0;
                                        userInfo.newUsn = newUsn;
                                        var keyHead = "u:info:" + newUsn + ":";
                                        //can be made
                                        redisCli.multi([
                                            [
                                                "mset",
                                                keyHead + "usn", userInfo.newUsn,
                                                keyHead + "id", userInfo.userId,
                                                keyHead + "pw", hash.getHashedPassword(userInfo.userPw),
                                                keyHead + "regf", userInfo.regf,
                                                keyHead + "fn", userInfo.userFn,
                                                keyHead + "ln", userInfo.userLn,
                                                keyHead + "bdt", userInfo.birthDate,
                                                keyHead + "gen", userInfo.gender,
                                                keyHead + "ml", userInfo.ml, //TBD
                                                keyHead + "expd", userInfo.expd, //TBD
                                                keyHead + "mti", userInfo.mti, //TBD
                                                keyHead + "tti", userInfo.tti, //TBD
                                                keyHead + "ass", userInfo.ass, //TBD
                                                "u:info:id:" + userInfo.userId, userInfo.newUsn
                                            ],
                                            [
                                                "setbit", keyHead + "signf", 0, 0
                                            ],
                                            [
                                                "setbit", keyHead + "signf", 1, 0
                                            ]
                                        ]).exec(function (err, replies) {
                                            if (err) {
                                                payload = {
                                                    "resultCode": g.SDP_MSG_RESCODE.RESCODE_SDP_UVC.RESCODE_SDP_UVC_OTHER
                                                }
                                                protocol.packMsg(g.SDP_MSG_TYPE.SDP_UVC_RSP, payload);
                                                state.setState(g.ENTITY_TYPE.DATABASE, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI, [protocol.getEndpointId(), userInfo.userId], g.DATABASE_TCI_STATE_ID.DATABASE_USN_ALLOCATED_STATE, g.DATABASE_TIMER.T902);
                                                logger.debug("| DATABASE change TCI state to USN ALLOCATED STATE");
                                                return res.send(protocol.getPackedMsg());
                                            } else {
                                                logger.debug("| DATABASE stored user info" + JSON.stringify(userInfo));
                                                payload = {
                                                    "resultCode": g.SDP_MSG_RESCODE.RESCODE_SDP_UVC.RESCODE_SDP_UVC_OK
                                                }
                                                protocol.packMsg(g.SDP_MSG_TYPE.SDP_UVC_RSP, payload);
                                                state.setState(g.ENTITY_TYPE.DATABASE, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI, [protocol.getEndpointId(), userInfo.userId], g.DATABASE_TCI_STATE_ID.DATABASE_USN_ALLOCATED_STATE, g.DATABASE_TIMER.T902);
                                                logger.debug("| DATABASE change TCI state to USN ALLOCATED STATE");
                                                return res.send(protocol.getPackedMsg());
                                            }
                                        });
                                       
                                    });                                   
                                } else {
                                    payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_UVC.RESCODE_SDP_UVC_DUPLICATE_OF_USER_ID;
                                    protocol.packMsg(g.SDP_MSG_TYPE.SDP_UVC_RSP, payload)
                                    logger.debug("| DATABASE Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                    return res.send(protocol.getPackedMsg());
                                }
                            }
                        });
                    //Retries state
                    } else if(resState === g.DATABASE_TCI_STATE_ID.DATABASE_USN_ALLOCATED_STATE) {
                         payload = {
                             "resultCode": g.SDP_MSG_RESCODE.RESCODE_SDP_UVC.RESCODE_SDP_UVC_OK
                         }
                         protocol.packMsg(g.SDP_MSG_TYPE.SDP_UVC_RSP, payload);
                         logger.debug("| DATABASE Send response: " + JSON.stringify(protocol.getPackedMsg()));
                         return res.send(protocol.getPackedMsg());
                    }
                } else {
                    //other
                    payload = {
                        "resultCode": g.SDP_MSG_RESCODE.RESCODE_SDP_UVC.RESCODE_SDP_UVC_OTHER
                    }
                    protocol.packMsg(g.SDP_MSG_TYPE.SDP_UVC_RSP, payload);
                    logger.debug("| DATABASE Send response: " + JSON.stringify(protocol.getPackedMsg()));
                    return res.send(protocol.getPackedMsg());
                }
            });
            break;
        
        //SGI
        case g.SDP_MSG_TYPE.SDP_SGI_REQ:
            //모든 스테이트에서 받을 수 있음
            var payload = new Object();
            redisCli.get("u:info:id:"+unpackedPayload.userId, (err, usn) => {
                if(err) {} else {
                    if (usn === null) {
                        payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SGI.RESCODE_SDP_SGI_NOT_EXIST_USER_ID;
                        protocol.packMsg(g.SDP_MSG_TYPE.SDP_SGI_RSP, payload);
                        logger.debug("| DATABASE Send response: " + JSON.stringify(protocol.getPackedMsg()));
                        return res.send(protocol.getPackedMsg());
                    } else {
                        redisCli.get("u:info:" + usn + ":pw", (err, hashedPw) => {
                            if(err) {} else {
                                if (hashedPw === null) {
                                    payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SGI.RESCODE_SDP_SGI_OTHER;
                                    protocol.packMsg(g.SDP_MSG_TYPE.SDP_SGI_RSP, payload);
                                    logger.debug("| DATABASE Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                    return res.send(protocol.getPackedMsg());
                                } else {
                                    if (hash.checkPassword(unpackedPayload.userPw, hashedPw)) {
                                        payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SGI.RESCODE_SDP_SGI_OK;
                                        //update user state
                                        var keyHead = "u:info:" + usn + ":";
                                        redisCli.multi([
                                           //here -> 나누자!!
                                            ["setbit", keyHead + "signf", 1, g.SIGNED_IN_STATE.SIGNED_IN],
                                            ["mget", keyHead + "usn", keyHead + "ml"]
                                        ]).exec((err, replies) => {
                                            if(err){} else {
                                                payload.usn = replies[1][0];
                                                payload.ml = replies[1][1];
                                            }
                                            state.setState(g.ENTITY_TYPE.DATABASE, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_USN, replies[1][0], g.DATABASE_USN_STATE_ID.DATABASE_USN_USN_INFORMED_STATE, g.DATABASE_TIMER.T955);
                                            logger.debug("| DATABASE change USN state (IDLE) -> (USN INFORMED)");
                                            protocol.packMsg(g.SDP_MSG_TYPE.SDP_SGI_RSP, payload);
                                            logger.debug("| DATABASE Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                            return res.send(protocol.getPackedMsg());
                                        });
                                        //
                                    } else {
                                        payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SGI.RESCODE_SDP_SGI_INCORRECT_CURRENT_USER_PASSWORD;
                                        protocol.packMsg(g.SDP_MSG_TYPE.SDP_SGI_RSP, payload);
                                        logger.debug("| DATABASE Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                        return res.send(protocol.getPackedMsg());
                                    }
                                }
                            }
                        })
                    }
                }
            });
            break;
        
        //SGO
        case g.SDP_MSG_TYPE.SDP_SGO_NOT:
            var payload = new Object();
            var key = "u:info:" + protocol.getEndpointId() + ":signf";
            redisCli.getbit(key, 1,(err, signf) => {
                //not exist user id
                if (signf === null) {
                    payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SGO.RESCODE_SDP_SGO_UNALLOCATED_USER_SEQUENCE_NUMBER;
                    protocol.packMsg(g.SDP_MSG_TYPE.SDP_SGO_ACK, payload);
                    logger.debug("| DATABASE Send response: " + JSON.stringify(protocol.getPackedMsg()));
                    return res.send(protocol.getPackedMsg());
                //signed in
                }else if(signf === g.SIGNED_IN_STATE.SIGNED_IN){
                    redisCli.setbit(key, 1, g.SIGNED_IN_STATE.SIGNED_OUT);
                    payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SGO.RESCODE_SDP_SGO_OK;
                    protocol.packMsg(g.SDP_MSG_TYPE.SDP_SGO_ACK, payload);
                    logger.debug("| DATABASE Send response: " + JSON.stringify(protocol.getPackedMsg()));
                    state.setState(g.ENTITY_TYPE.DATABASE, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_USN, protocol.getEndpointId(), g.DATABASE_USN_STATE_ID.DATABASE_USN_IDLE_STATE);
                    logger.debug("| SERVER change USN state (USN INFORMED) -> (IDLE)");
                    return res.send(protocol.getPackedMsg());
                //signed out
                } else if (signf === g.SIGNED_IN_STATE.SIGNED_OUT) {
                    payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SGO.RESCODE_SDP_SGO_OTHER;
                    protocol.packMsg(g.SDP_MSG_TYPE.SDP_SGO_ACK, payload);
                    logger.debug("| DATABASE Send response: " + JSON.stringify(protocol.getPackedMsg()));
                    return res.send(protocol.getPackedMsg());
                }
            });
            break;
        
        //ASR
        case g.SDP_MSG_TYPE.SDP_ASR_REQ:
            var payload = new Object();
            var key = "u:info:" + protocol.getEndpointId() + ":signf";
            redisCli.getbit(key, 1, (err, signf) => {
                //not exist user id
                if (signf === null) {
                    payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_ASR.RESCODE_SDP_ASR_UNALLOCATED_USER_SEQUENCE_NUMBER;
                    protocol.packMsg(g.SDP_MSG_TYPE.SDP_ASR_RSP, payload);
                    logger.debug("| DATABASE Send response: " + JSON.stringify(protocol.getPackedMsg()));
                    return res.send(protocol.getPackedMsg());
                    //signed in
                } else if (signf === g.SIGNED_IN_STATE.SIGNED_IN) {
                    //Auth, It should be repfactoring
                    if(protocol.getEndpointId() < 2){
                        payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_ASR.RESCODE_SDP_ASR_OK;
                        //add usn
                        redisCli.get("s:info:" + unpackedPayload.wmac, (err, reply) => {
                            if(err){
                                logger.error("| DATABASE ERROR search wmac");
                            } else {
                                if (reply === null) {
                                    sModule.getNewSensorSerialNum(g.USER_TYPE.ADMIN, (newSsn) => {
                                        var payload = new Object();
                                        var sensorInfo = unpackedPayload;
                                        var keyHead = 's:info:' + newSsn + ':';
                                        sensorInfo.ssn = newSsn;
                                        sensorInfo.actf = 0;
                                        sensorInfo.mobf = 0;
                                        sensorInfo.stat = 0b11111111;
                                        sensorInfo.rdt = cModule.getCurrentDate();
                                        sensorInfo.sdt = 0;
                                        sensorInfo.edt = 0;
                                        sensorInfo.drgcd = 0;
                                        sensorInfo.regusn = protocol.getEndpointId();
                                        redisCli.multi([
                                            [
                                                "mset",
                                                keyHead + "ssn", sensorInfo.ssn,
                                                keyHead + "wmac", sensorInfo.wmac,
                                                keyHead + "cmac", sensorInfo.cmac,
                                                keyHead + "rdt", sensorInfo.rdt,
                                                keyHead + "sdt", sensorInfo.sdt, //TBD
                                                keyHead + "edt", sensorInfo.edt, //TBD
                                                keyHead + "drgcd", sensorInfo.drgcd, 
                                                keyHead + "regusn", sensorInfo.regusn,
                                                keyHead + "actf", sensorInfo.actf,
                                                keyHead + "mobf", sensorInfo.mobf,
                                                keyHead + "stat", sensorInfo.stat,
                                                "s:info:" + sensorInfo.wmac, sensorInfo.ssn
                                            ],
                                            [   
                                                "sadd", "search:s:actf:0", sensorInfo.ssn,
                                            ],
                                            [
                                                "sadd", "search:s:mobf:0", sensorInfo.ssn
                                            ],
                                            [
                                                "sadd", "search:s:nat:0", sensorInfo.ssn, 
                                            ],
                                            [
                                                "sadd", "search:s:user:" + protocol.getEndpointId(), sensorInfo.ssn
                                            ]
                                        ]).exec(function (err, replies) {
                                            if (err) {
                                                logger.error("| DATABASE ERROR set sensor information");
                                                return;
                                            } else {
                                                logger.debug("| DATABASE stored sensor info" + JSON.stringify(sensorInfo));
                                                payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_ASR.RESCODE_SDP_ASR_OK;
                                                protocol.packMsg(g.SDP_MSG_TYPE.SDP_ASR_RSP, payload);
                                                state.setState(g.ENTITY_TYPE.DATABASE, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_USN, protocol.getEndpointId(), g.DATABASE_USN_STATE_ID.DATABASE_USN_USN_INFORMED_STATE, g.DATABASE_TIMER.T955);
                                                logger.debug("| DATABASE change USN state (USN INFORMED) -> (USN INFORMED)");
                                                return res.send(protocol.getPackedMsg());
                                            }
                                        });
                                    });
                                } else {
                                    payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_ASR.RESCODE_SDP_ASR_OK;
                                    protocol.packMsg(g.SDP_MSG_TYPE.SDP_ASR_RSP, payload);
                                    state.setState(g.ENTITY_TYPE.DATABASE, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_USN, protocol.getEndpointId(), g.DATABASE_USN_STATE_ID.DATABASE_USN_USN_INFORMED_STATE, g.DATABASE_TIMER.T955);
                                    logger.debug("| DATABASE change USN state (USN INFORMED) -> (USN INFORMED)");
                                    return res.send(protocol.getPackedMsg());
                                }
                            }
                        });
                    } else {
                        payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_ASR.RESCODE_SDP_ASR_UNAUTHORIZED_USER_SEQUENCE_NUMBER;
                        protocol.packMsg(g.SDP_MSG_TYPE.SDP_ASR_RSP, payload);
                        logger.debug("| DATABASE Send response: " + JSON.stringify(protocol.getPackedMsg()));
                    }
                    
                    //signed out
                } else if (signf === g.SIGNED_IN_STATE.SIGNED_OUT) {
                    payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_ASR.RESCODE_SDP_ASR_OTHER;
                    protocol.packMsg(g.SDP_MSG_TYPE.SDP_ASR_RSP, payload);
                    logger.debug("| DATABASE Send response: " + JSON.stringify(protocol.getPackedMsg()));
                    return res.send(protocol.getPackedMsg());
                }
            });
            break;
        
        //ASD
        case g.SDP_MSG_TYPE.SDP_ASD_REQ:
            var payload = new Object();
            var key = "u:info:" + protocol.getEndpointId() + ":signf";
            //유저시퀀스 조회
            redisCli.getbit(key, 1, (err, signf) => {
                if (signf === null) {
                    payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_ASD.RESCODE_SDP_ASD_UNALLOCATED_USER_SEQUENCE_NUMBER;
                    protocol.packMsg(g.SDP_MSG_TYPE.SDP_ASD_REQ, payload);
                    logger.debug("| DATABASE Send response: " + JSON.stringify(protocol.getPackedMsg()));
                    return res.send(protocol.getPackedMsg());
                    //signed in
                } else if (signf === g.SIGNED_IN_STATE.SIGNED_IN) {
                    //Auth, It should be repfactoring
                    if(protocol.getEndpointId() < 2){
                        redisCli.get("s:info:" + unpackedPayload.wmac, (err, ssn) => {
                            if (err) {
                                logger.error("| DATABASE ERROR search wmac");
                            } else {
                                //wifi MAC address exist
                                if (ssn !== null) {
                                    redisCli.get("u:info:id:" + unpackedPayload.userId, (err, usn)=> {
                                        //user id exist
                                        if (usn !== null) {
                                            var arrDrg = [0,2,3,4,5];
                                            //deregistration
                                            if (arrDrg.includes(Number(unpackedPayload.drgcd))) {
                                                redisCli.multi([
                                                    //Delete sensor association with user
                                                    ["set", "s:info:" + ssn + ":drgcd", unpackedPayload.drgcd],
                                                    [
                                                        "srem", "search:s:actf:0", ssn,
                                                    ],
                                                    [
                                                        "sadd", "search:s:actf:3", ssn,
                                                    ]
                                                ]).exec(function (err, replies) {
                                                    if (err) {
                                                        logger.error("| DATABASE ERROR set drgcd info");
                                                    } else {
                                                        payload = {};
                                                        payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_ASD.RESCODE_SDP_ASD_OK;
                                                        protocol.packMsg(g.SDP_MSG_TYPE.SDP_ASD_RSP, payload);
                                                        logger.debug("| DATABASE Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                                        return res.send(protocol.getPackedMsg());
                                                    }
                                                });
                                            //deassociation
                                            } else {
                                                var keyHead = "u:ass:" + usn + ":" + ssn + ":";
                                                redisCli.get(keyHead + ":ssn", (err, result) => {
                                                    if (err) {
                                                        logger.error("| DATABASE ERROR search usn ssn");
                                                    } else {
                                                        if (result !== null) {
                                                            redisCli.multi([
                                                                //Delete sensor association with user
                                                                ["del", keyHead + "ssn"],
                                                                ["del", keyHead + "usn"],
                                                                ["del", keyHead + "mti"],
                                                                ["del", keyHead + "tti"],
                                                                ["del", keyHead + "mobf"],
                                                                //Update sensor information
                                                                ["set", keyHead + "actf", 0],
                                                                [
                                                                    "srem", "search:s:actf:1", sensorInfo.ssn,
                                                                ],
                                                                [
                                                                    "sadd", "search:s:actf:0", sensorInfo.ssn,
                                                                ],
                                                                [
                                                                    "sadd", "search:s:mobf:0", sensorInfo.ssn
                                                                ]
                                                            ]).exec(function (err, replies) {
                                                                if (err) {
                                                                    logger.error("| DATABASE ERROR delete usn,ssn");
                                                                } else {
                                                                    payload = {};
                                                                    payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_ASD.RESCODE_SDP_ASD_OK;
                                                                    protocol.packMsg(g.SDP_MSG_TYPE.SDP_ASD_RSP, payload);
                                                                    logger.debug("| DATABASE Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                                                    return res.send(protocol.getPackedMsg());
                                                                }
                                                            });
                                                        } else {
                                                            payload = {};
                                                            payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_ASD.RESCODE_SDP_ASD_THE_REQUESTED_WIFI_MAC_IS_NOT_AN_ASSOCIATED_WITH_USER_ID;
                                                            protocol.packMsg(g.SDP_MSG_TYPE.SDP_ASD_RSP, payload);
                                                            logger.debug("| DATABASE Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                                            return res.send(protocol.getPackedMsg());
                                                        }
                                                    }
                                                })
                                            }
                                        //user id not exist
                                        } else {
                                            payload = {};
                                            payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_ASD.RESCODE_SDP_ASD_NOT_EXIST_USER_ID;
                                            protocol.packMsg(g.SDP_MSG_TYPE.SDP_ASD_RSP, payload);
                                            logger.debug("| DATABASE Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                            return res.send(protocol.getPackedMsg());
                                        }
                                    });
                                //wifi MAC address not exist
                                } else {
                                    payload = {};
                                    payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_ASD.RESCODE_SDP_ASD_UNALLOCATED_WIFI_MAC_ADDRESS;
                                    protocol.packMsg(g.SDP_MSG_TYPE.SDP_ASD_RSP, payload);
                                    logger.debug("| DATABASE Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                    return res.send(protocol.getPackedMsg());
                                }
                            }
                        });
                    } else {
                        payload = {};
                        payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_ASD.RESCODE_SDP_ASD_UNAUTHORIZED_USER_SEQUENCE_NUMBER;
                        protocol.packMsg(g.SDP_MSG_TYPE.SDP_ASD_RSP, payload);
                        logger.debug("| DATABASE Send response: " + JSON.stringify(protocol.getPackedMsg()));
                    }
                    //signed out
                } else if (signf === g.SIGNED_IN_STATE.SIGNED_OUT) {
                    payload = {};
                    payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_ASD.RESCODE_SDP_ASD_OTHER;
                    protocol.packMsg(g.SDP_MSG_TYPE.SDP_ASD_RSP, payload);
                    logger.debug("| DATABASE Send response: " + JSON.stringify(protocol.getPackedMsg()));
                    return res.send(protocol.getPackedMsg());
                }
            });
            break;
        
        //ASV
        case g.SDP_MSG_TYPE.SDP_ASV_REQ:
            var payload = {};
            var key = "u:info:" + protocol.getEndpointId() + ":signf";
            redisCli.getbit(key, 1, (err, signf)=> {
                if (signf === null) {
                    payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_ASV.RESCODE_SDP_ASV_UNALLOCATED_USER_SEQUENCE_NUMBER;
                    protocol.packMsg(g.SDP_MSG_TYPE.SDP_ASV_REQ, payload);
                    logger.debug("| DATABASE Send response: " + JSON.stringify(protocol.getPackedMsg()));
                    return res.send(protocol.getPackedMsg());
                    //signed in
                } else if (signf === g.SIGNED_IN_STATE.SIGNED_IN) {
                    //Auth, It should be repfactoring
                    if(protocol.getEndpointId() < 2){
                        //main logic
                        //If user searched using mac
                        if (typeof unpackedPayload.wmac !== 'undefined') {
                            //시리얼 넘버 * 해당 번치 -> 
                            redisCli.get('s:info:' + unpackedPayload.wmac, (err, ssn) => {
                                if(ssn !== null){
                                    redisCli.keys('s:info:' + ssn + ':*', (err, values) => {
                                        if(err){} else {
                                            console.log(values);
                                            redisCli.mget(values, (err, replies) => {
                                                console.log(replies);
                                                var obj = {};
                                                for (var i = 0; i < replies.length; i++) {
                                                    obj[values[i].split("s:info:"+ ssn +":")[1]] = replies[i];
                                                }
                                                payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_ASV.RESCODE_SDP_ASV_OK;
                                                payload.selectedSensorInformationList = [obj];
                                                protocol.packMsg(g.SDP_MSG_TYPE.SDP_ASV_RSP, payload);
                                                logger.debug("| DATABASE Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                                return res.send(protocol.getPackedMsg());
                                            })
                                        }
                                    });
                                } else {
                                    payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_ASV.RESCODE_SDP_ASV_OK;
                                    payload.selectedSensorInformationList = [];
                                    protocol.packMsg(g.SDP_MSG_TYPE.SDP_ASV_RSP, payload);
                                    logger.debug("| DATABASE Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                    return res.send(protocol.getPackedMsg());
                                }
                            });
                        } else {
                            var searchSets = [];
                            var keyHead = 'search:s:actf:';
                            switch (unpackedPayload.actf) {
                                case g.SENSOR_ACT_FLAG.REGISTERED:
                                    searchSets.push(keyHead + g.SENSOR_ACT_FLAG.REGISTERED.toString());
                                    break;
                                case g.SENSOR_ACT_FLAG.ASSOCATIED:
                                    searchSets.push(keyHead + g.SENSOR_ACT_FLAG.ASSOCATIED.toString());
                                    break;
                                case g.SENSOR_ACT_FLAG.OPERATING:
                                    searchSets.push(keyHead + g.SENSOR_ACT_FLAG.OPERATING.toString());
                                    break;
                                case g.SENSOR_ACT_FLAG.DEREGISTERED:
                                    searchSets.push(keyHead + g.SENSOR_ACT_FLAG.DEREGISTERED.toString());
                                    break;
                                default: break;
                            }
                            keyHead = 'search:s:mobf:';
                            switch (unpackedPayload.mobf) {
                                case g.SENSOR_MOB_FLAG.STATIONARY:
                                    searchSets.push(keyHead + g.SENSOR_MOB_FLAG.STATIONARY.toString());
                                    break;
                                case g.SENSOR_MOB_FLAG.PORTABLE:
                                    searchSets.push(keyHead + g.SENSOR_MOB_FLAG.PORTABLE.toString());
                                    break;
                                default: break;
                            }
                            keyHead = 'search:s:nat:';
                            switch (unpackedPayload.nat) {
                                case 0:
                                    searchSets.push(keyHead + '0');
                                    break;
                                case 1:
                                    searchSets.push(keyHead + '1');
                                    break;
                                default:
                                    break;
                            }
                            keyHead = 'search:s:user:';
                            //not if search by user id
                            if (typeof unpackedPayload.userId === 'undefined') {
                                sModule.searchSensor(searchSets, (result)=>{
                                    payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_ASV.RESCODE_SDP_ASV_OK;
                                    payload.selectedSensorInformationList = result;
                                    protocol.packMsg(g.SDP_MSG_TYPE.SDP_ASV_RSP, payload);
                                    logger.debug("| DATABASE Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                    return res.send(protocol.getPackedMsg());
                                })
                            //if search by user id
                            } else {
                                redisCli.get('u:info:id:' + unpackedPayload.userId, (err, usn) => {
                                    if (usn === null) {
                                        payload.selectedSensorInformationList = [];
                                        payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_ASV.RESCODE_SDP_ASV_OK;
                                        protocol.packMsg(g.SDP_MSG_TYPE.SDP_ASV_RSP, payload);
                                        logger.debug("| DATABASE Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                        return res.send(protocol.getPackedMsg());
                                    } else {
                                        sModule.searchSensor(['search:s:user:' + usn], (result) => {
                                            payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_ASV.RESCODE_SDP_ASV_OK;
                                            payload.selectedSensorInformationList = result;
                                            protocol.packMsg(g.SDP_MSG_TYPE.SDP_ASV_RSP, payload);
                                            logger.debug("| DATABASE Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                            return res.send(protocol.getPackedMsg());
                                        });
                                    }
                                });
                            }
                        }
                    } else if (signf === g.SIGNED_IN_STATE.SIGNED_OUT) {
                        payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_ASV.RESCODE_SDP_ASV_UNAUTHORIZED_USER_SEQUENCE_NUMBER;
                        protocol.packMsg(g.SDP_MSG_TYPE.SDP_ASV_RSP, payload);
                        logger.debug("| DATABASE Send response: " + JSON.stringify(protocol.getPackedMsg()));
                    }
                } else if (signf === g.SIGNED_IN_STATE.SIGNED_OUT) {
                    payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_ASV.RESCODE_SDP_ASV_OTHER;
                    protocol.packMsg(g.SDP_MSG_TYPE.SDP_ASV_RSP, payload);
                    logger.debug("| DATABASE Send response: " + JSON.stringify(protocol.getPackedMsg()));
                    return res.send(protocol.getPackedMsg());
                }
            });
            break;
        
        //SRG
        case g.SDP_MSG_TYPE.SDP_SRG_REQ:
            var payload = new Object();
            var key = "u:info:" + protocol.getEndpointId() + ":signf";
            redisCli.getbit(key, 1, (err, signf) => {
                //not exist user id
                if (signf === null) {
                    payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SRG.RESCODE_SDP_SRG_UNALLOCATED_USER_SEQUENCE_NUMBER;
                    protocol.packMsg(g.SDP_MSG_TYPE.SDP_SRG_RSP, payload);
                    logger.debug("| DATABASE Send response: " + JSON.stringify(protocol.getPackedMsg()));
                    return res.send(protocol.getPackedMsg());
                    //signed in
                } else if (signf === g.SIGNED_IN_STATE.SIGNED_IN) {
                        payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SRG.RESCODE_SDP_SRG_OK;
                        //add usn
                        redisCli.get("s:info:" + unpackedPayload.wmac, (err, reply) => {
                            if (err) {
                                logger.error("| DATABASE ERROR search wmac");
                            } else {
                                if (reply === null) {
                                    sModule.getNewSensorSerialNum(g.USER_TYPE.USER, (newSsn) => {
                                        var payload = new Object();
                                        var sensorInfo = unpackedPayload;
                                        var keyHead = 's:info:' + newSsn + ':';
                                        sensorInfo.ssn = newSsn;
                                        sensorInfo.actf = 0;
                                        sensorInfo.mobf = 0;
                                        sensorInfo.stat = 0b11111111;
                                        sensorInfo.rdt = cModule.getCurrentDate();
                                        sensorInfo.sdt = 0;
                                        sensorInfo.edt = 0;
                                        sensorInfo.drgcd = 0;
                                        sensorInfo.regusn = protocol.getEndpointId();
                                        redisCli.multi([
                                            [
                                                "mset",
                                                keyHead + "ssn", sensorInfo.ssn,
                                                keyHead + "wmac", sensorInfo.wmac,
                                                keyHead + "cmac", sensorInfo.cmac,
                                                keyHead + "rdt", sensorInfo.rdt,
                                                keyHead + "sdt", sensorInfo.sdt, //TBD
                                                keyHead + "edt", sensorInfo.edt, //TBD
                                                keyHead + "drgcd", sensorInfo.drgcd,
                                                keyHead + "regusn", sensorInfo.regusn,
                                                keyHead + "actf", sensorInfo.actf,
                                                keyHead + "mobf", sensorInfo.mobf,
                                                keyHead + "stat", sensorInfo.stat,
                                                "s:info:" + sensorInfo.wmac, sensorInfo.ssn
                                            ],
                                            [
                                                "sadd", "search:s:actf:0", sensorInfo.ssn,
                                            ],
                                            [
                                                "sadd", "search:s:mobf:0", sensorInfo.ssn
                                            ],
                                            [
                                                "sadd", "search:s:nat:0", sensorInfo.ssn,
                                            ],
                                            [
                                                "sadd", "search:s:user:" + protocol.getEndpointId(), sensorInfo.ssn
                                            ]
                                        ]).exec(function (err, replies) {
                                            if (err) {
                                                logger.error("| DATABASE ERROR set sensor information");
                                                return;
                                            } else {
                                                logger.debug("| DATABASE stored sensor info" + JSON.stringify(sensorInfo));
                                                payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SRG.RESCODE_SDP_SRG_OK;
                                                protocol.packMsg(g.SDP_MSG_TYPE.SDP_SRG_RSP, payload);
                                                state.setState(g.ENTITY_TYPE.DATABASE, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_USN, protocol.getEndpointId(), g.DATABASE_USN_STATE_ID.DATABASE_USN_USN_INFORMED_STATE, g.DATABASE_TIMER.T955);
                                                logger.debug("| DATABASE change USN state (USN INFORMED) -> (USN INFORMED)");
                                                return res.send(protocol.getPackedMsg());
                                            }
                                        });
                                    });
                                } else {
                                    payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SRG.RESCODE_SDP_SRG_OK;
                                    protocol.packMsg(g.SDP_MSG_TYPE.SDP_SRG_RSP, payload);
                                    state.setState(g.ENTITY_TYPE.DATABASE, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_USN, protocol.getEndpointId(), g.DATABASE_USN_STATE_ID.DATABASE_USN_USN_INFORMED_STATE, g.DATABASE_TIMER.T955);
                                    logger.debug("| DATABASE change USN state (USN INFORMED) -> (USN INFORMED)");
                                    return res.send(protocol.getPackedMsg());
                                }
                            }
                        });
                    //signed out
                } else if (signf === g.SIGNED_IN_STATE.SIGNED_OUT) {
                    payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SRG.RESCODE_SDP_SRG_OTHER;
                    protocol.packMsg(g.SDP_MSG_TYPE.SDP_SRG_RSP, payload);
                    logger.debug("| DATABASE Send response: " + JSON.stringify(protocol.getPackedMsg()));
                    return res.send(protocol.getPackedMsg());
                }
            });
            break;
        
        //SAS
        case g.SDP_MSG_TYPE.SDP_SAS_REQ:
            var payload = new Object();
            var key = "u:info:" + protocol.getEndpointId() + ":signf";
            redisCli.getbit(key, 1, (err, signf) => {
                if (signf === null) {
                    payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SAS.RESCODE_SDP_SAS_UNALLOCATED_USER_SEQUENCE_NUMBER;
                    protocol.packMsg(g.SDP_MSG_TYPE.SDP_SAS_RSP, payload);
                    logger.debug("| DATABASE Send response: " + JSON.stringify(protocol.getPackedMsg()));
                    return res.send(protocol.getPackedMsg());
                // if the user signed in
                /**
                 * REQ: wmac, mob
                 * RSP: Result Code. 0) OK, 1) other, 2) unallocated, 3) not exist wmac, 4) already associated  
                 */
                } else if (signf === g.SIGNED_IN_STATE.SIGNED_IN) {
                    /**
                     * 1) search wmac 
                     * 1.1) if exist
                     * 1.1.1) check association
                     * 1.1.1.1) if not associated
                     *      var keyHead = "u:ass:" + usn + ":" + ssn + ":usn";        
                     * 1.1.1.2) if associated
                     * 1.2)if not exist
                     */
                    //1)
                    redisCli.get('s:info:' + unpackedPayload.wmac, (err, ssn) => {
                        if(err) {
                            logger.error("| DATABASE ERROR search wmac");
                        } else{
                            // 1.1)
                            if(ssn === null) {
                                // 1.1.1)
                                redisCli.keys('u:ass:*:' + ssn + ':usn', (err, usns) => {
                                    if (err) {
                                        logger.error("| DATABASE ERROR user association");
                                    } else {
                                        // 1.1.1.1)
                                        if(usns.length === 0) {
                                            var keyHead = "u:ass:" + usns[0] + ":" + ssn + ":";
                                            redisCli.multi([
                                                //Set association user and sensor
                                                ["set", keyHead + "ssn", ssn],
                                                ["set", keyHead + "usn", usns[0]],
                                                ["set", keyHead + "mti", g.DATABASE_TIMER.T957],
                                                ["set", keyHead + "tti", g.DATABASE_TIMER.T958],
                                                ["set", keyHead + "mobf", unpackedPayload.mob],
                                                //Update sensor information
                                                ["set", keyHead + "actf", 0],
                                                [
                                                    "srem", "search:s:actf:0", ssn,
                                                ],
                                                [
                                                    "sadd", "search:s:actf:1", ssn,
                                                ],
                                                [
                                                    "sadd", "search:s:mobf:" + unpackedPayload.mob, ssn,
                                                ]
                                            ]).exec(function (err, replies) {
                                                if (err) {
                                                    logger.error("| DATABASE ERROR update usn,ssn associataion");
                                                } else {
                                                    payload = {};
                                                    payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SAS.RESCODE_SDP_SAS_OK;
                                                    protocol.packMsg(g.SDP_MSG_TYPE.SDP_SAS_RSP, payload);
                                                    logger.debug("| DATABASE Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                                    return res.send(protocol.getPackedMsg());
                                                }
                                            });
                                        // 1.1.1.2)
                                        } else {
                                            payload = {};
                                            payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SAS.RESCODE_SDP_SAS_THE_REQUESTED_WIFI_MAC_WAS_ALREADY_ASSOCIATED_WITH_OWN_USN;
                                            protocol.packMsg(g.SDP_MSG_TYPE.SDP_SAS_RSP, payload);
                                            logger.debug("| DATABASE Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                            return res.send(protocol.getPackedMsg());
                                        }
                                    }
                                });
                            // 1.2)  
                            } else {
                               payload = {};
                               payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SAS.RESCODE_SDP_SAS_NOT_EXIST_WIFI_MAC_ADDRESS;
                               protocol.packMsg(g.SDP_MSG_TYPE.SDP_SAS_RSP, payload);
                               logger.debug("| DATABASE Send response: " + JSON.stringify(protocol.getPackedMsg()));
                               return res.send(protocol.getPackedMsg());
                            }
                        }
                    });
                } else if (signf === g.SIGNED_IN_STATE.SIGNED_OUT) {
                    payload = {};
                    payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SAS.RESCODE_SDP_SAS_OTHER;
                    protocol.packMsg(g.SDP_MSG_TYPE.SDP_SAS_RSP, payload);
                    logger.debug("| DATABASE Send response: " + JSON.stringify(protocol.getPackedMsg()));
                    return res.send(protocol.getPackedMsg());
                }
            });
            break;
        
        //SDD
        case g.SDP_MSG_TYPE.SDP_SDD_REQ:
            var payload = new Object();
            var key = "u:info:" + protocol.getEndpointId() + ":signf";
            //유저시퀀스 조회
            redisCli.getbit(key, 1, (err, signf) => {
                if (signf === null) {
                    payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SDD.RESCODE_SDP_SDD_UNALLOCATED_USER_SEQUENCE_NUMBER;
                    protocol.packMsg(g.SDP_MSG_TYPE.SDP_SDD_REQ, payload);
                    logger.debug("| DATABASE Send response: " + JSON.stringify(protocol.getPackedMsg()));
                    return res.send(protocol.getPackedMsg());
                    //signed in
                } else if (signf === g.SIGNED_IN_STATE.SIGNED_IN) {
                    redisCli.get("s:info:" + unpackedPayload.wmac, (err, ssn) => {
                        if (err) {
                            logger.error("| DATABASE ERROR search wmac");
                        } else {
                            //wifi MAC address exist
                            if (ssn !== null) {
                                redisCli.get("u:info:id:" + unpackedPayload.userId, (err, usn) => {
                                    var arrDrg = [0, 2, 3, 4, 5];
                                    //deregistration
                                    if (arrDrg.includes(Number(unpackedPayload.drgcd))) {
                                        redisCli.multi([
                                            //Delete sensor association with user
                                            ["set", "s:info:" + ssn + ":drgcd", unpackedPayload.drgcd],
                                            [
                                                "srem", "search:s:actf:0", ssn,
                                            ],
                                            [
                                                "sadd", "search:s:actf:3", ssn,
                                            ]
                                        ]).exec(function (err, replies) {
                                            if (err) {
                                                logger.error("| DATABASE ERROR set drgcd info");
                                            } else {
                                                payload = {};
                                                payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SDD.RESCODE_SDP_SDD_OK;
                                                protocol.packMsg(g.SDP_MSG_TYPE.SDP_SDD_RSP, payload);
                                                logger.debug("| DATABASE Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                                return res.send(protocol.getPackedMsg());
                                            }
                                        });
                                        //deassociation
                                    } else {
                                        var keyHead = "u:ass:" + protocol.getEndpointId() + ":" + ssn + ":";
                                        redisCli.get(keyHead + "ssn", (err, result) => {
                                            if (err) {
                                                logger.error("| DATABASE ERROR search usn ssn");
                                            } else {
                                                if (result !== null) {
                                                    redisCli.multi([
                                                        //Delete sensor association with user
                                                        ["del", keyHead + "ssn"],
                                                        ["del", keyHead + "usn"],
                                                        ["del", keyHead + "mti"],
                                                        ["del", keyHead + "tti"],
                                                        ["del", keyHead + "mobf"],
                                                        //Update sensor information
                                                        ["set", keyHead + "actf", 0],
                                                        [
                                                            "srem", "search:s:actf:1", sensorInfo.ssn,
                                                        ],
                                                        [
                                                            "sadd", "search:s:actf:0", sensorInfo.ssn,
                                                        ],
                                                        [
                                                            "sadd", "search:s:mobf:0", sensorInfo.ssn
                                                        ]
                                                    ]).exec(function (err, replies) {
                                                        if (err) {
                                                            logger.error("| DATABASE ERROR delete usn,ssn");
                                                        } else {
                                                            payload = {};
                                                            payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SDD.RESCODE_SDP_SDD_OK;
                                                            protocol.packMsg(g.SDP_MSG_TYPE.SDP_SDD_RSP, payload);
                                                            logger.debug("| DATABASE Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                                            return res.send(protocol.getPackedMsg());
                                                        }
                                                    });
                                                } else {
                                                    payload = {};
                                                    payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SDD.RESCODE_SDP_SDD_THE_REQUESTED_WIFI_MAC_IS_NOT_AN_ASSOCIATED_WITH_USER_ID;
                                                    protocol.packMsg(g.SDP_MSG_TYPE.SDP_SDD_RSP, payload);
                                                    logger.debug("| DATABASE Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                                    return res.send(protocol.getPackedMsg());
                                                }
                                            }
                                        });
                                    }
                                });
                                //wifi MAC address not exist
                            } else {
                                payload = {};
                                payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SDD.RESCODE_SDP_SDD_UNALLOCATED_WIFI_MAC_ADDRESS;
                                protocol.packMsg(g.SDP_MSG_TYPE.SDP_SDD_RSP, payload);
                                logger.debug("| DATABASE Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                return res.send(protocol.getPackedMsg());
                            }
                        }
                    });
                    //signed out
                } else if (signf === g.SIGNED_IN_STATE.SIGNED_OUT) {
                    payload = {};
                    payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SDD.RESCODE_SDP_SDD_OTHER;
                    protocol.packMsg(g.SDP_MSG_TYPE.SDP_ASD_RSP, payload);
                    logger.debug("| DATABASE Send response: " + JSON.stringify(protocol.getPackedMsg()));
                    return res.send(protocol.getPackedMsg());
                }
            });
            break;
        
        //SLV
        case g.SDP_MSG_TYPE.SDP_SLV_REQ:
            var payload = {};
            var key = "u:info:" + protocol.getEndpointId() + ":signf";
            redisCli.getbit(key, 1, (err, signf) => {
                //unallocated user sequence number
                if (signf === null) {
                    payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SLV.RESCODE_SDP_SLV_UNALLOCATED_USER_SEQUENCE_NUMBER;
                    protocol.packMsg(g.SDP_MSG_TYPE.SDP_SLV_REQ, payload);
                    logger.debug("| DATABASE Send response: " + JSON.stringify(protocol.getPackedMsg()));
                    return res.send(protocol.getPackedMsg());
                //signed-in
                } else if (signf === g.SIGNED_IN_STATE.SIGNED_IN) {
                    redisCli.keys("search:s:user"+ protocol.getEndpointId(), (err, arrSsn) =>{
                        if(err){}
                        else {
                            if (arrSsn.length === 0) {
                                payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SLV.RESCODE_SDP_SLV_OK;
                                payload.existCode = 1;
                                protocol.packMsg(g.SDP_MSG_TYPE.SDP_SLV_RSP, payload);
                                logger.debug("| DATABASE Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                return res.send(protocol.getPackedMsg());
                            } else {
                                redisCli.multi(arrSsn).exec((err, replies) => {
                                    console.log(replies);
                                    var searchKes = [];
                                    for (let index = 0; index < replies.length; index++) {
                                        searchKes.push(['mget', replies[index]]);
                                    }
                                    //get values by keys
                                    redisCli.multi(searchKes).exec(function (err, values) {
                                        var result = [];
                                        for (let rowIndex = 0; rowIndex < values.length; rowIndex++) {
                                            var row = {};
                                            //make row
                                            var ssn = replies[rowIndex][0].split(":")[2];
                                            for (let itemIndex = 0; itemIndex < replies[rowIndex].length; itemIndex++) {
                                                row[replies[rowIndex][itemIndex].split("s:info:" + ssn + ":")[1]] = values[rowIndex][itemIndex];
                                            }
                                            //insert row to result obj
                                            result.push(row);
                                        }
                                        //
                                        payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SLV.RESCODE_SDP_SLV_OK;
                                        payload.existCode = 0;
                                        payload.selectedSensorInformationList = result;
                                        protocol.packMsg(g.SDP_MSG_TYPE.SDP_SLV_RSP, payload);
                                        logger.debug("| DATABASE Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                        return res.send(protocol.getPackedMsg());
                                    });
                                });
                            }
                        }
                    });

                    sModule.searchSensor(searchSets, (result) => {
                        payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SLV.RESCODE_SDP_SLV_OK;
                        payload.selectedSensorInformationList = result;
                        protocol.packMsg(g.SDP_MSG_TYPE.SDP_SLV_RSP, payload);
                        logger.debug("| DATABASE Send response: " + JSON.stringify(protocol.getPackedMsg()));
                        return res.send(protocol.getPackedMsg());
                    });
                //signed-out
                } else if (signf === g.SIGNED_IN_STATE.SIGNED_OUT) {
                    payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SLV.RESCODE_SDP_SLV_OTHER;
                    protocol.packMsg(g.SDP_MSG_TYPE.SDP_SLV_RSP, payload);
                    logger.debug("| DATABASE Send response: " + JSON.stringify(protocol.getPackedMsg()));
                    return res.send(protocol.getPackedMsg());
                }
            });
            break;
        
        case g.SDP_MSG_TYPE.SDP_SIR_REQ:
            /**
             * 1~ check existance wmac
             * 1.1~ if exist
             * 1.1.1~ check association
             * 1.1.1.1~ if associated
             * 1.1.1.1.1~ 0. ok with ssn message return
             * 1.1.1.1.2~ ssn state update
             * 1.1.1.2~ if not associated
             * 1.1.1.2.1~ 3. not an associated sensor with any user
             * 1.2~ if not exist
             * 1.2.1~ send 2. not exist wmac
             */
            var payload = {};
            // 1~
            redisCli.get("s:info:" + unpackedPayload.wmac, (err, ssn) => {
                if(err){
                    logger.error("| DATABASE ERROR search ssn");
                } else {
                    // 1.1~
                    if(ssn !== null) {
                        // 1.1.1~
                        redisCli.get("s:info:" + ssn + ":actf", (err, actf) => {
                            if(err) {
                                logger.error("| DATABASE ERROR search actf");
                            } else {
                                // 1.1.1.1~
                                if (actf === g.SENSOR_ACT_FLAG.ASSOCATIED || actf === g.SENSOR_ACT_FLAG.OPERATING) {
                                    payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SIR.RESCODE_SDP_SIR_OK;
                                    payload.ssn = ssn;
                                    protocol.packMsg(g.SDP_MSG_TYPE.SDP_SIR_RSP, payload);
                                    logger.debug("| DATABASE Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                    state.setState(g.ENTITY_TYPE.DATABASE, g.ENDPOIONT_ID_TYPE.EI_TYPE_SENSOR_SSN, protocol.getEndpointId(), g.DATABASE_SSN_STATE_ID.DATABASE_SSN_INFORMED_STATE, g.DATABASE_TIMER.T951);
                                    logger.debug("| DATABASE change SSN state (IDLE) -> (SSN INFORMED)");
                                    return res.send(protocol.getPackedMsg());
                                //1.1.1.2~
                                } else {
                                    payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SIR.RESCODE_SDP_SIR_NOT_AN_ASSOCIATED_SENSOR_WITH_ANY_USER;
                                    protocol.packMsg(g.SDP_MSG_TYPE.SDP_SIR_RSP, payload);
                                    logger.debug("| DATABASE Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                    return res.send(protocol.getPackedMsg());
                                }
                            }
                        });
                    // 1.2~
                    } else {
                        payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SIR.RESCODE_SDP_SIR_NOT_EXIST_WIFI_MAC_ADDRESS;
                        protocol.packMsg(g.SDP_MSG_TYPE.SDP_SIR_RSP, payload);
                        logger.debug("| DATABASE Send response: " + JSON.stringify(protocol.getPackedMsg()));
                        return res.send(protocol.getPackedMsg());
                    }
                }
            });
        default:
            break;
           
    }
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