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
//Mail Sender module
var LlMailer = require('../lib/LlMailer');

const userModule = require('./userModule');
const sensorModule = require('./sensorModule');
const commonModule = require('./commonModule');
const dataModule = require('./searchHistoricalDataModule');

const redis = require("redis");
//Connect with Redis client
const redisCli = redis.createClient();
//Data tran
router.post("/serverdatatran", function (req, res){
    logger.debug("    +--------------------------------------------------------------------------------.................");
    logger.debug("| SERVER Received request on /serverapi: " + JSON.stringify(req.body));

    var protocol = new LlProtocol();
    protocol.setMsg(req.body);
    if(!protocol.verifyHeader()) return;
    
    switch (protocol.getMsgType()) {
        case g.SSP_MSG_TYPE.SSP_RAD_TRN:
            // CID 스테이트 확인 
            redisCli.get('c:con:s:' + protocol.getEndpointId() + ':ssn', (err, ssn) => {
                if(err) {
                    logger.debug("| SERVER ERROR get" + "c:con:s:" + protocol.getEndpointId() + ":ssn");
                } else {
                    if(ssn !== null) {
                        //ssn state update
                        state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_SENSOR_SSN, ssn, g.SERVER_SSN_STATE_ID.SERVER_SSN_CID_INFORMED_STATE, g.SERVER_TIMER.T803)
                        var mti = g.SERVER_TIMER.T805;
                        var unpackedPayload = unpackTrnPayload(protocol.payload, mti);
                        var dataSet = unpackedPayload.airQualityDataListEncodings.airQualityDataTuples;
                        //add data into buffer
                        var args = [];
                        args.push('d:air:' + ssn + ':raw');
                        for (let index = 0; index < dataSet.length; index++) {
                            args.push(dataSet[index].shift());
                            args.push(dataSet[index].toString());
                        }
                        redisCli.zadd(args, (err, result) => {
                            if (err) {
                                logger.debug("| SERVER ERROR zadd d:air:" + ssn + ':raw with values');
                            } else {
                                var payload = {}
                                payload.successfulRcptFlg = unpackedPayload.successfulRcptFlg;
                                payload.continuityOfSuccessfulRcpt = unpackedPayload.continuityOfSuccessfulRcpt;
                                payload.numOfSuccessfulRcpt = unpackedPayload.numOfSuccessfulRcpt;
                                if (payload.successfulRcptFlg === 1) {
                                    payload.listOfSuccessfulTs = unpackedPayload.arrSuccessfulTs;
                                }
                                payload.retransReqFlg = unpackedPayload.retransReqFlg;
                                payload.continuityOfRetransReq = unpackedPayload.continuityOfRetransReq;
                                payload.numOfRetransReq = unpackedPayload.numOfRetransReq;
                                if (payload.retransReqFlg === 1) {
                                    payload.listOfUnsuccessfulTs = unpackedPayload.arrUnsuccessfulTs;
                                }
                                var sspRadAck = {
                                    "header": {
                                        "msgType": g.SSP_MSG_TYPE.SSP_RAD_ACK,
                                        "msgLen": 0,
                                        "endpointId": this.endpointId
                                    },
                                    "payload": payload
                                }
                                logger.debug("| SERVER Send response:" + JSON.stringify(sspRadAck));
                                return res.send(sspRadAck);
                            }
                        });
                    } else {
                        return;
                    }
                }
            })
            break;

        case g.SAP_MSG_TYPE.SAP_RHD_TRN:
            // Check CID state
            redisCli.get('c:con:a:' + protocol.getEndpointId() + ':usn', (err, usn) => {
                if (err) {
                    logger.debug("| SERVER ERROR get" + "c:con:a:" + protocol.getEndpointId() + ":usn");
                } else {
                    if (ssn !== null) {
                        //ssn state update
                        state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_APP_USN, usn, g.SERVER_USN_STATE_ID.SERVER_USN_CID_INFORMED_STATE, g.SERVER_TIMER.T803);
                        //here
                        var mti = g.SERVER_TIMER.T837;
                        var unpackedPayload = unpackTrnPayload(protocol.payload, mti);
                        var dataSet = unpackedPayload.heartRelatedDataListEncodings.heartRelatedDataTuples;
                        //add data into buffer
                        var args = [];
                        args.push('d:heart:' + usn + ':raw');
                        for (let index = 0; index < dataSet.length; index++) {
                            args.push(dataSet[index].shift());
                            args.push(dataSet[index].toString());
                        }
                        redisCli.zadd(args, (err, result) => {
                            if (err) {
                                logger.debug("| SERVER ERROR zadd d:air:" + ssn + ':raw with values');
                            } else {
                                var payload = {}
                                payload.successfulRcptFlg = unpackedPayload.successfulRcptFlg;
                                payload.continuityOfSuccessfulRcpt = unpackedPayload.continuityOfSuccessfulRcpt;
                                payload.numOfSuccessfulRcpt = unpackedPayload.numOfSuccessfulRcpt;
                                if (payload.successfulRcptFlg === 1) {
                                    payload.listOfSuccessfulTs = unpackedPayload.arrSuccessfulTs;
                                }
                                payload.retransReqFlg = unpackedPayload.retransReqFlg;
                                payload.continuityOfRetransReq = unpackedPayload.continuityOfRetransReq;
                                payload.numOfRetransReq = unpackedPayload.numOfRetransReq;
                                if (payload.retransReqFlg === 1) {
                                    payload.listOfUnsuccessfulTs = unpackedPayload.arrUnsuccessfulTs;
                                }
                                var sspRadAck = {
                                    "header": {
                                        "msgType": g.SAP_MSG_TYPE.SAP_RHD_ACK,
                                        "msgLen": 0,
                                        "endpointId": this.endpointId
                                    },
                                    "payload": payload
                                }
                                logger.debug("| SERVER Send response:" + JSON.stringify(sspRadAck));
                                return res.send(sspRadAck);
                            }
                        });
                    } else {
                        return;
                    }
                }
            });
            break;

        default:
            break;
    }
});
//Process : 일정시간마다 에어데이터를 서버에서 데이터베이스로 전송
//레디스에 데이터를 넣어두고, 이를 읽어서 데이터베이스로 전송

//SERVER
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
    var sModule = new sensorModule();
    var mailer = new LlMailer();
    //protocol verify
    protocol.setMsg(req.body);
    if(!protocol.verifyHeader()) return;
    var unpackedPayload = protocol.unpackPayload();
    //unpacking
    if (!unpackedPayload) return;

    switch (protocol.getMsgType()) {
        
        /**
         * Receive SAP: SGU-REQ
         * Last update: 10.23.2018
         * Author: Junhee Park
         */
        case g.SAP_MSG_TYPE.SAP_SGU_REQ:
            state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_APP_TCI, protocol.getEndpointId(), (resState, searchedKey) => {
                let payload = {};
                //처음받지 않을경우
                if (resState) {
                    //아이디가 같을경우 재전송, 다를경우 중복
                    if (`c:sta:s:a:tci:${protocol.getEndpointId()}:${unpackedPayload.userId}` === searchedKey) {
                        state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_APP_TCI, [protocol.getEndpointId(), unpackedPayload.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_IDLE_STATE);
                        logger.debug("| SERVER change TCI state to IDLE STATE");

                        payload.userId = unpackedPayload.userId;
                        payload.clientType = g.CLIENT_TYPE.APP;
                        payload = protocol.packMsg(g.SDP_MSG_TYPE.SDP_SGU_REQ, payload);
                        logger.debug(`| SERVER send request: ${JSON.stringify(protocol.getPackedMsg())}`);
                        //update state
                        state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_APP_TCI, [protocol.getEndpointId(), unpackedPayload.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_USER_ID_DUPLICATE_REQUESTED_STATE);
                        
                        let userInfo = unpackedPayload;
                        logger.debug("| SERVER change TCI state to USER ID DUPLICATE REQUESTED STATE");
                        request.send('http://localhost:8080/databaseapi', payload, (message) => {
                            protocol.setMsg(message);
                            if (!protocol.verifyHeader()) return;
                            unpackedPayload = protocol.unpackPayload();
                            if (!unpackedPayload) return;
                            switch (unpackedPayload.resultCode) {
                                case g.SDP_MSG_RESCODE.RESCODE_SDP_SGU.RESCODE_SDP_SGU_OK:
                                    return state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_APP_TCI, protocol.getEndpointId(), (resState) => {
                                        if (g.SERVER_RECV_STATE_BY_MSG.SDP_SGU_RSP.includes(resState)) {

                                            const ac = codeGen.getAuthenticationCode(),
                                                  vc = codeGen.getVerificationCode(),
                                                  contect = `<H1> Verification code: ${vc}<H1></BR><H1> Authentication code: ${ac}<H1>`;

                                            mailer.sendEmail(userInfo.userId, 'Verification from Airound', contect);
                                            
                                            const keyHead = `u:temp:${protocol.getEndpointId()}:`,
                                                  expTime = g.SERVER_TIMER.T862;

                                            redisCli.multi([
                                                ["set", `${keyHead}id`, userInfo.userId, 'EX', expTime],
                                                ["set", `${keyHead}pw`, userInfo.userPw, 'EX', expTime],
                                                ["set", `${keyHead}fn`, userInfo.userFn, 'EX', expTime],
                                                ["set", `${keyHead}bdt`, userInfo.bdt, 'EX', expTime],
                                                ["set", `${keyHead}gen`, userInfo.gender, 'EX', expTime],
                                                ["set", `${keyHead}ac`, ac, 'EX', expTime],
                                                ["set", `${keyHead}vc`, vc, 'EX', expTime],
                                            ]).exec((err, replies) => {
                                                if (err) {} else {
                                                    logger.debug(`| SERVER stored temporary user info: in ${expTime} sec > ${JSON.stringify(userInfo)}`);
                                                }
                                            });

                                            payload = {};
                                            payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_SGU.RESCODE_SAP_SGU_OK;
                                            payload.vc = vc;
                                            protocol.packMsg(g.SAP_MSG_TYPE.SAP_SGU_RSP, payload);
                                            
                                            state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_APP_TCI, [protocol.getEndpointId(), userInfo.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_USER_ID_AVAILABLITY_CONFIRMED_STATE, g.SERVER_TIMER.T862);
                                            logger.debug("| SERVER change TCI state to USER ID AVAILABLITY CONFIRMED_STATE");

                                            logger.debug(`| Server Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                            res.send(protocol.getPackedMsg());
                                        }
                                    });

                                case g.SDP_MSG_RESCODE.RESCODE_SDP_SGU.RESCODE_SDP_SGU_OTHER:
                                    payload = {};
                                    payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_SGU.RESCODE_SAP_SGU_OTHER;
                                    protocol.packMsg(g.SAP_MSG_TYPE.SAP_SGU_RSP, payload);
                                
                                    state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_APP_TCI, [protocol.getEndpointId(), userInfo.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_IDLE_STATE);
                                    logger.debug('| SERVER change TCI state to IDLE STATE');

                                    logger.debug(`| SERVER Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                    return res.send(protocol.getPackedMsg());

                                case g.SDP_MSG_RESCODE.RESCODE_SDP_SGU.RESCODE_SDP_SGU_DUPLICATE_OF_USER_ID:
                                    payload = {};
                                    payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_SGU.RESCODE_SAP_SGU_DUPLICATE_OF_USER_ID;
                                    protocol.packMsg(g.SAP_MSG_TYPE.SAP_SGU_RSP, payload);

                                    state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_APP_TCI, [protocol.getEndpointId(), userInfo.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_IDLE_STATE);
                                    logger.debug('| SERVER change TCI state to IDLE STATE');

                                    logger.debug(`| SERVER Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                    return res.send(protocol.getPackedMsg());
                            }
                        });
                    } else {
                        payload = {};
                        payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_SGU.RESCODE_SAP_SGU_CONFLICT_OF_TEMPORARY_CLIENT_ID
                        protocol.packMsg(g.SAP_MSG_TYPE.SAP_SGU_RSP, payload)

                        logger.debug(`| SERVER Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                        return res.send(protocol.getPackedMsg());
                    }
                } else {
                    //If first request
                    resState = g.SERVER_TCI_STATE_ID.SERVER_TCI_IDLE_STATE;

                    if (g.SERVER_RECV_STATE_BY_MSG.SAP_SGU_REQ.includes(resState)) {
                        //set state
                        state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_APP_TCI, [protocol.getEndpointId(), unpackedPayload.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_IDLE_STATE);
                        logger.debug("| SERVER change TCI state to IDLE STATE");

                        payload.userId = unpackedPayload.userId;
                        payload.clientType = g.CLIENT_TYPE.APP;

                        payload = protocol.packMsg(g.SDP_MSG_TYPE.SDP_SGU_REQ, payload);
                        logger.debug("| SERVER send request: " + JSON.stringify(protocol.getPackedMsg()));
                        
                        //update state
                        state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_APP_TCI, [protocol.getEndpointId(), unpackedPayload.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_USER_ID_DUPLICATE_REQUESTED_STATE);
                        let userInfo = unpackedPayload;

                        logger.debug("| SERVER change TCI state to USER ID DUPLICATE REQUESTED STATE");
                        request.send('http://localhost:8080/databaseapi', payload, (message) => {
                            protocol.setMsg(message);
                            if (!protocol.verifyHeader()) return;
                            unpackedPayload = protocol.unpackPayload();
                            if (!unpackedPayload) return;
                            switch (unpackedPayload.resultCode) {
                                case g.SDP_MSG_RESCODE.RESCODE_SDP_SGU.RESCODE_SDP_SGU_OK:
                                    return state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_APP_TCI, protocol.getEndpointId(), (resState) => {
                                        if (g.SERVER_RECV_STATE_BY_MSG.SDP_SGU_RSP.includes(resState)) {
                                        
                                            const ac = codeGen.getAuthenticationCode(),
                                                vc = codeGen.getVerificationCode(),
                                                contect = `<H1> Verification code: ${vc}<H1></BR><H1> Authentication code: ${ac}<H1>`;

                                            mailer.sendEmail(userInfo.userId, 'Verification from Airound', contect);
                                            
                                            const keyHead = `u:temp:${protocol.getEndpointId()}:`,
                                                  expTime = g.SERVER_TIMER.T862;

                                            redisCli.multi([
                                                ["set", keyHead + "id", userInfo.userId, 'EX', expTime],
                                                ["set", keyHead + "pw", userInfo.userPw, 'EX', expTime],
                                                ["set", keyHead + "fn", userInfo.userFn, 'EX', expTime],
                                                ["set", keyHead + "ln", userInfo.userLn, 'EX', expTime],
                                                ["set", keyHead + "bdt", userInfo.bdt, 'EX', expTime],
                                                ["set", keyHead + "gen", userInfo.gender, 'EX', expTime],
                                                ["set", keyHead + "ac", ac, 'EX', expTime],
                                                ["set", keyHead + "vc", vc, 'EX', expTime],
                                            ]).exec((err, replies) => {
                                                if (err) {} else {
                                                    logger.debug(`| SERVER stored temporary user info: in ${expTime} sec > ${JSON.stringify(userInfo)}`);
                                                }
                                            });

                                            payload = {};
                                            payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_SGU.RESCODE_SAP_SGU_OK;
                                            payload.vc = vc;
                                            protocol.packMsg(g.SAP_MSG_TYPE.SAP_SGU_RSP, payload);

                                            state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_APP_TCI, [protocol.getEndpointId(), userInfo.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_USER_ID_AVAILABLITY_CONFIRMED_STATE, g.SERVER_TIMER.T862);
                                            logger.debug("| SERVER change TCI state to USER ID AVAILABLITY CONFIRMED STATE");
                                            
                                            logger.debug(`| Server Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                            return res.send(protocol.getPackedMsg());
                                        }
                                    });

                                case g.SDP_MSG_RESCODE.RESCODE_SDP_SGU.RESCODE_SDP_SGU_OTHER:
                                    payload = {};
                                    payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_SGU.RESCODE_SAP_SGU_OTHER;
                                    protocol.packMsg(g.SAP_MSG_TYPE.SAP_SGU_RSP, payload);

                                    state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_APP_TCI, [protocol.getEndpointId(), userInfo.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_IDLE_STATE);
                                    logger.debug("| SERVER change TCI state to IDLE STATE");

                                    logger.debug(`| SERVER Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                    return res.send(protocol.getPackedMsg());

                                case g.SDP_MSG_RESCODE.RESCODE_SDP_SGU.RESCODE_SDP_SGU_DUPLICATE_OF_USER_ID:
                                    payload = {};
                                    payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_SGU.RESCODE_SAP_SGU_DUPLICATE_OF_USER_ID;
                                    protocol.packMsg(g.SAP_MSG_TYPE.SAP_SGU_RSP, payload);

                                    state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_APP_TCI, [protocol.getEndpointId(), userInfo.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_IDLE_STATE);
                                    logger.debug("| SERVER change TCI state to IDLE STATE");

                                    logger.debug("| Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                    return res.send(protocol.getPackedMsg());
                            }
                        });
                    }
                }
            });
            break;

        /**
         * Receive SWP: SGU-REQ
         * Last update: 10.23.2018
         * Author: Junhee Park
         */
        case g.SWP_MSG_TYPE.SWP_SGU_REQ:
            state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI, protocol.getEndpointId(), (resState, searchedKey) => {
                let payload = {};
                //처음받지 않을경우
                if (resState) {
                    //아이디가 같을경우 재전송, 다를경우 중복
                    if (`c:sta:s:w:tci:${protocol.getEndpointId()}:${unpackedPayload.userId}` === searchedKey) {
                        state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI, [protocol.getEndpointId(), unpackedPayload.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_IDLE_STATE);
                        logger.debug("| SERVER change TCI state to IDLE STATE");
                        unpackedPayload.clientType = g.CLIENT_TYPE.WEB;
                        payload = protocol.packMsg(g.SDP_MSG_TYPE.SDP_SGU_REQ, unpackedPayload);
                        logger.debug(`| SERVER send request: ${JSON.stringify(protocol.getPackedMsg())}`);
                        //update state
                        state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI, [protocol.getEndpointId(), unpackedPayload.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_USER_ID_DUPLICATE_REQUESTED_STATE);
                        
                        let userInfo = unpackedPayload;
                        logger.debug("| SERVER change TCI state to USER ID DUPLICATE REQUESTED STATE");
                        request.send('http://localhost:8080/databaseapi', payload, (message) => {
                            protocol.setMsg(message);
                            if (!protocol.verifyHeader()) return;
                            unpackedPayload = protocol.unpackPayload();
                            if (!unpackedPayload) return;
                            switch (unpackedPayload.resultCode) {
                                case g.SDP_MSG_RESCODE.RESCODE_SDP_SGU.RESCODE_SDP_SGU_OK:
                                    return state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI, protocol.getEndpointId(), (resState) => {
                                        if (g.SERVER_RECV_STATE_BY_MSG.SDP_SGU_RSP.includes(resState)) {

                                            const ac = codeGen.getAuthenticationCode(),
                                                vc = codeGen.getVerificationCode(),
                                                contect = `<H1> Verification code: ${vc}<H1></BR><H1> Authentication code: ${ac}<H1>`;

                                            mailer.sendEmail(userInfo.userId, 'Verification from Airound', contect);

                                            const keyHead = `u:temp:${protocol.getEndpointId()}:`,
                                                expTime = g.SERVER_TIMER.T862;

                                            redisCli.multi([
                                                ["set", `${keyHead}id`, userInfo.userId, 'EX', expTime],
                                                ["set", `${keyHead}pw`, userInfo.userPw, 'EX', expTime],
                                                ["set", `${keyHead}fn`, userInfo.userFn, 'EX', expTime],
                                                ["set", `${keyHead}bdt`, userInfo.bdt, 'EX', expTime],
                                                ["set", `${keyHead}gen`, userInfo.gender, 'EX', expTime],
                                                ["set", `${keyHead}ac`, ac, 'EX', expTime],
                                                ["set", `${keyHead}vc`, vc, 'EX', expTime],
                                            ]).exec((err, replies) => {
                                                if (err) {} else {
                                                    logger.debug(`| SERVER stored temporary user info: in ${expTime} sec > ${JSON.stringify(userInfo)}`);
                                                }
                                            });

                                            payload = {};
                                            payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SGU.RESCODE_SWP_SGU_OK;
                                            payload.vc = vc;
                                            protocol.packMsg(g.SWP_MSG_TYPE.SWP_SGU_RSP, payload);

                                            state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI, [protocol.getEndpointId(), userInfo.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_USER_ID_AVAILABLITY_CONFIRMED_STATE, g.SERVER_TIMER.T862);
                                            logger.debug("| SERVER change TCI state to USER ID AVAILABLITY CONFIRMED_STATE");

                                            logger.debug(`| Server Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                            res.send(protocol.getPackedMsg());
                                        }
                                    });

                                case g.SDP_MSG_RESCODE.RESCODE_SDP_SGU.RESCODE_SDP_SGU_OTHER:

                                    payload = {};
                                    payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SGU.RESCODE_SWP_SGU_OTHER;
                                    protocol.packMsg(g.SWP_MSG_TYPE.SWP_SGU_RSP, payload);

                                    state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI, [protocol.getEndpointId(), userInfo.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_IDLE_STATE);
                                    logger.debug('| SERVER change TCI state to IDLE STATE');

                                    logger.debug(`| SERVER Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                    return res.send(protocol.getPackedMsg());

                                case g.SDP_MSG_RESCODE.RESCODE_SDP_SGU.RESCODE_SDP_SGU_DUPLICATE_OF_USER_ID:

                                    payload = {};
                                    payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SGU.RESCODE_SWP_SGU_DUPLICATE_OF_USER_ID;
                                    protocol.packMsg(g.SWP_MSG_TYPE.SWP_SGU_RSP, payload);

                                    state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI, [protocol.getEndpointId(), userInfo.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_IDLE_STATE);
                                    logger.debug('| SERVER change TCI state to IDLE STATE');

                                    logger.debug(`| SERVER Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                    return res.send(protocol.getPackedMsg());
                            }
                        });
                    } else {

                        payload = {};
                        payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SGU.RESCODE_SWP_SGU_CONFLICT_OF_TEMPORARY_CLIENT_ID
                        protocol.packMsg(g.SWP_MSG_TYPE.SWP_SGU_RSP, payload)

                        logger.debug(`| SERVER Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                        return res.send(protocol.getPackedMsg());
                    }
                } else {
                    //If first request
                    resState = g.SERVER_TCI_STATE_ID.SERVER_TCI_IDLE_STATE;

                    if (g.SERVER_RECV_STATE_BY_MSG.SWP_SGU_REQ.includes(resState)) {
                        //set state
                        state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI, [protocol.getEndpointId(), unpackedPayload.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_IDLE_STATE);
                        logger.debug("| SERVER change TCI state to IDLE STATE");

                        unpackedPayload.clientType = g.CLIENT_TYPE.WEB;
                        payload = protocol.packMsg(g.SDP_MSG_TYPE.SDP_SGU_REQ, unpackedPayload);
                        logger.debug("| SERVER send request: " + JSON.stringify(protocol.getPackedMsg()));

                        //update state
                        state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI, [protocol.getEndpointId(), unpackedPayload.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_USER_ID_DUPLICATE_REQUESTED_STATE);
                        
                        let userInfo = unpackedPayload;
                        logger.debug("| SERVER change TCI state to USER ID DUPLICATE REQUESTED STATE");
                        request.send('http://localhost:8080/databaseapi', payload, (message) => {
                            protocol.setMsg(message);
                            if (!protocol.verifyHeader()) return;
                            unpackedPayload = protocol.unpackPayload();
                            if (!unpackedPayload) return;
                            switch (unpackedPayload.resultCode) {
                                case g.SDP_MSG_RESCODE.RESCODE_SDP_SGU.RESCODE_SDP_SGU_OK:
                                    return state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI, protocol.getEndpointId(), (resState) => {
                                        if (g.SERVER_RECV_STATE_BY_MSG.SDP_SGU_RSP.includes(resState)) {

                                            const ac = codeGen.getAuthenticationCode(),
                                                vc = codeGen.getVerificationCode(),
                                                contect = `<H1> Verification code: ${vc}<H1></BR><H1> Authentication code: ${ac}<H1>`;

                                            mailer.sendEmail(userInfo.userId, 'Verification from Airound', contect);

                                            const keyHead = `u:temp:${protocol.getEndpointId()}:`,
                                                expTime = g.SERVER_TIMER.T862;

                                            redisCli.multi([
                                                ["set", keyHead + "id", userInfo.userId, 'EX', expTime],
                                                ["set", keyHead + "pw", userInfo.userPw, 'EX', expTime],
                                                ["set", keyHead + "fn", userInfo.userFn, 'EX', expTime],
                                                ["set", keyHead + "ln", userInfo.userLn, 'EX', expTime],
                                                ["set", keyHead + "bdt", userInfo.bdt, 'EX', expTime],
                                                ["set", keyHead + "gen", userInfo.gender, 'EX', expTime],
                                                ["set", keyHead + "ac", ac, 'EX', expTime],
                                                ["set", keyHead + "vc", vc, 'EX', expTime],
                                            ]).exec((err, replies) => {
                                                if (err) {} else {
                                                    logger.debug(`| SERVER stored temporary user info: in ${expTime} sec > ${JSON.stringify(userInfo)}`);
                                                }
                                            });

                                            payload = {};
                                            payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SGU.RESCODE_SWP_SGU_OK;
                                            payload.vc = vc;
                                            protocol.packMsg(g.SWP_MSG_TYPE.SWP_SGU_RSP, payload);

                                            state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI, [protocol.getEndpointId(), userInfo.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_USER_ID_AVAILABLITY_CONFIRMED_STATE, g.SERVER_TIMER.T862);
                                            logger.debug("| SERVER change TCI state to USER ID AVAILABLITY CONFIRMED STATE");

                                            logger.debug(`| Server Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                            return res.send(protocol.getPackedMsg());
                                        }
                                    });

                                case g.SDP_MSG_RESCODE.RESCODE_SDP_SGU.RESCODE_SDP_SGU_OTHER:

                                    payload = {};
                                    payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SGU.RESCODE_SWP_SGU_OTHER;
                                    protocol.packMsg(g.SWP_MSG_TYPE.SWP_SGU_RSP, payload);

                                    state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI, [protocol.getEndpointId(), userInfo.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_IDLE_STATE);
                                    logger.debug("| SERVER change TCI state to IDLE STATE");

                                    logger.debug(`| SERVER Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                    return res.send(protocol.getPackedMsg());

                                case g.SDP_MSG_RESCODE.RESCODE_SDP_SGU.RESCODE_SDP_SGU_DUPLICATE_OF_USER_ID:

                                    payload = {};
                                    payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SGU.RESCODE_SWP_SGU_DUPLICATE_OF_USER_ID;
                                    protocol.packMsg(g.SWP_MSG_TYPE.SWP_SGU_RSP, payload);

                                    state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI, [protocol.getEndpointId(), userInfo.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_IDLE_STATE);
                                    logger.debug("| SERVER change TCI state to IDLE STATE");

                                    logger.debug("| Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                    return res.send(protocol.getPackedMsg());
                            }
                        });
                    }
                }
            });
            break;

        /*
         * Receive SAP: UVC-REQ
         * Last update: 10.23.2018
         * Author: Junhee Park
         */
        case g.SAP_MSG_TYPE.SAP_UVC_REQ:
            return state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_APP_TCI, protocol.getEndpointId(), (resState, searchedKey) => {
                //state exist
                let payload = {};
                if (resState) {
                    //Receivable state
                    if (g.SERVER_RECV_STATE_BY_MSG.SAP_UVC_REQ.includes(resState)) {
                        let keyHead = `u:temp:${protocol.getEndpointId()}:`;
                        redisCli.get(`${keyHead}vc`, (err, vc) => {
                            if (err) {} else {
                                if (vc === null) {
                                    payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_UVC.RESCODE_SAP_UVC_OTHER;
                                    protocol.packMsg(g.SAP_MSG_TYPE.SAP_UVC_RSP, payload);
                                    logger.debug(`| SERVER Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                    res.send(protocol.getPackedMsg());
                                } else {
                                    //correct vc
                                    if (unpackedPayload.vc === vc) {
                                        redisCli.get(`${keyHead}ac`, (err, ac) => {
                                            if (err) {} else {
                                                //correct ac
                                                if (unpackedPayload.ac === ac) {
                                                    //database에 저장
                                                    redisCli.keys(`${keyHead}*`, (err, keys) => {
                                                        if (err) {} else {
                                                            redisCli.mget(keys, (err, values) => {
                                                                for (let index = 0; index < keys.length; index++) {
                                                                    const key = keys[index].substr(keyHead.length);
                                                                    switch (key) {
                                                                        case 'id':
                                                                            payload.userId = values[index];
                                                                            break;
                                                                        case 'pw':
                                                                            payload.userPw = values[index];
                                                                            break;
                                                                        case 'fn':
                                                                            payload.userFn = values[index];
                                                                            break;
                                                                        case 'ln':
                                                                            payload.userLn = values[index];
                                                                            break;
                                                                        case 'bdt':
                                                                            payload.bdt = values[index];
                                                                            break;
                                                                        case 'gen':
                                                                            payload.gender = values[index];
                                                                            break;
                                                                    }
                                                                }
                                                                payload.clientType = g.CLIENT_TYPE.APP;
                                                                payload = protocol.packMsg(g.SDP_MSG_TYPE.SDP_UVC_REQ, payload);
                                                                request.send('http://localhost:8080/databaseapi', payload, (message) => {
                                                                    protocol.setMsg(message);
                                                                    if (!protocol.verifyHeader()) return;
                                                                    let unpackedPayload = protocol.unpackPayload();
                                                                    if (!unpackedPayload) return;
                                                                    payload = {};
                                                                    switch (unpackedPayload.resultCode) {
                                                                        case g.SDP_MSG_RESCODE.RESCODE_SDP_UVC.RESCODE_SDP_UVC_OK:
                                                                            let keyHead = "u:temp:" + protocol.getEndpointId() + ":";
                                                                            redisCli.get(`${keyHead}id`, (err, id) => {
                                                                                state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_APP_TCI, [protocol.getEndpointId(), id], g.SERVER_TCI_STATE_ID.SERVER_TCI_USN_ALLOCATED_STATE, g.SERVER_TIMER.T832);
                                                                                logger.debug("| SERVER change TCI state to USN ALLOCATED STATE");
                                                                                payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_UVC.RESCODE_SAP_UVC_OK;
                                                                                //remove temp Data
                                                                                redisCli.multi([
                                                                                    ["del", `${keyHead}id`],
                                                                                    ["del", `${keyHead}pw`],
                                                                                    ["del", `${keyHead}fn`],
                                                                                    ["del", `${keyHead}ln`],
                                                                                    ["del", `${keyHead}bdt`],
                                                                                    ["del", `${keyHead}gen`],
                                                                                    ["del", `${keyHead}ac`],
                                                                                    ["del", `${keyHead}vc`],
                                                                                ]).exec((err, replies) => {
                                                                                    if (err) {} else {
                                                                                        payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_UVC.RESCODE_SAP_UVC_OK;
                                                                                        protocol.packMsg(g.SAP_MSG_TYPE.SAP_UVC_RSP, payload);
                                                                                        logger.debug(`| SERVER Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                                                                        res.send(protocol.getPackedMsg());
                                                                                    }
                                                                                });
                                                                            });
                                                                            break;
                                                                        case g.SDP_MSG_RESCODE.RESCODE_SDP_UVC.RESCODE_SDP_UVC_OTHER:
                                                                            payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_UVC.RESCODE_SAP_UVC_OTHER;
                                                                            protocol.packMsg(g.SAP_MSG_TYPE.SAP_UVC_RSP, payload);
                                                                            logger.debug(`| SERVER Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                                                            res.send(protocol.getPackedMsg());
                                                                            break;
                                                                        case g.SDP_MSG_RESCODE.RESCODE_SDP_UVC.RESCODE_SDP_UVC_DUPLICATE_OF_USER_ID:
                                                                            payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_UVC.RESCODE_SAP_UVC_DUPLICATE_OF_USER_ID;
                                                                            protocol.packMsg(g.SAP_MSG_TYPE.SAP_UVC_RSP, payload);
                                                                            logger.debug(`| SERVER Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                                                            res.send(protocol.getPackedMsg());
                                                                            break;
                                                                    }
                                                                });
                                                            });
                                                        }
                                                    });
                                                    //incorrect ac
                                                } else {
                                                    payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_UVC.RESCODE_SAP_UVC_INCORRECT_AC_UNDER_THE_VC;
                                                    protocol.packMsg(g.SAP_MSG_TYPE.SAP_UVC_RSP, payload)
                                                    logger.debug("| Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                                    res.send(protocol.getPackedMsg());
                                                }
                                            }
                                        });
                                        //incorrect vc
                                    } else {
                                        //인증코드 불일치 - error코드 4번 전송
                                        payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_UVC.RESCODE_SAP_UVC_INCORRECT_AC_UNDER_THE_VC;
                                        protocol.packMsg(g.SAP_MSG_TYPE.SAP_UVC_RSP, payload)
                                        logger.debug(`| SERVER Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                        res.send(protocol.getPackedMsg());
                                    }
                                }
                            }
                        });
                    };
                    //state not exist
                } else {
                    // not exist
                    payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_UVC.RESCODE_SAP_UVC_NOT_EXIST_TEMPORARY_CLIENT_ID;
                    protocol.packMsg(g.SAP_MSG_TYPE.SAP_UVC_RSP, payload)
                    logger.debug("| Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                    res.send(protocol.getPackedMsg());
                };
            });

        /*
         * Receive SWP: UVC-REQ
         * Last update: 10.23.2018
         * Author: Junhee Park
         */    
        case g.SWP_MSG_TYPE.SWP_UVC_REQ:
            return state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI, protocol.getEndpointId(), (resState, searchedKey) => {
                //state exist
                let payload = {};
                if (resState) {
                    //Receivable state
                    if (g.SERVER_RECV_STATE_BY_MSG.SWP_UVC_REQ.includes(resState)) {
                        let keyHead = `u:temp:${protocol.getEndpointId()}:`;
                        redisCli.get(`${keyHead}vc`, (err, vc) => {
                            if (err) {} else {
                                if (vc === null) {
                                    payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_UVC.RESCODE_SWP_UVC_OTHER;
                                    protocol.packMsg(g.SWP_MSG_TYPE.SWP_UVC_RSP, payload);
                                    logger.debug(`| SERVER Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                    res.send(protocol.getPackedMsg());
                                } else {
                                    //correct vc
                                    if (unpackedPayload.vc === vc) {
                                        redisCli.get(`${keyHead}ac`, (err, ac)=> {
                                            if (err) {} else {
                                                //correct ac
                                                if (unpackedPayload.ac === ac) {
                                                    //database에 저장
                                                    redisCli.keys(`${keyHead}*`, (err, keys) => {
                                                        if(err) {} else {
                                                            redisCli.mget(keys, (err, values) => {
                                                                for (let index = 0; index < keys.length; index++) {
                                                                    const key = keys[index].substr(keyHead.length);
                                                                    switch (key) {
                                                                        case 'id':
                                                                            payload.userId = values[index];
                                                                            break;
                                                                        case 'pw':
                                                                            payload.userPw = values[index];
                                                                            break;
                                                                        case 'fn':
                                                                            payload.userFn = values[index];
                                                                            break;
                                                                        case 'ln':
                                                                            payload.userLn = values[index];
                                                                            break;
                                                                        case 'bdt':
                                                                            payload.bdt = values[index];
                                                                            break;
                                                                        case 'gen':
                                                                            payload.gender = values[index];
                                                                            break;
                                                                    }
                                                                }
                                                                payload.clientType = g.CLIENT_TYPE.WEB;
                                                                payload = protocol.packMsg(g.SDP_MSG_TYPE.SDP_UVC_REQ, payload);
                                                                request.send('http://localhost:8080/databaseapi', payload, (message) => {
                                                                    protocol.setMsg(message);
                                                                    if (!protocol.verifyHeader()) return;
                                                                    let unpackedPayload = protocol.unpackPayload();
                                                                    if (!unpackedPayload) return;
                                                                    payload = {};
                                                                    switch (unpackedPayload.resultCode) {
                                                                        case g.SDP_MSG_RESCODE.RESCODE_SDP_UVC.RESCODE_SDP_UVC_OK:
                                                                            let keyHead = "u:temp:" + protocol.getEndpointId() + ":";
                                                                            redisCli.get(`${keyHead}id`, (err, id) => {
                                                                                state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI, [protocol.getEndpointId(), id], g.SERVER_TCI_STATE_ID.SERVER_TCI_USN_ALLOCATED_STATE, g.SERVER_TIMER.T832);
                                                                                logger.debug("| SERVER change TCI state to USN ALLOCATED STATE");
                                                                                payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_UVC.RESCODE_SWP_UVC_OK;
                                                                                //remove temp Data
                                                                                redisCli.multi([
                                                                                    ["del", `${keyHead}id`],
                                                                                    ["del", `${keyHead}pw`],
                                                                                    ["del", `${keyHead}fn`],
                                                                                    ["del", `${keyHead}ln`],
                                                                                    ["del", `${keyHead}bdt`],
                                                                                    ["del", `${keyHead}gen`],
                                                                                    ["del", `${keyHead}ac`],
                                                                                    ["del", `${keyHead}vc`],
                                                                                ]).exec((err, replies) => {
                                                                                    if (err) {} else {
                                                                                        payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_UVC.RESCODE_SWP_UVC_OK;
                                                                                        protocol.packMsg(g.SWP_MSG_TYPE.SWP_UVC_RSP, payload);
                                                                                        logger.debug(`| SERVER Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                                                                        res.send(protocol.getPackedMsg());
                                                                                    }
                                                                                });
                                                                            });
                                                                            break;
                                                                        case g.SDP_MSG_RESCODE.RESCODE_SDP_UVC.RESCODE_SDP_UVC_OTHER:
                                                                            payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_UVC.RESCODE_SWP_UVC_OTHER;
                                                                            protocol.packMsg(g.SWP_MSG_TYPE.SWP_UVC_RSP, payload);
                                                                            logger.debug(`| SERVER Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                                                            res.send(protocol.getPackedMsg());
                                                                            break;
                                                                        case g.SDP_MSG_RESCODE.RESCODE_SDP_UVC.RESCODE_SDP_UVC_DUPLICATE_OF_USER_ID:
                                                                            payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_UVC.RESCODE_SWP_UVC_DUPLICATE_OF_USER_ID;
                                                                            protocol.packMsg(g.SWP_MSG_TYPE.SWP_UVC_RSP, payload);
                                                                            logger.debug(`| SERVER Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                                                            res.send(protocol.getPackedMsg());
                                                                            break;
                                                                    }
                                                                });
                                                            });
                                                        }
                                                    });
                                                //incorrect ac
                                                } else {
                                                    payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_UVC.RESCODE_SWP_UVC_INCORRECT_AC_UNDER_THE_VC;
                                                    protocol.packMsg(g.SWP_MSG_TYPE.SWP_UVC_RSP, payload)
                                                    logger.debug("| Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                                    res.send(protocol.getPackedMsg());
                                                }
                                            }
                                        });
                                    //incorrect vc
                                    } else {
                                        //인증코드 불일치 - error코드 4번 전송
                                        payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_UVC.RESCODE_SWP_UVC_INCORRECT_AC_UNDER_THE_VC;
                                        protocol.packMsg(g.SWP_MSG_TYPE.SWP_UVC_RSP, payload)
                                        logger.debug(`| SERVER Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                        res.send(protocol.getPackedMsg());
                                    }
                                }
                            }
                        });
                    };
                //state not exist
                } else {
                    // not exist
                    payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_UVC.RESCODE_SWP_UVC_NOT_EXIST_TEMPORARY_CLIENT_ID;
                    protocol.packMsg(g.SWP_MSG_TYPE.SWP_UVC_RSP, payload)
                    logger.debug("| Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                    res.send(protocol.getPackedMsg());
                };
            });

        /*
         * Receive SAP: SGI-REQ
         * Last update: 10.24.2018
         * Author: Junhee Park
         */
        case g.SAP_MSG_TYPE.SAP_SGI_REQ:
            return state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_APP_TCI, protocol.getEndpointId(), (resState, searchedKey) => {
                let payload = {};
                //idle state이거나, 재전송인 경우 데이터베이스로 연결하는 로직
                if (resState === false || (resState === g.SERVER_TCI_STATE_ID.SERVER_TCI_HALF_USN_INFORMED_STATE && searchedKey.includes(unpackedPayload.userId))) {
                    let userId = unpackedPayload.userId;
                    //state변경
                    state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_APP_TCI, [protocol.getEndpointId(), userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_HALF_USN_INFORMED_STATE);
                    logger.debug("| SERVER change TCI state (IDLE) -> (HALF USN INFORMED STATE)");
                    //Database verify request
                    payload.userId = unpackedPayload.userId;
                    payload.userPw = unpackedPayload.userPw;
                    payload.clientType = g.CLIENT_TYPE.APP;
                    payload = protocol.packMsg(g.SDP_MSG_TYPE.SDP_SGI_REQ, payload);

                    request.send('http://localhost:8080/databaseapi', payload, (message) => {
                        //unpack
                        payload = {};
                        protocol.setMsg(message);
                        if (!protocol.verifyHeader()) return;
                        unpackedPayload = protocol.unpackPayload();
                        if (!unpackedPayload) return;
                        switch (unpackedPayload.resultCode) {
                            case g.SDP_MSG_RESCODE.RESCODE_SDP_SGI.RESCODE_SDP_SGI_OK:
                                //make buffer data
                                uModule.getNewNumOfSignedInCompls(g.ENTITY_TYPE.APPCLIENT, unpackedPayload.usn, (nsc) => {
                                    let keyHead = `c:act:s:${g.ENTITY_TYPE.APPCLIENT}:${unpackedPayload.usn}:`,
                                      expTime = g.SERVER_TIMER.T863,
                                      command = [["set", `${keyHead}signf`, "0", "EX", expTime], ["set", `${keyHead}nsc`, nsc, "EX", expTime], ["set", `${keyHead}ml`, unpackedPayload.ml, "EX", expTime]];
                                    redisCli.multi(command).exec((err, replies) => {
                                        if (err) {
                                            loger.debug(err);
                                        } else {
                                            logger.debug(`| SERVER stored active user ${JSON.stringify(command)}`);
                                            state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_APP_USN, unpackedPayload.usn, g.SERVER_USN_STATE_ID.SERVER_USN_USN_INFORMED_STATE, g.SERVER_TIMER.T863);
                                            state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_APP_TCI, [protocol.getEndpointId(), userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_IDLE_STATE);
                                            logger.debug("| SERVER change USN state (IDLE) -> (USN INFORMED)");
                                            payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_SGI.RESCODE_SAP_SGI_OK;
                                            payload.usn = unpackedPayload.usn;
                                            payload.nsc = nsc;
                                            protocol.packMsg(g.SAP_MSG_TYPE.SAP_SGI_RSP, payload)
                                            res.send(protocol.getPackedMsg());
                                        }
                                    });
                                })
                                break;
                            //reject cases
                            case g.SDP_MSG_RESCODE.RESCODE_SDP_SGI.RESCODE_SDP_SGI_OTHER:
                                state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_APP_TCI, [protocol.getEndpointId(), userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_IDLE_STATE);
                                logger.debug("| SERVER change TCI state (HALF USN INFORMED STATE) ->  (IDLE)");

                                payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_SGI.RESCODE_SAP_SGI_OTHER;
                                protocol.packMsg(g.SAP_MSG_TYPE.SAP_SGI_RSP, payload)
                                logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                res.send(protocol.getPackedMsg());
                                break;
                            case g.SDP_MSG_RESCODE.RESCODE_SDP_SGI.RESCODE_SDP_SGI_NOT_EXIST_USER_ID:
                                state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_APP_TCI, [protocol.getEndpointId(), userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_IDLE_STATE);
                                logger.debug("| SERVER change TCI state (HALF USN INFORMED STATE) ->  (IDLE)");

                                payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_SGI.RESCODE_SAP_SGI_NOT_EXIST_USER_ID;
                                protocol.packMsg(g.SAP_MSG_TYPE.SAP_SGI_RSP, payload)
                                logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                res.send(protocol.getPackedMsg());
                                break;
                            case g.SDP_MSG_RESCODE.RESCODE_SDP_SGI.RESCODE_SDP_SGI_INCORRECT_CURRENT_USER_PASSWORD:
                                state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_APP_TCI, [protocol.getEndpointId(), userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_IDLE_STATE);
                                logger.debug("| SERVER change TCI state (HALF USN INFORMED STATE) ->  (IDLE)");

                                payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_SGI.RESCODE_SAP_SGI_INCORRECT_CURRENT_USER_PASSWORD;
                                protocol.packMsg(g.SAP_MSG_TYPE.SAP_SGI_RSP, payload)
                                logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                res.send(protocol.getPackedMsg());
                                break;
                        }
                    });
                    //TCI 충돌 (테스트 필요)
                } else {
                    payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_SGI.RESCODE_SAP_SGI_CONFLICT_OF_TEMPORARY_CLIENT_ID;
                    protocol.packMsg(g.SAP_MSG_TYPE.SAP_SGI_RSP, payload);
                    logger.debug("Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                    res.send(protocol.getPackedMsg());
                }
            });

        /*
         * Receive SWP: SGI-REQ
         * Last update: 10.23.2018
         * Author: Junhee Park
         */
        case g.SWP_MSG_TYPE.SWP_SGI_REQ:
            return state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI, protocol.getEndpointId(), (resState, searchedKey) => {
                let payload = {};
                //idle state이거나, 재전송인 경우 데이터베이스로 연결하는 로직
                if (resState === false || (resState === g.SERVER_TCI_STATE_ID.SERVER_TCI_HALF_USN_INFORMED_STATE && searchedKey.includes(unpackedPayload.userId))) {
                    let userId = unpackedPayload.userId;
                    //state변경
                    state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI, [protocol.getEndpointId(), userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_HALF_USN_INFORMED_STATE);
                    logger.debug("| SERVER change TCI state (IDLE) -> (HALF USN INFORMED STATE)");
                    //Database verify request
                    payload.userId = unpackedPayload.userId;
                    payload.userPw = unpackedPayload.userPw;
                    payload.clientType = g.CLIENT_TYPE.WEB;
                    payload = protocol.packMsg(g.SDP_MSG_TYPE.SDP_SGI_REQ, payload);

                    request.send('http://localhost:8080/databaseapi', payload, (message) => {
                        //unpack
                        payload = {};
                        protocol.setMsg(message);
                        if (!protocol.verifyHeader()) return;
                        unpackedPayload = protocol.unpackPayload();
                        if (!unpackedPayload) return;
                        switch (unpackedPayload.resultCode) {
                            case g.SDP_MSG_RESCODE.RESCODE_SDP_SGI.RESCODE_SDP_SGI_OK:
                                //make buffer data
                                uModule.getNewNumOfSignedInCompls(g.ENTITY_TYPE.WEBCLIENT, unpackedPayload.usn, (nsc) => {
                                    let keyHead = `c:act:s:${g.ENTITY_TYPE.WEBCLIENT}:${unpackedPayload.usn}:`,
                                        expTime = g.SERVER_TIMER.T863,
                                        command = [
                                            ["set", `${keyHead}signf`, '1', 'EX', expTime],
                                            ["set", `${keyHead}nsc`, nsc, 'EX', expTime],
                                            ["set", `${keyHead}ml`, unpackedPayload.ml, 'EX', expTime]
                                        ];
                                    redisCli.multi(command).exec((err, replies) => {
                                        if (err) {
                                            loger.debug(err);
                                        } else {
                                            logger.debug(`| SERVER stored active user ${JSON.stringify(command)}`);
                                            state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_USN, unpackedPayload.usn, g.SERVER_USN_STATE_ID.SERVER_USN_USN_INFORMED_STATE, g.SERVER_TIMER.T863);
                                            state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI, [protocol.getEndpointId(), userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_IDLE_STATE);
                                            logger.debug("| SERVER change USN state (IDLE) -> (USN INFORMED)");
                                            payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SGI.RESCODE_SWP_SGI_OK;
                                            payload.usn = unpackedPayload.usn;
                                            payload.nsc = nsc;
                                            protocol.packMsg(g.SWP_MSG_TYPE.SWP_SGI_RSP, payload)
                                            res.send(protocol.getPackedMsg());
                                        }
                                    });
                                })
                                break;
                                //reject cases
                            case g.SDP_MSG_RESCODE.RESCODE_SDP_SGI.RESCODE_SDP_SGI_OTHER:
                                state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI, [protocol.getEndpointId(), userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_IDLE_STATE);
                                logger.debug("| SERVER change TCI state (HALF USN INFORMED STATE) ->  (IDLE)");

                                payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SGI.RESCODE_SWP_SGI_OTHER;
                                protocol.packMsg(g.SWP_MSG_TYPE.SWP_SGI_RSP, payload)
                                logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                res.send(protocol.getPackedMsg());
                                break;
                            case g.SDP_MSG_RESCODE.RESCODE_SDP_SGI.RESCODE_SDP_SGI_NOT_EXIST_USER_ID:
                                state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI, [protocol.getEndpointId(), userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_IDLE_STATE);
                                logger.debug("| SERVER change TCI state (HALF USN INFORMED STATE) ->  (IDLE)");

                                payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SGI.RESCODE_SWP_SGI_NOT_EXIST_USER_ID;
                                protocol.packMsg(g.SWP_MSG_TYPE.SWP_SGI_RSP, payload)
                                logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                res.send(protocol.getPackedMsg());
                                break;
                            case g.SDP_MSG_RESCODE.RESCODE_SDP_SGI.RESCODE_SDP_SGI_INCORRECT_CURRENT_USER_PASSWORD:
                                state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI, [protocol.getEndpointId(), userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_IDLE_STATE);
                                logger.debug("| SERVER change TCI state (HALF USN INFORMED STATE) ->  (IDLE)");

                                payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SGI.RESCODE_SWP_SGI_INCORRECT_CURRENT_USER_PASSWORD;
                                protocol.packMsg(g.SWP_MSG_TYPE.SWP_SGI_RSP, payload)
                                logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                res.send(protocol.getPackedMsg());
                                break;
                        }
                    });
                    //TCI 충돌 (테스트 필요)
                } else {
                    payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SGI.RESCODE_SWP_SGI_CONFLICT_OF_TEMPORARY_CLIENT_ID;
                    protocol.packMsg(g.SWP_MSG_TYPE.SWP_SGI_RSP, payload);
                    logger.debug("Server Send response: " + JSON.stringify(protocol.getPackedMsg()));
                    res.send(protocol.getPackedMsg());
                }
            });
        /*
         * Receive SAP: SGO-NOT
         * Last update: 10.24.2018
         * Author: Junhee Park
         */
        case g.SAP_MSG_TYPE.SAP_SGO_NOT:
            return state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_APP_USN, protocol.getEndpointId(), (resState, searchedKey) => {
                let payload = {},
                    clientType = g.CLIENT_TYPE.APP;
                if (resState) {
                    //user sequence -> user state update
                    uModule.checkUserSignedInState(g.ENTITY_TYPE.SERVER, clientType, protocol.getEndpointId(), unpackedPayload.nsc, (result) => {
                        if (result === 1) {
                            payload.usn = protocol.getEndpointId();
                            payload.clientType = g.CLIENT_TYPE.APP;
                            payload = protocol.packMsg(g.SDP_MSG_TYPE.SDP_SGO_NOT, payload);
                            state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_APP_USN, protocol.getEndpointId(), g.SERVER_USN_STATE_ID.SERVER_USN_HALF_IDLE_STATE);
                            logger.debug("| SERVER change USN state (USN INFORMED STATE) ->  (HALF IDLE IDLE)");
                            request.send('http://localhost:8080/databaseapi', payload, (message) => {
                                protocol.setMsg(message);
                                if (!protocol.verifyHeader()) return;
                                let unpackedPayload = protocol.unpackPayload();
                                if (!unpackedPayload) return;
                                payload = {};
                                switch (unpackedPayload.resultCode) {
                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_SGO.RESCODE_SDP_SGO_OK:
                                        //유저버퍼 지우기
                                        uModule.removeActiveUserInfo(g.ENTITY_TYPE.APPCLIENT, protocol.getEndpointId(), (result) => {
                                            if (result) {
                                                payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_SGO.RESCODE_SAP_SGO_OK;
                                                protocol.packMsg(g.SAP_MSG_TYPE.SAP_SGO_ACK, payload);

                                                state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_APP_USN, protocol.getEndpointId(), g.SERVER_USN_STATE_ID.SERVER_USN_IDLE_STATE);
                                                logger.debug("| SERVER change USN state (HALF IDLE STATE) ->  (IDLE)");

                                                logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                                res.send(protocol.getPackedMsg());
                                            }
                                        });
                                        break;

                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_SGO.RESCODE_SDP_SGO_OTHER:
                                        payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_SGO.RESCODE_SAP_SGO_OTHER;
                                        protocol.packMsg(g.SAP_MSG_TYPE.SAP_SGO_ACK, payload)

                                        logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                        res.send(protocol.getPackedMsg());
                                        break;

                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_SGO.RESCODE_SDP_SGO_UNALLOCATED_USER_SEQUENCE_NUMBER:
                                        payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_SGO.RESCODE_SAP_SGO_UNALLOCATED_USER_SEQUENCE_NUMBER;
                                        protocol.packMsg(g.SAP_MSG_TYPE.SAP_SGO_ACK, payload)

                                        logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                        res.send(protocol.getPackedMsg());
                                    default:
                                        break;
                                }
                            })
                        } else if (result === 3) {
                            //시퀀스
                            payload = {};
                            payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_SGO.RESCODE_SAP_SGO_INCORRECT_NUMBER_OF_SIGNED_IN_COMPLETIONS;
                            protocol.packMsg(g.SAP_MSG_TYPE.SAP_SGO_ACK, payload);

                            logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                            res.send(protocol.getPackedMsg());
                        }
                    });
                } else {

                    payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_SGO.RESCODE_SAP_SGO_UNALLOCATED_USER_SEQUENCE_NUMBER;
                    protocol.packMsg(g.SAP_MSG_TYPE.SAP_SGO_ACK, payload);

                    logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                    res.send(protocol.getPackedMsg());
                }
            });

        /*
         * Receive SWP: SGO-NOT
         * Last update: 10.24.2018
         * Author: Junhee Park
         */
        case g.SWP_MSG_TYPE.SWP_SGO_NOT:
            return state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_USN, protocol.getEndpointId(), (resState, searchedKey) => {
                let payload = {},
                    clientType = g.CLIENT_TYPE.WEB;
                if (resState) {
                    //user sequence -> user state update
                    uModule.checkUserSignedInState(g.ENTITY_TYPE.SERVER, clientType, protocol.getEndpointId(), unpackedPayload.nsc, (result) => {
                        if (result === 1) {
                            payload.usn = protocol.getEndpointId();
                            payload.clientType = g.CLIENT_TYPE.WEB;
                            payload = protocol.packMsg(g.SDP_MSG_TYPE.SDP_SGO_NOT, payload);
                            state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_USN, protocol.getEndpointId(), g.SERVER_USN_STATE_ID.SERVER_USN_HALF_IDLE_STATE);
                            logger.debug("| SERVER change USN state (USN INFORMED STATE) ->  (HALF IDLE IDLE)");
                            request.send('http://localhost:8080/databaseapi', payload, (message) => {
                                protocol.setMsg(message);
                                if (!protocol.verifyHeader()) return;
                                let unpackedPayload = protocol.unpackPayload();
                                if (!unpackedPayload) return;
                                payload = {};
                                switch (unpackedPayload.resultCode) {
                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_SGO.RESCODE_SDP_SGO_OK:
                                        //유저버퍼 지우기
                                        uModule.removeActiveUserInfo(g.ENTITY_TYPE.WEBCLIENT, protocol.getEndpointId(), (result) => {
                                            if (result) {
                                                payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SGO.RESCODE_SWP_SGO_OK;
                                                protocol.packMsg(g.SWP_MSG_TYPE.SWP_SGO_ACK, payload);

                                                state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_USN, protocol.getEndpointId(), g.SERVER_USN_STATE_ID.SERVER_USN_IDLE_STATE);
                                                logger.debug("| SERVER change USN state (HALF IDLE STATE) ->  (IDLE)");

                                                logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                                res.send(protocol.getPackedMsg());
                                            }
                                        });
                                        break;

                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_SGO.RESCODE_SDP_SGO_OTHER:
                                        payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SGO.RESCODE_SWP_SGO_OTHER;
                                        protocol.packMsg(g.SWP_MSG_TYPE.SWP_SGO_ACK, payload)

                                        logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                        res.send(protocol.getPackedMsg());
                                        break;

                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_SGO.RESCODE_SDP_SGO_UNALLOCATED_USER_SEQUENCE_NUMBER:
                                        payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SGO.RESCODE_SWP_SGO_UNALLOCATED_USER_SEQUENCE_NUMBER;
                                        protocol.packMsg(g.SWP_MSG_TYPE.SWP_SGO_ACK, payload)

                                        logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                        res.send(protocol.getPackedMsg());
                                    default:
                                        break;
                                }
                            })
                        } else if (result === 3) {
                            //시퀀스
                            payload = {};
                            payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SGO.RESCODE_SWP_SGO_INCORRECT_NUMBER_OF_SIGNED_IN_COMPLETIONS;
                            protocol.packMsg(g.SWP_MSG_TYPE.SWP_SGO_ACK, payload);

                            logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                            res.send(protocol.getPackedMsg());
                        }
                    });
                } else {

                    payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SGO.RESCODE_SWP_SGO_UNALLOCATED_USER_SEQUENCE_NUMBER;
                    protocol.packMsg(g.SWP_MSG_TYPE.SWP_SGO_ACK, payload);

                    logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                    res.send(protocol.getPackedMsg());
                }
            });
        /*
         * Receive SAP: UPC-REQ
         * Last update: 10.24.2018
         * Author: Junhee Park
         */
        case g.SAP_MSG_TYPE.SAP_UPC_REQ:
            return state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_APP_USN, protocol.getEndpointId(), (resState, searchedKey) => {
                let payload = {};
                if (resState) {
                    uModule.checkUserSignedInState(g.ENTITY_TYPE.APPCLIENT, g.CLIENT_TYPE.APP, protocol.getEndpointId(), unpackedPayload.nsc, (result) => {
                        if (result === 1) {
                            payload.curPw = unpackedPayload.curPw;
                            payload.newPw = unpackedPayload.newPw;
                            payload.clientType = g.CLIENT_TYPE.APP;
                            payload = protocol.packMsg(g.SDP_MSG_TYPE.SDP_UPC_REQ, payload)

                            request.send('http://localhost:8080/databaseapi', payload, (message) => {
                                payload = {};
                                protocol.setMsg(message);
                                if (!protocol.verifyHeader()) return;
                                let unpackedPayload = protocol.unpackPayload();
                                if (!unpackedPayload) return;
                                switch (unpackedPayload.resultCode) {
                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_UPC.RESCODE_SDP_UPC_OK:
                                        uModule.updateUserSignedInState(g.ENTITY_TYPE.APPCLIENT, protocol.getEndpointId(), (result) => {
                                            if (result) {
                                                uModule.getNewNumOfSignedInCompls(g.ENTITY_TYPE.APPCLIENT, protocol.getEndpointId(), (nsc) => {
                                                    let keyHead = `c:act:s:${g.ENTITY_TYPE.APPCLIENT}:${protocol.getEndpointId()}:`,
                                                        expTime = g.SERVER_TIMER.T863,
                                                        command = [
                                                            ["set", `${keyHead}signf`, '1', 'EX', expTime],
                                                            ["set", `${keyHead}nsc`, nsc, 'EX', expTime],
                                                            ["set", `${keyHead}ml`, unpackedPayload.ml, 'EX', expTime]
                                                        ];
                                                    redisCli.multi(command).exec((err, replies) => {
                                                        if (err) {
                                                            loger.debug(err);
                                                        } else {
                                                            logger.debug(`| SERVER stored active user${JSON.stringify(command)}`);
                                                            state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_APP_USN, protocol.getEndpointId(), g.SERVER_USN_STATE_ID.SERVER_USN_USN_INFORMED_STATE, g.SERVER_TIMER.T863);
                                                            logger.debug("| SERVER change USN state (USN INFORMED) ->  (USN INFORMED)");

                                                            payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_UPC.RESCODE_SAP_UPC_OK;
                                                            payload.nsc = nsc;
                                                            protocol.packMsg(g.SAP_MSG_TYPE.SAP_UPC_RSP, payload);

                                                            logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                                            res.send(protocol.getPackedMsg());
                                                        }
                                                    });
                                                });
                                            }
                                        });
                                        break;

                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_UPC.RESCODE_SDP_UPC_UNALLOCATED_USER_SEQUENCE_NUMBER:

                                        payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_UPC.RESCODE_SDP_UPC_UNALLOCATED_USER_SEQUENCE_NUMBER;
                                        protocol.packMsg(g.SAP_MSG_TYPE.SAP_UPC_RSP, payload);
                                        logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                        res.send(protocol.getPackedMsg());
                                        break;

                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_UPC.RESCODE_SDP_UPC_INCORRECT_CURRENT_USER_PASSWORD:

                                        state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_APP_USN, protocol.getEndpointId(), g.SERVER_USN_STATE_ID.SERVER_USN_USN_INFORMED_STATE, g.SERVER_TIMER.T863);
                                        logger.debug("| SERVER change USN state (USN INFORMED) ->  (USN INFORMED)");

                                        payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_UPC.RESCODE_SAP_UPC_INCORRECT_CURRENT_USER_PASSWORD;
                                        protocol.packMsg(g.SAP_MSG_TYPE.SAP_UPC_RSP, payload);
                                        logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                        res.send(protocol.getPackedMsg());
                                        break;
                                }
                            });
                        } else {
                            payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_UPC.RESCODE_SAP_UPC_INCORRECT_NUMBER_OF_SIGNED_IN_COMPLETIONS;
                            protocol.packMsg(g.SAP_MSG_TYPE.SAP_UPC_RSP, payload);

                            logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                            res.send(protocol.getPackedMsg());
                        }
                    });
                }
            });

        /*
         * Receive SWP: UPC-REQ
         * Last update: 10.24.2018
         * Author: Junhee Park
         */
        case g.SWP_MSG_TYPE.SWP_UPC_REQ:
            return state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_USN, protocol.getEndpointId(), (resState, searchedKey) => {
                let payload = {};
                if (resState) {
                    uModule.checkUserSignedInState(g.ENTITY_TYPE.WEBCLIENT, g.CLIENT_TYPE.WEB, protocol.getEndpointId(), unpackedPayload.nsc, (result) => {
                        if (result === 1) {
                            payload.curPw = unpackedPayload.curPw;
                            payload.newPw = unpackedPayload.newPw;
                            payload.clientType = g.CLIENT_TYPE.WEB;
                            payload = protocol.packMsg(g.SDP_MSG_TYPE.SDP_UPC_REQ, payload)

                            request.send('http://localhost:8080/databaseapi', payload, (message) => {
                                payload = {};
                                protocol.setMsg(message);
                                if (!protocol.verifyHeader()) return;
                                let unpackedPayload = protocol.unpackPayload();
                                if (!unpackedPayload) return;
                                switch (unpackedPayload.resultCode) {
                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_UPC.RESCODE_SDP_UPC_OK:
                                        uModule.updateUserSignedInState(g.ENTITY_TYPE.WEBCLIENT, protocol.getEndpointId(), (result) => {
                                            if (result) {
                                                uModule.getNewNumOfSignedInCompls(g.ENTITY_TYPE.WEBCLIENT, protocol.getEndpointId(), (nsc) => {
                                                    let keyHead = `c:act:s:${g.ENTITY_TYPE.WEBCLIENT}:${protocol.getEndpointId()}:`,
                                                        expTime = g.SERVER_TIMER.T863,
                                                        command = [
                                                            ["set", `${keyHead}signf`, '1', 'EX', expTime],
                                                            ["set", `${keyHead}nsc`, nsc, 'EX', expTime],
                                                            ["set", `${keyHead}ml`, unpackedPayload.ml, 'EX', expTime]
                                                        ];
                                                    redisCli.multi(command).exec((err, replies) => {
                                                        if (err) {
                                                            loger.debug(err);
                                                        } else {
                                                            logger.debug(`| SERVER stored active user${JSON.stringify(command)}`);
                                                            state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_USN, protocol.getEndpointId(), g.SERVER_USN_STATE_ID.SERVER_USN_USN_INFORMED_STATE, g.SERVER_TIMER.T863);
                                                            logger.debug("| SERVER change USN state (USN INFORMED) ->  (USN INFORMED)");

                                                            payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_UPC.RESCODE_SWP_UPC_OK;
                                                            payload.nsc = nsc;
                                                            protocol.packMsg(g.SWP_MSG_TYPE.SWP_UPC_RSP, payload);
                                                            
                                                            logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                                            res.send(protocol.getPackedMsg());
                                                        }
                                                    });
                                                });
                                            }
                                        });
                                        break;

                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_UPC.RESCODE_SDP_UPC_UNALLOCATED_USER_SEQUENCE_NUMBER:

                                        payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_UPC.RESCODE_SDP_UPC_UNALLOCATED_USER_SEQUENCE_NUMBER;
                                        protocol.packMsg(g.SWP_MSG_TYPE.SWP_UPC_RSP, payload);
                                        logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                        res.send(protocol.getPackedMsg());
                                        break;

                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_UPC.RESCODE_SDP_UPC_INCORRECT_CURRENT_USER_PASSWORD:

                                        state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_USN, protocol.getEndpointId(), g.SERVER_USN_STATE_ID.SERVER_USN_USN_INFORMED_STATE, g.SERVER_TIMER.T863);
                                        logger.debug("| SERVER change USN state (USN INFORMED) ->  (USN INFORMED)");

                                        payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_UPC.RESCODE_SWP_UPC_INCORRECT_CURRENT_USER_PASSWORD;
                                        protocol.packMsg(g.SWP_MSG_TYPE.SWP_UPC_RSP, payload);
                                        logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                        res.send(protocol.getPackedMsg());
                                        break;
                                }
                            });
                        } else {
                            payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_UPC.RESCODE_SWP_UPC_INCORRECT_NUMBER_OF_SIGNED_IN_COMPLETIONS;
                            protocol.packMsg(g.SWP_MSG_TYPE.SWP_UPC_RSP, payload);

                            logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                            res.send(protocol.getPackedMsg());
                        }
                    });
                }
            });

        /*
         * Receive SAP: FPU-REQ
         * Last update: 10.24.2018
         * Author: Junhee Park
         */
        case g.SAP_MSG_TYPE.SAP_FPU_REQ:
            return state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_APP_TCI, protocol.getEndpointId(), (resState, searchedKey) => {
                let payload = {};
                if (!resState) {
                    //Database verify request
                    payload.bdt = unpackedPayload.bdt;
                    payload.userId = unpackedPayload.userId;
                    payload.userFn = unpackedPayload.userFn;
                    payload.userLn = unpackedPayload.userLn;
                    payload.clientType = g.CLIENT_TYPE.APP;
                    payload = protocol.packMsg(g.SDP_MSG_TYPE.SDP_FPU_REQ, payload);
                    
                    let receiver = unpackedPayload.userId;

                    request.send('http://localhost:8080/databaseapi', payload, (message) => {
                        //unpack
                        protocol.setMsg(message);
                        if (!protocol.verifyHeader()) return;
                        let unpackedPayload = protocol.unpackPayload();
                        if (!unpackedPayload) return;
                        payload = {};
                        switch (unpackedPayload.resultCode) {
                            case g.SDP_MSG_RESCODE.RESCODE_SDP_FPU.RESCODE_SDP_FPU_OK:
                                let newPw = unpackedPayload.userPw,
                                    contect = `<H1> New temporary password is: ${newPw}<H1></BR>`;
                                //send Email
                                mailer.sendEmail(receiver, 'Verification from Airound', contect);

                                payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_FPU.RESCODE_SAP_FPU_OK;
                                protocol.packMsg(g.SAP_MSG_TYPE.SAP_FPU_RSP, payload);

                                logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                res.send(protocol.getPackedMsg());
                                break;

                            case g.SDP_MSG_RESCODE.RESCODE_SDP_FPU.RESCODE_SDP_FPU_NOT_EXIST_USER_ID:
                                payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_FPU.RESCODE_SAP_FPU_NOT_EXIST_USER_ID;
                                protocol.packMsg(g.SAP_MSG_TYPE.SAP_FPU_RSP, payload);

                                logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                res.send(protocol.getPackedMsg());
                                break;

                            case g.SDP_MSG_RESCODE.RESCODE_SDP_FPU.RESCODE_SDP_FPU_INCORRECT_USER_INFORMATION:
                                payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_FPU.RESCODE_SAP_FPU_INCORRECT_USER_INFORMATION;
                                protocol.packMsg(g.SAP_MSG_TYPE.SAP_FPU_RSP, payload);

                                logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                res.send(protocol.getPackedMsg());
                                break;

                        }
                    });
                } else {
                    payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_FPU.RESCODE_SAP_FPU_CONFLICT_OF_TEMPORARY_CLIENT_ID;
                    protocol.packMsg(g.SAP_MSG_TYPE.SAP_FPU_RSP, payload);

                    logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                    res.send(protocol.getPackedMsg());
                }
            });

        /*
         * Receive SWP: FPU-REQ
         * Last update: 10.24.2018
         * Author: Junhee Park
         */
        case g.SWP_MSG_TYPE.SWP_FPU_REQ:
            return state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI, protocol.getEndpointId(), (resState, searchedKey) => {
                let payload = {};
                if (!resState) {
                    //Database verify request
                    payload.bdt = unpackedPayload.bdt;
                    payload.userId = unpackedPayload.userId;
                    payload.userFn = unpackedPayload.userFn;
                    payload.userLn = unpackedPayload.userLn;
                    payload.clientType = g.CLIENT_TYPE.WEB;
                    payload = protocol.packMsg(g.SDP_MSG_TYPE.SDP_FPU_REQ, payload);
                    
                    let receiver = unpackedPayload.userId;

                    request.send('http://localhost:8080/databaseapi', payload, (message) => {
                        //unpack
                        protocol.setMsg(message);
                        if (!protocol.verifyHeader()) return;
                        let unpackedPayload = protocol.unpackPayload();
                        if (!unpackedPayload) return;
                        payload = {};
                        switch (unpackedPayload.resultCode) {
                            case g.SDP_MSG_RESCODE.RESCODE_SDP_FPU.RESCODE_SDP_FPU_OK:
                                let newPw = unpackedPayload.userPw,
                                    contect = `<H1> New temporary password is: ${newPw}<H1></BR>`;
                                //send Email
                                mailer.sendEmail(receiver, 'Verification from Airound', contect);

                                payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_FPU.RESCODE_SWP_FPU_OK;
                                protocol.packMsg(g.SWP_MSG_TYPE.SWP_FPU_RSP, payload);

                                logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                res.send(protocol.getPackedMsg());
                                break;

                            case g.SDP_MSG_RESCODE.RESCODE_SDP_FPU.RESCODE_SDP_FPU_NOT_EXIST_USER_ID:
                                payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_FPU.RESCODE_SWP_FPU_NOT_EXIST_USER_ID;
                                protocol.packMsg(g.SWP_MSG_TYPE.SWP_FPU_RSP, payload);

                                logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                res.send(protocol.getPackedMsg());
                                break;

                            case g.SDP_MSG_RESCODE.RESCODE_SDP_FPU.RESCODE_SDP_FPU_INCORRECT_USER_INFORMATION:
                                payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_FPU.RESCODE_SWP_FPU_INCORRECT_USER_INFORMATION;
                                protocol.packMsg(g.SWP_MSG_TYPE.SWP_FPU_RSP, payload);

                                logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                res.send(protocol.getPackedMsg());
                                break;

                        }
                    });
                } else {
                    payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_FPU.RESCODE_SWP_FPU_CONFLICT_OF_TEMPORARY_CLIENT_ID;
                    protocol.packMsg(g.SWP_MSG_TYPE.SWP_FPU_RSP, payload);

                    logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                    res.send(protocol.getPackedMsg());
                }
            });

        
            
        default:
            break;
    }
    
});

//DATABASE
router.post("/databaseapi", (req, res) => {
    logger.debug("| DB Received request on /databaseapi: " + JSON.stringify(req.body));
    var protocol = new LlProtocol();
    var state = new LlState();
    var hash = new LlHash();
    var codeGen = new LlCodeGenerator();
    var uModule = new userModule();
    var sModule = new sensorModule();
    var cModule = new commonModule();
    protocol.setMsg(req.body);
    if (!protocol.verifyHeader()) return;
    //여기가 문제다..
    var unpackedPayload = protocol.unpackPayload();
    if (!unpackedPayload) return;
    let endpointIdType = 0,
        signfbit = 0,
        payload = {};

    switch (protocol.getMsgType()) {
        /**
         * Receive SDP: SGU-REQ
         * Last update: 10.23.2018
         * Author: Junhee Park
         */
        case g.SDP_MSG_TYPE.SDP_SGU_REQ:
            //state check
            if (unpackedPayload.clientType === g.CLIENT_TYPE.APP){
                state.setState(g.ENTITY_TYPE.DATABASE, g.ENDPOIONT_ID_TYPE.EI_TYPE_APP_TCI, [protocol.getEndpointId(), unpackedPayload.userId], g.DATABASE_TCI_STATE_ID.DATABASE_TCI_IDLE_STATE);
            } else {
                state.setState(g.ENTITY_TYPE.DATABASE, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI, [protocol.getEndpointId(), unpackedPayload.userId], g.DATABASE_TCI_STATE_ID.DATABASE_TCI_IDLE_STATE);
            }
           logger.debug("| DATABASE change TCI state to IDLE STATE");
            redisCli.get("u:info:id:" + unpackedPayload.userId, (err, reply) => {
                payload = {};
                let sdpSguRspCode = 0;
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

                if (unpackedPayload.clientType === g.CLIENT_TYPE.APP) {
                    state.setState(g.ENTITY_TYPE.DATABASE, g.ENDPOIONT_ID_TYPE.EI_TYPE_APP_TCI, [protocol.getEndpointId(), unpackedPayload.userId], g.DATABASE_TCI_STATE_ID.DATABASE_TCI_UNIQUE_USER_ID_CONFIRMED_STATE, g.DATABASE_TIMER.T954);
                } else {
                    state.setState(g.ENTITY_TYPE.DATABASE, g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI, [protocol.getEndpointId(), unpackedPayload.userId], g.DATABASE_TCI_STATE_ID.DATABASE_TCI_UNIQUE_USER_ID_CONFIRMED_STATE, g.DATABASE_TIMER.T954);
                }

                logger.debug("| DATABASE change TCI state to UNIQUE USER CONFIRMED STATE");
                return res.send(protocol.getPackedMsg());
            });
            break;
        
        /**
         * Receive SDP: UVC-REQ
         * Last update: 10.23.2018
         * Author: Junhee Park
         */
        case g.SDP_MSG_TYPE.SDP_UVC_REQ:
            endpointIdType = g.ENDPOIONT_ID_TYPE.EI_TYPE_APP_TCI;
            if (unpackedPayload.clientType === g.CLIENT_TYPE.WEB){
                endpointIdType = g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI;
            } 
            state.getState(g.ENTITY_TYPE.DATABASE, endpointIdType, [protocol.getEndpointId(), unpackedPayload.userId], (resState, searchedKey) => {
                if (g.DATABASE_RECV_STATE_BY_MSG.SDP_SGU_REQ.includes(resState)) {
                    //Initial state
                    if(resState === g.DATABASE_TCI_STATE_ID.DATABASE_TCI_UNIQUE_USER_ID_CONFIRMED_STATE){
                        //Insert user info
                        let userInfo = unpackedPayload;
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
                                                keyHead + "bdt", userInfo.bdt,
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
                                        ]).exec((err, replies) => {
                                            if (err) {
                                                payload = {
                                                    "resultCode": g.SDP_MSG_RESCODE.RESCODE_SDP_UVC.RESCODE_SDP_UVC_OTHER
                                                }
                                                protocol.packMsg(g.SDP_MSG_TYPE.SDP_UVC_RSP, payload);
                                                state.setState(g.ENTITY_TYPE.DATABASE, endpointIdType, [protocol.getEndpointId(), userInfo.userId], g.DATABASE_TCI_STATE_ID.DATABASE_USN_ALLOCATED_STATE, g.DATABASE_TIMER.T902);
                                                logger.debug("| DATABASE change TCI state to USN ALLOCATED STATE");
                                                return res.send(protocol.getPackedMsg());
                                            } else {
                                                logger.debug("| DATABASE stored user info" + JSON.stringify(userInfo));
                                                payload = {
                                                    "resultCode": g.SDP_MSG_RESCODE.RESCODE_SDP_UVC.RESCODE_SDP_UVC_OK
                                                }
                                                protocol.packMsg(g.SDP_MSG_TYPE.SDP_UVC_RSP, payload);
                                                state.setState(g.ENTITY_TYPE.DATABASE, endpointIdType, [protocol.getEndpointId(), userInfo.userId], g.DATABASE_TCI_STATE_ID.DATABASE_USN_ALLOCATED_STATE, g.DATABASE_TIMER.T902);
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

        /**
         * Receive SDP: SGI-REQ
         * Last update: 10.23.2018
         * Author: Junhee Park
         */
        case g.SDP_MSG_TYPE.SDP_SGI_REQ:
            return redisCli.get(`u:info:id:${unpackedPayload.userId}`, (err, usn) => {
                if (err) {} else {
                    endpointIdType = g.ENDPOIONT_ID_TYPE.EI_TYPE_APP_USN;
                    if (unpackedPayload.clientType === g.CLIENT_TYPE.WEB) {
                        endpointIdType = g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_USN;
                        signfbit = 1;
                    }

                    if (usn === null) {
                        payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SGI.RESCODE_SDP_SGI_NOT_EXIST_USER_ID;
                        protocol.packMsg(g.SDP_MSG_TYPE.SDP_SGI_RSP, payload);
                        logger.debug(`| DATABASE Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                        res.send(protocol.getPackedMsg());
                    } else {
                        redisCli.get(`u:info:${usn}:pw`, (err, hashedPw) => {
                            if (err) {} else {
                                if (hashedPw === null) {
                                    payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SGI.RESCODE_SDP_SGI_OTHER;
                                    protocol.packMsg(g.SDP_MSG_TYPE.SDP_SGI_RSP, payload);

                                    logger.debug(`| DATABASE Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                    res.send(protocol.getPackedMsg());
                                } else {
                                    if (hash.checkPassword(unpackedPayload.userPw, hashedPw)) {
                                        payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SGI.RESCODE_SDP_SGI_OK;
                                        //update user state
                                        let keyHead = `u:info:${usn}:`;
                                        redisCli.multi([
                                            //here -> 나누자!!
                                            ["setbit", `${keyHead}signf`, signfbit, g.SIGNED_IN_STATE.SIGNED_IN],
                                            ["mget", `${keyHead}usn`, `${keyHead}ml`]
                                        ]).exec((err, replies) => {
                                            if (err) {} else {
                                                state.setState(g.ENTITY_TYPE.DATABASE, endpointIdType, replies[1][0], g.DATABASE_USN_STATE_ID.DATABASE_USN_USN_INFORMED_STATE, g.DATABASE_TIMER.T955);
                                                logger.debug("| DATABASE change USN state (IDLE) -> (USN INFORMED)");

                                                payload.usn = replies[1][0];
                                                payload.ml = replies[1][1];
                                                protocol.packMsg(g.SDP_MSG_TYPE.SDP_SGI_RSP, payload);

                                                logger.debug(`| DATABASE Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                                res.send(protocol.getPackedMsg());
                                            }
                                        });
                                        //
                                    } else {
                                        payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SGI.RESCODE_SDP_SGI_INCORRECT_CURRENT_USER_PASSWORD;
                                        protocol.packMsg(g.SDP_MSG_TYPE.SDP_SGI_RSP, payload);

                                        logger.debug(`| DATABASE Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                        res.send(protocol.getPackedMsg());
                                    }
                                }
                            }
                        })
                    }
                }
            });

        /**
         * Receive SDP: SGO-NOT
         * Last update: 10.24.2018
         * Author: Junhee Park
         */
        case g.SDP_MSG_TYPE.SDP_SGO_NOT:

            endpointIdType = g.ENDPOIONT_ID_TYPE.EI_TYPE_APP_USN;
            if (unpackedPayload.clientType === g.CLIENT_TYPE.WEB) {
                endpointIdType = g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_USN;
                signfbit = 1;
            }

            return redisCli.getbit(`u:info:${protocol.getEndpointId()}:signf`, signfbit, (err, signf) => {
                if (signf === null) {
                    payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SGO.RESCODE_SDP_SGO_UNALLOCATED_USER_SEQUENCE_NUMBER;
                    protocol.packMsg(g.SDP_MSG_TYPE.SDP_SGO_ACK, payload);
                    
                    logger.debug(`| DATABASE Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                    res.send(protocol.getPackedMsg());
                    
                } else if (signf === g.SIGNED_IN_STATE.SIGNED_IN) {
                    redisCli.setbit(`u:info:${protocol.getEndpointId()}:signf`, signfbit, g.SIGNED_IN_STATE.SIGNED_OUT);

                    payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SGO.RESCODE_SDP_SGO_OK;
                    protocol.packMsg(g.SDP_MSG_TYPE.SDP_SGO_ACK, payload);
                    
                    logger.debug(`| DATABASE Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                    state.setState(g.ENTITY_TYPE.DATABASE, endpointIdType, protocol.getEndpointId(), g.DATABASE_USN_STATE_ID.DATABASE_USN_IDLE_STATE);
                    
                    logger.debug("| SERVER change USN state (USN INFORMED) -> (IDLE)");
                    res.send(protocol.getPackedMsg());
                
                } else if (signf === g.SIGNED_IN_STATE.SIGNED_OUT) {
                    payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SGO.RESCODE_SDP_SGO_OTHER;
                    protocol.packMsg(g.SDP_MSG_TYPE.SDP_SGO_ACK, payload);
                    
                    logger.debug(`| DATABASE Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                    res.send(protocol.getPackedMsg());
                }
            });

        /**
         * Receive SDP: UPC-REQ
         * Last update: 10.24.2018
         * Author: Junhee Park
         */
         case g.SDP_MSG_TYPE.SDP_UPC_REQ:

            endpointIdType = g.ENDPOIONT_ID_TYPE.EI_TYPE_APP_USN;
            if (unpackedPayload.clientType === g.CLIENT_TYPE.WEB) {
                endpointIdType = g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_USN;
                signfbit = 1;
            }
            return redisCli.getbit(`u:info:${protocol.getEndpointId()}:signf`, signfbit, (err, signf) => {
                if (signf === null) {
                    payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_UPC.RESCODE_SDP_UPC_UNALLOCATED_USER_SEQUENCE_NUMBER;
                    protocol.packMsg(g.SDP_MSG_TYPE.SDP_UPC_RSP, payload);

                    logger.debug("| DATABASE Send response: " + JSON.stringify(protocol.getPackedMsg()));
                    res.send(protocol.getPackedMsg());

                } else if (signf === g.SIGNED_IN_STATE.SIGNED_IN) {
                    redisCli.get('u:info:' + protocol.getEndpointId() + ':pw', (err, hashedPw) => {
                        if (err) {
                            logger.error(`| DATABASE ERROR get u:info:${protocol.getEndpointId()}:pw`);
                        }
                        if (hash.checkPassword(unpackedPayload.curPw, hashedPw)) {
                            redisCli.set('u:info:' + protocol.getEndpointId() + ':pw', hash.getHashedPassword(unpackedPayload.newPw), (err, result) => {
                                state.setState(g.ENTITY_TYPE.DATABASE, endpointIdType, protocol.getEndpointId(), g.DATABASE_USN_STATE_ID.DATABASE_USN_USN_INFORMED_STATE, g.DATABASE_TIMER.T955);
                                logger.debug("| DATABASE change USN state (USN INFORMED) -> (USN INFORMED)");

                                payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_UPC.RESCODE_SDP_UPC_OK;
                                protocol.packMsg(g.SDP_MSG_TYPE.SDP_UPC_RSP, payload);
                                
                                logger.debug("| DATABASE Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                res.send(protocol.getPackedMsg());
                            })
                        } else {
                            state.setState(g.ENTITY_TYPE.DATABASE, endpointIdType, protocol.getEndpointId(), g.DATABASE_USN_STATE_ID.DATABASE_USN_USN_INFORMED_STATE, g.DATABASE_TIMER.T955);
                            logger.debug("| DATABASE change USN state (USN INFORMED) -> (USN INFORMED)");
                            
                            payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_UPC.RESCODE_SDP_UPC_INCORRECT_CURRENT_USER_PASSWORD;
                            protocol.packMsg(g.SDP_MSG_TYPE.SDP_UPC_RSP, payload);
                            
                            logger.debug("| DATABASE Send response: " + JSON.stringify(protocol.getPackedMsg()));
                            res.send(protocol.getPackedMsg());
                        }
                    })
                }
            });

            /**
             * Receive SDP: FPU-REQ
             * Last update: 10.24.2018
             * Author: Junhee Park
             */
            case g.SDP_MSG_TYPE.SDP_FPU_REQ:
                return redisCli.get(`u:info:id:${unpackedPayload.userId}`, (err, usn) => {
                    if (err) {} else {
                        if (usn === null) {
                            payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_FPU.RESCODE_SDP_FPU_NOT_EXIST_USER_ID;
                            protocol.packMsg(g.SDP_MSG_TYPE.SDP_FPU_RSP, payload);

                            logger.debug("| DATABASE Send response: " + JSON.stringify(protocol.getPackedMsg()));
                            res.send(protocol.getPackedMsg());
                        } else {
                            let keyHead = `u:info:${usn}:`;
                            redisCli.mget(keyHead + 'bdt', keyHead + 'fn', keyHead + 'ln', (err, replies) => {
                                if (err) {} else {
                                    if (replies[0] === unpackedPayload.bdt &&
                                        replies[1] === unpackedPayload.userFn &&
                                        replies[2] === unpackedPayload.userLn) {
                                        //gen pw 
                                        let pw = codeGen.getAuthenticationCode();
                                        //update pw
                                        redisCli.set(keyHead + 'pw', hash.getHashedPassword(pw), (err, reply) => {
                                            if (err) {} else {
                                                payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_FPU.RESCODE_SDP_FPU_OK;
                                                payload.userPw = pw;
                                                protocol.packMsg(g.SDP_MSG_TYPE.SDP_FPU_RSP, payload);

                                                logger.debug("| DATABASE Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                                res.send(protocol.getPackedMsg());
                                            }
                                        })
                                    } else {
                                        payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_FPU.RESCODE_SDP_FPU_INCORRECT_USER_INFORMATION;
                                        protocol.packMsg(g.SDP_MSG_TYPE.SDP_FPU_RSP, payload);

                                        logger.debug("| DATABASE Send response: " + JSON.stringify(protocol.getPackedMsg()));
                                        res.send(protocol.getPackedMsg());
                                    }
                                }
                            });
                        }
                    }
                });

            default:
                break;
            
    }
});