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
//Mail Sender modul
var LlMailer = require('../lib/LlMailer');

const userModule = require('./userModule');
const sensorModule = require('./sensorModule');
const commonModule = require('./commonModule');
const dataModule = require('./searchHistoricalDataModule');
const storeHistoricalDataModule = require('./historicalAirDataModule');

const redis = require("redis");
//Connect with Redis client
console.log("connect");
const redisConf = {
    
    host: 'root:wnsgml90@intuseer.co.kr',
}
const redisCli = redis.createClient();
//Data tran
router.post("/serverdatatran", function (req, res){
    logger.debug("    +--------------------------------------------------------------------------------.................");
    logger.debug("| SERVER Received request on /serverapi: " + JSON.stringify(req.body));

    let protocol = new LlProtocol();
    let state = new LlState();
    let sModule = new sensorModule();
    let sDataModule = new storeHistoricalDataModule(protocol.getEndpointId());
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
                        state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_SENSOR_SSN, ssn, g.SERVER_SSN_STATE_ID.SERVER_SSN_CID_INFORMED_STATE, g.SERVER_TIMER.T803)
                        let mti = g.SERVER_TIMER.T805,
                            unpackedPayload = sModule.unpackTrnPayload(g.ENTITY_TYPE.SENSOR, protocol.msgPayload, mti),
                            dataSet = unpackedPayload.success.arrSuccessfulRcvdData;
                        for (let i = 0, x = dataSet.length; i < x; i++) {
                            if (i === x-1) {    //last row
                                const nation = dataSet[i][2],
                                        state = dataSet[i][3],
                                        city = dataSet[i][4];

                                let rawData = [];
                                for(let j in dataSet[i]){
                                    rawData[j] = dataSet[i][j];
                                }
                                
                                rawData.splice(2,3);
                                rawData = rawData.toString();
                                let key = Number(ssn),
                                    lessKey = key - 1,
                                    greaterKey = key + 1;

                                lessKey = `(${lessKey.toString()}`;
                                redisCli.zremrangebyscore(`search:s:realtime:air:${nation}:${state}:${city}`, lessKey, greaterKey);
                                redisCli.zadd(`search:s:realtime:air:${nation}:${state}:${city}`, ssn, rawData, (err, replies) =>{
                                    if(err){
                                        console.log(err);
                                    } else {
                                        console.log(replies);
                                    }
                                });
                                greaterKey = `(${greaterKey.toString()}`;
                                redisCli.set('c:con:s:' + protocol.getEndpointId() + ':ssn', ssn, 'EX', g.SERVER_TIMER.T835);

                                setTimeout(() => {
                                    redisCli.zremrangebyscore(`search:s:realtime:air:${nation}:${state}:${city}`, lessKey, greaterKey, (err, reply )=> {
                                        if(err){} else {
                                            logger.debug("| SERVER removed realtime data.");
                                        }
                                    });
                                }, g.SERVER_TIMER.T803 * 1000 * 10);
                            }
                        }
                        sDataModule.storeData(ssn, dataSet, (result) => {
                            if(result) {
                                let payload = {},
                                    sspRadAck = {};
                                payload.successfulRcptFlg = unpackedPayload.success.successfulRcptFlg;
                                payload.continuityOfSuccessfulRcpt = unpackedPayload.success.continuityOfSuccessfulRcpt;
                                payload.numOfSuccessfulRcpt = unpackedPayload.success.numOfSuccessfulRcpt;
                                if (payload.successfulRcptFlg === 1) {
                                    payload.listOfSuccessfulTs = unpackedPayload.success.arrSuccessfulTs;
                                }
                                payload.retransReqFlg = unpackedPayload.fail.retranReqFlg;
                                payload.continuityOfRetransReq = unpackedPayload.fail.continuityOfRetransReq;
                                payload.numOfRetransReq = unpackedPayload.fail.numOfRetransReq;
                                if (payload.retransReqFlg === 1) {
                                    payload.listOfUnsuccessfulTs = unpackedPayload.fail.arrUnsuccessfulTs;
                                }
                                sspRadAck = {
                                    "header": {
                                        "msgType": g.SSP_MSG_TYPE.SSP_RAD_ACK,
                                        "msgLen": 0,
                                        "endpointId": protocol.getEndpointId()
                                    },
                                    "payload": payload
                                }
                                logger.debug(`| SERVER Send response: ${JSON.stringify(sspRadAck)}`);
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
                    if(usn !== null) {
                        //usn state update
                        state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_SENSOR_USN, usn, g.SERVER_USN_STATE_ID.SERVER_USN_CID_INFORMED_STATE, g.SERVER_TIMER.T803)
                        let mti = g.SERVER_TIMER.T805,
                            unpackedPayload = sModule.unpackTrnPayload(g.ENTITY_TYPE.APPCLIENT, protocol.msgPayload, mti),
                            dataSet = unpackedPayload.success.arrSuccessfulRcvdData,
                            commandList = [];
                        //add data into buffer
                        for (let i = 0, x = dataSet.length; i < x; i++) {
                            let nat = dataSet[i][2],
                                state = dataSet[i][3],
                                city = dataSet[i][4];
                            dataSet[i].splice(2, 3);
                            commandList.push([
                                'zadd',
                                `d:heart:raw:${nat}:${state}:${city}:${usn}`,
                                dataSet[i][0],
                                dataSet[i].toString()
                            ])
                            if (i === x-1) {
                                let rawData = dataSet[i];
                                rawData = rawData.toString();
                                let key = Number(usn),
                                    lessKey = key - 1,
                                    greaterKey = key + 1;
                                lessKey = `(${lessKey.toString()}`;
                                redisCli.zremrangebyscore(`search:a:realtime:heart`, lessKey, greaterKey);
                                redisCli.zadd(`search:a:realtime:heart`, usn, rawData, (err, replies) =>{
                                    if(err){
                                        console.log(err);
                                    } else {
                                        console.log(replies);
                                    }
                                });
                                greaterKey = `(${greaterKey.toString()}`;
                                redisCli.set('c:con:a:' + protocol.getEndpointId() + ':usn', usn, 'EX', g.SERVER_TIMER.T835);

                                setTimeout(() => {
                                    redisCli.zremrangebyscore(`search:a:realtime:heart`, lessKey, greaterKey, (err, reply )=> {
                                        if(err){} else {
                                            logger.debug("| SERVER removed realtime data.");
                                        }
                                    });
                                }, g.SERVER_TIMER.T835 * 1000);
                            }
                        }
                        redisCli.multi(commandList).exec((err, result) => {
                            if (err) {
                            } else {
                                let payload = {},
                                    sspRhdAck = {};
                                payload.successfulRcptFlg = unpackedPayload.success.successfulRcptFlg;
                                payload.continuityOfSuccessfulRcpt = unpackedPayload.success.continuityOfSuccessfulRcpt;
                                payload.numOfSuccessfulRcpt = unpackedPayload.success.numOfSuccessfulRcpt;
                                if (payload.successfulRcptFlg === 1) {
                                    payload.listOfSuccessfulTs = unpackedPayload.success.arrSuccessfulTs;
                                }
                                payload.retransReqFlg = unpackedPayload.fail.retranReqFlg;
                                payload.continuityOfRetransReq = unpackedPayload.fail.continuityOfRetransReq;
                                payload.numOfRetransReq = unpackedPayload.fail.numOfRetransReq;
                                if (payload.retransReqFlg === 1) {
                                    payload.listOfUnsuccessfulTs = unpackedPayload.fail.arrUnsuccessfulTs;
                                }
                                sspRhdAck = {
                                    "header": {
                                        "msgType": g.SAP_MSG_TYPE.SAP_RHD_ACK,
                                        "msgLen": 0,
                                        "endpointId": protocol.getEndpointId()
                                    },
                                    "payload": payload
                                }
                                logger.debug(`| SERVER Send response: ${JSON.stringify(sspRhdAck)}`);
                                return res.send(sspRhdAck);
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
//Process : Send Air data each time to Database. It should be modified

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
            state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_TCI, protocol.getEndpointId(), (resState, searchedKey) => {
                let payload = {};
                //처음받지 않을경우
                if (resState) {
                    //아이디가 같을경우 재전송, 다를경우 중복
                    if (`c:sta:s:a:tci:${protocol.getEndpointId()}:${unpackedPayload.userId}` === searchedKey) {
                        state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_TCI, [protocol.getEndpointId(), unpackedPayload.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_IDLE_STATE);
                        logger.debug("| SERVER change TCI state to IDLE STATE");

                        payload.userId = unpackedPayload.userId;
                        payload.clientType = g.CLIENT_TYPE.APP;
                        payload = protocol.packMsg(g.SDP_MSG_TYPE.SDP_SGU_REQ, payload);
                        logger.debug(`| SERVER send request: ${JSON.stringify(protocol.getPackedMsg())}`);
                        //update state
                        state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_TCI, [protocol.getEndpointId(), unpackedPayload.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_USER_ID_DUPLICATE_REQUESTED_STATE);
                        
                        let userInfo = unpackedPayload;
                        logger.debug("| SERVER change TCI state to USER ID DUPLICATE REQUESTED STATE");
                        request.send('http://localhost:8080/databaseapi', payload, (message) => {
                            protocol.setMsg(message);
                            if (!protocol.verifyHeader()) return;
                            unpackedPayload = protocol.unpackPayload();
                            if (!unpackedPayload) return;
                            switch (unpackedPayload.resultCode) {
                                case g.SDP_MSG_RESCODE.RESCODE_SDP_SGU.RESCODE_SDP_SGU_OK:
                                    return state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_TCI, protocol.getEndpointId(), (resState) => {
                                        if (g.SERVER_RECV_STATE_BY_MSG.SDP_SGU_RSP.includes(resState)) {

                                            const ac = codeGen.getAuthenticationCode(),
                                                  vc = codeGen.getVerificationCode(),
                                                  contect = `<H1> Verification code: ${vc}<H1></BR><H1> Authentication code: ${ac}<H1>`;
                                            console.log('codes: ', ac, vc);
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
                                            
                                            state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_TCI, [protocol.getEndpointId(), userInfo.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_USER_ID_AVAILABLITY_CONFIRMED_STATE, g.SERVER_TIMER.T862);
                                            logger.debug("| SERVER change TCI state to USER ID AVAILABLITY CONFIRMED_STATE");

                                            logger.debug(`| Server Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                            res.send(protocol.getPackedMsg());
                                        }
                                    });

                                case g.SDP_MSG_RESCODE.RESCODE_SDP_SGU.RESCODE_SDP_SGU_OTHER:
                                    payload = {};
                                    payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_SGU.RESCODE_SAP_SGU_OTHER;
                                    protocol.packMsg(g.SAP_MSG_TYPE.SAP_SGU_RSP, payload);
                                
                                    state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_TCI, [protocol.getEndpointId(), userInfo.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_IDLE_STATE);
                                    logger.debug('| SERVER change TCI state to IDLE STATE');

                                    logger.debug(`| SERVER Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                    return res.send(protocol.getPackedMsg());

                                case g.SDP_MSG_RESCODE.RESCODE_SDP_SGU.RESCODE_SDP_SGU_DUPLICATE_OF_USER_ID:
                                    payload = {};
                                    payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_SGU.RESCODE_SAP_SGU_DUPLICATE_OF_USER_ID;
                                    protocol.packMsg(g.SAP_MSG_TYPE.SAP_SGU_RSP, payload);

                                    state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_TCI, [protocol.getEndpointId(), userInfo.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_IDLE_STATE);
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
                        state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_TCI, [protocol.getEndpointId(), unpackedPayload.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_IDLE_STATE);
                        logger.debug("| SERVER change TCI state to IDLE STATE");

                        payload.userId = unpackedPayload.userId;
                        payload.clientType = g.CLIENT_TYPE.APP;

                        payload = protocol.packMsg(g.SDP_MSG_TYPE.SDP_SGU_REQ, payload);
                        logger.debug("| SERVER send request: " + JSON.stringify(protocol.getPackedMsg()));
                        
                        //update state
                        state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_TCI, [protocol.getEndpointId(), unpackedPayload.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_USER_ID_DUPLICATE_REQUESTED_STATE);
                        let userInfo = unpackedPayload;

                        logger.debug("| SERVER change TCI state to USER ID DUPLICATE REQUESTED STATE");
                        request.send('http://localhost:8080/databaseapi', payload, (message) => {
                            protocol.setMsg(message);
                            if (!protocol.verifyHeader()) return;
                            unpackedPayload = protocol.unpackPayload();
                            if (!unpackedPayload) return;
                            switch (unpackedPayload.resultCode) {
                                case g.SDP_MSG_RESCODE.RESCODE_SDP_SGU.RESCODE_SDP_SGU_OK:
                                    return state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_TCI, protocol.getEndpointId(), (resState) => {
                                        if (g.SERVER_RECV_STATE_BY_MSG.SDP_SGU_RSP.includes(resState)) {
                                        
                                            const ac = codeGen.getAuthenticationCode(),
                                                vc = codeGen.getVerificationCode(),
                                                contect = `<H1> Verification code: ${vc}<H1></BR><H1> Authentication code: ${ac}<H1>`;
                                            console.log('codes: ', ac, vc);
                                            mailer.sendEmail(userInfo.userId, 'Verification from Airound', contect);
                                            
                                            const keyHead = `u:temp:${protocol.getEndpointId()}:`,
                                                  expTime = g.SERVER_TIMER.T862;

                                            redisCli.multi([
                                                ["set", `${keyHead}id`, userInfo.userId, 'EX', expTime],
                                                ["set", `${keyHead}pw`, userInfo.userPw, 'EX', expTime],
                                                ["set", `${keyHead}fn`, userInfo.userFn, 'EX', expTime],
                                                ["set", `${keyHead}ln`, userInfo.userLn, 'EX', expTime],
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

                                            state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_TCI, [protocol.getEndpointId(), userInfo.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_USER_ID_AVAILABLITY_CONFIRMED_STATE, g.SERVER_TIMER.T862);
                                            logger.debug("| SERVER change TCI state to USER ID AVAILABLITY CONFIRMED STATE");
                                            
                                            logger.debug(`| Server Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                            return res.send(protocol.getPackedMsg());
                                        }
                                    });

                                case g.SDP_MSG_RESCODE.RESCODE_SDP_SGU.RESCODE_SDP_SGU_OTHER:
                                    payload = {};
                                    payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_SGU.RESCODE_SAP_SGU_OTHER;
                                    protocol.packMsg(g.SAP_MSG_TYPE.SAP_SGU_RSP, payload);

                                    state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_TCI, [protocol.getEndpointId(), userInfo.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_IDLE_STATE);
                                    logger.debug("| SERVER change TCI state to IDLE STATE");

                                    logger.debug(`| SERVER Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                    return res.send(protocol.getPackedMsg());

                                case g.SDP_MSG_RESCODE.RESCODE_SDP_SGU.RESCODE_SDP_SGU_DUPLICATE_OF_USER_ID:
                                    payload = {};
                                    payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_SGU.RESCODE_SAP_SGU_DUPLICATE_OF_USER_ID;
                                    protocol.packMsg(g.SAP_MSG_TYPE.SAP_SGU_RSP, payload);

                                    state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_TCI, [protocol.getEndpointId(), userInfo.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_IDLE_STATE);
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
            state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_TCI, protocol.getEndpointId(), (resState, searchedKey) => {
                let payload = {};
                //처음받지 않을경우
                if (resState) {
                    //아이디가 같을경우 재전송, 다를경우 중복
                    if (`c:sta:s:w:tci:${protocol.getEndpointId()}:${unpackedPayload.userId}` === searchedKey) {
                        state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_TCI, [protocol.getEndpointId(), unpackedPayload.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_IDLE_STATE);
                        logger.debug("| SERVER change TCI state to IDLE STATE");
                        unpackedPayload.clientType = g.CLIENT_TYPE.WEB;
                        payload = protocol.packMsg(g.SDP_MSG_TYPE.SDP_SGU_REQ, unpackedPayload);
                        logger.debug(`| SERVER send request: ${JSON.stringify(protocol.getPackedMsg())}`);
                        //update state
                        state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_TCI, [protocol.getEndpointId(), unpackedPayload.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_USER_ID_DUPLICATE_REQUESTED_STATE);
                        
                        let userInfo = unpackedPayload;
                        logger.debug("| SERVER change TCI state to USER ID DUPLICATE REQUESTED STATE");
                        request.send('http://localhost:8080/databaseapi', payload, (message) => {
                            protocol.setMsg(message);
                            if (!protocol.verifyHeader()) return;
                            unpackedPayload = protocol.unpackPayload();
                            if (!unpackedPayload) return;
                            switch (unpackedPayload.resultCode) {
                                case g.SDP_MSG_RESCODE.RESCODE_SDP_SGU.RESCODE_SDP_SGU_OK:
                                    return state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_TCI, protocol.getEndpointId(), (resState) => {
                                        if (g.SERVER_RECV_STATE_BY_MSG.SDP_SGU_RSP.includes(resState)) {

                                            const ac = codeGen.getAuthenticationCode(),
                                                vc = codeGen.getVerificationCode(),
                                                contect = `<H1> Verification code: ${vc}<H1></BR><H1> Authentication code: ${ac}<H1>`;
                                            console.log('codes: ', ac, vc);
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

                                            state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_TCI, [protocol.getEndpointId(), userInfo.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_USER_ID_AVAILABLITY_CONFIRMED_STATE, g.SERVER_TIMER.T862);
                                            logger.debug("| SERVER change TCI state to USER ID AVAILABLITY CONFIRMED_STATE");

                                            logger.debug(`| Server Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                            res.send(protocol.getPackedMsg());
                                        }
                                    });

                                case g.SDP_MSG_RESCODE.RESCODE_SDP_SGU.RESCODE_SDP_SGU_OTHER:

                                    payload = {};
                                    payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SGU.RESCODE_SWP_SGU_OTHER;
                                    protocol.packMsg(g.SWP_MSG_TYPE.SWP_SGU_RSP, payload);

                                    state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_TCI, [protocol.getEndpointId(), userInfo.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_IDLE_STATE);
                                    logger.debug('| SERVER change TCI state to IDLE STATE');

                                    logger.debug(`| SERVER Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                    return res.send(protocol.getPackedMsg());

                                case g.SDP_MSG_RESCODE.RESCODE_SDP_SGU.RESCODE_SDP_SGU_DUPLICATE_OF_USER_ID:

                                    payload = {};
                                    payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SGU.RESCODE_SWP_SGU_DUPLICATE_OF_USER_ID;
                                    protocol.packMsg(g.SWP_MSG_TYPE.SWP_SGU_RSP, payload);

                                    state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_TCI, [protocol.getEndpointId(), userInfo.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_IDLE_STATE);
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
                        state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_TCI, [protocol.getEndpointId(), unpackedPayload.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_IDLE_STATE);
                        logger.debug("| SERVER change TCI state to IDLE STATE");

                        unpackedPayload.clientType = g.CLIENT_TYPE.WEB;
                        payload = protocol.packMsg(g.SDP_MSG_TYPE.SDP_SGU_REQ, unpackedPayload);
                        logger.debug("| SERVER send request: " + JSON.stringify(protocol.getPackedMsg()));

                        //update state
                        state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_TCI, [protocol.getEndpointId(), unpackedPayload.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_USER_ID_DUPLICATE_REQUESTED_STATE);
                        
                        let userInfo = unpackedPayload;
                        logger.debug("| SERVER change TCI state to USER ID DUPLICATE REQUESTED STATE");
                        request.send('http://localhost:8080/databaseapi', payload, (message) => {
                            protocol.setMsg(message);
                            if (!protocol.verifyHeader()) return;
                            unpackedPayload = protocol.unpackPayload();
                            if (!unpackedPayload) return;
                            switch (unpackedPayload.resultCode) {
                                case g.SDP_MSG_RESCODE.RESCODE_SDP_SGU.RESCODE_SDP_SGU_OK:
                                    return state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_TCI, protocol.getEndpointId(), (resState) => {
                                        if (g.SERVER_RECV_STATE_BY_MSG.SDP_SGU_RSP.includes(resState)) {

                                            const ac = codeGen.getAuthenticationCode(),
                                                  vc = codeGen.getVerificationCode(),
                                                  contect = `<H1> Verification code: ${vc}<H1></BR><H1> Authentication code: ${ac}<H1>`;

                                            mailer.sendEmail(userInfo.userId, 'Verification from Airound', contect);
                                            console.log('codes: ', ac, vc);
                                            const keyHead = `u:temp:${protocol.getEndpointId()}:`,
                                                  expTime = g.SERVER_TIMER.T862;

                                            redisCli.multi([
                                                ["set", `${keyHead}id`, userInfo.userId, 'EX', expTime],
                                                ["set", `${keyHead}pw`, userInfo.userPw, 'EX', expTime],
                                                ["set", `${keyHead}fn`, userInfo.userFn, 'EX', expTime],
                                                ["set", `${keyHead}ln`, userInfo.userLn, 'EX', expTime],
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

                                            state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_TCI, [protocol.getEndpointId(), userInfo.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_USER_ID_AVAILABLITY_CONFIRMED_STATE, g.SERVER_TIMER.T862);
                                            logger.debug("| SERVER change TCI state to USER ID AVAILABLITY CONFIRMED STATE");

                                            logger.debug(`| Server Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                            return res.send(protocol.getPackedMsg());
                                        }
                                    });

                                case g.SDP_MSG_RESCODE.RESCODE_SDP_SGU.RESCODE_SDP_SGU_OTHER:

                                    payload = {};
                                    payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SGU.RESCODE_SWP_SGU_OTHER;
                                    protocol.packMsg(g.SWP_MSG_TYPE.SWP_SGU_RSP, payload);

                                    state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_TCI, [protocol.getEndpointId(), userInfo.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_IDLE_STATE);
                                    logger.debug("| SERVER change TCI state to IDLE STATE");

                                    logger.debug(`| SERVER Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                    return res.send(protocol.getPackedMsg());

                                case g.SDP_MSG_RESCODE.RESCODE_SDP_SGU.RESCODE_SDP_SGU_DUPLICATE_OF_USER_ID:

                                    payload = {};
                                    payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SGU.RESCODE_SWP_SGU_DUPLICATE_OF_USER_ID;
                                    protocol.packMsg(g.SWP_MSG_TYPE.SWP_SGU_RSP, payload);

                                    state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_TCI, [protocol.getEndpointId(), userInfo.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_IDLE_STATE);
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
            return state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_TCI, protocol.getEndpointId(), (resState, searchedKey) => {
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
                                                                                state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_TCI, [protocol.getEndpointId(), id], g.SERVER_TCI_STATE_ID.SERVER_TCI_USN_ALLOCATED_STATE, g.SERVER_TIMER.T832);
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
            return state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_TCI, protocol.getEndpointId(), (resState, searchedKey) => {
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
                                                                                state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_TCI, [protocol.getEndpointId(), id], g.SERVER_TCI_STATE_ID.SERVER_TCI_USN_ALLOCATED_STATE, g.SERVER_TIMER.T832);
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
            return state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_TCI, protocol.getEndpointId(), (resState, searchedKey) => {
                let payload = {};
                //idle state이거나, 재전송인 경우 데이터베이스로 연결하는 로직
                if (resState === false || (resState === g.SERVER_TCI_STATE_ID.SERVER_TCI_HALF_USN_INFORMED_STATE && searchedKey.includes(unpackedPayload.userId))) {
                    let userId = unpackedPayload.userId;
                    //state변경
                    state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_TCI, [protocol.getEndpointId(), userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_HALF_USN_INFORMED_STATE);
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
                                            state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_USN, unpackedPayload.usn, g.SERVER_USN_STATE_ID.SERVER_USN_USN_INFORMED_STATE, g.SERVER_TIMER.T863);
                                            state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_TCI, [protocol.getEndpointId(), userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_IDLE_STATE);
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
                                state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_TCI, [protocol.getEndpointId(), userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_IDLE_STATE);
                                logger.debug("| SERVER change TCI state (HALF USN INFORMED STATE) ->  (IDLE)");

                                payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_SGI.RESCODE_SAP_SGI_OTHER;
                                protocol.packMsg(g.SAP_MSG_TYPE.SAP_SGI_RSP, payload)
                                logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                res.send(protocol.getPackedMsg());
                                break;
                            case g.SDP_MSG_RESCODE.RESCODE_SDP_SGI.RESCODE_SDP_SGI_NOT_EXIST_USER_ID:
                                state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_TCI, [protocol.getEndpointId(), userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_IDLE_STATE);
                                logger.debug("| SERVER change TCI state (HALF USN INFORMED STATE) ->  (IDLE)");

                                payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_SGI.RESCODE_SAP_SGI_NOT_EXIST_USER_ID;
                                protocol.packMsg(g.SAP_MSG_TYPE.SAP_SGI_RSP, payload)
                                logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                res.send(protocol.getPackedMsg());
                                break;
                            case g.SDP_MSG_RESCODE.RESCODE_SDP_SGI.RESCODE_SDP_SGI_INCORRECT_CURRENT_USER_PASSWORD:
                                state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_TCI, [protocol.getEndpointId(), userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_IDLE_STATE);
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
                    logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`)
                    res.send(protocol.getPackedMsg());
                }
            });

        /*
         * Receive SWP: SGI-REQ
         * Last update: 10.23.2018
         * Author: Junhee Park
         */
        case g.SWP_MSG_TYPE.SWP_SGI_REQ:
            return state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_TCI, protocol.getEndpointId(), (resState, searchedKey) => {
                let payload = {};
                //idle state이거나, 재전송인 경우 데이터베이스로 연결하는 로직
                if (resState === false || (resState === g.SERVER_TCI_STATE_ID.SERVER_TCI_HALF_USN_INFORMED_STATE && searchedKey.includes(unpackedPayload.userId))) {
                    let userId = unpackedPayload.userId;
                    //state변경
                    state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_TCI, [protocol.getEndpointId(), userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_HALF_USN_INFORMED_STATE);
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
                                            state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_USN, unpackedPayload.usn, g.SERVER_USN_STATE_ID.SERVER_USN_USN_INFORMED_STATE, g.SERVER_TIMER.T863);
                                            state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_TCI, [protocol.getEndpointId(), userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_IDLE_STATE);
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
                                state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_TCI, [protocol.getEndpointId(), userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_IDLE_STATE);
                                logger.debug("| SERVER change TCI state (HALF USN INFORMED STATE) ->  (IDLE)");

                                payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SGI.RESCODE_SWP_SGI_OTHER;
                                protocol.packMsg(g.SWP_MSG_TYPE.SWP_SGI_RSP, payload)
                                logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                res.send(protocol.getPackedMsg());
                                break;
                            case g.SDP_MSG_RESCODE.RESCODE_SDP_SGI.RESCODE_SDP_SGI_NOT_EXIST_USER_ID:
                                state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_TCI, [protocol.getEndpointId(), userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_IDLE_STATE);
                                logger.debug("| SERVER change TCI state (HALF USN INFORMED STATE) ->  (IDLE)");

                                payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SGI.RESCODE_SWP_SGI_NOT_EXIST_USER_ID;
                                protocol.packMsg(g.SWP_MSG_TYPE.SWP_SGI_RSP, payload)
                                logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                res.send(protocol.getPackedMsg());
                                break;
                            case g.SDP_MSG_RESCODE.RESCODE_SDP_SGI.RESCODE_SDP_SGI_INCORRECT_CURRENT_USER_PASSWORD:
                                state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_TCI, [protocol.getEndpointId(), userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_IDLE_STATE);
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
                    logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`)
                    res.send(protocol.getPackedMsg());
                }
            });
        /*
         * Receive SAP: SGO-NOT
         * Last update: 10.24.2018
         * Author: Junhee Park
         */
        case g.SAP_MSG_TYPE.SAP_SGO_NOT:
            return state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_USN, protocol.getEndpointId(), (resState, searchedKey) => {
                let payload = {},
                    clientType = g.CLIENT_TYPE.APP;
                if (resState) {
                    //user sequence -> user state update
                    uModule.checkUserSignedInState(g.ENTITY_TYPE.SERVER, clientType, protocol.getEndpointId(), unpackedPayload.nsc, (result) => {
                        if (result === 1) {
                            payload.usn = protocol.getEndpointId();
                            payload.clientType = g.CLIENT_TYPE.APP;
                            payload = protocol.packMsg(g.SDP_MSG_TYPE.SDP_SGO_NOT, payload);
                            state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_USN, protocol.getEndpointId(), g.SERVER_USN_STATE_ID.SERVER_USN_HALF_IDLE_STATE);
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

                                                state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_USN, protocol.getEndpointId(), g.SERVER_USN_STATE_ID.SERVER_USN_IDLE_STATE);
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
            return state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_USN, protocol.getEndpointId(), (resState, searchedKey) => {
                let payload = {},
                    clientType = g.CLIENT_TYPE.WEB;
                if (resState) {
                    //user sequence -> user state update
                    uModule.checkUserSignedInState(g.ENTITY_TYPE.SERVER, clientType, protocol.getEndpointId(), unpackedPayload.nsc, (result) => {
                        if (result === 1) {
                            payload.usn = protocol.getEndpointId();
                            payload.clientType = g.CLIENT_TYPE.WEB;
                            payload = protocol.packMsg(g.SDP_MSG_TYPE.SDP_SGO_NOT, payload);
                            state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_USN, protocol.getEndpointId(), g.SERVER_USN_STATE_ID.SERVER_USN_HALF_IDLE_STATE);
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

                                                state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_USN, protocol.getEndpointId(), g.SERVER_USN_STATE_ID.SERVER_USN_IDLE_STATE);
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
            return state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_USN, protocol.getEndpointId(), (resState, searchedKey) => {
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
                                                            state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_USN, protocol.getEndpointId(), g.SERVER_USN_STATE_ID.SERVER_USN_USN_INFORMED_STATE, g.SERVER_TIMER.T863);
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

                                        state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_USN, protocol.getEndpointId(), g.SERVER_USN_STATE_ID.SERVER_USN_USN_INFORMED_STATE, g.SERVER_TIMER.T863);
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
            return state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_USN, protocol.getEndpointId(), (resState, searchedKey) => {
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
                                                            state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_USN, protocol.getEndpointId(), g.SERVER_USN_STATE_ID.SERVER_USN_USN_INFORMED_STATE, g.SERVER_TIMER.T863);
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

                                        state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_USN, protocol.getEndpointId(), g.SERVER_USN_STATE_ID.SERVER_USN_USN_INFORMED_STATE, g.SERVER_TIMER.T863);
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
            return state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_TCI, protocol.getEndpointId(), (resState, searchedKey) => {
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
            return state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_TCI, protocol.getEndpointId(), (resState, searchedKey) => {
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

        /*
         * Receive SWP: UDR-REQ
         * Last update: 10.24.2018
         * Author: Junhee Park
         */
        case g.SWP_MSG_TYPE.SWP_UDR_REQ:
            return state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_USN, protocol.getEndpointId(), (resState, searchedKey) => {
                /**
                 * Receive SWP: UDR-REQ
                 * 1.~ Check USN state.
                 * 1.1.~ If receivable
                 * 1.1.1. Check USER NSC
                 * 1.1.1.1.~ NSC is okay
                 * 1.1.1.1.1.~ update user state to deregistratered
                 * 1.1.1.1.2.~ Send message to the database
                 * 1.1.1.1.3.~ Receive message from the tserver
                 * 1.1.1.1.4.~ If message is okay
                 * 1.1.1.1.3.1.~ Okay
                 * 1.1.1.1.3.1.1.~ Delete user state
                 * 1.1.1.1.3.1.2.~ Send success message
                 * 1.1.1.1.3.2.~ Not Okay
                 * 1.1.1.1.3.2.1.~ Send fail message
                 * 1.1.1.1.3.2.2.~ Send err message
                 * 1.1.1.2.~ NSC is not okay
                 * 1.1.1.2.1~ Send error NSC
                 * 1.2.~ If not receivable
                 * 1.2.1.~ Send err not registered user
                 */
                let payload = {};
                // 1.1~
                if (resState) {
                    // 1.1.1.~
                    uModule.checkUserSignedInState(g.ENTITY_TYPE.WEBCLIENT, g.CLIENT_TYPE.WEB, protocol.getEndpointId(), unpackedPayload.nsc, (result) => {
                        // 1.1.1.1.~
                        if (result === 1) {
                            payload.userPw = unpackedPayload.userPw;
                            payload.clientType = g.CLIENT_TYPE.WEB;
                            payload = protocol.packMsg(g.SDP_MSG_TYPE.SDP_UDR_REQ, payload)
                            // 1.1.1.1.2.~
                            request.send('http://localhost:8080/databaseapi', payload, (message) => {
                                payload = {};
                                protocol.setMsg(message);
                                if (!protocol.verifyHeader()) return;
                                var unpackedPayload = protocol.unpackPayload();
                                if (!unpackedPayload) return;
                                switch (unpackedPayload.resultCode) {
                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_UDR.RESCODE_SDP_UDR_OK:
                                        // 1.1.1.1.1.~
                                        uModule.removeActiveUserInfo(g.ENTITY_TYPE.WEBCLIENT, protocol.getEndpointId(), (result) => {
                                            if (result) {
                                                state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_USN, protocol.getEndpointId(), g.SERVER_USN_STATE_ID.SERVER_USN_IDLE_STATE, g.SERVER_TIMER.T863);
                                                logger.debug("| SERVER change USN state (USN INFORMED) ->  (IDLE)");
                                                payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_UDR.RESCODE_SWP_UDR_OK;
                                                protocol.packMsg(g.SWP_MSG_TYPE.SWP_UDR_RSP, payload);
                                                logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                                res.send(protocol.getPackedMsg());
                                            }
                                        });
                                        break;

                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_UDR.RESCODE_SDP_UDR_UNALLOCATED_USER_SEQUENCE_NUMBER:
                                        payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_UDR.RESCODE_SDP_UDR_UNALLOCATED_USER_SEQUENCE_NUMBER;
                                        protocol.packMsg(g.SWP_MSG_TYPE.SWP_UDR_RSP, payload);
                                        logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                        res.send(protocol.getPackedMsg());
                                        break;

                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_UDR.RESCODE_SDP_UDR_INCORRECT_CURRENT_USER_PASSWORD:
                                        payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_UDR.RESCODE_SWP_UDR_INCORRECT_CURRENT_USER_PASSWORD;
                                        protocol.packMsg(g.SWP_MSG_TYPE.SWP_UDR_RSP, payload);
                                        logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                        res.send(protocol.getPackedMsg());
                                        break;
                                }
                            });
                            // 1.1.1.2.~
                        } else {
                            payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_UDR.RESCODE_SWP_UDR_INCORRECT_NUMBER_OF_SIGNED_IN_COMPLETIONS;
                            protocol.packMsg(g.SWP_MSG_TYPE.SWP_UDR_RSP, payload)
                            logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                            res.send(protocol.getPackedMsg());
                        }
                    });
                    // 1.2.~    
                }
            });

        /*
         * Receive SWP: AUV-REQ
         * Last update: 10.24.2018
         * Author: Junhee Park
         */
        case g.SWP_MSG_TYPE.SWP_AUV_REQ:
            return state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_USN, protocol.getEndpointId(), (resState, searchedKey) => {
                let payload = {};
                //state exist
                if (resState) {
                    uModule.checkUserSignedInState(g.ENTITY_TYPE.WEBCLIENT, g.CLIENT_TYPE.WEB, protocol.getEndpointId(), unpackedPayload.nsc, (result) => {
                        if (result === 1) {
                            //payload 생성
                            if (typeof unpackedPayload.regf !== 'undefined') payload.regf = unpackedPayload.regf;
                            if (typeof unpackedPayload.signf !== 'undefined') payload.signf = unpackedPayload.signf;
                            if (typeof unpackedPayload.ml !== 'undefined') payload.mlv = unpackedPayload.ml;
                            if (typeof unpackedPayload.userId !== 'undefined') payload.userId = unpackedPayload.userId;
                            if (typeof unpackedPayload.userFn !== 'undefined') payload.userFn = unpackedPayload.userFn;
                            if (typeof unpackedPayload.userLn !== 'undefined') payload.userLn = unpackedPayload.userLn;
                            if (typeof unpackedPayload.oprset !== 'undefined') payload.oprset = unpackedPayload.oprset;
                            payload.clientType = g.CLIENT_TYPE.WEB;
                            payload = protocol.packMsg(g.SDP_MSG_TYPE.SDP_AUV_REQ, payload)
                            request.send('http://localhost:8080/databaseapi', payload, (message) => {
                                payload = {};
                                protocol.setMsg(message);
                                if (!protocol.verifyHeader()) return;
                                unpackedPayload = protocol.unpackPayload();
                                if (!unpackedPayload) return;
                                switch (unpackedPayload.resultCode) {
                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_AUV.RESCODE_SDP_AUV_OK:
                                        //유저버퍼 업데이트
                                        uModule.updateUserSignedInState(g.ENTITY_TYPE.WEBCLIENT, protocol.getEndpointId(), (result) => {
                                            if (result) {
                                                // here!!
                                                payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_AUV.RESCODE_SWP_AUV_OK;
                                                payload.userInfoListEncodings = unpackedPayload.userInfoListEncodings;
                                                protocol.packMsg(g.SWP_MSG_TYPE.SWP_AUV_RSP, payload);
                                                state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_USN, protocol.getEndpointId(), g.SERVER_USN_STATE_ID.SERVER_USN_USN_INFORMED_STATE, g.SERVER_TIMER.T863);
                                                logger.debug("| SERVER change USN state (USN INFORMED) ->  (USN INFORMED)");

                                                logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                                res.send(protocol.getPackedMsg());
                                            }
                                        });
                                        break;
                                        
                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_AUV.RESCODE_SDP_AUV_OTHER:
                                        payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_AUV.RESCODE_SWP_AUV_OTHER;
                                        protocol.packMsg(g.SWP_MSG_TYPE.SWP_AUV_RSP, payload);

                                        logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                        res.send(protocol.getPackedMsg());
                                        break;

                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_AUV.RESCODE_SDP_AUV_UNALLOCATED_USER_SEQUENCE_NUMBER:
                                        payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_AUV.RESCODE_SWP_AUV_UNALLOCATED_USER_SEQUENCE_NUMBER;
                                        protocol.packMsg(g.SWP_MSG_TYPE.SWP_AUV_RSP, payload);

                                        logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                        res.send(protocol.getPackedMsg());
                                        break;

                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_AUV.RESCODE_SDP_AUV_UNAUTHORIZED_USER_SEQUENCE_NUMBER:
                                        payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_AUV.RESCODE_SWP_AUV_UNAUTHORIZED_USER_SEQUENCE_NUMBER;
                                        protocol.packMsg(g.SWP_MSG_TYPE.SWP_AUV_RSP, payload);

                                        logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                        res.send(protocol.getPackedMsg());
                                        break;

                                    default:
                                        break;
                                }
                            })
                        } else {
                            payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_AUV.RESCODE_SWP_AUV_INCORRECT_NUMBER_OF_SIGNED_IN_COMPLETIONS;
                            protocol.packMsg(g.SWP_MSG_TYPE.SWP_AUV_RSP, payload);

                            logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                            return res.send(protocol.getPackedMsg());
                        }
                    });
                    //state not exist
                } else {
                    payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_AUV.RESCODE_SWP_AUV_OTHER;
                    logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);

                    protocol.packMsg(g.SWP_MSG_TYPE.SWP_AUV_RSP, payload);
                    return res.send(protocol.getPackedMsg());
                }
            });
        /*
         * Receive SWP: ASR-REQ
         * Last update: 11.01.2018
         * Author: Junhee Park
         */
        case g.SWP_MSG_TYPE.SWP_ASR_REQ:
            state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_USN, protocol.getEndpointId(), (resState, searchedKey) => {
                //권한체크 필요 없음
                let payload = {};
                if (resState) {
                    return uModule.checkUserSignedInState(g.ENTITY_TYPE.WEBCLIENT, g.CLIENT_TYPE.WEB, protocol.getEndpointId(), unpackedPayload.nsc, (result) => {
                        if (result === 1) {
                            payload.wmac = unpackedPayload.wmac;
                            payload.cmac = unpackedPayload.cmac;
                            payload.clientType = g.CLIENT_TYPE.WEB;
                            payload = protocol.packMsg(g.SDP_MSG_TYPE.SDP_ASR_REQ, payload);

                            request.send('http://localhost:8080/databaseapi', payload, (message) => {
                                payload = {};
                                protocol.setMsg(message);
                                if (!protocol.verifyHeader()) return;
                                unpackedPayload = protocol.unpackPayload();
                                if (!unpackedPayload) return;
                                switch (unpackedPayload.resultCode) {
                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_ASR.RESCODE_SDP_ASR_OK:
                                        uModule.updateUserSignedInState(g.ENTITY_TYPE.WEBCLIENT, protocol.getEndpointId(), (result) => {
                                            if (result) {
                                                payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_ASR.RESCODE_SWP_ASR_OK;
                                                protocol.packMsg(g.SWP_MSG_TYPE.SWP_ASR_RSP, payload);

                                                state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_USN, protocol.getEndpointId(), g.SERVER_USN_STATE_ID.SERVER_USN_USN_INFORMED_STATE, g.SERVER_TIMER.T863);
                                                logger.debug("| SERVER change USN state (USN INFORMED) ->  (USN INFORMED)");

                                                logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                                return res.send(protocol.getPackedMsg());
                                            }
                                        });
                                        break;

                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_ASR.RESCODE_SDP_ASR_OTHER:
                                        payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_ASR.RESCODE_SWP_ASR_OTHER;
                                        protocol.packMsg(g.SWP_MSG_TYPE.SWP_ASR_RSP, payload);

                                        logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                        res.send(protocol.getPackedMsg());
                                        break;

                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_ASR.RESCODE_SDP_ASR_UNALLOCATED_USER_SEQUENCE_NUMBER:

                                        payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_ASR.RESCODE_SWP_ASR_UNALLOCATED_USER_SEQUENCE_NUMBER;
                                        protocol.packMsg(g.SWP_MSG_TYPE.SWP_ASR_RSP, payload);

                                        logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                        res.send(protocol.getPackedMsg());
                                        break;

                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_ASR.RESCODE_SDP_ASR_UNAUTHORIZED_USER_SEQUENCE_NUMBER:

                                        payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_ASR.RESCODE_SWP_ASR_UNAUTHORIZED_USER_SEQUENCE_NUMBER;
                                        protocol.packMsg(g.SWP_MSG_TYPE.SWP_ASR_RSP, payload);

                                        logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                        res.send(protocol.getPackedMsg());
                                        break;

                                    default:
                                        break;
                                }
                            })
                        } else if (result === 3) {
                            payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_ASR.RESCODE_SWP_ASR_INCORRECT_NUMBER_OF_SIGNED_IN_COMPLETIONS;
                            protocol.packMsg(g.SWP_MSG_TYPE.SWP_ASR_RSP, payload);

                            logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                            res.send(protocol.getPackedMsg());
                        }
                    });
                } else {
                    payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_ASR.RESCODE_SWP_ASR_OTHER;
                    protocol.packMsg(g.SWP_MSG_TYPE.SWP_ASR_RSP, payload)
                    
                    logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                    res.send(protocol.getPackedMsg());
                }
            });
            break;
        /*
         * Receive SWP: ASD-REQ
         * Last update: 10.25.2018
         * Author: Junhee Park
         */
        case g.SWP_MSG_TYPE.SWP_ASD_REQ:
            return state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_USN, protocol.getEndpointId(), (resState, searchedKey) => {
                let payload = {};
                //State exist
                if (resState) {
                    uModule.checkUserSignedInState(g.ENTITY_TYPE.WEBCLIENT, g.CLIENT_TYPE.WEB, protocol.getEndpointId(), unpackedPayload.nsc, (result) => {
                        if (result === 1) {
                            payload.wmac = unpackedPayload.wmac;
                            payload.drgcd = unpackedPayload.drgcd;
                            payload.userId = unpackedPayload.userId;
                            payload.clientType = g.CLIENT_TYPE.WEB;
                            payload = protocol.packMsg(g.SDP_MSG_TYPE.SDP_ASD_REQ, payload);

                            request.send('http://localhost:8080/databaseapi', payload, (message) => {
                                payload = {};
                                protocol.setMsg(message);
                                if (!protocol.verifyHeader()) return;
                                unpackedPayload = protocol.unpackPayload();
                                if (!unpackedPayload) return;
                                switch (unpackedPayload.resultCode) {
                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_ASD.RESCODE_SDP_ASD_OK:
                                        uModule.updateUserSignedInState(g.ENTITY_TYPE.WEBCLIENT, protocol.getEndpointId(), (result) => {
                                            if (result) {
                                                payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_ASD.RESCODE_SWP_ASD_OK;
                                                protocol.packMsg(g.SWP_MSG_TYPE.SWP_ASD_RSP, payload);
                                                
                                                state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_USN, protocol.getEndpointId(), g.SERVER_USN_STATE_ID.SERVER_USN_USN_INFORMED_STATE, g.SERVER_TIMER.T863);
                                                logger.debug("| SERVER change USN state (USN INFORMED) ->  (USN INFORMED)");

                                                logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`)
                                                return res.send(protocol.getPackedMsg());
                                            }
                                        });
                                        break;

                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_ASD.RESCODE_SDP_ASD_OTHER:
                                        payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_ASD.RESCODE_SWP_ASD_OTHER;
                                        protocol.packMsg(g.SWP_MSG_TYPE.SWP_ASD_RSP, payload);

                                        logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`)
                                        res.send(protocol.getPackedMsg());
                                        break;

                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_ASD.RESCODE_SDP_ASD_UNALLOCATED_USER_SEQUENCE_NUMBER:
                                        payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_ASD.RESCODE_SWP_ASD_UNALLOCATED_USER_SEQUENCE_NUMBER;
                                        protocol.packMsg(g.SWP_MSG_TYPE.SWP_ASD_RSP, payload);

                                        logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`)
                                        res.send(protocol.getPackedMsg());
                                        break;

                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_ASD.RESCODE_SDP_ASD_UNAUTHORIZED_USER_SEQUENCE_NUMBER:
                                        payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_ASD.RESCODE_SWP_ASD_UNAUTHORIZED_USER_SEQUENCE_NUMBER;
                                        protocol.packMsg(g.SWP_MSG_TYPE.SWP_ASD_RSP, payload);

                                        logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`)
                                        res.send(protocol.getPackedMsg());
                                        break;

                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_ASD.RESCODE_SDP_ASD_NOT_EXIST_WIFI_MAC_ADDRESS:
                                        payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_ASD.RESCODE_SDP_ASD_NOT_EXIST_WIFI_MAC_ADDRESS;
                                        protocol.packMsg(g.SWP_MSG_TYPE.SWP_ASD_RSP, payload);

                                        logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`)
                                        res.send(protocol.getPackedMsg());
                                        break;
                                        
                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_ASD.RESCODE_SDP_ASD_NOT_EXIST_USER_ID:
                                        payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_ASD.RESCODE_SWP_ASD_NOT_EXIST_USER_ID;
                                        protocol.packMsg(g.SWP_MSG_TYPE.SWP_ASD_RSP, payload);

                                        logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`)
                                        res.send(protocol.getPackedMsg());
                                        break;
                                        
                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_ASD.RESCODE_SDP_ASD_THE_REQUESTED_WIFI_MAC_IS_NOT_AN_ASSOCIATED_WITH_USER_ID:
                                        payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_ASD.RESCODE_SWP_ASD_OTHER;
                                        protocol.packMsg(g.SWP_MSG_TYPE.SWP_ASD_RSP, payload);

                                        logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`)
                                        res.send(protocol.getPackedMsg());
                                        break;
                                }
                            });
                        } else if (result === 3) {
                            payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_ASD.RESCODE_SWP_ASD_INCORRECT_NUMBER_OF_SIGNED_IN_COMPLETIONS;
                            protocol.packMsg(g.SWP_MSG_TYPE.SWP_ASD_RSP, payload);

                            logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`)
                            res.send(protocol.getPackedMsg());
                        }
                    });
                    //State not exist
                } else {
                    payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_ASD.RESCODE_SWP_ASD_OTHER;
                    logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`)

                    protocol.packMsg(g.SWP_MSG_TYPE.SWP_ASD_RSP, payload);
                    res.send(protocol.getPackedMsg());
                }
            });

        /*
         * Receive SWP: ASV-REQ
         * Last update: 10.25.2018
         * Author: Junhee Park
         */
        case g.SWP_MSG_TYPE.SWP_ASV_REQ:
            return state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_USN, protocol.getEndpointId(), (resState, searchedKey) => {
                let payload = {};
                //state exist
                if (resState) {
                    uModule.checkUserSignedInState(g.ENTITY_TYPE.WEBCLIENT, g.CLIENT_TYPE.WEB, protocol.getEndpointId(), unpackedPayload.nsc, (result) => {
                        if (result === 1) {
                            //payload 생성
                            if (typeof unpackedPayload.wmac !== 'undefined') payload.wmac = unpackedPayload.wmac;
                            if (typeof unpackedPayload.actf !== 'undefined') payload.actf = unpackedPayload.actf;
                            if (typeof unpackedPayload.mobf !== 'undefined') payload.mobf = unpackedPayload.mobf;
                            if (typeof unpackedPayload.nat !== 'undefined') payload.nat = unpackedPayload.nat;
                            if (typeof unpackedPayload.state !== 'undefined') payload.state = unpackedPayload.state;
                            if (typeof unpackedPayload.city !== 'undefined') payload.city = unpackedPayload.city;
                            if (typeof unpackedPayload.userId !== 'undefined') payload.userId = unpackedPayload.userId;
                            payload.clientType = g.CLIENT_TYPE.WEB;
                            payload = protocol.packMsg(g.SDP_MSG_TYPE.SDP_ASV_REQ, payload)
                            request.send('http://localhost:8080/databaseapi', payload, (message) => {
                                payload = {};
                                protocol.setMsg(message);
                                if (!protocol.verifyHeader()) return;
                                unpackedPayload = protocol.unpackPayload();
                                if (!unpackedPayload) return;
                                switch (unpackedPayload.resultCode) {
                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_ASV.RESCODE_SDP_ASV_OK:
                                        //유저버퍼 업데이트
                                        uModule.updateUserSignedInState(g.ENTITY_TYPE.WEBCLIENT, protocol.getEndpointId(), (result) => {
                                            if (result) {
                                                payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_ASV.RESCODE_SWP_ASV_OK;
                                                payload.selectedSensorInformationList = unpackedPayload.selectedSensorInformationList;
                                                protocol.packMsg(g.SWP_MSG_TYPE.SWP_ASV_RSP, payload);
                                                
                                                state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_USN, protocol.getEndpointId(), g.SERVER_USN_STATE_ID.SERVER_USN_USN_INFORMED_STATE, g.SERVER_TIMER.T863);
                                                logger.debug("| SERVER change USN state (USN INFORMED) ->  (USN INFORMED)");
                                                
                                                logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`)
                                                res.send(protocol.getPackedMsg());
                                            }
                                        });
                                        break;
                                        
                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_ASV.RESCODE_SDP_ASV_OTHER:
                                        payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_ASV.RESCODE_SWP_ASV_OTHER;
                                        protocol.packMsg(g.SWP_MSG_TYPE.SWP_ASV_RSP, payload);

                                        logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`)
                                        res.send(protocol.getPackedMsg());
                                        break;

                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_ASV.RESCODE_SDP_ASV_UNALLOCATED_USER_SEQUENCE_NUMBER:
                                        payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_ASV.RESCODE_SWP_ASV_UNALLOCATED_USER_SEQUENCE_NUMBER;
                                        protocol.packMsg(g.SWP_MSG_TYPE.SWP_ASV_RSP, payload);
                                        logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`)
                                        res.send(protocol.getPackedMsg());
                                        break;

                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_ASV.RESCODE_SDP_ASV_UNAUTHORIZED_USER_SEQUENCE_NUMBER:
                                        payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_ASV.RESCODE_SWP_ASV_UNAUTHORIZED_USER_SEQUENCE_NUMBER;
                                        protocol.packMsg(g.SWP_MSG_TYPE.SWP_ASV_RSP, payload);
                                        logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`)
                                        res.send(protocol.getPackedMsg());
                                        break;
                                }
                            })
                        } else {
                            payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_ASV.RESCODE_SWP_ASV_INCORRECT_NUMBER_OF_SIGNED_IN_COMPLETIONS;
                            protocol.packMsg(g.SWP_MSG_TYPE.SWP_ASV_RSP, payload);
                            logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                            res.send(protocol.getPackedMsg());
                        }
                    });
                    //state not exist
                } else {
                    payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_ASV.RESCODE_SWP_ASV_OTHER;
                    logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`)
                    protocol.packMsg(g.SWP_MSG_TYPE.SWP_ASV_RSP, payload);
                    res.send(protocol.getPackedMsg());
                }
            });
        /*
         * Receive SAP: SRG-REQ
         * Last update: 10.25.2018
         * Author: Junhee Park
         */
        case g.SAP_MSG_TYPE.SAP_SRG_REQ:
            return state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_USN, protocol.getEndpointId(), (resState, searchedKey) => {
                let payload = {};
                if (resState) {
                    uModule.checkUserSignedInState(g.ENTITY_TYPE.APPCLIENT, g.CLIENT_TYPE.APP, protocol.getEndpointId(), unpackedPayload.nsc, (result) => {
                        if (result === 1) {
                            payload.wmac = unpackedPayload.wmac;
                            payload.cmac = unpackedPayload.cmac;
                            payload.clientType = g.CLIENT_TYPE.APP;
                            payload = protocol.packMsg(g.SDP_MSG_TYPE.SDP_SRG_REQ, payload);
                            request.send('http://localhost:8080/databaseapi', payload, (message) => {
                                payload = {};
                                protocol.setMsg(message);
                                if (!protocol.verifyHeader()) return;
                                unpackedPayload = protocol.unpackPayload();
                                if (!unpackedPayload) return;

                                switch (unpackedPayload.resultCode) {
                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_SRG.RESCODE_SDP_SRG_OK:
                                        uModule.updateUserSignedInState(g.ENTITY_TYPE.APPCLIENT, protocol.getEndpointId(), (result) => {
                                            if (result) {
                                                payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_SRG.RESCODE_SAP_SRG_OK;
                                                protocol.packMsg(g.SAP_MSG_TYPE.SAP_SRG_RSP, payload);

                                                state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_USN, protocol.getEndpointId(), g.SERVER_USN_STATE_ID.SERVER_USN_USN_INFORMED_STATE, g.SERVER_TIMER.T863);
                                                logger.debug("| SERVER change USN state (USN INFORMED) ->  (USN INFORMED)");

                                                logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                                res.send(protocol.getPackedMsg());
                                            }
                                        });
                                        break;

                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_SRG.RESCODE_SDP_SRG_OTHER:
                                        payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_SRG.RESCODE_SAP_SRG_OTHER;
                                        protocol.packMsg(g.SAP_MSG_TYPE.SAP_SRG_RSP, payload);

                                        logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                        res.send(protocol.getPackedMsg());
                                        break;

                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_SRG.RESCODE_SDP_SRG_UNALLOCATED_USER_SEQUENCE_NUMBER:
                                        payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_SRG.RESCODE_SAP_SRG_UNALLOCATED_USER_SEQUENCE_NUMBER;
                                        protocol.packMsg(g.SAP_MSG_TYPE.SAP_SRG_RSP, payload);

                                        logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                        res.send(protocol.getPackedMsg());
                                        break;
                                }
                            })
                        } else if (result === 3) {
                            payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_SRG.RESCODE_SAP_SRG_INCORRECT_NUMBER_OF_SIGNED_IN_COMPLETIONS;
                            protocol.packMsg(g.SAP_MSG_TYPE.SAP_SRG_RSP, payload);

                            logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                            res.send(protocol.getPackedMsg());
                        }
                    });
                } else {
                    payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_SRG.RESCODE_SAP_SRG_OTHER;
                    protocol.packMsg(g.SAP_MSG_TYPE.SAP_SRG_RSP, payload);

                    logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                    res.send(protocol.getPackedMsg());
                }
            });

        /*
         * Receive SWP: SRG-REQ
         * Last update: 10.25.2018
         * Author: Junhee Park
         */
        case g.SWP_MSG_TYPE.SWP_SRG_REQ:
            return state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_USN, protocol.getEndpointId(), (resState, searchedKey) => {
                let payload = {};
                if (resState) {
                    uModule.checkUserSignedInState(g.ENTITY_TYPE.WEBCLIENT, g.CLIENT_TYPE.WEB, protocol.getEndpointId(), unpackedPayload.nsc, (result) => {
                        if (result === 1) {
                            payload.wmac = unpackedPayload.wmac;
                            payload.cmac = unpackedPayload.cmac;
                            payload.clientType = g.CLIENT_TYPE.WEB;
                            payload = protocol.packMsg(g.SDP_MSG_TYPE.SDP_SRG_REQ, payload);
                            request.send('http://localhost:8080/databaseapi', payload, (message) => {
                                payload = {};
                                protocol.setMsg(message);
                                if (!protocol.verifyHeader()) return;
                                unpackedPayload = protocol.unpackPayload();
                                if (!unpackedPayload) return;

                                switch (unpackedPayload.resultCode) {
                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_SRG.RESCODE_SDP_SRG_OK:
                                        uModule.updateUserSignedInState(g.ENTITY_TYPE.WEBCLIENT, protocol.getEndpointId(), (result) => {
                                            if (result) {
                                                payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SRG.RESCODE_SWP_SRG_OK;
                                                protocol.packMsg(g.SWP_MSG_TYPE.SWP_SRG_RSP, payload);

                                                state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_USN, protocol.getEndpointId(), g.SERVER_USN_STATE_ID.SERVER_USN_USN_INFORMED_STATE, g.SERVER_TIMER.T863);
                                                logger.debug("| SERVER change USN state (USN INFORMED) ->  (USN INFORMED)");

                                                logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                                res.send(protocol.getPackedMsg());
                                            }
                                        });
                                        break;

                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_SRG.RESCODE_SDP_SRG_OTHER:
                                        payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SRG.RESCODE_SWP_SRG_OTHER;
                                        protocol.packMsg(g.SWP_MSG_TYPE.SWP_SRG_RSP, payload);

                                        logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                        res.send(protocol.getPackedMsg());
                                        break;

                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_SRG.RESCODE_SDP_SRG_UNALLOCATED_USER_SEQUENCE_NUMBER:
                                        payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SRG.RESCODE_SWP_SRG_UNALLOCATED_USER_SEQUENCE_NUMBER;
                                        protocol.packMsg(g.SWP_MSG_TYPE.SWP_SRG_RSP, payload);

                                        logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                        res.send(protocol.getPackedMsg());
                                        break;
                                }
                            })
                        } else if (result === 3) {
                            payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SRG.RESCODE_SWP_SRG_INCORRECT_NUMBER_OF_SIGNED_IN_COMPLETIONS;
                            protocol.packMsg(g.SWP_MSG_TYPE.SWP_SRG_RSP, payload);

                            logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                            res.send(protocol.getPackedMsg());
                        }
                    });
                } else {
                    payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SRG.RESCODE_SWP_SRG_OTHER;
                    protocol.packMsg(g.SWP_MSG_TYPE.SWP_SRG_RSP, payload);
                    
                    logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                    res.send(protocol.getPackedMsg());
                }
            });

        /*
         * Receive SAP: SAS-REQ
         * Last update: 10.25.2018
         * Author: Junhee Park
         */
        case g.SAP_MSG_TYPE.SAP_SAS_REQ:
            return state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_USN, protocol.getEndpointId(), (resState, searchedKey) => {
                let payload = {};
                if (resState) {
                    uModule.checkUserSignedInState(g.ENTITY_TYPE.APPCLIENT, g.CLIENT_TYPE.APP, protocol.getEndpointId(), unpackedPayload.nsc, (result) => {
                        if (result === 1) {
                            payload.wmac = unpackedPayload.wmac;
                            payload.mobf = unpackedPayload.mobf;
                            payload.clientType = g.CLIENT_TYPE.APP;
                            payload = protocol.packMsg(g.SDP_MSG_TYPE.SDP_SAS_REQ, payload);
                            request.send('http://localhost:8080/databaseapi', payload, (message) => {
                                payload = {};
                                protocol.setMsg(message);
                                if (!protocol.verifyHeader()) return;
                                unpackedPayload = protocol.unpackPayload();
                                if (!unpackedPayload) return;
                                console.log('test');
                                switch (unpackedPayload.resultCode) {
                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_SAS.RESCODE_SDP_SAS_OK:
                                        uModule.updateUserSignedInState(g.ENTITY_TYPE.APPCLIENT, protocol.getEndpointId(), (result) => {
                                            if (result) {
                                                payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_SAS.RESCODE_SAP_SAS_OK;
                                                protocol.packMsg(g.SAP_MSG_TYPE.SAP_SAS_RSP, payload);
                                                console.log(payload);
                                                state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_USN, protocol.getEndpointId(), g.SERVER_USN_STATE_ID.SERVER_USN_USN_INFORMED_STATE, g.SERVER_TIMER.T863);
                                                logger.debug("| SERVER change USN state (USN INFORMED) ->  (USN INFORMED)");

                                                logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                                res.send(protocol.getPackedMsg());
                                            }
                                        });
                                        break;

                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_SAS.RESCODE_SDP_SAS_OTHER:
                                        payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_SAS.RESCODE_SAP_SAS_OTHER;
                                        protocol.packMsg(g.SAP_MSG_TYPE.SAP_SAS_RSP, payload);

                                        logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                        res.send(protocol.getPackedMsg());
                                        break;

                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_SAS.RESCODE_SDP_SAS_UNALLOCATED_USER_SEQUENCE_NUMBER:
                                        payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_SAS.RESCODE_SAP_SAS_UNALLOCATED_USER_SEQUENCE_NUMBER;
                                        protocol.packMsg(g.SAP_MSG_TYPE.SAP_SAS_RSP, payload);

                                        logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                        res.send(protocol.getPackedMsg());
                                        break;

                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_SAS.RESCODE_SDP_SAS_NOT_EXIST_WIFI_MAC_ADDRESS:
                                        payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_SAS.RESCODE_SDP_SAS_NOT_EXIST_WIFI_MAC_ADDRESS;
                                        protocol.packMsg(g.SAP_MSG_TYPE.SAP_SAS_RSP, payload);

                                        logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                        res.send(protocol.getPackedMsg());
                                        break;

                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_SAS.RESCODE_SDP_SAS_THE_REQUESTED_WIFI_MAC_WAS_ALREADY_ASSOCIATED_WITH_OWN_USN:
                                        payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_SAS.RESCODE_SAP_SAS_THE_REQUESTED_WIFI_MAC_WAS_ALREADY_ASSOCIATED_WITH_OWN_USN;
                                        protocol.packMsg(g.SAP_MSG_TYPE.SAP_SAS_RSP, payload);

                                        logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                        res.send(protocol.getPackedMsg());
                                        break;
                                }
                            });
                        } else if (result === 3) {
                            payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_SAS.RESCODE_SAP_SAS_INCORRECT_NUMBER_OF_SIGNED_IN_COMPLETIONS;
                            protocol.packMsg(g.SAP_MSG_TYPE.SAP_SAS_RSP, payload);

                            logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                            res.send(protocol.getPackedMsg());
                        }
                    });
                } else {
                    payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_SAS.RESCODE_SAP_SAS_OTHER;
                    protocol.packMsg(g.SAP_MSG_TYPE.SAP_SAS_RSP, payload);

                    logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                    res.send(protocol.getPackedMsg());
                }
            });
        

        /*
         * Receive SWP: SAS-REQ
         * Last update: 10.25.2018
         * Author: Junhee Park
         */
        case g.SWP_MSG_TYPE.SWP_SAS_REQ:
            return state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_USN, protocol.getEndpointId(), (resState, searchedKey) => {
                let payload = {};
                if (resState) {
                    uModule.checkUserSignedInState(g.ENTITY_TYPE.WEBCLIENT, g.CLIENT_TYPE.WEB, protocol.getEndpointId(), unpackedPayload.nsc, (result) => {
                        if (result === 1) {
                            payload.wmac = unpackedPayload.wmac;
                            payload.mobf = unpackedPayload.mobf;
                            payload.clientType = g.CLIENT_TYPE.WEB;
                            payload = protocol.packMsg(g.SDP_MSG_TYPE.SDP_SAS_REQ, payload);
                            request.send('http://localhost:8080/databaseapi', payload, (message) => {
                                payload = {};
                                protocol.setMsg(message);
                                if (!protocol.verifyHeader()) return;
                                unpackedPayload = protocol.unpackPayload();
                                if (!unpackedPayload) return;
                                switch (unpackedPayload.resultCode) {
                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_SAS.RESCODE_SDP_SAS_OK:
                                        uModule.updateUserSignedInState(g.ENTITY_TYPE.WEBCLIENT, protocol.getEndpointId(), (result) => {
                                            if (result) {
                                                payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SAS.RESCODE_SWP_SAS_OK;
                                                protocol.packMsg(g.SWP_MSG_TYPE.SWP_SAS_RSP, payload);
                                                
                                                state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_USN, protocol.getEndpointId(), g.SERVER_USN_STATE_ID.SERVER_USN_USN_INFORMED_STATE, g.SERVER_TIMER.T863);
                                                logger.debug("| SERVER change USN state (USN INFORMED) ->  (USN INFORMED)");
                                                
                                                logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                                res.send(protocol.getPackedMsg());
                                            }
                                        });
                                        break;

                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_SAS.RESCODE_SDP_SAS_OTHER:
                                        payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SAS.RESCODE_SWP_SAS_OTHER;
                                        protocol.packMsg(g.SWP_MSG_TYPE.SWP_SAS_RSP, payload);
                                        
                                        logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                        res.send(protocol.getPackedMsg());
                                        break;

                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_SAS.RESCODE_SDP_SAS_UNALLOCATED_USER_SEQUENCE_NUMBER:
                                        payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SAS.RESCODE_SWP_SAS_UNALLOCATED_USER_SEQUENCE_NUMBER;
                                        protocol.packMsg(g.SWP_MSG_TYPE.SWP_SAS_RSP, payload);
                                        
                                        logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                        res.send(protocol.getPackedMsg());
                                        break;

                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_SAS.RESCODE_SDP_SAS_NOT_EXIST_WIFI_MAC_ADDRESS:
                                        payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SAS.RESCODE_SDP_SAS_NOT_EXIST_WIFI_MAC_ADDRESS;
                                        protocol.packMsg(g.SWP_MSG_TYPE.SWP_SAS_RSP, payload);
                                        
                                        logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                        res.send(protocol.getPackedMsg());
                                        break;

                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_SAS.RESCODE_SDP_SAS_THE_REQUESTED_WIFI_MAC_WAS_ALREADY_ASSOCIATED_WITH_OWN_USN:
                                        payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SAS.RESCODE_SWP_SAS_THE_REQUESTED_WIFI_MAC_WAS_ALREADY_ASSOCIATED_WITH_OWN_USN;
                                        protocol.packMsg(g.SWP_MSG_TYPE.SWP_SAS_RSP, payload);

                                        logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                        res.send(protocol.getPackedMsg());
                                        break;
                                }
                            });
                        } else if (result === 3) {
                            payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SAS.RESCODE_SWP_SAS_INCORRECT_NUMBER_OF_SIGNED_IN_COMPLETIONS;
                            protocol.packMsg(g.SWP_MSG_TYPE.SWP_SAS_RSP, payload);

                            logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                            res.send(protocol.getPackedMsg());
                        }
                    });
                } else {
                    payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SAS.RESCODE_SWP_SAS_OTHER;
                    protocol.packMsg(g.SWP_MSG_TYPE.SWP_SAS_RSP, payload);

                    logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                    res.send(protocol.getPackedMsg());
                }
            });

        /**
         * Receive SAP: SDD-REQ
         * Last update: 10.25.2018
         * Author: Junhee Park
         */
        case g.SAP_MSG_TYPE.SAP_SDD_REQ:
            //check state
            return state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_USN, protocol.getEndpointId(), (resState, searchedKey) => {
                let payload = {};
                //State exist
                if (resState) {
                    uModule.checkUserSignedInState(g.ENTITY_TYPE.APPCLIENT, g.CLIENT_TYPE.APP, protocol.getEndpointId(), unpackedPayload.nsc, (result) => {
                        if (result === 1) {
                            payload.wmac = unpackedPayload.wmac;
                            payload.drgcd = unpackedPayload.drgcd;
                            payload.clientType = g.CLIENT_TYPE.APP;
                            payload = protocol.packMsg(g.SDP_MSG_TYPE.SDP_SDD_REQ, payload)
                            request.send('http://localhost:8080/databaseapi', payload, (message) => {
                                payload = {};
                                protocol.setMsg(message);
                                if (!protocol.verifyHeader()) return;
                                unpackedPayload = protocol.unpackPayload();
                                if (!unpackedPayload) return;
                                switch (unpackedPayload.resultCode) {
                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_SDD.RESCODE_SDP_SDD_OK:
                                        //유저버퍼 업데이트
                                        uModule.updateUserSignedInState(g.ENTITY_TYPE.APPCLIENT, protocol.getEndpointId(), (result) => {
                                            if (result) {
                                                payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_SDD.RESCODE_SAP_SDD_OK;
                                                protocol.packMsg(g.SAP_MSG_TYPE.SAP_SDD_RSP, payload);

                                                state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_USN, protocol.getEndpointId(), g.SERVER_USN_STATE_ID.SERVER_USN_USN_INFORMED_STATE, g.SERVER_TIMER.T863);
                                                logger.debug("| SERVER change USN state (USN INFORMED) ->  (USN INFORMED)");

                                                logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                                res.send(protocol.getPackedMsg());
                                            }
                                        });
                                        break;

                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_SDD.RESCODE_SDP_SDD_OTHER:
                                        payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_SDD.RESCODE_SAP_SDD_OTHER;
                                        protocol.packMsg(g.SAP_MSG_TYPE.SAP_SDD_RSP, payload);

                                        logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                        res.send(protocol.getPackedMsg());
                                        break;

                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_SDD.RESCODE_SDP_SDD_UNALLOCATED_USER_SEQUENCE_NUMBER:
                                        payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_SDD.RESCODE_SAP_SDD_UNALLOCATED_USER_SEQUENCE_NUMBER;
                                        protocol.packMsg(g.SAP_MSG_TYPE.SAP_SDD_RSP, payload);

                                        logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                        res.send(protocol.getPackedMsg());
                                        break;

                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_SDD.RESCODE_SDP_SDD_NOT_EXIST_USER_ID:
                                        payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_SDD.RESCODE_SAP_SDD_NOT_EXIST_USER_ID;
                                        protocol.packMsg(g.SAP_MSG_TYPE.SAP_SDD_RSP, payload);

                                        logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                        res.send(protocol.getPackedMsg());
                                        break;
                                }
                            });
                        } else if (result === 3) {
                            //시퀀스
                            payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_SDD.RESCODE_SAP_SDD_INCORRECT_NUMBER_OF_SIGNED_IN_COMPLETIONS;
                            protocol.packMsg(g.SAP_MSG_TYPE.SAP_SDD_RSP, payload)

                            logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                            res.send(protocol.getPackedMsg());
                        }
                    });
                    //State not exist
                } else {
                    payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_SDD.RESCODE_SAP_SDD_OTHER;
                    logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);

                    protocol.packMsg(g.SAP_MSG_TYPE.SAP_SDD_RSP, payload);
                    res.send(protocol.getPackedMsg());
                }
            });
            
        /**
         * Receive SWP: SDD-REQ
         * Last update: 10.25.2018
         * Author: Junhee Park
         */
        case g.SWP_MSG_TYPE.SWP_SDD_REQ:
            //check state
            return state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_USN, protocol.getEndpointId(), (resState, searchedKey) => {
                let payload = {};
                //State exist
                if (resState) {
                    uModule.checkUserSignedInState(g.ENTITY_TYPE.WEBCLIENT, g.CLIENT_TYPE.WEB, protocol.getEndpointId(), unpackedPayload.nsc, (result) => {
                        if (result === 1) {
                            payload.wmac = unpackedPayload.wmac;
                            payload.drgcd = unpackedPayload.drgcd;
                            payload.clientType = g.CLIENT_TYPE.WEB;
                            payload = protocol.packMsg(g.SDP_MSG_TYPE.SDP_SDD_REQ, payload)
                            request.send('http://localhost:8080/databaseapi', payload, (message) => {
                                payload = {};
                                protocol.setMsg(message);
                                if (!protocol.verifyHeader()) return;
                                unpackedPayload = protocol.unpackPayload();
                                if (!unpackedPayload) return;
                                switch (unpackedPayload.resultCode) {
                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_SDD.RESCODE_SDP_SDD_OK:
                                        //유저버퍼 업데이트
                                        uModule.updateUserSignedInState(g.ENTITY_TYPE.WEBCLIENT, protocol.getEndpointId(), (result) => {
                                            if (result) {
                                                payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SDD.RESCODE_SWP_SDD_OK;
                                                protocol.packMsg(g.SWP_MSG_TYPE.SWP_SDD_RSP, payload);

                                                state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_USN, protocol.getEndpointId(), g.SERVER_USN_STATE_ID.SERVER_USN_USN_INFORMED_STATE, g.SERVER_TIMER.T863);
                                                logger.debug("| SERVER change USN state (USN INFORMED) ->  (USN INFORMED)");
                                                
                                                logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                                res.send(protocol.getPackedMsg());
                                            }
                                        });
                                        break;

                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_SDD.RESCODE_SDP_SDD_OTHER:
                                        payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SDD.RESCODE_SWP_SDD_OTHER;
                                        protocol.packMsg(g.SWP_MSG_TYPE.SWP_SDD_RSP, payload);
                                        
                                        logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                        res.send(protocol.getPackedMsg());
                                        break;

                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_SDD.RESCODE_SDP_SDD_UNALLOCATED_USER_SEQUENCE_NUMBER:
                                        payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SDD.RESCODE_SWP_SDD_UNALLOCATED_USER_SEQUENCE_NUMBER;
                                        protocol.packMsg(g.SWP_MSG_TYPE.SWP_SDD_RSP, payload);
                                        
                                        logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                        res.send(protocol.getPackedMsg());
                                        break;

                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_SDD.RESCODE_SDP_SDD_NOT_EXIST_USER_ID:
                                        payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SDD.RESCODE_SWP_SDD_NOT_EXIST_USER_ID;
                                        protocol.packMsg(g.SWP_MSG_TYPE.SWP_SDD_RSP, payload);
                                        
                                        logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                        res.send(protocol.getPackedMsg());
                                        break;

                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_SDD.RESCODE_SDP_SDD_THE_REQUESTED_USN_AND_WIFI_MAC_ADDRESS_ARE_NOT_ASSOCIATED:
                                        payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SDD.RESCODE_SWP_SDD_THE_REQUESTED_USN_AND_WIFI_MAC_ADDRESS_ARE_NOT_ASSOCIATED;
                                        protocol.packMsg(g.SWP_MSG_TYPE.SWP_SDD_RSP, payload);

                                        logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                        res.send(protocol.getPackedMsg());
                                        break;
                                }
                            });
                        } else if (result === 3) {
                            //시퀀스
                            payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SDD.RESCODE_SWP_SDD_INCORRECT_NUMBER_OF_SIGNED_IN_COMPLETIONS;
                            protocol.packMsg(g.SWP_MSG_TYPE.SWP_SDD_RSP, payload)
                            
                            logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                            res.send(protocol.getPackedMsg());
                        }
                    });
                    //State not exist
                } else {
                    payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SDD.RESCODE_SWP_SDD_OTHER;
                    logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                    
                    protocol.packMsg(g.SWP_MSG_TYPE.SWP_SDD_RSP, payload);
                    res.send(protocol.getPackedMsg());
                }
            });

        /**
         * Receive SAP: SLV-REQ
         * Last update: 10.25.2018
         * Author: Junhee Park
         */
        case g.SAP_MSG_TYPE.SAP_SLV_REQ:
            return state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_USN, protocol.getEndpointId(), (resState, searchedKey) => {
                let payload = {};
                //state exist
                if (resState) {
                    uModule.checkUserSignedInState(g.ENTITY_TYPE.APPCLIENT, g.CLIENT_TYPE.APP, protocol.getEndpointId(), unpackedPayload.nsc, (result) => {
                        if (result === 1) {
                            payload.clientType = g.CLIENT_TYPE.APP;
                            payload = protocol.packMsg(g.SDP_MSG_TYPE.SDP_SLV_REQ, payload)
                            request.send('http://localhost:8080/databaseapi', payload, (message) => {
                                payload = {};
                                protocol.setMsg(message);
                                if (!protocol.verifyHeader()) return;
                                unpackedPayload = protocol.unpackPayload();
                                if (!unpackedPayload) return;
                                switch (unpackedPayload.resultCode) {
                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_SLV.RESCODE_SDP_SLV_OK:
                                        //유저버퍼 업데이트
                                        uModule.updateUserSignedInState(g.ENTITY_TYPE.APPCLIENT, protocol.getEndpointId(), (result) => {
                                            if (result) {
                                                payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_SLV.RESCODE_SAP_SLV_OK;
                                                payload.selectedSensorInformationList = unpackedPayload.selectedSensorInformationList;
                                                protocol.packMsg(g.SAP_MSG_TYPE.SAP_SLV_RSP, payload);

                                                state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_USN, protocol.getEndpointId(), g.SERVER_USN_STATE_ID.SERVER_USN_USN_INFORMED_STATE, g.SERVER_TIMER.T863);
                                                logger.debug("| SERVER change USN state (USN INFORMED) ->  (USN INFORMED)");

                                                logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                                res.send(protocol.getPackedMsg());
                                            }
                                        });
                                        break;
                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_SLV.RESCODE_SDP_SLV_OTHER:
                                        payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_SLV.RESCODE_SAP_SLV_OTHER;
                                        protocol.packMsg(g.SAP_MSG_TYPE.SAP_SLV_RSP, payload);

                                        logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                        res.send(protocol.getPackedMsg());
                                        break;

                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_SLV.RESCODE_SDP_SLV_UNALLOCATED_USER_SEQUENCE_NUMBER:
                                        payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_SLV.RESCODE_SAP_SLV_UNALLOCATED_USER_SEQUENCE_NUMBER;
                                        protocol.packMsg(g.SAP_MSG_TYPE.SAP_SLV_RSP, payload);

                                        logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                        res.send(protocol.getPackedMsg());
                                        break;
                                }
                            });
                        } else {
                            payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_SLV.RESCODE_SAP_SLV_INCORRECT_NUMBER_OF_SIGNED_IN_COMPLETIONS;
                            protocol.packMsg(g.SAP_MSG_TYPE.SAP_SLV_RSP, payload);

                            logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                            res.send(protocol.getPackedMsg());
                        }
                    });
                    //state not exist
                } else {
                    payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_SLV.RESCODE_SAP_SLV_OTHER;
                    logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);

                    protocol.packMsg(g.SAP_MSG_TYPE.SAP_SLV_RSP, payload);
                    res.send(protocol.getPackedMsg());
                }
            });

        /**
         * Receive SWP: SLV-REQ
         * Last update: 10.25.2018
         * Author: Junhee Park
         */
        case g.SWP_MSG_TYPE.SWP_SLV_REQ:
            return state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_USN, protocol.getEndpointId(), (resState, searchedKey) => {
                let payload = {};
                //state exist
                if (resState) {
                    uModule.checkUserSignedInState(g.ENTITY_TYPE.WEBCLIENT, g.CLIENT_TYPE.WEB, protocol.getEndpointId(), unpackedPayload.nsc, (result) => {
                        if (result === 1) {
                            payload.clientType = g.CLIENT_TYPE.WEB;
                            payload = protocol.packMsg(g.SDP_MSG_TYPE.SDP_SLV_REQ, payload)
                            request.send('http://localhost:8080/databaseapi', payload, (message) => {
                                payload = {};
                                protocol.setMsg(message);
                                if (!protocol.verifyHeader()) return;
                                unpackedPayload = protocol.unpackPayload();
                                if (!unpackedPayload) return;
                                switch (unpackedPayload.resultCode) {
                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_SLV.RESCODE_SDP_SLV_OK:
                                        //유저버퍼 업데이트
                                        uModule.updateUserSignedInState(g.ENTITY_TYPE.WEBCLIENT, protocol.getEndpointId(), (result) => {
                                            if (result) {
                                                payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SLV.RESCODE_SWP_SLV_OK;
                                                payload.selectedSensorInformationList = unpackedPayload.selectedSensorInformationList;
                                                protocol.packMsg(g.SWP_MSG_TYPE.SWP_SLV_RSP, payload);
                                                
                                                state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_USN, protocol.getEndpointId(), g.SERVER_USN_STATE_ID.SERVER_USN_USN_INFORMED_STATE, g.SERVER_TIMER.T863);
                                                logger.debug("| SERVER change USN state (USN INFORMED) ->  (USN INFORMED)");
                                                
                                                logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                                res.send(protocol.getPackedMsg());
                                            }
                                        });
                                        break;
                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_SLV.RESCODE_SDP_SLV_OTHER:
                                        payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SLV.RESCODE_SWP_SLV_OTHER;
                                        protocol.packMsg(g.SWP_MSG_TYPE.SWP_SLV_RSP, payload);

                                        logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                        res.send(protocol.getPackedMsg());
                                        break;

                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_SLV.RESCODE_SDP_SLV_UNALLOCATED_USER_SEQUENCE_NUMBER:
                                        payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SLV.RESCODE_SWP_SLV_UNALLOCATED_USER_SEQUENCE_NUMBER;
                                        protocol.packMsg(g.SWP_MSG_TYPE.SWP_SLV_RSP, payload);

                                        logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                        res.send(protocol.getPackedMsg());
                                        break;
                                }
                            });
                        } else {
                            payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SLV.RESCODE_SWP_SLV_INCORRECT_NUMBER_OF_SIGNED_IN_COMPLETIONS;
                            protocol.packMsg(g.SWP_MSG_TYPE.SWP_SLV_RSP, payload);

                            logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                            res.send(protocol.getPackedMsg());
                        }
                    });
                    //state not exist
                } else {
                    payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SLV.RESCODE_SWP_SLV_OTHER;
                    logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);

                    protocol.packMsg(g.SWP_MSG_TYPE.SWP_SLV_RSP, payload);
                    res.send(protocol.getPackedMsg());
                }
            });

        /**
         * Receive SSP: SIR-REQ
         * Last update: 10.25.2018
         * Author: Junhee Park
         */
        case g.SSP_MSG_TYPE.SSP_SIR_REQ:
            return redisCli.keys(`c:sta:s:s:${unpackedPayload.tsi}:*`, (err, keys) => {
                /**
                 * SSP: SIR-REQ
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
                let payload = {};
                if (err) {} else {
                    // 1.1.~ 
                    if (keys.length === 0) {
                        state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_SENSOR_TSI, [protocol.getEndpointId(), unpackedPayload.wmac], g.SERVER_TSI_STATE_ID.SERVER_TSI_HALF_SSN_INFORMED_STATE);
                        payload.wmac = unpackedPayload.wmac;
                        let wmac = unpackedPayload.wmac;
                        payload.clientType = g.CLIENT_TYPE.WEB;
                        var packedSdpSirReq = protocol.packMsg(g.SDP_MSG_TYPE.SDP_SIR_REQ, payload);
                        //1.1.1.~
                        request.send('http://localhost:8080/databaseapi', packedSdpSirReq, (message) => {
                            protocol.setMsg(message);
                            if (!protocol.verifyHeader()) return;
                            unpackedPayload = protocol.unpackPayload();
                            if (!unpackedPayload) return;
                            payload = {};
                            switch (unpackedPayload.resultCode) {
                                // 1.1.1.1.~
                                case g.SDP_MSG_RESCODE.RESCODE_SDP_SIR.RESCODE_SDP_SIR_OK:
                                    payload.resultCode = g.SSP_MSG_RESCODE.RESCODE_SSP_SIR.RESCODE_SSP_SIR_OK;
                                    payload.ssn = unpackedPayload.ssn;
                                    protocol.packMsg(g.SSP_MSG_TYPE.SSP_SIR_RSP, payload);

                                    state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_SENSOR_TSI, [protocol.getEndpointId(), wmac], g.SERVER_TSI_STATE_ID.SERVER_TSI_SSN_INFORMED_STATE, g.SERVER_TIMER.T801);
                                    state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_SENSOR_SSN, unpackedPayload.ssn, g.SERVER_SSN_STATE_ID.SERVER_SSN_HALF_CID_INFORMED_STATE, 300);
                                    logger.debug("| SERVER change SSN state (HALF SSN INFORMED) ->  (HALF CID INFORMED)");
                                    
                                    logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                    res.send(protocol.getPackedMsg());
                                    break;

                                    // 1.1.1.2.~
                                case g.SDP_MSG_RESCODE.RESCODE_SDP_SIR.RESCODE_SDP_SIR_NOT_EXIST_WIFI_MAC_ADDRESS:
                                    payload.resultCode = g.SSP_MSG_RESCODE.RESCODE_SSP_SIR.RESCODE_SSP_SIR_NOT_EXIST_WIFI_MAC_ADDRESS;
                                    protocol.packMsg(g.SSP_MSG_TYPE.SSP_SIR_RSP, payload)
                                    
                                    logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                    res.send(protocol.getPackedMsg());
                                    break;

                                case g.SDP_MSG_RESCODE.RESCODE_SDP_SIR.RESCODE_SDP_SIR_NOT_AN_ASSOCIATED_SENSOR_WITH_ANY_USER:
                                    payload.resultCode = g.SSP_MSG_RESCODE.RESCODE_SSP_SIR.RESCODE_SSP_SIR_NOT_AN_ASSOCIATED_SENSOR_WITH_ANY_USER;
                                    protocol.packMsg(g.SSP_MSG_TYPE.SSP_SIR_RSP, payload)
                                    
                                    logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                    res.send(protocol.getPackedMsg());
                                    break;

                            }
                        });
                        // 1.2.~
                    } else {
                        payload.resultCode = g.SSP_MSG_RESCODE.RESCODE_SSP_SIR.RESCODE_SSP_SIR_CONFLICT_OF_TEMPORARY_SENSOR_ID
                        protocol.packMsg(g.SSP_MSG_TYPE.SSP_SIR_RSP, payload)
                        
                        logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                        res.send(protocol.getPackedMsg());
                    }
                }
            });

        /**
         * Receive SSP: DCA-REQ
         * Last update: 10.25.2018
         * Author: Junhee Park
         */
        case g.SSP_MSG_TYPE.SSP_DCA_REQ:
            return state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_SENSOR_SSN, protocol.getEndpointId(), (resState, searchedKey) => {
                /**
                 * Receive SSP: DCA-REQ
                 * 1.~ Get SSN state
                 * 1.1.~ If state is SSN INFORMED
                 * 1.1.1.~ Update SSN state to HALF-CID INFORMED
                 * 1.1.2.~ Send SDP: DCA-REQ
                 * 1.1.2.1.~ If SDP: DCA-RSP code is 0
                 * 1.1.2.1.1.~ Get CID
                 * 1.1.2.1.2.~ Store CID state to buffer
                 * 1.1.2.1.3.~ Update SSN state to CID INFORMED
                 * 1.1.2.1.4.~ Send SSP: DCA-RSP with ok code
                 * 1.1.2.2.~ If SDP: DCA-RSP code is not 0
                 * 1.1.2.2.1.~ Update SSN state to IDLE
                 * 1.1.2.2.2.~ Send SSP: DCA-RSP with error codes except 1
                 * 1.2. If state is not SSN INFORMED 
                 * 1.2.1. Send SSP: DCA-RSP with error code 1
                 */
                let payload = {};
                // 1.1.~
                if (g.SERVER_RECV_STATE_BY_MSG.SSP_DCA_REQ.includes(resState)) {
                    // 1.1.1.~
                    state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_SENSOR_SSN, protocol.getEndpointId(), g.SERVER_SSN_STATE_ID.SERVER_SSN_HALF_CID_INFORMED_STATE);
                    logger.debug("| SERVER change SSN state (SSN INFORMED) ->  (HALF CID INFORMED)");

                    // 1.1.2.~
                    payload.lat = unpackedPayload.lat;
                    payload.lng = unpackedPayload.lng;
                    payload.nat = unpackedPayload.nat;
                    payload.state = unpackedPayload.state;
                    payload.city = unpackedPayload.city;
                    payload = protocol.packMsg(g.SDP_MSG_TYPE.SDP_DCA_REQ, payload);

                    request.send('http://localhost:8080/databaseapi', payload, (message) => {
                        payload = {};
                        protocol.setMsg(message);
                        if (!protocol.verifyHeader()) return;
                        unpackedPayload = protocol.unpackPayload();
                        if (!unpackedPayload) return;
                        switch (unpackedPayload.resultCode) {
                            // 1.1.2.1.~
                            case g.SDP_MSG_RESCODE.RESCODE_SDP_DCA.RESCODE_SDP_DCA_OK:
                                // 1.1.2.1.1.~
                                sModule.getNewConnId(g.CID_TYPE.SENSOR, (cid) => {
                                    // 1.1.2.1.2.~
                                    redisCli.multi([
                                        ["set", `c:con:s:${cid}:ssn`, protocol.getEndpointId(), 'EX', g.SERVER_TIMER.T835],
                                        ["set", `c:con:s:${cid}:tti`, g.SERVER_TIMER.T838, 'EX'
                                            , g.SERVER_TIMER.T835
                                        ],
                                        ["setbit", "c:con:s:all", protocol.getEndpointId(), 1]
                                    ]).exec((err, replies) => {
                                        if (err) {} else {
                                            // 1.1.2.1.3.~
                                            state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_SENSOR_SSN, protocol.getEndpointId(), g.SERVER_SSN_STATE_ID.SERVER_SSN_CID_INFORMED_STATE, g.SERVER_TIMER.T803);
                                            logger.debug("| SERVER change SSN state (HALF CID INFORMED) ->  (CID INFORMED)", g.SERVER_TIMER.T835);
                                           
                                            // 1.1.2.1.4.~
                                            payload.resultCode = g.SSP_MSG_RESCODE.RESCODE_SSP_DCA.RESCODE_SSP_DCA_OK;
                                            payload.cid = cid;
                                            payload.mti = g.SERVER_TIMER.T805;
                                            payload.tti = g.SERVER_TIMER.T806;
                                            payload.mobf = unpackedPayload.mobf;
                                            protocol.packMsg(g.SSP_MSG_TYPE.SSP_DCA_RSP, payload);
                                           
                                            logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                            res.send(protocol.getPackedMsg());

                                        }
                                    })
                                });
                                // 1.1.2.2.~
                                break;
                            case g.SDP_MSG_RESCODE.RESCODE_SDP_DCA.RESCODE_SDP_DCA_INITIAL_GPS_MISMACH:
                                //1.1.2.2.1.~
                                state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_SENSOR_SSN, protocol.getEndpointId(), g.SERVER_SSN_STATE_ID.SERVER_SSN_IDLE_STATE);
                                logger.debug("| SERVER change SSN state (HALF CID INFORMED) ->  (IDLE)");
                                
                                //1.1.2.2.2.~
                                payload.resultCode = g.SSP_MSG_RESCODE.RESCODE_SSP_DCA.RESCODE_SSP_DCA_MISMACH_INITIAL_GPS_INFORMATION;
                                protocol.packMsg(g.SSP_MSG_TYPE.SSP_DCA_RSP, payload);
                                
                                logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                res.send(protocol.getPackedMsg());
                                break;

                            case g.SDP_MSG_RESCODE.RESCODE_SDP_DCA.RESCODE_SDP_DCA_NOT_AN_ASSOCIATED_SENSOR_WITH_ANY_USER:
                                //1.1.2.2.1.~
                                state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_SENSOR_SSN, protocol.getEndpointId(), g.SERVER_SSN_STATE_ID.SERVER_SSN_IDLE_STATE);
                                logger.debug("| SERVER change SSN state (HALF CID INFORMED) ->  (IDLE)");
                                
                                //1.1.2.2.2.~
                                payload.resultCode = g.SSP_MSG_RESCODE.RESCODE_SSP_DCA.RESCODE_SSP_DCA_NOT_AN_ASSOCIATED_SENSOR_WITH_ANY_USER;
                                protocol.packMsg(g.SSP_MSG_TYPE.SSP_DCA_RSP, payload);
                                
                                logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                res.send(protocol.getPackedMsg());
                                break;

                        }
                    });
                    // 1.2.~
                } else {
                    //1.2.1.~
                    payload.resultCode = g.SSP_MSG_RESCODE.RESCODE_SSP_DCA.RESCODE_SSP_DCA_OTHER;
                    protocol.packMsg(g.SSP_MSG_TYPE.SSP_DCA_RSP, payload);

                    logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                    res.send(protocol.getPackedMsg());
                }
            });

        /**
         * Receive SAP: DCA-REQ
         * Last update: 10.25.2018
         * Author: Junhee Park
         */
        case g.SAP_MSG_TYPE.SAP_DCA_REQ:
            return state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_USN, protocol.getEndpointId(), (resState, searchedKey) => {
                /**
                 * Receive SAP: DCA-REQ
                 * 1.~ Get USN state
                 * 1.1.~ If state is USN INFORMED
                 * 1.1.1.~ Check the NSC
                 * 1.1.1.1.~ If NSC OK
                 * 1.1.1.1.1.~ Update USN state to HALF-CID INFORMED
                 * 1.1.1.1.2.~ Send SDP: DCA-REQ
                 * 1.1.1.1.2.1.~ If SDP: DCA-RSP code is 0
                 * 1.1.1.1.2.1.1.~ Get CID
                 * 1.1.1.1.2.1.2.~ Store CID state to buffer
                 * 1.1.1.1.2.1.3.~ Update USN state to CID INFORMED
                 * 1.1.1.1.2.1.4.~ Update user signed-in state in active buffer
                 * 1.1.1.1.2.1.5.~ Send SAP: DCA-RSP with ok code
                 * 1.1.1.1.2.2.~ If SDP: DCA-RSP code is not 0
                 * 1.1.1.1.2.2.1.~ Update USN state to USN INFORMED
                 * 1.1.1.1.2.2.2.~ Send SAP: DCA-RSP with error codes except 1
                 * 1.1.1.2.~ If NSC not Ok
                 * 1.1.1.2.1.~ Send SSP: DCA-RSP with error code 3
                 * 1.2. If state is not SSN INFORMED 
                 * 1.2.1. Send SSP: DCA-RSP with error code 1
                    // 1.1.1~
                    state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_USN, protocol.getEndpointId(), g.SERVER_USN_STATE_ID.SERVER_USN_HALF_CID_INFORMED_STATE);
                    logger.debug("| SERVER change USN state (USN INFORMED) ->  (HALF CID INFORMED)");
                */
                let payload = {};
                // 1.1.~
                if (g.SERVER_RECV_STATE_BY_MSG.SAP_DCA_REQ.includes(resState)) {
                    // 1.1.1~
                    uModule.checkUserSignedInState(g.ENTITY_TYPE.APPCLIENT, g.CLIENT_TYPE.APP, protocol.getEndpointId(), unpackedPayload.nsc, (result) => {
                        // 1.1.1.1.~
                        if (result === 1) {
                            // 1.1.1.1.1.~
                            state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_USN, protocol.getEndpointId(), g.SERVER_USN_STATE_ID.SERVER_USN_HALF_CID_INFORMED_STATE);
                            logger.debug("| SERVER change USN state (USN INFORMED) ->  (HALF CID INFORMED)");
                            // 1.1.1.1.2.~
                            payload = protocol.packMsg(g.SDP_MSG_TYPE.SDP_DCA_REQ, payload);
                            request.send('http://localhost:8080/databaseapi', payload, (message) => {
                                // 1.1.1.1.2.1.~
                                payload = {};
                                protocol.setMsg(message);
                                if (!protocol.verifyHeader()) return;
                                unpackedPayload = protocol.unpackPayload();
                                if (!unpackedPayload) return;
                                switch (unpackedPayload.resultCode) {
                                    // 1.1.1.1.2.1.~
                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_DCA.RESCODE_SDP_DCA_OK:
                                        // 1.1.1.1.2.1.1.~
                                        sModule.getNewConnId(g.CID_TYPE.SENSOR, (cid) => {
                                            // 1.1.1.1.2.1.2.~
                                            redisCli.multi([
                                                ["set", `c:con:a:${cid}:usn`, protocol.getEndpointId(), 'EX', g.SERVER_TIMER.T835],
                                                ["set", `c:con:a:${cid}:tti`, g.SERVER_TIMER.T838, 'EX', g.SERVER_TIMER.T835],
                                                ["setbit", "c:con:a:all", protocol.getEndpointId(), 1]
                                            ]).exec((err, replies) => {
                                                if (err) {} else {
                                                    // 1.1.1.1.2.1.3.~
                                                    state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_USN, protocol.getEndpointId(), g.SERVER_USN_STATE_ID.SERVER_USN_CID_INFORMED_STATE);
                                                    logger.debug("| SERVER change USN state (HALF CID INFORMED) ->  (CID INFORMED)", g.SERVER_TIMER.T835);
                                                    // 1.1.1.1.2.1.4.~
                                                    uModule.updateUserSignedInState(g.ENTITY_TYPE.APPCLIENT, protocol.getEndpointId(), (result) => {
                                                        if (result) {
                                                            // 1.1.1.1.2.1.5.~
                                                            payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_DCA.RESCODE_SAP_DCA_OK;
                                                            payload.cid = cid;
                                                            payload.mti = g.SERVER_TIMER.T837;
                                                            payload.tti = g.SERVER_TIMER.T838;
                                                            protocol.packMsg(g.SAP_MSG_TYPE.SAP_DCA_RSP, payload);
                                                            
                                                            logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                                            res.send(protocol.getPackedMsg());
                                                        }
                                                    });
                                                }
                                            });
                                        });
                                        break;

                                        // 1.1.1.1.2.2.~
                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_DCA.RESCODE_SDP_DCA_NOT_EXIST_USER_SEQUENCE_NUMBER_OR_SENSOR_SERIAL_NUMBER:
                                        //1.1.2.2.1.~
                                        state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_USN, protocol.getEndpointId(), g.SERVER_USN_STATE_ID.SERVER_USN_USN_INFORMED_STATE);
                                        logger.debug("| SERVER change USNN state (HALF CID INFORMED) ->  (USN INFORMED)");
                                        //1.1.2.2.2.~
                                        payload = {};
                                        payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_DCA.RESCODE_SAP_DCA_UNALLOCATED_USER_SEQUENCE_NUMBER;
                                        protocol.packMsg(g.SAP_MSG_TYPE.SAP_DCA_RSP, payload);
                                                                         
                                        logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                        res.send(protocol.getPackedMsg());
                                        break;

                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_DCA.RESCODE_SDP_DCA_OTHER:
                                        //1.1.2.2.1.~
                                        state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_USN, protocol.getEndpointId(), g.SERVER_USN_STATE_ID.SERVER_USN_USN_INFORMED_STATE);
                                        logger.debug("| SERVER change USN state (HALF CID INFORMED) ->  (USN INFORMED)");
                                        //1.1.2.2.2.~
                                        payload = {};
                                        payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_DCA.RESCODE_SAP_DCA_OTHER;
                                        protocol.packMsg(g.SAP_MSG_TYPE.SAP_DCA_RSP, payload);
                                        
                                        logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                        res.send(protocol.getPackedMsg());
                                        break;

                                    default:
                                        break;
                                }
                            });
                            // 1.1.1.2.~
                        } else {
                            // 1.1.1.2.1.~
                            payload = {};
                            payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_DCA.RESCODE_SAP_DCA_INCORRECT_NUMBER_OF_SIGNED_IN_COMPLETIONS;
                            protocol.packMsg(g.SAP_MSG_TYPE.SAP_DCA_RSP, payload);
                            
                            logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                            res.send(protocol.getPackedMsg());
                        }
                    });
                    // 1.2.~
                } else {
                    // 1.2.1.~
                    payload = {};
                    payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_DCA.RESCODE_SAP_DCA_OTHER;
                    protocol.packMsg(g.SAP_MSG_TYPE.SAP_DCA_RSP, payload);
                    
                    logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                    res.send(protocol.getPackedMsg());
                }
            });

        /**
         * Receive SSP: DCD-REQ
         * Last update: 10.25.2018
         * Author: Junhee Park
         */
        case g.SSP_MSG_TYPE.SSP_DCD_NOT:
            // 1.~
            return redisCli.get(`c:con:s:${protocol.getEndpointId()}:ssn`, (err, ssn) => {
                /*
                 * Receive SSP: DCD-NOT
                 * 
                 * 1.~ Check CID in connection buffer
                 * 1.1.~ If CID exist
                 * 1.1.1.~ Get SSN state
                 * 1.1.1.1.~ If state is CID INFORMED or Reasonable
                 * 1.1.1.1.1.~ Update CID INFORMED state to HALF-IDLE
                 * 1.1.1.1.2.~ Send SDP: DCD-NOT
                 * 1.1.1.1.2.1.~ If SDP: DCD-ACK 0
                 * 1.1.1.1.2.1.1.~ Delete connection buffer
                 * 1.1.1.1.2.1.2.~ Update HALF-IDLE to IDLE
                 * 1.1.1.1.2.1.3.~ Send SSP: DCD-ACK with 0
                 * 1.1.1.1.2.2.~ If SDP: DCD-ACK not 0
                 * 1.1.1.1.2.2.1.~ Update HALF-IDLE to IDLE
                 * 1.1.1.1.2.2.2.~ Send SSP: DCD-ACK with with rej code
                 * 1.1.1.2.~ If state is not reasonable or not exist
                 * 1.1.1.2.1.~ Remove CID
                 * 1.1.1.2.2.~ Break
                 * 1.2.~ If CID not exist
                 * 1.2.1.~ Break
                 */
                if (err) {} else {
                    // 1.1.~
                    if (ssn !== null) {
                        // 1.1.1.~
                        state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_SENSOR_SSN, ssn, (resState, searchedKey) => {
                            let payload = {};
                            // 1.1.1.1.~
                            if (g.SERVER_RECV_STATE_BY_MSG.SSP_DCD_NOT.includes(resState)) {
                                // 1.1.1.1.1.~
                                state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_SENSOR_SSN, protocol.getEndpointId(), g.SERVER_SSN_STATE_ID.SERVER_SSN_HALF_IDLE_STATE);
                                logger.debug("| SERVER change SSN state (CID INFORMED) ->  (HALF IDLE)");
                                // 1.1.1.1.2.~
                                let cid = protocol.getEndpointId();
                                payload.entityType = g.ENTITY_TYPE.SENSOR;
                                protocol.setEndpointId(ssn);
                                payload = protocol.packMsg(g.SDP_MSG_TYPE.SDP_DCD_NOT, payload);

                                request.send('http://localhost:8080/databaseapi', payload, (message) => {
                                    payload = {};
                                    protocol.setMsg(message);
                                    if (!protocol.verifyHeader()) return;
                                    var unpackedPayload = protocol.unpackPayload();
                                    if (!unpackedPayload) return;
                                    switch (unpackedPayload.resultCode) {
                                        // 1.1.1.1.2.1.~
                                        case g.SDP_MSG_RESCODE.RESCODE_SDP_DCD.RESCODE_SDP_DCD_OK:
                                            // 1.1.1.1.2.1.1. & 1.1.1.1.2.1.2. ~
                                            redisCli.multi([
                                                ["del", `c:con:s:${cid}:ssn`],
                                                ["del", `c:con:s:${cid}:tti`],
                                                ["setbit", "c:con:s:all", ssn, 0],
                                                //["set", "s:info:" + ssn + ":actf", 1]
                                            ]).exec((err, replies) => {
                                                if (err) {} else {
                                                    // 1.1.1.1.2.1.2.~
                                                    state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_SENSOR_SSN, protocol.getEndpointId(), g.SERVER_SSN_STATE_ID.SERVER_SSN_IDLE_STATE);
                                                    logger.debug("| SERVER change SSN state (HALF IDLE) ->  (IDLE)");
                                                    // 1.1.1.1.2.1.3.~
                                                    payload.resultCode = g.SSP_MSG_RESCODE.RESCODE_SSP_DCD.RESCODE_SSP_DCD_OK;
                                                    protocol.setEndpointId(cid);
                                                    protocol.packMsg(g.SSP_MSG_TYPE.SSP_DCD_ACK, payload);

                                                    logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                                    res.send(protocol.getPackedMsg());
                                                }
                                            })
                                            break;

                                        case g.SDP_MSG_RESCODE.RESCODE_SDP_DCD.RESCODE_SDP_DCD_OTHER:
                                            // 1.1.1.1.2.2.1.~
                                            state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_SENSOR_SSN, protocol.getEndpointId(), g.SERVER_SSN_STATE_ID.SERVER_SSN_IDLE_STATE);
                                            logger.debug("| SERVER change SSN state (HALF IDLE) ->  (IDLE)");
                                            // 1.1.1.1.2.2.2.~
                                            payload.resultCode = g.SSP_MSG_RESCODE.RESCODE_SSP_DCD.RESCODE_SSP_DCD_OTHER;
                                            protocol.packMsg(g.SSP_MSG_TYPE.SSP_DCD_ACK, payload);

                                            logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                            res.send(protocol.getPackedMsg());
                                            break;

                                        case g.SDP_MSG_RESCODE.RESCODE_SDP_DCD.RESCODE_SDP_DCD_NOT_EXIST_USER_SEQUENCE_NUMBER_OR_SENSOR_SERIAL_NUMBER:
                                            // 1.1.1.1.2.2.1.~
                                            state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_SENSOR_SSN, protocol.getEndpointId(), g.SERVER_SSN_STATE_ID.SERVER_SSN_IDLE_STATE);
                                            logger.debug("| SERVER change SSN state (HALF IDLE) ->  (IDLE)");
                                            // 1.1.1.1.2.2.2.~
                                            payload.resultCode = g.SSP_MSG_RESCODE.RESCODE_SSP_DCD.RESCODE_SSP_DCD_OTHER;
                                            protocol.packMsg(g.SSP_MSG_TYPE.SSP_DCD_ACK, payload);

                                            logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                            res.send(protocol.getPackedMsg());
                                            break;

                                    }
                                });
                                // 1.1.1.2.~
                            } else {
                                // 1.1.1.2.1.~
                                redisCli.del(`c:con:s:${protocol.getEndpointId()}:ssn`);
                            }
                        });
                        // 1.2.~
                    }
                }
            });

        /**
         * Receive SAP: DCD-REQ
         * Last update: 10.25.2018
         * Author: Junhee Park
         */
        case g.SAP_MSG_TYPE.SAP_DCD_NOT:
            // 1.~
            return redisCli.get(`c:con:a:${protocol.getEndpointId()}:usn`, (err, usn) => {
                if (err) {} else {
                    // 1.1.~
                    if (usn !== null) {
                        // 1.1.1.~
                        let payload = {};
                        state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_USN, usn, (resState, searchedKey) => {
                            // 1.1.1.1.~
                            if (g.SERVER_RECV_STATE_BY_MSG.SAP_DCD_NOT.includes(resState)) {
                                // 1.1.1.1.1.~
                                state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_USN, protocol.getEndpointId(), g.SERVER_USN_STATE_ID.SERVER_USN_HALF_CID_RELEASED_STATE);
                                logger.debug("| SERVER change USN state (CID INFORMED) ->  (HALF CID RELEASED)");

                                // 1.1.1.1.2.~
                                protocol.setEndpointId(usn);
                                payload.entityType = g.ENTITY_TYPE.APPCLIENT;
                                payload = protocol.packMsg(g.SDP_MSG_TYPE.SDP_DCD_NOT, payload);
                                request.send('http://localhost:8080/databaseapi', payload, (message) => {
                                    payload = {};
                                    protocol.setMsg(message);
                                    if (!protocol.verifyHeader()) return;
                                    unpackedPayload = protocol.unpackPayload();
                                    if (!unpackedPayload) return;
                                    switch (unpackedPayload.resultCode) {
                                        // 1.1.1.1.2.1.~
                                        case g.SDP_MSG_RESCODE.RESCODE_SDP_DCD.RESCODE_SDP_DCD_OK:
                                            // 1.1.1.1.2.1.1. & 1.1.1.1.2.1.2. ~
                                            redisCli.multi([
                                                ["del", `c:con:a:${protocol.getEndpointId()}:usn`],
                                                ["del", `c:con:a:${protocol.getEndpointId()}:tti`],
                                                ["setbit", 'c:con:a:all', usn,  0],
                                                //["set", "s:info:" + ssn + ":actf", 1]
                                            ]).exec((err, replies) => {
                                                if (err) {} else {
                                                    // 1.1.1.1.2.1.2.~
                                                    state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_USN, protocol.getEndpointId(), g.SERVER_USN_STATE_ID.SERVER_USN_USN_INFORMED_STATE);
                                                    logger.debug("| SERVER change USN state (HALF CID RELEASED) ->  (USN INFORMED)");

                                                    // 1.1.1.1.2.1.3.~
                                                    payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_DCD.RESCODE_SAP_DCD_OK;
                                                    protocol.packMsg(g.SAP_MSG_TYPE.SAP_DCD_ACK, payload);
                                                    
                                                    logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                                    res.send(protocol.getPackedMsg());
                                                }
                                            })
                                            break;
                                            // 1.1.1.1.2.2.~
                                        case g.SDP_MSG_RESCODE.RESCODE_SDP_DCD.RESCODE_SDP_DCD_OTHER:
                                            // 1.1.1.1.2.2.1.~
                                            state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_USN, protocol.getEndpointId(), g.SERVER_USN_STATE_ID.SERVER_USN_USN_INFORMED_STATE);
                                            logger.debug("| SERVER change USN state (HALF CID INFORMED) ->  (USN INFORMED)");
                                            // 1.1.1.1.2.2.2.~
                                            payload = {};
                                            payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_DCD.RESCODE_SAP_DCD_OTHER;
                                            protocol.packMsg(g.SAP_MSG_TYPE.SAP_DCD_ACK, payload);
                                            logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                            res.send(protocol.getPackedMsg());
                                            break;

                                        case g.SDP_MSG_RESCODE.RESCODE_SDP_DCD.RESCODE_SDP_DCD_NOT_EXIST_USER_SEQUENCE_NUMBER_OR_SENSOR_SERIAL_NUMBER:
                                            // 1.1.1.1.2.2.1.~
                                            state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_USN, protocol.getEndpointId(), g.SERVER_USN_STATE_ID.SERVER_USN_IDLE_STATE);
                                            logger.debug("| SERVER change SAP state (HALF IDLE) ->  (IDLE)");
                                            // 1.1.1.1.2.2.2.~
                                            payload = {};
                                            payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_DCD.RESCODE_SAP_DCD_OTHER;
                                            protocol.packMsg(g.SAP_MSG_TYPE.SAP_DCD_ACK, payload);
                                            logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                            res.send(protocol.getPackedMsg());
                                            break;
                                    }
                                });
                                // 1.1.1.2.~
                            } else {
                                // 1.1.1.2.1.~
                                redisCli.del('c:con:a:' + protocol.getEndpointId() + ':usn');
                            }
                        });
                    }
                }
            });
        /**
         * Receive SAP: RAV-REQ
         * Last update: 10.31.2018
         * Author: Junhee Park
         */
        case g.SAP_MSG_TYPE.SAP_RAV_REQ:
            if (protocol.getEndpointId() === 0) {
                redisCli.keys(`search:s:realtime:air:${unpackedPayload.provinceListEncodings.commonNatTierTuple.nat}:${unpackedPayload.provinceListEncodings.commonNatTierTuple.commonStateTierTuple[0].state}:${unpackedPayload.provinceListEncodings.commonNatTierTuple.commonStateTierTuple[0].commonCityTierTuple[0]}`, (err, keys) => {
                    if (err) {} else {
                        let commandSet = [];
                        let realtimeAirQualityDataList = [];
                        for (var index = 0; index < keys.length; index++) {
                            commandSet.push(['zrevrange', keys[index], 0, -1, 'WITHSCORES']);
                        }
                        redisCli.multi(commandSet).exec((err, replies) => {
                            if (err) {
                                logger.err('zrevrange');
                            } else {
                                if (replies.length === 0) {
                                    let payload = {};
                                    payload.realtimeAirQualityDataList = [];
                                    payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_RAV.RESCODE_SAP_RAV_OK;
                                    protocol.packMsg(g.SAP_MSG_TYPE.SAP_RAV_RSP, payload);
                                    logger.debug(`Server Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                    return res.send(protocol.getPackedMsg());
                                }
                                //replies[갯수만큼][0]: 키 [1]: 벨류
                                let arrData = [],
                                    arrKey = [];
                                for (let keyCount = 0; keyCount < (replies[0].length)/2; keyCount++) {
                                    arrData.push(replies[0][keyCount*2]);
                                    arrKey.push(replies[0][keyCount*2+1]);
                                }
                                commandSet = [];
                                for (let i = 0, x = arrKey.length; i < x; i++) {
                                    commandSet.push(['get', `s:info:${arrKey[i]}:wmac`]);
                                }
                                redisCli.multi(commandSet).exec((err, wmacs) => {
                                    if (err) {} else {
                                        arrKey = wmacs;
                                        for (let i = 0, x = arrData.length; i < x; i++) {
                                            realtimeAirQualityDataList.push(`${arrKey[i]},${arrData[i]}`);
                                        }
                                        let payload = {};
                                        payload.realtimeAirQualityDataList = realtimeAirQualityDataList;
                                        payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_RAV.RESCODE_SAP_RAV_OK;
                                        protocol.packMsg(g.SAP_MSG_TYPE.SAP_RAV_RSP, payload);
                                        logger.debug(`Server Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                        return res.send(protocol.getPackedMsg());
                                    }
                                });
                            }
                        });
                    }
                });
            } else {
                state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_USN, protocol.getEndpointId(), (resState, searchedKey) => {
                    let payload = {};
                    //state exist
                    if (resState) {
                        uModule.checkUserSignedInState(g.ENTITY_TYPE.APPCLIENT, g.CLIENT_TYPE.APP, protocol.getEndpointId(), unpackedPayload.nsc, (result) => {
                            if (result === 1) {
                                redisCli.keys(`search:s:realtime:air:${unpackedPayload.provinceListEncodings.commonNatTierTuple.nat}:${unpackedPayload.provinceListEncodings.commonNatTierTuple.commonStateTierTuple[0].state}:${unpackedPayload.provinceListEncodings.commonNatTierTuple.commonStateTierTuple[0].commonCityTierTuple[0]}`, (err, keys) => {
                                    if (err) {} else {
                                        let commandSet = [];
                                        let realtimeAirQualityDataList = [];
                                        for (var index = 0; index < keys.length; index++) {
                                            commandSet.push(['zrevrange', keys[index], 0, -1, 'WITHSCORES']);
                                        }
                                        redisCli.multi(commandSet).exec((err, replies) => {
                                            if (err) {
                                                logger.err('zrevrange');
                                            } else {
                                                if (replies.length === 0) {
                                                    let payload = {};
                                                    payload.realtimeAirQualityDataList = [];
                                                    payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_RAV.RESCODE_SWP_RAV_OK;
                                                    protocol.packMsg(g.SAP_MSG_TYPE.SAP_RAV_RSP, payload);
                                                    logger.debug(`Server Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                                    return res.send(protocol.getPackedMsg());
                                                }
                                                //replies[갯수만큼][0]: 키 [1]: 벨류
                                                let arrData = [],
                                                    arrKey = [];
                                                for (let keyCount = 0; keyCount < (replies[0].length) / 2; keyCount++) {
                                                    arrData.push(replies[0][keyCount * 2]);
                                                    arrKey.push(replies[0][keyCount * 2 + 1]);
                                                }
                                                commandSet = [];
                                                for (let i = 0, x = arrKey.length; i < x; i++) {
                                                    commandSet.push(['get', `s:info:${arrKey[i]}:wmac`]);
                                                }
                                                redisCli.multi(commandSet).exec((err, wmacs) => {
                                                    if (err) {} else {
                                                        arrKey = wmacs;
                                                        for (let i = 0, x = arrData.length; i < x; i++) {
                                                            realtimeAirQualityDataList.push(`${arrKey[i]},${arrData[i]}`);
                                                        }
                                                        let payload = {};
                                                        payload.realtimeAirQualityDataList = realtimeAirQualityDataList;
                                                        payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_RAV.RESCODE_SAP_RAV_OK;
                                                        protocol.packMsg(g.SAP_MSG_TYPE.SAP_RAV_RSP, payload);
                                                        logger.debug(`Server Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                                        res.send(protocol.getPackedMsg());
                                                    }
                                                });
                                            }
                                        });
                                    }
                                });
                            } else {
                                payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_RAV.RESCODE_SAP_RAV_INCORRECT_NUMBER_OF_SIGNED_IN_COMPLETIONS;
                                protocol.packMsg(g.SAP_MSG_TYPE.SAP_RAV_RSP, payload);
                                logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                res.send(protocol.getPackedMsg());
                            }
                        });
                        //state not exist
                    } else {
                        payload = {};
                        payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_RAV.RESCODE_SAP_RAV_UNALLOCATED_USER_SEQUENCE_NUMBER;
                        protocol.packMsg(g.SAP_MSG_TYPE.SAP_RAV_RSP, payload);
                        logger.debug(`Server Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                        res.send(protocol.getPackedMsg());
                    }
                });
            }
        break;

        /**
         * Receive SWP: RAV-REQ
         * Last update: 10.31.2018
         * Author: Junhee Park
         */
        case g.SWP_MSG_TYPE.SWP_RAV_REQ:
            if (protocol.getEndpointId() === 0) {
                redisCli.keys(`search:s:realtime:air:${unpackedPayload.provinceListEncodings.commonNatTierTuple.nat}:${unpackedPayload.provinceListEncodings.commonNatTierTuple.commonStateTierTuple[0].state}:${unpackedPayload.provinceListEncodings.commonNatTierTuple.commonStateTierTuple[0].commonCityTierTuple[0]}`, (err, keys) => {
                    if (err) {} else {
                        let commandSet = [];
                        let realtimeAirQualityDataList = [];
                        for (var index = 0; index < keys.length; index++) {
                            commandSet.push(['zrevrange', keys[index], 0, -1, 'WITHSCORES']);
                        }
                        redisCli.multi(commandSet).exec((err, replies) => {
                            if (err) {
                                logger.err('zrevrange');
                            } else {
                                if (replies.length === 0) {
                                    let payload = {};
                                    payload.realtimeAirQualityDataList = [];
                                    payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_RAV.RESCODE_SWP_RAV_OK;
                                    protocol.packMsg(g.SWP_MSG_TYPE.SWP_RAV_RSP, payload);
                                    logger.debug(`Server Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                    return res.send(protocol.getPackedMsg());
                                }
                                //replies[갯수만큼][0]: 키 [1]: 벨류
                                let arrData = [],
                                    arrKey = [];
                                for (let keyCount = 0; keyCount < (replies[0].length) / 2; keyCount++) {
                                    arrData.push(replies[0][keyCount * 2]);
                                    arrKey.push(replies[0][keyCount * 2 + 1]);
                                }
                                commandSet = [];
                                for (let i = 0, x = arrKey.length; i < x; i++) {
                                    commandSet.push(['get', `s:info:${arrKey[i]}:wmac`]);
                                }
                                redisCli.multi(commandSet).exec((err, wmacs) => {
                                    if (err) {} else {
                                        arrKey = wmacs;
                                        for (let i = 0, x = arrData.length; i < x; i++) {
                                            realtimeAirQualityDataList.push(`${arrKey[i]},${arrData[i]}`);
                                        }
                                        let payload = {};
                                        payload.realtimeAirQualityDataList = realtimeAirQualityDataList;
                                        payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_RAV.RESCODE_SWP_RAV_OK;
                                        protocol.packMsg(g.SWP_MSG_TYPE.SWP_RAV_RSP, payload);
                                        logger.debug(`Server Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                        return res.send(protocol.getPackedMsg());
                                    }
                                });
                            }
                        });
                    }
                });
            } else {
                state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_USN, protocol.getEndpointId(), (resState, searchedKey) => {
                    let payload = {};
                    //state exist
                    if (resState) {
                        uModule.checkUserSignedInState(g.ENTITY_TYPE.WEBCLIENT, g.CLIENT_TYPE.WEB, protocol.getEndpointId(), unpackedPayload.nsc, (result) => {
                            if (result === 1) {
                                redisCli.keys(`search:s:realtime:air:${unpackedPayload.provinceListEncodings.commonNatTierTuple.nat}:${unpackedPayload.provinceListEncodings.commonNatTierTuple.commonStateTierTuple[0].state}:${unpackedPayload.provinceListEncodings.commonNatTierTuple.commonStateTierTuple[0].commonCityTierTuple[0]}`, (err, keys) => {
                                    if (err) {} else {
                                        let commandSet = [];
                                        let realtimeAirQualityDataList = [];
                                        for (var index = 0; index < keys.length; index++) {
                                            commandSet.push(['zrevrange', keys[index], 0, -1, 'WITHSCORES']);
                                        }
                                        redisCli.multi(commandSet).exec((err, replies) => {
                                            if (err) {
                                                logger.err('zrevrange');
                                            } else {
                                                if (replies.length === 0) {
                                                    let payload = {};
                                                    payload.realtimeAirQualityDataList = [];
                                                    payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_RAV.RESCODE_SWP_RAV_OK;
                                                    protocol.packMsg(g.SWP_MSG_TYPE.SWP_RAV_RSP, payload);
                                                    logger.debug(`Server Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                                    return res.send(protocol.getPackedMsg());
                                                }
                                                //replies[갯수만큼][0]: 키 [1]: 벨류
                                                let arrData = [],
                                                    arrKey = [];
                                                for (let keyCount = 0; keyCount < (replies[0].length) / 2; keyCount++) {
                                                    arrData.push(replies[0][keyCount * 2]);
                                                    arrKey.push(replies[0][keyCount * 2 + 1]);
                                                }
                                                commandSet = [];
                                                for (let i = 0, x = arrKey.length; i < x; i++) {
                                                    commandSet.push(['get', `s:info:${arrKey[i]}:wmac`]);
                                                }
                                                redisCli.multi(commandSet).exec((err, wmacs) => {
                                                    if (err) {} else {
                                                        arrKey = wmacs;
                                                        for (let i = 0, x = arrData.length; i < x; i++) {
                                                            realtimeAirQualityDataList.push(`${arrKey[i]},${arrData[i]}`);
                                                        }
                                                        let payload = {};
                                                        payload.realtimeAirQualityDataList = realtimeAirQualityDataList;
                                                        payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_RAV.RESCODE_SWP_RAV_OK;
                                                        protocol.packMsg(g.SWP_MSG_TYPE.SWP_RAV_RSP, payload);
                                                        logger.debug(`Server Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                                        res.send(protocol.getPackedMsg());
                                                    }
                                                });
                                            }
                                        });
                                    }
                                });
                            } else {
                                payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_RAV.RESCODE_SWP_RAV_INCORRECT_NUMBER_OF_SIGNED_IN_COMPLETIONS;
                                protocol.packMsg(g.SWP_MSG_TYPE.SWP_RAV_RSP, payload);
                                logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                res.send(protocol.getPackedMsg());
                            }
                        });
                        //state not exist
                    } else {
                         payload = {};
                         payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_RAV.RESCODE_SWP_RAV_UNALLOCATED_USER_SEQUENCE_NUMBER;
                         protocol.packMsg(g.SWP_MSG_TYPE.SWP_RAV_RSP, payload);
                         logger.debug(`Server Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                         res.send(protocol.getPackedMsg());
                    }
                });
            }
            break;
        
        /**
         * Receive SWP: RHV-REQ
         * Last update: 10.31.2018
         * Author: Junhee Park
         */
        case g.SWP_MSG_TYPE.SWP_RHV_REQ:
            return state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_USN, protocol.getEndpointId(), (resState, searchedKey) => {
                let payload = {};
                //state exist
                if (resState) {
                    uModule.checkUserSignedInState(g.ENTITY_TYPE.WEBCLIENT, g.CLIENT_TYPE.WEB, protocol.getEndpointId(), unpackedPayload.nsc, (result) => {
                        if (result === 1) {
                            let key = Number(protocol.getEndpointId()),
                                lessKey = key - 1,
                                greaterKey = key + 1;

                            lessKey = `(${lessKey.toString()}`;
                            redisCli.zrangebyscore('search:a:realtime:heart', lessKey, greaterKey, (err, keys) => {
                                if (err) {} else {
                                    let payload = {};
                                    if (keys.length === 0)  {
                                        payload.ts = 0
                                        payload.lat = 0
                                        payload.lng = 0
                                        payload.hr = 0
                                        payload.rr = 0
                                    } else {
                                        payload.ts = keys[0].split(",")[0]
                                        payload.lat = keys[0].split(",")[1]
                                        payload.lng = keys[0].split(",")[2]
                                        payload.hr = keys[0].split(",")[3]
                                        payload.rr = keys[0].split(",")[4]
                                    }
                                    payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_RHV.RESCODE_SWP_RHV_OK;
                                    protocol.packMsg(g.SWP_MSG_TYPE.SWP_RHV_RSP, payload);
                                    logger.debug(`Server Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                    res.send(protocol.getPackedMsg());
                                }
                            });
                        } else {
                            payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_RAV.RESCODE_SWP_RAV_INCORRECT_NUMBER_OF_SIGNED_IN_COMPLETIONS;
                            protocol.packMsg(g.SWP_MSG_TYPE.SWP_RAV_RSP, payload);
                            logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                            res.send(protocol.getPackedMsg());
                        }
                    });
                    //state not exist
                } else {
                    payload = {};
                    payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_RAV.RESCODE_SWP_RAV_UNALLOCATED_USER_SEQUENCE_NUMBER;
                    protocol.packMsg(g.SWP_MSG_TYPE.SWP_RAV_RSP, payload);
                    logger.debug(`Server Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                    res.send(protocol.getPackedMsg());
                }
            });

        /**
         * Receive SWP: HAV-REQ
         * Last update: 11.05.2018
         * Author: Junhee Park
         */
        case g.SWP_MSG_TYPE.SWP_HAV_REQ:
            return state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_USN, protocol.getEndpointId(), (resState, searchedKey) => {
                if (g.SERVER_RECV_STATE_BY_MSG.SWP_HAV_REQ.includes(resState)) {
                    let payload = {};
                    uModule.checkUserSignedInState(g.ENTITY_TYPE.WEBCLIENT, g.CLIENT_TYPE.WEB, protocol.getEndpointId(), unpackedPayload.nsc, (result) => {
                        if (result === 1) {
                            payload.ownershipCode = unpackedPayload.ownershipCode;
                            payload.sTs = unpackedPayload.sTs;
                            payload.eTs = unpackedPayload.eTs;
                            payload.numOfHavFlgRetran = unpackedPayload.numOfHavFlgRetran;
                            payload.nat = unpackedPayload.nat;
                            payload.state = unpackedPayload.state;
                            payload.city = unpackedPayload.city;
                            payload.clientType = g.CLIENT_TYPE.WEB;
                            payload = protocol.packMsg(g.SDP_MSG_TYPE.SDP_HAV_REQ, payload);
                            request.send('http://localhost:8080/databaseapi', payload, (message) => {
                                protocol.setMsg(message);
                                if (!protocol.verifyHeader()) return;
                                let unpackedPayload = protocol.unpackPayload();
                                if (!unpackedPayload) return;
                                //switch
                                switch (unpackedPayload.resultCode) {
                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_HAV.RESCODE_SDP_HAV_OK:
                                        payload = {}
                                        payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_HAV.RESCODE_SWP_HAV_OK;
                                        payload.lastFlg = unpackedPayload.lastFlg;
                                        ///here. need to be define
                                        payload.flgSeqNum = unpackedPayload.flgSeqNum;
                                        payload.historicalAirQualityDataListEncodings = unpackedPayload.historicalAirQualityDataListEncodings;
                                        protocol.packMsg(g.SWP_MSG_TYPE.SWP_HAV_RSP, payload);

                                        logger.debug(`Server Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                        res.send(protocol.getPackedMsg());
                                        break;

                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_HAV.RESCODE_SDP_HAV_OTHER:
                                        payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_HAV.RESCODE_SWP_HAV_OTHER;
                                        protocol.packMsg(g.SWP_MSG_TYPE.SWP_HAV_RSP, payload);

                                        logger.debug(`Server Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                        res.send(protocol.getPackedMsg());
                                        break;

                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_HAV.RESCODE_SDP_HAV_UNALLOCATED_USER_SEQUENCE_NUMBER:
                                        payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_HAV.RESCODE_SWP_HAV_UNALLOCATED_USER_SEQUENCE_NUMBER;
                                        protocol.packMsg(g.SWP_MSG_TYPE.SWP_HAV_RSP, payload);

                                        logger.debug(`Server Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                        res.send(protocol.getPackedMsg());
                                        break;

                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_HAV.RESCODE_SDP_HAV_REQUESTED_BY_AN_UNAUTHORIZED_USER_SEQUENCE_NUMBER:
                                        payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_HAV.RESCODE_SWP_HAV_REQUESTED_BY_AN_UNAUTHORIZED_USER_SEQUENCE_NUMBER;
                                        protocol.packMsg(g.SWP_MSG_TYPE.SWP_HAV_RSP, payload);

                                        logger.debug(`Server Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                        res.send(protocol.getPackedMsg());
                                        break;
                                }

                            });
                        } else {
                            payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_HAV.RESCODE_SWP_HAV_UNALLOCATED_USER_SEQUENCE_NUMBER;
                            protocol.packMsg(g.SWP_MSG_TYPE.SWP_HAV_RSP, payload);

                            logger.debug(`Server Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                            res.send(protocol.getPackedMsg());
                        }
                    });
                }
            });

        /**
         * Receive SWP: SHR-REQ
         * Last update: 11.05.2018
         * Author: Junhee Park
         */
        case g.SWP_MSG_TYPE.SWP_SHR_REQ:
            //1.Check USN. & 1.1.If USN is 0.~
            if (protocol.getEndpointId() === 0) {
                let payload = {};
                payload.nat = unpackedPayload.nat;
                payload.state = unpackedPayload.state;
                payload.city = unpackedPayload.city;
                payload.clientType = g.CLIENT_TYPE.WEB;
                payload = protocol.packMsg(g.SDP_MSG_TYPE.SDP_SHR_REQ, payload);
                request.send('http://localhost:8080/databaseapi', payload, (message) => {
                    payload = {};
                    protocol.setMsg(message);
                    if (!protocol.verifyHeader()) return;
                    let unpackedPayload = protocol.unpackPayload();
                    if (!unpackedPayload) return;
                    switch (unpackedPayload.resultCode) {
                        case g.SDP_MSG_RESCODE.RESCODE_SDP_SHR.RESCODE_SDP_SHR_OK:
                            payload.mlv = 0;
                            payload.historyRecordList = unpackedPayload.historyRecordList;
                            payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SHR.RESCODE_SWP_SHR_OK;
                            protocol.packMsg(g.SWP_MSG_TYPE.SWP_SHR_RSP, payload);

                            logger.debug(`Server Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                            return res.send(protocol.getPackedMsg());
                        case g.SDP_MSG_RESCODE.RESCODE_SDP_SHR.RESCODE_SDP_SHR_OTHER:
                            payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SHR.RESCODE_SWP_SHR_OTHER;
                            protocol.packMsg(g.SWP_MSG_TYPE.SWP_SHR_RSP, payload);

                            logger.debug(`Server Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                            return res.send(protocol.getPackedMsg());
                        case g.SDP_MSG_RESCODE.RESCODE_SDP_SHR.RESCODE_SDP_SHR_UNALLOCATED_USER_SEQUENCE_NUMBER:
                            payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SHR.RESCODE_SWP_SHR_UNALLOCATED_USER_SEQUENCE_NUMBER;
                            protocol.packMsg(g.SWP_MSG_TYPE.SWP_SHR_RSP, payload);

                            logger.debug(`Server Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                            return res.send(protocol.getPackedMsg());

                    }
                });
            // 1.2. IF USN is not 0.~
            } else {
                return state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_USN, protocol.getEndpointId(), (resState, searchedKey) => {
                    if (g.SERVER_RECV_STATE_BY_MSG.SWP_SHR_REQ.includes(resState)) {
                        uModule.checkUserSignedInState(g.ENTITY_TYPE.WEBCLIENT, g.CLIENT_TYPE.WEB, protocol.getEndpointId(), unpackedPayload.nsc, (result) => {
                            let payload = {};
                            if (result === 1) {
                                payload.nat = unpackedPayload.nat;
                                payload.state = unpackedPayload.state;
                                payload.city = unpackedPayload.city;
                                payload.clientType = g.CLIENT_TYPE.WEB;
                                payload = protocol.packMsg(g.SDP_MSG_TYPE.SDP_SHR_REQ, payload);
                                request.send('http://localhost:8080/databaseapi', payload, (message) => {
                                    payload = {};
                                    protocol.setMsg(message);
                                    if (!protocol.verifyHeader()) return;
                                    let unpackedPayload = protocol.unpackPayload();
                                    if (!unpackedPayload) return;
                                    switch (unpackedPayload.resultCode) {
                                        case g.SDP_MSG_RESCODE.RESCODE_SDP_SHR.RESCODE_SDP_SHR_OK:
                                            payload.mlv = 0;
                                            payload.historyRecordList = unpackedPayload.historyRecordList;
                                            payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SHR.RESCODE_SWP_SHR_OK;
                                            protocol.packMsg(g.SWP_MSG_TYPE.SWP_SHR_RSP, payload);

                                            logger.debug(`Server Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                            res.send(protocol.getPackedMsg());
                                            break;

                                        case g.SDP_MSG_RESCODE.RESCODE_SDP_SHR.RESCODE_SDP_SHR_OTHER:
                                            payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SHR.RESCODE_SWP_SHR_OTHER;
                                            protocol.packMsg(g.SWP_MSG_TYPE.SWP_SHR_RSP, payload);

                                            logger.debug(`Server Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                            res.send(protocol.getPackedMsg());
                                            break;

                                        case g.SDP_MSG_RESCODE.RESCODE_SDP_SHR.RESCODE_SDP_SHR_UNALLOCATED_USER_SEQUENCE_NUMBER:
                                            payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SHR.RESCODE_SWP_SHR_UNALLOCATED_USER_SEQUENCE_NUMBER;
                                            protocol.packMsg(g.SWP_MSG_TYPE.SWP_SHR_RSP, payload);

                                            logger.debug(`Server Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                            res.send(protocol.getPackedMsg());
                                            break;
                                    }
                                });
                            } else if (result === 2) {
                                payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SHR.RESCODE_SWP_SHR_UNALLOCATED_USER_SEQUENCE_NUMBER;
                                protocol.packMsg(g.SWP_MSG_TYPE.SWP_SHR_RSP, payload);

                                logger.debug(`Server Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                res.send(protocol.getPackedMsg());

                            } else if (result === 3) {
                                payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_SHR.RESCODE_SWP_SHR_INCORRECT_NUMBER_OF_SIGNED_IN_COMPLETIONS;
                                protocol.packMsg(g.SWP_MSG_TYPE.SWP_SHR_RSP, payload);

                                logger.debug(`Server Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                res.send(protocol.getPackedMsg());
                            }
                        });
                    }
                });
            }
            break;
        /**
         * Receive SAP: HHV-REQ
         * Last update: 11.07.2018
         * Author: Junhee Park
         */
        case g.SAP_MSG_TYPE.SAP_HHV_REQ:
            return state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_USN, protocol.getEndpointId(), (resState, searchedKey) => {
                if (g.SERVER_RECV_STATE_BY_MSG.SAP_HHV_REQ.includes(resState)) {
                    let payload = {};
                    uModule.checkUserSignedInState(g.ENTITY_TYPE.APPCLIENT, g.CLIENT_TYPE.APP, protocol.getEndpointId(), unpackedPayload.nsc, (result) => {
                        if (result === 1) {
                            payload.sTs = unpackedPayload.sTs;
                            payload.eTs = unpackedPayload.eTs;
                            payload.nat = unpackedPayload.nat;
                            payload.state = unpackedPayload.state;
                            payload.city = unpackedPayload.city;
                            payload.clientType = g.CLIENT_TYPE.APP;
                            payload = protocol.packMsg(g.SDP_MSG_TYPE.SDP_HHV_REQ, payload);
                            request.send('http://localhost:8080/databaseapi', payload, (message) => {
                                protocol.setMsg(message);
                                if (!protocol.verifyHeader()) return;
                                unpackedPayload = protocol.unpackPayload();
                                if (!unpackedPayload) return;
                                payload = {}
                                //switch
                                switch (unpackedPayload.resultCode) {
                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_HHV.RESCODE_SDP_HHV_OK:
                                        payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_HHV.RESCODE_SAP_HHV_OK;
                                        payload.historicalHeartQualityDataListEncodings = unpackedPayload.historicalHeartQualityDataListEncodings;
                                        protocol.packMsg(g.SAP_MSG_TYPE.SAP_HHV_RSP, payload);

                                        logger.debug(`Server Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                        res.send(protocol.getPackedMsg());
                                        break;

                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_HHV.RESCODE_SDP_HHV_OTHER:
                                        payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_HHV.RESCODE_SAP_HHV_OTHER;
                                        protocol.packMsg(g.SAP_MSG_TYPE.SAP_HHV_RSP, payload);

                                        logger.debug(`Server Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                        res.send(protocol.getPackedMsg());
                                        break;

                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_HHV.RESCODE_SDP_HHV_UNALLOCATED_USER_SEQUENCE_NUMBER:
                                        payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_HHV.RESCODE_SAP_HHV_UNALLOCATED_USER_SEQUENCE_NUMBER;
                                        protocol.packMsg(g.SAP_MSG_TYPE.SAP_HHV_RSP, payload);

                                        logger.debug(`Server Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                        res.send(protocol.getPackedMsg());
                                        break;
                                }

                            });
                        } else {
                            payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_HHV.RESCODE_SAP_HHV_UNALLOCATED_USER_SEQUENCE_NUMBER;
                            protocol.packMsg(g.SAP_MSG_TYPE.SAP_HHV_RSP, payload);

                            logger.debug(`Server Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                            res.send(protocol.getPackedMsg());
                        }
                    })
                }
            });

        /**
         * Receive SWP: HHV-REQ
         * Last update: 11.07.2018
         * Author: Junhee Park
         */
        case g.SWP_MSG_TYPE.SWP_HHV_REQ:
            return state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_USN, protocol.getEndpointId(), (resState, searchedKey) => {
                if (g.SERVER_RECV_STATE_BY_MSG.SWP_HHV_REQ.includes(resState)) {
                    let payload = {};
                    uModule.checkUserSignedInState(g.ENTITY_TYPE.WEBCLIENT, g.CLIENT_TYPE.WEB, protocol.getEndpointId(), unpackedPayload.nsc, (result) => {
                        if (result === 1) {
                            payload.sTs = unpackedPayload.sTs;
                            payload.eTs = unpackedPayload.eTs;
                            payload.nat = unpackedPayload.nat;
                            payload.state = unpackedPayload.state;
                            payload.city = unpackedPayload.city;
                            payload.clientType = g.CLIENT_TYPE.WEB;
                            payload = protocol.packMsg(g.SDP_MSG_TYPE.SDP_HHV_REQ, payload);
                            request.send('http://localhost:8080/databaseapi', payload, (message) => {
                                protocol.setMsg(message);
                                if (!protocol.verifyHeader()) return;
                                unpackedPayload = protocol.unpackPayload();
                                if (!unpackedPayload) return;
                                payload = {}
                                //switch
                                switch (unpackedPayload.resultCode) {
                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_HHV.RESCODE_SDP_HHV_OK:
                                        payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_HHV.RESCODE_SWP_HHV_OK;
                                        payload.historicalHeartQualityDataListEncodings = unpackedPayload.historicalHeartQualityDataListEncodings;
                                        protocol.packMsg(g.SWP_MSG_TYPE.SWP_HHV_RSP, payload);

                                        logger.debug(`Server Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                        res.send(protocol.getPackedMsg());
                                        break;

                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_HHV.RESCODE_SDP_HHV_OTHER:
                                        payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_HHV.RESCODE_SWP_HHV_OTHER;
                                        protocol.packMsg(g.SWP_MSG_TYPE.SWP_HHV_RSP, payload);

                                        logger.debug(`Server Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                        res.send(protocol.getPackedMsg());
                                        break;

                                    case g.SDP_MSG_RESCODE.RESCODE_SDP_HHV.RESCODE_SDP_HHV_UNALLOCATED_USER_SEQUENCE_NUMBER:
                                        payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_HHV.RESCODE_SWP_HHV_UNALLOCATED_USER_SEQUENCE_NUMBER;
                                        protocol.packMsg(g.SWP_MSG_TYPE.SWP_HHV_RSP, payload);

                                        logger.debug(`Server Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                        res.send(protocol.getPackedMsg());
                                        break;
                                }

                            });
                        } else {
                            payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_HHV.RESCODE_SWP_HHV_UNALLOCATED_USER_SEQUENCE_NUMBER;
                            protocol.packMsg(g.SWP_MSG_TYPE.SWP_HHV_RSP, payload);

                            logger.debug(`Server Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                            res.send(protocol.getPackedMsg());
                        }
                    })
                }
            });

        /**
         * Receive SAP: KAS-REQ
         * Last update: 11.05.2018
         * Author: Junhee Park
         */
        case g.SAP_MSG_TYPE.SAP_KAS_REQ:
            // 1.~
            return state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_USN, protocol.getEndpointId(), (resState, searchedKey) => {
                let payload = {};
                // 1.1~
                if (resState) {
                    // 1.1.1.~\
                    uModule.checkUserSignedInState(g.ENTITY_TYPE.APPCLIENT, g.CLIENT_TYPE.APP, protocol.getEndpointId(), unpackedPayload.nsc, (result) => {
                        // 1.1.1.1.~
                        if (result === 1) {
                            uModule.updateUserSignedInState(g.ENTITY_TYPE.APPCLIENT, protocol.getEndpointId(), (result) => {
                                if (result) {
                                    state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_USN, protocol.getEndpointId(), g.SERVER_USN_STATE_ID.SERVER_USN_USN_INFORMED_STATE, g.SERVER_TIMER.T863);
                                    logger.debug("| SERVER change USN state (USN INFORMED) ->  (USN INFORMED)");
                                    payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_KAS.RESCODE_SAP_KAS_OK;
                                    protocol.packMsg(g.SAP_MSG_TYPE.SAP_KAS_RSP, payload);

                                    logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                    res.send(protocol.getPackedMsg());
                                }
                            });
                            // 1.1.1.2.~
                        } else {
                            payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_KAS.RESCODE_SAP_KAS_INCORRECT_NUMBER_OF_SIGNED_IN_COMPLETIONS;
                            protocol.packMsg(g.SAP_MSG_TYPE.SAP_KAS_RSP, payload);

                            logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                            res.send(protocol.getPackedMsg());
                        }
                    });
                }
            });

        /**
         * Receive SWP: KAS-REQ
         * Last update: 11.05.2018
         * Author: Junhee Park
         */
        case g.SWP_MSG_TYPE.SWP_KAS_REQ:
            // 1.~
            return state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_USN, protocol.getEndpointId(), (resState, searchedKey) => {
                let payload = {};
                // 1.1~
                if (resState) {
                    // 1.1.1.~
                    uModule.checkUserSignedInState(g.ENTITY_TYPE.WEBCLIENT, g.CLIENT_TYPE.WEB, protocol.getEndpointId(), unpackedPayload.nsc, (result) => {
                        // 1.1.1.1.~
                        if (result === 1) {
                            uModule.updateUserSignedInState(g.ENTITY_TYPE.WEBCLIENT, protocol.getEndpointId(), (result) => {
                                if (result) {
                                    state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_USN, protocol.getEndpointId(), g.SERVER_USN_STATE_ID.SERVER_USN_USN_INFORMED_STATE, g.SERVER_TIMER.T863);
                                    logger.debug("| SERVER change USN state (USN INFORMED) ->  (USN INFORMED)");
                                    payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_KAS.RESCODE_SWP_KAS_OK;
                                    protocol.packMsg(g.SWP_MSG_TYPE.SWP_KAS_RSP, payload);

                                    logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                    res.send(protocol.getPackedMsg());
                                }
                            });
                            // 1.1.1.2.~
                        } else {
                            payload.resultCode = g.SWP_MSG_RESCODE.RESCODE_SWP_KAS.RESCODE_SWP_KAS_INCORRECT_NUMBER_OF_SIGNED_IN_COMPLETIONS;
                            protocol.packMsg(g.SWP_MSG_TYPE.SWP_KAS_RSP, payload);

                            logger.debug(`| SERVER send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                            res.send(protocol.getPackedMsg());
                        }
                    });
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
                state.setState(g.ENTITY_TYPE.DATABASE, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_TCI, [protocol.getEndpointId(), unpackedPayload.userId], g.DATABASE_TCI_STATE_ID.DATABASE_TCI_IDLE_STATE);
            } else {
                state.setState(g.ENTITY_TYPE.DATABASE, g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_TCI, [protocol.getEndpointId(), unpackedPayload.userId], g.DATABASE_TCI_STATE_ID.DATABASE_TCI_IDLE_STATE);
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
                logger.debug(`| DATABASE Send response:${JSON.stringify(protocol.getPackedMsg())}`);

                if (unpackedPayload.clientType === g.CLIENT_TYPE.APP) {
                    state.setState(g.ENTITY_TYPE.DATABASE, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_TCI, [protocol.getEndpointId(), unpackedPayload.userId], g.DATABASE_TCI_STATE_ID.DATABASE_TCI_UNIQUE_USER_ID_CONFIRMED_STATE, g.DATABASE_TIMER.T954);
                } else {
                    state.setState(g.ENTITY_TYPE.DATABASE, g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_TCI, [protocol.getEndpointId(), unpackedPayload.userId], g.DATABASE_TCI_STATE_ID.DATABASE_TCI_UNIQUE_USER_ID_CONFIRMED_STATE, g.DATABASE_TIMER.T954);
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
            endpointIdType = g.ENDPOINT_ID_TYPE.EI_TYPE_APP_TCI;
            if (unpackedPayload.clientType === g.CLIENT_TYPE.WEB){
                endpointIdType = g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_TCI;
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
                                logger.debug(`| DATABASE Send response:${JSON.stringify(protocol.getPackedMsg())}`);
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
                                                `${keyHead}usn`, userInfo.newUsn,
                                                `${keyHead}id`, userInfo.userId,
                                                `${keyHead}pw`, hash.getHashedPassword(userInfo.userPw),
                                                `${keyHead}regf`, userInfo.regf,
                                                `${keyHead}fn`, userInfo.userFn,
                                                `${keyHead}ln`, userInfo.userLn,
                                                `${keyHead}bdt`, userInfo.bdt,
                                                `${keyHead}gen`, userInfo.gender,
                                                `${keyHead}ml`, userInfo.ml, //TBD
                                                `${keyHead}expd`, userInfo.expd, //TBD
                                                `${keyHead}mti`, userInfo.mti, //TBD
                                                `${keyHead}tti`, userInfo.tti, //TBD
                                                `${keyHead}ass`, userInfo.ass, //TBD
                                                "u:info:id:" + userInfo.userId, userInfo.newUsn
                                            ],
                                            [
                                                "setbit", `${keyHead}signf`, 0, 0
                                            ],
                                            [
                                                "setbit", `${keyHead}signf`, 1, 0
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
                                    logger.debug(`| DATABASE Send response:${JSON.stringify(protocol.getPackedMsg())}`);
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
                         logger.debug(`| DATABASE Send response:${JSON.stringify(protocol.getPackedMsg())}`);
                         return res.send(protocol.getPackedMsg());
                    }
                } else {
                    //other
                    payload = {
                        "resultCode": g.SDP_MSG_RESCODE.RESCODE_SDP_UVC.RESCODE_SDP_UVC_OTHER
                    }
                    protocol.packMsg(g.SDP_MSG_TYPE.SDP_UVC_RSP, payload);
                    logger.debug(`| DATABASE Send response:${JSON.stringify(protocol.getPackedMsg())}`);
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
            console.log('test');
            return redisCli.get(`u:info:id:${unpackedPayload.userId}`, (err, usn) => {
                if (err) {} else {
                    endpointIdType = g.ENDPOINT_ID_TYPE.EI_TYPE_APP_USN;
                    if (unpackedPayload.clientType === g.CLIENT_TYPE.WEB) {
                        endpointIdType = g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_USN;
                        signfbit = 1;
                    }

                    if (usn === null) {
                        payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SGI.RESCODE_SDP_SGI_NOT_EXIST_USER_ID;
                        protocol.packMsg(g.SDP_MSG_TYPE.SDP_SGI_RSP, payload);
                        logger.debug(`| DATABASE Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                        res.send(protocol.getPackedMsg());
                    } else {
                        redisCli.mget(`u:info:${usn}:regf`, `u:info:${usn}:pw`, (err, replies) => {
                            if (err) {} else {
                                let signf = replies[0];
                                if (signf === "2") {
                                    payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SGI.RESCODE_SDP_SGI_NOT_EXIST_USER_ID;
                                    protocol.packMsg(g.SDP_MSG_TYPE.SDP_SGI_RSP, payload);

                                    logger.debug(`| DATABASE Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                    res.send(protocol.getPackedMsg());
                                } else {
                                    let hashedPw = replies[1];
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

            endpointIdType = g.ENDPOINT_ID_TYPE.EI_TYPE_APP_USN;
            if (unpackedPayload.clientType === g.CLIENT_TYPE.WEB) {
                endpointIdType = g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_USN;
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

            endpointIdType = g.ENDPOINT_ID_TYPE.EI_TYPE_APP_USN;
            if (unpackedPayload.clientType === g.CLIENT_TYPE.WEB) {
                endpointIdType = g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_USN;
                signfbit = 1;
            }
            return redisCli.getbit(`u:info:${protocol.getEndpointId()}:signf`, signfbit, (err, signf) => {
                if (signf === null) {
                    payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_UPC.RESCODE_SDP_UPC_UNALLOCATED_USER_SEQUENCE_NUMBER;
                    protocol.packMsg(g.SDP_MSG_TYPE.SDP_UPC_RSP, payload);

                    logger.debug(`| DATABASE Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
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
                                
                                logger.debug(`| DATABASE Send response: ${JSON.stringify(protocol.getPackedMsg())}`);   
                                res.send(protocol.getPackedMsg());
                            })
                        } else {
                            state.setState(g.ENTITY_TYPE.DATABASE, endpointIdType, protocol.getEndpointId(), g.DATABASE_USN_STATE_ID.DATABASE_USN_USN_INFORMED_STATE, g.DATABASE_TIMER.T955);
                            logger.debug("| DATABASE change USN state (USN INFORMED) -> (USN INFORMED)");
                            
                            payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_UPC.RESCODE_SDP_UPC_INCORRECT_CURRENT_USER_PASSWORD;
                            protocol.packMsg(g.SDP_MSG_TYPE.SDP_UPC_RSP, payload);
                            
                            logger.debug(`| DATABASE Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
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

                            logger.debug(`| DATABASE Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                            res.send(protocol.getPackedMsg());
                        } else {
                            let keyHead = `u:info:${usn}:`;
                            redisCli.mget(`${keyHead}bdt`, `${keyHead}fn`, `${keyHead}ln`, (err, replies) => {
                                if (err) {} else {
                                    if (replies[0] === unpackedPayload.bdt &&
                                        replies[1] === unpackedPayload.userFn &&
                                        replies[2] === unpackedPayload.userLn) {
                                        //gen pw 
                                        let pw = codeGen.getAuthenticationCode();
                                        //update pw
                                        redisCli.set(`${keyHead}pw`, hash.getHashedPassword(pw), (err, reply) => {
                                            if (err) {} else {
                                                payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_FPU.RESCODE_SDP_FPU_OK;
                                                payload.userPw = pw;
                                                protocol.packMsg(g.SDP_MSG_TYPE.SDP_FPU_RSP, payload);


                                                state.setState(g.ENTITY_TYPE.DATABASE, endpointIdType, protocol.getEndpointId(), g.DATABASE_USN_STATE_ID.DATABASE_USN_IDLE_STATE);
                                                logger.debug("| DATABASE change USN state (USN INFORMED) -> (IDLE)");

                                                logger.debug(`| DATABASE Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                                res.send(protocol.getPackedMsg());
                                            }
                                        })
                                    } else {
                                        payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_FPU.RESCODE_SDP_FPU_INCORRECT_USER_INFORMATION;
                                        protocol.packMsg(g.SDP_MSG_TYPE.SDP_FPU_RSP, payload);

                                        logger.debug(`| DATABASE Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                        res.send(protocol.getPackedMsg());
                                    }
                                }
                            });
                        }
                    }
                });

            /**
             * Receive SDP: UDR-REQ
             * Last update: 10.24.2018
             * Author: Junhee Park
             */
            case g.SDP_MSG_TYPE.SDP_UDR_REQ:

                endpointIdType = g.ENDPOINT_ID_TYPE.EI_TYPE_APP_USN;
                if (unpackedPayload.clientType === g.CLIENT_TYPE.WEB) {
                    endpointIdType = g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_USN;
                    signfbit = 1;
                }
                return redisCli.getbit(`u:info:${protocol.getEndpointId()}:signf`, signfbit, (err, signf) => {
                    if (signf === null) {
                        payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_UDR.RESCODE_SDP_UDR_UNALLOCATED_USER_SEQUENCE_NUMBER;
                        protocol.packMsg(g.SDP_MSG_TYPE.SDP_UDR_RSP, payload);
                        
                        logger.debug(`| DATABASE Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                        res.send(protocol.getPackedMsg());
                    } else if (signf === g.SIGNED_IN_STATE.SIGNED_IN) {
                        redisCli.get(`u:info:${protocol.getEndpointId()}:pw`, (err, hashedPw) => {
                            if (err) {} else {
                                if (hash.checkPassword(unpackedPayload.userPw, hashedPw)) {
                                    redisCli.set(`u:info:${protocol.getEndpointId()}:regf`, 2, (err, result) => {
                                        state.setState(g.ENTITY_TYPE.DATABASE, g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_USN, protocol.getEndpointId(), g.DATABASE_USN_STATE_ID.DATABASE_USN_IDLE_STATE);
                                        logger.debug("| DATABASE change USN state (USN INFORMED) -> (IDLE)");
                                        
                                        payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_UDR.RESCODE_SDP_UDR_OK;
                                        protocol.packMsg(g.SDP_MSG_TYPE.SDP_UDR_RSP, payload);
                                        
                                        logger.debug(`| DATABASE Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                        res.send(protocol.getPackedMsg());
                                    });
                                } else {
                                    state.setState(g.ENTITY_TYPE.DATABASE, g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_USN, protocol.getEndpointId(), g.DATABASE_USN_STATE_ID.DATABASE_USN_IDLE_STATE);
                                    logger.debug("| DATABASE change USN state (USN INFORMED) -> (IDLE)");
                                    
                                    payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_UDR.RESCODE_SDP_UDR_INCORRECT_CURRENT_USER_PASSWORD;
                                    protocol.packMsg(g.SDP_MSG_TYPE.SDP_UDR_RSP, payload);
                                    
                                        logger.debug(`| DATABASE Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                    res.send(protocol.getPackedMsg());
                                }
                            }
                        })
                    }
                });

            /**
             * Receive SDP: AUV-REQ
             * Last update: 10.24.2018
             * Author: Junhee Park
             */
            case g.SDP_MSG_TYPE.SDP_AUV_REQ:
                return redisCli.getbit(`u:info:${protocol.getEndpointId()}:signf`, 1, (err, signf) => {
                    if (signf === null) {
                        payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_AUV.RESCODE_SDP_AUV_UNALLOCATED_USER_SEQUENCE_NUMBER;
                        protocol.packMsg(g.SDP_MSG_TYPE.SDP_AUV_REQ, payload);
                        logger.debug(`| DATABASE Send response:${JSON.stringify(protocol.getPackedMsg())}`);
                        res.send(protocol.getPackedMsg());
                        //signed in
                    } else if (signf === g.SIGNED_IN_STATE.SIGNED_IN) {
                        //Auth, It should be repfactoring
                        if (protocol.getEndpointId() < 2) {
                            //main logic
                            //the output should be
                            /**
                             * userinfo = [
                             *     [regf, signf, uml, mexpd, userId, fn, ln],
                             *     [regf, signf, uml, mexpd, userId, fn, ln],
                             *     [regf, signf, uml, mexpd, userId, fn, ln],
                             *     [regf, signf, uml, mexpd, userId, fn, ln],
                             *     [regf, signf, uml, mexpd, userId, fn, ln]
                             * ]
                             */
                            redisCli.scan(0, 'MATCH', 'u:info:*:usn', 'COUNT', 1000, (err, keys) => {
                                let userInfoListEncodings = [],
                                    commandList = [];
                                for (let i = 0, x = keys[1].length; i < x; i++) {
                                    let usn = keys[1][i].split(":")[2];
                                    commandList.push(
                                        ['get', `u:info:${usn}:regf`],
                                        ['getbit',`u:info:${usn}:signf`, 0],
                                        ['getbit',`u:info:${usn}:signf`, 1],
                                        ['get',`u:info:${usn}:ml`],
                                        ['get',`u:info:${usn}:id`],
                                        ['get',`u:info:${usn}:fn`],
                                        ['get',`u:info:${usn}:ln`],
                                    );
                                }
                                redisCli.multi(commandList).exec((err, replies) => {
                                    for (let i = 0, x = replies.length / 7; i < x; i++) {
                                        userInfoListEncodings.push({
                                            regf: replies[i * 7],
                                            wsignf: replies[i * 7 + 1],
                                            asignf: replies[i * 7 + 2],
                                            ml: replies[i * 7 + 3],
                                            userId: replies[i * 7 + 4],
                                            fn: replies[i * 7 + 5],
                                            ln: replies[i * 7 + 6]
                                        });
                                    }
                                    payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_AUV.RESCODE_SDP_AUV_OK;
                                    payload.userInfoListEncodings = userInfoListEncodings;
                                    protocol.packMsg(g.SDP_MSG_TYPE.SDP_AUV_RSP, payload);
                                    
                                    logger.debug(`| DATABASE Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                    res.send(protocol.getPackedMsg());
                                });
                            });
                        } else if (signf === g.SIGNED_IN_STATE.SIGNED_OUT) {
                            payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_AUV.RESCODE_SDP_AUV_UNAUTHORIZED_USER_SEQUENCE_NUMBER;
                            protocol.packMsg(g.SDP_MSG_TYPE.SDP_AUV_RSP, payload);

                            logger.debug(`| DATABASE Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                            res.send(protocol.getPackedMsg());

                        }
                    } else if (signf === g.SIGNED_IN_STATE.SIGNED_OUT) {
                        payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_AUV.RESCODE_SDP_AUV_OTHER;
                        protocol.packMsg(g.SDP_MSG_TYPE.SDP_AUV_RSP, payload);

                        logger.debug(`| DATABASE Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                        res.send(protocol.getPackedMsg());
                    }
                });

            /**
             * Receive SDP: ASR-REQ
             * Last update: 10.25.2018
             * Author: Junhee Park
             */
            case g.SDP_MSG_TYPE.SDP_ASR_REQ:
                return redisCli.getbit(`u:info:${protocol.getEndpointId()}:signf`, 1, (err, signf) => {
                    //not exist user id
                    if (signf === null) {
                        payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_ASR.RESCODE_SDP_ASR_UNALLOCATED_USER_SEQUENCE_NUMBER;
                        protocol.packMsg(g.SDP_MSG_TYPE.SDP_ASR_RSP, payload);

                        logger.debug(`| DATABASE Send response:${JSON.stringify(protocol.getPackedMsg())}`);
                        res.send(protocol.getPackedMsg());
                        //signed in
                    } else if (signf === g.SIGNED_IN_STATE.SIGNED_IN) {
                        //Auth, It should be repfactoring
                        if (protocol.getEndpointId() < 2) {
                            redisCli.get(`s:info:${unpackedPayload.wmac}`, (err, reply) => {
                                if (err) {} else {
                                    if (reply === null) {
                                        sModule.getNewSensorSerialNum(g.USER_TYPE.ADMIN, (newSsn) => {
                                            payload = {};
                                            let sensorInfo = unpackedPayload,
                                                keyHead = `s:info:${newSsn}:`;
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
                                                    `${keyHead}ssn`, sensorInfo.ssn,
                                                    `${keyHead}wmac`, sensorInfo.wmac,
                                                    `${keyHead}cmac`, sensorInfo.cmac,
                                                    `${keyHead}rdt`, sensorInfo.rdt,
                                                    `${keyHead}sdt`, sensorInfo.sdt, //TBD
                                                    `${keyHead}edt`, sensorInfo.edt, //TBD
                                                    `${keyHead}drgcd`, sensorInfo.drgcd,
                                                    `${keyHead}regusn`, sensorInfo.regusn,
                                                    `${keyHead}actf`, sensorInfo.actf,
                                                    `${keyHead}mobf`, sensorInfo.mobf,
                                                    `${keyHead}stat`, sensorInfo.stat,
                                                    `s:info:${sensorInfo.wmac}`, sensorInfo.ssn
                                                ],
                                                [
                                                    "sadd", "search:s:actf:0", sensorInfo.ssn,
                                                ],
                                                [
                                                    "sadd", "search:s:mobf:0", sensorInfo.ssn
                                                ],
                                                [
                                                    "sadd", "search:s:nat:Q30", sensorInfo.ssn,
                                                ],
                                                [
                                                    "sadd", "search:s:user:" + protocol.getEndpointId(), sensorInfo.ssn
                                                ]
                                            ]).exec((err, replies) => {
                                                if (err) {} else {
                                                    logger.debug(`| DATABASE stored sensor info${JSON.stringify(sensorInfo)}`);
                                                    payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_ASR.RESCODE_SDP_ASR_OK;
                                                    protocol.packMsg(g.SDP_MSG_TYPE.SDP_ASR_RSP, payload);

                                                    state.setState(g.ENTITY_TYPE.DATABASE, g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_USN, protocol.getEndpointId(), g.DATABASE_USN_STATE_ID.DATABASE_USN_USN_INFORMED_STATE, g.DATABASE_TIMER.T955);
                                                    logger.debug("| DATABASE change USN state (USN INFORMED) -> (USN INFORMED)");
                                                    res.send(protocol.getPackedMsg());
                                                }
                                            });
                                        });
                                    } else {
                                        //Already regoistered
                                        payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_ASR.RESCODE_SDP_ASR_OK;
                                        protocol.packMsg(g.SDP_MSG_TYPE.SDP_ASR_RSP, payload);

                                        state.setState(g.ENTITY_TYPE.DATABASE, g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_USN, protocol.getEndpointId(), g.DATABASE_USN_STATE_ID.DATABASE_USN_USN_INFORMED_STATE, g.DATABASE_TIMER.T955);
                                        logger.debug("| DATABASE change USN state (USN INFORMED) -> (USN INFORMED)");
                                        res.send(protocol.getPackedMsg());
                                    }
                                }
                            });
                        } else {
                            payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_ASR.RESCODE_SDP_ASR_UNAUTHORIZED_USER_SEQUENCE_NUMBER;
                            protocol.packMsg(g.SDP_MSG_TYPE.SDP_ASR_RSP, payload);

                            logger.debug(`| DATABASE Send response:${JSON.stringify(protocol.getPackedMsg())}`);
                            res.send(protocol.getPackedMsg());
                        }

                        //signed out
                    } else if (signf === g.SIGNED_IN_STATE.SIGNED_OUT) {
                        payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_ASR.RESCODE_SDP_ASR_OTHER;
                        protocol.packMsg(g.SDP_MSG_TYPE.SDP_ASR_RSP, payload);

                        logger.debug(`| DATABASE Send response:${JSON.stringify(protocol.getPackedMsg())}`);
                        res.send(protocol.getPackedMsg());
                    }
                });
       
            /**
             * Receive SDP: ASD-REQ
             * Last update: 10.25.2018
             * Author: Junhee Park
             */     
            case g.SDP_MSG_TYPE.SDP_ASD_REQ:
                return redisCli.getbit(`u:info:${protocol.getEndpointId()}:signf`, 1, (err, signf) => {
                    if (signf === null) {
                        payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_ASD.RESCODE_SDP_ASD_UNALLOCATED_USER_SEQUENCE_NUMBER;
                        protocol.packMsg(g.SDP_MSG_TYPE.SDP_ASD_REQ, payload);

                        logger.debug(`| DATABASE Send response:${JSON.stringify(protocol.getPackedMsg())}`);
                        res.send(protocol.getPackedMsg());
                        //signed in
                    } else if (signf === g.SIGNED_IN_STATE.SIGNED_IN) {
                        //Auth, It should be repfactoring
                        if (protocol.getEndpointId() < 2) {
                            redisCli.get(`s:info:${unpackedPayload.wmac}`, (err, ssn) => {
                                if (err) {
                                    logger.error("| DATABASE ERROR search wmac");
                                } else {
                                    //wifi MAC address exist
                                    if (ssn !== null) {
                                        redisCli.get(`u:info:id:${unpackedPayload.userId}`, (err, usn) => {
                                            //user id exist
                                            if (usn !== null) {
                                                const arrDrg = [0, 2, 3, 4, 5];
                                                //deregistration
                                                if (arrDrg.includes(Number(unpackedPayload.drgcd))) {
                                                    redisCli.multi([
                                                        //Delete sensor association with user
                                                        ["set", `s:info:${ssn}:drgcd`, unpackedPayload.drgcd],
                                                        ["set", `s:info:${ssn}:actf`, 3],
                                                        ["del", `s:info:${ssn}:wmac`],
                                                        ["del", `s:info:${ssn}:cmac`],
                                                        ["del", `s:info:${ssn}:rdt`],
                                                        ["del", `s:info:${ssn}:sdt`],
                                                        ["del", `s:info:${ssn}:edt`],
                                                        ["del", `s:info:${ssn}:drgcd`],
                                                        ["del", `s:info:${ssn}:regusn`],
                                                        ["del", `s:info:${ssn}:mobf`],
                                                        ["del", `s:info:${ssn}:stat`],
                                                        ["del", `s:info:${unpackedPayload.wmac}`],
                                                        //search:s:user:1
                                                        ["srem", `search:s:user:${protocol.getEndpointId()}`, ssn],
                                                        ["srem", "search:s:actf:0", ssn],
                                                        ["srem", "search:s:actf:1", ssn],
                                                        ["srem", "search:s:actf:2", ssn],
                                                        ["sadd", "search:s:actf:3", ssn]
                                                    ]).exec((err, replies) => {
                                                        if (err) {} else {
                                                            payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_ASD.RESCODE_SDP_ASD_OK;
                                                            protocol.packMsg(g.SDP_MSG_TYPE.SDP_ASD_RSP, payload);

                                                            logger.debug(`| DATABASE Send response:${JSON.stringify(protocol.getPackedMsg())}`);
                                                            res.send(protocol.getPackedMsg());
                                                        }
                                                    });
                                                //deassociation
                                                } else {
                                                    let keyHead = `u:ass:${usn}:${ssn}:`;
                                                    redisCli.get(`${keyHead}ssn`, (err, result) => {
                                                        if (err) {
                                                            logger.error("| DATABASE ERROR search usn ssn");
                                                        } else {
                                                            if (result !== null) {
                                                                redisCli.multi([
                                                                    //Delete sensor association with user
                                                                    ["del", `${keyHead}ssn`],
                                                                    ["del", `${keyHead}usn`],
                                                                    ["del", `${keyHead}mti`],
                                                                    ["del", `${keyHead}tti`],
                                                                    ["del", `${keyHead}mobf`],
                                                                    //Update sensor information
                                                                    ["set", `${keyHead}actf`, 0],
                                                                    ["del", `${keyHead}cgeo`],
                                                                    ["del", `s:info:${ssn}:cgeo`],
                                                                    ["srem", "search:s:actf:1", ssn],
                                                                    ["srem", "search:s:actf:2", ssn],
                                                                    ["srem", "search:s:actf:3", ssn],
                                                                    ["sadd", "search:s:actf:0", ssn],
                                                                    ["sadd", "search:s:mobf:0", ssn]
                                                                ]).exec((err, replies) => {
                                                                    if (err) {} else {
                                                                        payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_ASD.RESCODE_SDP_ASD_OK;
                                                                        protocol.packMsg(g.SDP_MSG_TYPE.SDP_ASD_RSP, payload);

                                                                        logger.debug(`| DATABASE Send response:${JSON.stringify(protocol.getPackedMsg())}`);
                                                                        res.send(protocol.getPackedMsg());
                                                                    }
                                                                });
                                                            } else {
                                                                payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_ASD.RESCODE_SDP_ASD_THE_REQUESTED_WIFI_MAC_IS_NOT_AN_ASSOCIATED_WITH_USER_ID;
                                                                protocol.packMsg(g.SDP_MSG_TYPE.SDP_ASD_RSP, payload);

                                                                logger.debug(`| DATABASE Send response:${JSON.stringify(protocol.getPackedMsg())}`);
                                                                res.send(protocol.getPackedMsg());
                                                            }
                                                        }
                                                    })
                                                }
                                            //user id not exist
                                            } else {
                                                payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_ASD.RESCODE_SDP_ASD_NOT_EXIST_USER_ID;
                                                protocol.packMsg(g.SDP_MSG_TYPE.SDP_ASD_RSP, payload);

                                                logger.debug(`| DATABASE Send response:${JSON.stringify(protocol.getPackedMsg())}`);
                                                res.send(protocol.getPackedMsg());
                                            }
                                        });
                                    //wifi MAC address not exist
                                    } else {
                                        payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_ASD.RESCODE_SDP_ASD_NOT_EXIST_WIFI_MAC_ADDRESS;
                                        protocol.packMsg(g.SDP_MSG_TYPE.SDP_ASD_RSP, payload);

                                        logger.debug(`| DATABASE Send response:${JSON.stringify(protocol.getPackedMsg())}`);
                                        res.send(protocol.getPackedMsg());
                                    }
                                }
                            });
                        } else {
                            payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_ASD.RESCODE_SDP_ASD_UNAUTHORIZED_USER_SEQUENCE_NUMBER;
                            protocol.packMsg(g.SDP_MSG_TYPE.SDP_ASD_RSP, payload);

                            logger.debug(`| DATABASE Send response:${JSON.stringify(protocol.getPackedMsg())}`);
                            res.send(protocol.getPackedMsg());
                        }
                        //signed out
                    } else if (signf === g.SIGNED_IN_STATE.SIGNED_OUT) {
                        payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_ASD.RESCODE_SDP_ASD_OTHER;
                        protocol.packMsg(g.SDP_MSG_TYPE.SDP_ASD_RSP, payload);

                        logger.debug(`| DATABASE Send response:${JSON.stringify(protocol.getPackedMsg())}`);
                        res.send(protocol.getPackedMsg());
                    }
                });

            /**
             * Receive SDP: ASV-REQ
             * Last update: 10.25.2018
             * Author: Junhee Park
             */     
            case g.SDP_MSG_TYPE.SDP_ASV_REQ:
                return redisCli.getbit(`u:info:${protocol.getEndpointId()}:signf`, 1, (err, signf) => {
                    let payload = {};
                    if (signf === null) {
                        payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_ASV.RESCODE_SDP_ASV_UNALLOCATED_USER_SEQUENCE_NUMBER;
                        protocol.packMsg(g.SDP_MSG_TYPE.SDP_ASV_REQ, payload);

                        logger.debug(`| DATABASE Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                        res.send(protocol.getPackedMsg());
                        //signed in
                    } else if (signf === g.SIGNED_IN_STATE.SIGNED_IN) {
                        //Auth, It should be repfactoring
                        if (protocol.getEndpointId() < 2) {
                            //main logic & If user searched using mac
                            if (unpackedPayload.wmac !== "") {
                                //시리얼 넘버 * 해당 번치 -> 
                                redisCli.get(`s:info:${unpackedPayload.wmac}`, (err, ssn) => {
                                    if (ssn !== null) {
                                        redisCli.keys(`s:info:${ssn}:*`, (err, values) => {
                                            if (err) {} else {
                                                redisCli.mget(values, (err, replies) => {
                                                    let arr = [];
                                                    for (let i = 0; i < replies.length; i++) {
                                                        arr[values[i].split(`s:info:${ssn}:`)[1]] = replies[i];
                                                    }
                                                    payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_ASV.RESCODE_SDP_ASV_OK;
                                                    payload.selectedSensorInformationList = [arr];
                                                    payload.existCode = 0;
                                                    protocol.packMsg(g.SDP_MSG_TYPE.SDP_ASV_RSP, payload);
                                                    logger.debug(`| DATABASE Send response:${JSON.stringify(protocol.getPackedMsg())}`);
                                                    res.send(protocol.getPackedMsg());
                                                })
                                            }
                                        });
                                    } else {
                                        payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_ASV.RESCODE_SDP_ASV_OK;
                                        payload.existCode = 1;
                                        protocol.packMsg(g.SDP_MSG_TYPE.SDP_ASV_RSP, payload);
                                        logger.debug(`| DATABASE Send response:${JSON.stringify(protocol.getPackedMsg())}`);
                                        res.send(protocol.getPackedMsg());
                                    }
                                });
                            } else {
                                let searchSets = [];
                                let keyHead = 'search:s:actf:';
                                switch (unpackedPayload.actf) {
                                    case g.SENSOR_ACT_FLAG.REGISTERED:
                                        searchSets.push(`${keyHead}${g.SENSOR_ACT_FLAG.REGISTERED.toString()}`);
                                        break;
                                    case g.SENSOR_ACT_FLAG.ASSOCATIED:
                                        searchSets.push(`${keyHead}${g.SENSOR_ACT_FLAG.ASSOCATIED.toString()}`);
                                        break;
                                    case g.SENSOR_ACT_FLAG.OPERATING:
                                        searchSets.push(`${keyHead}${g.SENSOR_ACT_FLAG.OPERATING.toString()}`);
                                        break;
                                    case g.SENSOR_ACT_FLAG.DEREGISTERED:
                                        searchSets.push(`${keyHead}${g.SENSOR_ACT_FLAG.DEREGISTERED.toString()}`);
                                        break;
                                }
                                keyHead = 'search:s:mobf:';
                                switch (unpackedPayload.mobf) {
                                    case g.SENSOR_MOB_FLAG.STATIONARY:
                                        searchSets.push(`${keyHead}${g.SENSOR_MOB_FLAG.STATIONARY.toString()}`);
                                        break;
                                    case g.SENSOR_MOB_FLAG.PORTABLE:
                                        searchSets.push(`${keyHead}${g.SENSOR_MOB_FLAG.PORTABLE.toString()}`);
                                        break;
                                }
                                keyHead = 'search:s:nat:';
                                switch (unpackedPayload.nat) {
                                    case 0:
                                        searchSets.push(`${keyHead}0`);
                                        break;
                                    case 1:
                                        searchSets.push(`${keyHead}1`);
                                        break;
                                }
                                keyHead = 'search:s:user:';
                                //not if search by user id
                                if (typeof unpackedPayload.userId === 'undefined') {
                                    sModule.searchSensor(searchSets, (result) => {
                                        payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_ASV.RESCODE_SDP_ASV_OK;
                                        if (result.length > 0) {
                                            payload.existCode = 0;
                                        } else {
                                            payload.existCode = 1;
                                        }
                                        payload.selectedSensorInformationList = result;
                                        protocol.packMsg(g.SDP_MSG_TYPE.SDP_ASV_RSP, payload);
                                        logger.debug(`| DATABASE Send response:${JSON.stringify(protocol.getPackedMsg())}`);
                                        res.send(protocol.getPackedMsg());
                                    })
                                    //if search by user id
                                } else {
                                    redisCli.get('u:info:id:' + unpackedPayload.userId, (err, usn) => {
                                        if (usn === null) {
                                            payload.existCode = 1;
                                            payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_ASV.RESCODE_SDP_ASV_OK;
                                            protocol.packMsg(g.SDP_MSG_TYPE.SDP_ASV_RSP, payload);
                                            logger.debug(`| DATABASE Send response:${JSON.stringify(protocol.getPackedMsg())}`);
                                            res.send(protocol.getPackedMsg());
                                        } else {
                                            sModule.searchSensor(['search:s:user:' + usn], (result) => {
                                                payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_ASV.RESCODE_SDP_ASV_OK;
                                                payload.existCode = 0;
                                                payload.selectedSensorInformationList = result;
                                                protocol.packMsg(g.SDP_MSG_TYPE.SDP_ASV_RSP, payload);
                                                logger.debug(`| DATABASE Send response:${JSON.stringify(protocol.getPackedMsg())}`);
                                                res.send(protocol.getPackedMsg());
                                            });
                                        }
                                    });
                                }
                            }
                        } else if (signf === g.SIGNED_IN_STATE.SIGNED_OUT) {
                            payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_ASV.RESCODE_SDP_ASV_UNAUTHORIZED_USER_SEQUENCE_NUMBER;
                            protocol.packMsg(g.SDP_MSG_TYPE.SDP_ASV_RSP, payload);
                            logger.debug(`| DATABASE Send response:${JSON.stringify(protocol.getPackedMsg())}`);
                            res.send(protocol.getPackedMsg());
                        }
                    } else if (signf === g.SIGNED_IN_STATE.SIGNED_OUT) {
                        payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_ASV.RESCODE_SDP_ASV_OTHER;
                        protocol.packMsg(g.SDP_MSG_TYPE.SDP_ASV_RSP, payload);
                        logger.debug(`| DATABASE Send response:${JSON.stringify(protocol.getPackedMsg())}`);
                        res.send(protocol.getPackedMsg());
                    }
                });

            /**
             * Receive SDP: SRG-REQ
             * Last update: 10.25.2018
             * Author: Junhee Park
             */
            case g.SDP_MSG_TYPE.SDP_SRG_REQ:

                endpointIdType = g.ENDPOINT_ID_TYPE.EI_TYPE_APP_USN;
                if (unpackedPayload.clientType === g.CLIENT_TYPE.WEB) {
                    endpointIdType = g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_USN;
                    signfbit = 1;
                }
                return redisCli.getbit(`u:info:${protocol.getEndpointId()}:signf`, signfbit, (err, signf) => {
                    //not exist user id
                    if (signf === null) {
                        payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SRG.RESCODE_SDP_SRG_UNALLOCATED_USER_SEQUENCE_NUMBER;
                        protocol.packMsg(g.SDP_MSG_TYPE.SDP_SRG_RSP, payload);
                        
                        logger.debug(`| DATABASE Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                        res.send(protocol.getPackedMsg());
                    //signed in
                    } else if (signf === g.SIGNED_IN_STATE.SIGNED_IN) {
                        //add usn
                        redisCli.get(`s:info:${unpackedPayload.wmac}`, (err, reply) => {
                            if (err) {
                                logger.error("| DATABASE ERROR search wmac");
                            } else {
                                if (reply === null) {
                                    sModule.getNewSensorSerialNum(g.USER_TYPE.USER, (newSsn) => {
                                        let sensorInfo = unpackedPayload,
                                            keyHead = `s:info:${newSsn}:`;
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
                                                `${keyHead}ssn`, sensorInfo.ssn,
                                                `${keyHead}wmac`, sensorInfo.wmac,
                                                `${keyHead}cmac`, sensorInfo.cmac,
                                                `${keyHead}rdt`, sensorInfo.rdt,
                                                `${keyHead}sdt`, sensorInfo.sdt, //TBD
                                                `${keyHead}edt`, sensorInfo.edt, //TBD
                                                `${keyHead}drgcd`, sensorInfo.drgcd,
                                                `${keyHead}regusn`, sensorInfo.regusn,
                                                `${keyHead}actf`, sensorInfo.actf,
                                                `${keyHead}mobf`, sensorInfo.mobf,
                                                `${keyHead}stat`, sensorInfo.stat,
                                                `s:info:${sensorInfo.wmac}`, sensorInfo.ssn
                                            ],
                                            ["sadd", "search:s:actf:0", sensorInfo.ssn],
                                            ["sadd", "search:s:mobf:0", sensorInfo.ssn],
                                            ["sadd", "search:s:nat:Q30", sensorInfo.ssn],
                                            ["sadd", `search:s:user:${protocol.getEndpointId()}`, sensorInfo.ssn]
                                        ]).exec((err, replies) => {
                                            if (err) {} else {
                                                logger.debug(`| DATABASE stored sensor info${JSON.stringify(sensorInfo)}`);
                                                payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SRG.RESCODE_SDP_SRG_OK;
                                                protocol.packMsg(g.SDP_MSG_TYPE.SDP_SRG_RSP, payload);
                                                state.setState(g.ENTITY_TYPE.DATABASE, endpointIdType, protocol.getEndpointId(), g.DATABASE_USN_STATE_ID.DATABASE_USN_USN_INFORMED_STATE, g.DATABASE_TIMER.T955);
                                                logger.debug("| DATABASE change USN state (USN INFORMED) -> (USN INFORMED)");
                                                return res.send(protocol.getPackedMsg());
                                            }
                                        });
                                    });
                                } else {
                                    payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SRG.RESCODE_SDP_SRG_OK;
                                    protocol.packMsg(g.SDP_MSG_TYPE.SDP_SRG_RSP, payload);
                                    state.setState(g.ENTITY_TYPE.DATABASE, endpointIdType, protocol.getEndpointId(), g.DATABASE_USN_STATE_ID.DATABASE_USN_USN_INFORMED_STATE, g.DATABASE_TIMER.T955);
                                    logger.debug("| DATABASE change USN state (USN INFORMED) -> (USN INFORMED)");
                                    return res.send(protocol.getPackedMsg());
                                }
                            }
                        });
                        //signed out
                    } else if (signf === g.SIGNED_IN_STATE.SIGNED_OUT) {
                        payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SRG.RESCODE_SDP_SRG_OTHER;
                        protocol.packMsg(g.SDP_MSG_TYPE.SDP_SRG_RSP, payload);
                        logger.debug(`| DATABASE Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                        return res.send(protocol.getPackedMsg());
                    }
                });

            /**
             * Receive SDP: SAS-REQ
             * Last update: 10.25.2018
             * Author: Junhee Park
             */
            case g.SDP_MSG_TYPE.SDP_SAS_REQ:
                endpointIdType = g.ENDPOINT_ID_TYPE.EI_TYPE_APP_USN;
                if (unpackedPayload.clientType === g.CLIENT_TYPE.WEB) {
                    endpointIdType = g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_USN;
                    signfbit = 1;
                }
                return redisCli.getbit(`u:info:${protocol.getEndpointId()}:signf`, signfbit, (err, signf) => {
                    if (signf === null) {
                        payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SAS.RESCODE_SDP_SAS_UNALLOCATED_USER_SEQUENCE_NUMBER;
                        protocol.packMsg(g.SDP_MSG_TYPE.SDP_SAS_RSP, payload);

                        logger.debug(`| DATABASE Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                        res.send(protocol.getPackedMsg());
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
                        redisCli.get(`s:info:${unpackedPayload.wmac}`, (err, ssn) => {
                            if (err) {} else {
                                // 1.1)
                                if (ssn !== null) {
                                    // 1.1.1)
                                    redisCli.keys(`u:ass:*:${ssn}:usn`, (err, usns) => {
                                        if (err) {} else {
                                            // 1.1.1.1)
                                            if (usns.length === 0) {
                                                let keyHead = `u:ass:${protocol.getEndpointId()}:${ssn}:`;
                                                redisCli.multi([
                                                    //Set association user and sensor
                                                    ["set", `${keyHead}ssn`, ssn],
                                                    ["set", `${keyHead}usn`, protocol.getEndpointId()],
                                                    ["set", `${keyHead}mti`, g.DATABASE_TIMER.T957],
                                                    ["set", `${keyHead}tti`, g.DATABASE_TIMER.T958],
                                                    ["set", `${keyHead}mobf`, unpackedPayload.mobf],
                                                    //Update sensor information
                                                    ["set", `${keyHead}actf`, 1],
                                                    ["set", `${keyHead}drgcd`, 0],
                                                    ["set", `s:info:${ssn}:mobf`, unpackedPayload.mobf],
                                                    ["set", `s:info:${ssn}:actf`, 1],
                                                    ["srem", "search:s:actf:0", ssn],
                                                    ["sadd", "search:s:actf:1", ssn],
                                                    ["srem", "search:s:actf:2", ssn],
                                                    ["srem", "search:s:actf:3", ssn],
                                                    ["sadd", `search:s:mobf:${unpackedPayload.mobf}`, ssn]
                                                ]).exec((err, replies) => {
                                                    if (err) {} else {
                                                        payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SAS.RESCODE_SDP_SAS_OK;
                                                        protocol.packMsg(g.SDP_MSG_TYPE.SDP_SAS_RSP, payload);

                                                        logger.debug(`| DATABASE Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                                        return res.send(protocol.getPackedMsg());
                                                    }
                                                });
                                                // 1.1.1.2)
                                            } else {
                                                payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SAS.RESCODE_SDP_SAS_THE_REQUESTED_WIFI_MAC_WAS_ALREADY_ASSOCIATED_WITH_OWN_USN;
                                                protocol.packMsg(g.SDP_MSG_TYPE.SDP_SAS_RSP, payload);

                                                logger.debug(`| DATABASE Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                                return res.send(protocol.getPackedMsg());
                                            }
                                        }
                                    });
                                    // 1.2)  
                                } else {
                                    payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SAS.RESCODE_SDP_SAS_NOT_EXIST_WIFI_MAC_ADDRESS;
                                    protocol.packMsg(g.SDP_MSG_TYPE.SDP_SAS_RSP, payload);
                                    logger.debug(`| DATABASE Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                    return res.send(protocol.getPackedMsg());
                                }
                            }
                        });
                    } else if (signf === g.SIGNED_IN_STATE.SIGNED_OUT) {
                        payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SAS.RESCODE_SDP_SAS_OTHER;
                        protocol.packMsg(g.SDP_MSG_TYPE.SDP_SAS_RSP, payload);

                        logger.debug(`| DATABASE Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                        res.send(protocol.getPackedMsg());
                    }
                });

            /**
             * Receive SDP: SDD-REQ
             * Last update: 10.25.2018
             * Author: Junhee Park
             */
            case g.SDP_MSG_TYPE.SDP_SDD_REQ:
                endpointIdType = g.ENDPOINT_ID_TYPE.EI_TYPE_APP_USN;
                if (unpackedPayload.clientType === g.CLIENT_TYPE.WEB) {
                    endpointIdType = g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_USN;
                    signfbit = 1;
                }

                return redisCli.getbit(`u:info:${protocol.getEndpointId()}:signf`, signfbit, (err, signf) => {
                    if (signf === null) {
                        payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SDD.RESCODE_SDP_SDD_UNALLOCATED_USER_SEQUENCE_NUMBER;
                        protocol.packMsg(g.SDP_MSG_TYPE.SDP_SDD_REQ, payload);

                        logger.debug(`| DATABASE Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                        res.send(protocol.getPackedMsg());
                        //signed in
                    } else if (signf === g.SIGNED_IN_STATE.SIGNED_IN) {
                        redisCli.get(`s:info:${unpackedPayload.wmac}`, (err, ssn) => {
                            if (err) {
                                logger.error("| DATABASE ERROR search wmac");
                            } else {
                                //wifi MAC address exist
                                if (ssn !== null) {
                                    let arrDrg = [0, 2, 3, 4, 5];
                                    //deregistration
                                    if (arrDrg.includes(Number(unpackedPayload.drgcd))) {
                                        let keyHead = `u:ass:${protocol.getEndpointId()}:${ssn}:`;
                                        redisCli.multi([
                                            //Delete sensor association with user
                                            ["set", `s:info:${ssn}:drgcd`, unpackedPayload.drgcd],
                                            ["set", `s:info:${ssn}:actf`, 3],
                                            ["del", `s:info:${ssn}:wmac`],
                                            ["del", `s:info:${ssn}:cmac`],
                                            ["del", `s:info:${ssn}:rdt`],
                                            ["del", `s:info:${ssn}:sdt`],
                                            ["del", `s:info:${ssn}:edt`],
                                            ["del", `s:info:${ssn}:drgcd`],
                                            ["del", `s:info:${ssn}:regusn`],
                                            ["del", `s:info:${ssn}:mobf`],
                                            ["del", `s:info:${ssn}:stat`],
                                            ["del", `s:info:${unpackedPayload.wmac}`],
                                            ["srem", "search:s:actf:0", ssn],
                                            ["srem", "search:s:actf:1", ssn],
                                            ["srem", "search:s:actf:2", ssn],
                                            ["sadd", "search:s:actf:3", ssn],
                                            ["srem", `search:s:user:${protocol.getEndpointId()}`, ssn],
                                            ["del", keyHead + "ssn"],
                                            ["del", keyHead + "usn"],
                                            ["del", keyHead + "mti"],
                                            ["del", keyHead + "tti"],
                                            ["del", keyHead + "mobf"],
                                            ["del", keyHead + "cgeo"],

                                        ]).exec((err, replies) => {
                                            if (err) {
                                                logger.error("| DATABASE ERROR set drgcd info");
                                            } else {
                                                payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SDD.RESCODE_SDP_SDD_OK;
                                                protocol.packMsg(g.SDP_MSG_TYPE.SDP_SDD_RSP, payload);

                                                logger.debug(`| DATABASE Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                                res.send(protocol.getPackedMsg());
                                            }
                                        });
                                        //deassociation
                                    } else {
                                        let keyHead = `u:ass:${protocol.getEndpointId()}:${ssn}:`;
                                        redisCli.get(`${keyHead}ssn`, (err, result) => {
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
                                                        ["set", `s:info:${ssn}:actf`, 0],
                                                        ["del", `s:info:${ssn}:cgeo`],
                                                        ["srem", "search:s:actf:0", ssn],
                                                        ["srem", "search:s:actf:1", ssn],
                                                        ["srem", "search:s:actf:2", ssn],
                                                        ["sadd", "search:s:actf:3", ssn],
                                                        ["sadd", "search:s:mobf:0", ssn]
                                                    ]).exec((err, replies) => {
                                                        if (err) {
                                                            logger.error("| DATABASE ERROR delete usn,ssn");
                                                        } else {
                                                            payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SDD.RESCODE_SDP_SDD_OK;
                                                            protocol.packMsg(g.SDP_MSG_TYPE.SDP_SDD_RSP, payload);

                                                            logger.debug(`| DATABASE Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                                            res.send(protocol.getPackedMsg());
                                                        }
                                                    });
                                                } else {
                                                    payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SDD.RESCODE_SDP_SDD_THE_REQUESTED_USN_AND_WIFI_MAC_ADDRESS_ARE_NOT_ASSOCIATED;
                                                    protocol.packMsg(g.SDP_MSG_TYPE.SDP_SDD_RSP, payload);

                                                    logger.debug(`| DATABASE Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                                    res.send(protocol.getPackedMsg());
                                                }
                                            }
                                        });
                                    }
                                //wifi MAC address not exist
                                } else {
                                    payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SDD.RESCODE_SDP_SDD_UNALLOCATED_WIFI_MAC_ADDRESS;
                                    protocol.packMsg(g.SDP_MSG_TYPE.SDP_SDD_RSP, payload);

                                    logger.debug(`| DATABASE Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                    res.send(protocol.getPackedMsg());
                                }
                            }
                        });
                    //signed out
                    } else if (signf === g.SIGNED_IN_STATE.SIGNED_OUT) {
                        payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SDD.RESCODE_SDP_SDD_OTHER;
                        protocol.packMsg(g.SDP_MSG_TYPE.SDP_SDD_RSP, payload);

                        logger.debug(`| DATABASE Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                        res.send(protocol.getPackedMsg());
                    }
                });

            /**
             * Receive SDP: SLV-REQ
             * Last update: 10.26.2018
             * Author: Junhee Park
             */
            case g.SDP_MSG_TYPE.SDP_SLV_REQ:
                endpointIdType = g.ENDPOINT_ID_TYPE.EI_TYPE_APP_USN;
                if (unpackedPayload.clientType === g.CLIENT_TYPE.WEB) {
                    endpointIdType = g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_USN;
                    signfbit = 1;
                }
                return redisCli.getbit(`u:info:${protocol.getEndpointId()}:signf`, signfbit, (err, signf) => {
                    //unallocated user sequence number
                    if (signf === null) {
                        payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SLV.RESCODE_SDP_SLV_UNALLOCATED_USER_SEQUENCE_NUMBER;
                        protocol.packMsg(g.SDP_MSG_TYPE.SDP_SLV_REQ, payload);

                        logger.debug(`| DATABASE Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                        res.send(protocol.getPackedMsg());
                    //signed-in
                    } else if (signf === g.SIGNED_IN_STATE.SIGNED_IN) {
                        redisCli.smembers(`search:s:user:${protocol.getEndpointId()}`, (err, replies) => {
                            if (replies.length === 0) {
                                payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SLV.RESCODE_SDP_SLV_OK;
                                payload.existCode = 1;
                                protocol.packMsg(g.SDP_MSG_TYPE.SDP_SLV_RSP, payload);

                                logger.debug(`| DATABASE Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                res.send(protocol.getPackedMsg());
                            } else {
                                let selectedSensorInformationList = [],
                                    commandList = [];
                                for (let i = 0, x = replies.length; i < x; i++) {
                                    let ssn = replies[i];
                                    commandList.push(
                                        ['get', `s:info:${ssn}:wmac`],
                                        ['get', `s:info:${ssn}:cmac`],
                                        ['get', `s:info:${ssn}:rdt`],
                                        ['get', `s:info:${ssn}:actf`],
                                        ['get', `s:info:${ssn}:stat`],
                                        ['get', `s:info:${ssn}:mobf`],
                                        ['get', `s:info:${ssn}:nat`],
                                        ['get', `s:info:${ssn}:state`],
                                        ['get', `s:info:${ssn}:city`],
                                        ['get', `s:info:${ssn}:userId`]
                                    );
                                }
                                redisCli.multi(commandList).exec((err, replies) => {
                                    for (let i = 0, x = replies.length / 10; i < x; i++) {
                                        selectedSensorInformationList.push([
                                            replies[i * 10],
                                            replies[i * 10 + 1],
                                            replies[i * 10 + 2],
                                            replies[i * 10 + 3],
                                            replies[i * 10 + 4],
                                            //replies[i * 10 + 5],
                                            //replies[i * 10 + 6],
                                            //replies[i * 10 + 7],
                                            0,
                                            'Q1',
                                            'Q2',
                                            'Q3',
                                            //replies[i * 10 + 8],
                                            
                                        ]);
                                    }
                                    payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SLV.RESCODE_SDP_SLV_OK;
                                    payload.selectedSensorInformationList = selectedSensorInformationList;
                                    protocol.packMsg(g.SDP_MSG_TYPE.SDP_SLV_RSP, payload);
                                    payload.existCode = 0;
                                    logger.debug(`| DATABASE Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                    res.send(protocol.getPackedMsg());
                                });
                            }
                        });
                    //signed-out
                    } else if (signf === g.SIGNED_IN_STATE.SIGNED_OUT) {
                        payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SLV.RESCODE_SDP_SLV_OTHER;
                        protocol.packMsg(g.SDP_MSG_TYPE.SDP_SLV_RSP, payload);
                        logger.debug(`| DATABASE Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                        res.send(protocol.getPackedMsg());
                    }
                });

            /**
             * Receive SDP: SIR-REQ
             * Last update: 10.26.2018
             * Author: Junhee Park
             */
            case g.SDP_MSG_TYPE.SDP_SIR_REQ:
                return redisCli.get(`s:info:${unpackedPayload.wmac}`, (err, ssn) => {
                    /**
                     * 1.~ check existance wmac
                     * 1.1.~ if exist
                     * 1.1.1.~ check association
                     * 1.1.1.1.~ if associated
                     * 1.1.1.1.1.~ 0. ok with ssn message return
                     * 1.1.1.1.2~ ssn state update
                     * 1.1.1.2.~ if not associated
                     * 1.1.1.2.1~ 3. not an associated sensor with any user
                     * 1.2.~ if not exist
                     * 1.2.1.~ send 2. not exist wmac
                     */
                    if (err) {} else {
                        // 1.1~
                        if (ssn !== null) {
                            // 1.1.1~
                            redisCli.get(`s:info:${ssn}:actf`, (err, actf) => {
                                if (err) {
                                    logger.error("| DATABASE ERROR search actf");
                                } else {
                                    // 1.1.1.1~
                                    if (Number(actf) === g.SENSOR_ACT_FLAG.ASSOCATIED || Number(actf) === g.SENSOR_ACT_FLAG.OPERATING) {
                                        payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SIR.RESCODE_SDP_SIR_OK;
                                        payload.ssn = ssn;
                                        protocol.packMsg(g.SDP_MSG_TYPE.SDP_SIR_RSP, payload);

                                        logger.debug(`| DATABASE Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                        state.setState(g.ENTITY_TYPE.DATABASE, g.ENDPOINT_ID_TYPE.EI_TYPE_SENSOR_SSN, ssn, g.DATABASE_SSN_STATE_ID.DATABASE_SSN_INFORMED_STATE, g.DATABASE_TIMER.T951);
                                        
                                        logger.debug("| DATABASE change SSN state (IDLE) -> (SSN INFORMED)");
                                        res.send(protocol.getPackedMsg());
                                        //1.1.1.2~
                                    } else {
                                        payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SIR.RESCODE_SDP_SIR_NOT_AN_ASSOCIATED_SENSOR_WITH_ANY_USER;
                                        protocol.packMsg(g.SDP_MSG_TYPE.SDP_SIR_RSP, payload);

                                        logger.debug(`| DATABASE Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                        res.send(protocol.getPackedMsg());
                                    }
                                }
                            });
                            // 1.2~
                        } else {
                            payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SIR.RESCODE_SDP_SIR_NOT_EXIST_WIFI_MAC_ADDRESS;
                            protocol.packMsg(g.SDP_MSG_TYPE.SDP_SIR_RSP, payload);

                            logger.debug(`| DATABASE Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                            res.send(protocol.getPackedMsg());
                        }
                    }
                });

            /**
             * Receive SDP: DCA-REQ
             * Last update: 10.26.2018
             * Author: Junhee Park
             */
            case g.SDP_MSG_TYPE.SDP_DCA_REQ:
                if (typeof unpackedPayload.lat !== 'undefined' && unpackedPayload.lng !== 'undefined') {
                    /**
                     * Receive SDP: DCA-REQ
                     * 1.~ Check Payload have lat, lng
                     * 1.1.~ if payload have lat, lng => SENSOR
                     * 1.1.1.~ Check sensor state
                     * 1.1.1.1.~ If receivable state
                     * 1.1.1.1.1.~ Check ssn existance
                     * 1.1.1.1.1.1.~ If SSN exist
                     * 1.1.1.1.1.1.1.~ Check association
                     * 1.1.1.1.1.1.1.1.~ If associated
                     * 1.1.1.1.1.1.1.1.1.1.~ Check gps location
                     * 1.1.1.1.1.1.1.1.1.1.1.~ If gps ok
                     * 1.1.1.1.1.1.1.1.1.1.1.1.~ Update sensor activation flag to 3
                     * 1.1.1.1.1.1.1.1.1.1.1.2.~ Update sensor state to CID INFORMED
                     * 1.1.1.1.1.1.1.1.1.1.1.3.~ Send SDP: DCA-RSP with code 0
                     * 1.1.1.1.1.1.1.1.1.1.2.~ If gps not ok
                     * 1.1.1.1.1.1.1.1.1.1.2.1.~ Send SDP: DCA-RSP with code 3
                     * 1.1.1.1.1.1.1.2.~ If not associated
                     * 1.1.1.1.1.1.1.2.1.~ Update sensor state to IDLE
                     * 1.1.1.1.1.1.1.2.2.~ Send SDP: DCA-RSP with code 4
                     * 1.1.1.1.1.2.~ if SSN not exist
                     * 1.1.1.1.1.2.1.~ Update sensor state to IDLE
                     * 1.1.1.1.1.2.2.~ Send SDP: DCA-RSP with code 2
                     * 1.1.1.2.~ If not receivable state
                     * 1.1.1.2.1.~ Break
                     * 1.2.~ if payload don't have lat, lng => APP
                     * 1.2.1.~ Check user state
                     * 1.2.1.1.~ If receivable state
                     * 1.2.1.1.1.~ Check USN exist
                     * 1.2.1.1.1.1.~ If USN exist
                     * 1.2.1.1.1.1.1.~ Update USN state to CID INFORMED
                     * 1.2.1.1.1.1.2.~ Send SDP: DCA-RSP with code 0
                     * 1.2.1.1.1.2.~ If USN not exist
                     * 1.2.1.1.1.2.1.~ Update USN state to IDLE
                     * 1.2.1.1.1.2.2.~ Send SDP: DCA-RSP with code 2
                     * 1.2.1.2.~ If not receivable state
                     * 1.2.1.2.1.~ Break
                     */
                    // 1.1.1.~
                    return state.getState(g.ENTITY_TYPE.DATABASE, g.ENDPOINT_ID_TYPE.EI_TYPE_SENSOR_SSN, protocol.getEndpointId(), (resState, searchedKey) => {
                        // 1.1.1.1.~ 
                        if (g.DATABASE_RECV_STATE_BY_MSG.SDP_DCA_REQ.includes(resState)) {
                            // 1.1.1.1.1.~
                            redisCli.get(`s:info:${protocol.getEndpointId()}:actf`, (err, actf) => {
                                if (err) {} else {
                                    // 1.1.1.1.1.1.~
                                    if (actf !== null) {
                                        // 1.1.1.1.1.1.1.~ & 1.1.1.1.1.1.1.1.~
                                        if (Number(actf) === g.SENSOR_ACT_FLAG.ASSOCATIED || Number(actf) === g.SENSOR_ACT_FLAG.OPERATING) {
                                            //sModule.confirmStationalGps(protocol.getEndpointId(), unpackedPayload.lat, unpackedPayload.lng, (result) => {
                                            //});
                                            // 1.1.1.1.1.1.1.1.1.1.1.1.~
                                            redisCli.set(`s:info:${protocol.getEndpointId()}:actf`, 2);
                                            redisCli.get(`s:info:${protocol.getEndpointId()}:cgeo`, (err, cgeo) => {
                                                if (cgeo === null) {
                                                    redisCli.set(`s:info:${protocol.getEndpointId()}:cgeo`, `${unpackedPayload.lat},${unpackedPayload.lng}`);
                                                    //redisCli.sadd(`search:s:crgeo:${unpackedPayload.nat}:${unpackedPayload.state}:${unpackedPayload.city}`, protocol.getEndpointId());
                                                    
                                                    state.setState(g.ENTITY_TYPE.DATABASE, g.ENDPOINT_ID_TYPE.EI_TYPE_SENSOR_SSN, protocol.getEndpointId(), g.DATABASE_SSN_STATE_ID.DATABASE_SSN_CID_ALLOACATED_STATE, g.DATABASE_TIMER.T955);
                                                    logger.debug("| DATABASE change SSN state (SSN INFORMED) -> (CID ALLOCATED)");

                                                    // 1.1.1.1.1.1.1.1.1.1.1.3.~
                                                    payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_DCA.RESCODE_SDP_DCA_OK;
                                                    protocol.packMsg(g.SDP_MSG_TYPE.SDP_DCA_RSP, payload);

                                                    logger.debug(`| DATABASE Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                                    res.send(protocol.getPackedMsg());

                                                } else {
                                                    redisCli.get(`s:info:${protocol.getEndpointId()}:mobf`, (err, mobf)=> {
                                                        if(mobf === '0') {
                                                            if (cgeo === `${unpackedPayload.lat},${unpackedPayload.lng}`) {
                                                                // 1.1.1.1.1.1.1.1.1.1.1.2.~
                                                                state.setState(g.ENTITY_TYPE.DATABASE, g.ENDPOINT_ID_TYPE.EI_TYPE_SENSOR_SSN, protocol.getEndpointId(), g.DATABASE_SSN_STATE_ID.DATABASE_SSN_CID_ALLOACATED_STATE, g.DATABASE_TIMER.T955);
                                                                logger.debug("| DATABASE change SSN state (SSN INFORMED) -> (CID ALLOCATED)");
                                                                // 1.1.1.1.1.1.1.1.1.1.1.3.~
                                                                payload.mobf = mobf;
                                                                payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_DCA.RESCODE_SDP_DCA_OK;
                                                                protocol.packMsg(g.SDP_MSG_TYPE.SDP_DCA_RSP, payload);

                                                                logger.debug(`| DATABASE Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                                                res.send(protocol.getPackedMsg());

                                                            } else {
                                                                // 1.1.1.1.1.1.1.1.1.1.1.3.~
                                                                payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_DCA.RESCODE_SDP_DCA_INITIAL_GPS_MISMACH;
                                                                protocol.packMsg(g.SDP_MSG_TYPE.SDP_DCA_RSP, payload);

                                                                logger.debug(`| DATABASE Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                                                res.send(protocol.getPackedMsg());

                                                            }
                                                        } else {
                                                            redisCli.set(`s:info:${protocol.getEndpointId()}:cgeo`, `${unpackedPayload.lat},${unpackedPayload.lng}`);
                                                            // 1.1.1.1.1.1.1.1.1.1.1.3.~
                                                            payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_DCA.RESCODE_SDP_DCA_OK;
                                                            protocol.packMsg(g.SDP_MSG_TYPE.SDP_DCA_RSP, payload);

                                                            logger.debug(`| DATABASE Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                                            res.send(protocol.getPackedMsg());

                                                        }
                                                    });
                                                }   
                                            });

                                        // 1.1.1.1.1.1.1.2.~
                                        } else if (actf === g.SENSOR_ACT_FLAG.REGISTERED || actf === g.SENSOR_ACT_FLAG.DEREGISTERED) {
                                            // 1.1.1.1.1.1.1.2.1.~
                                            state.setState(g.ENTITY_TYPE.DATABASE, g.ENDPOINT_ID_TYPE.EI_TYPE_SENSOR_SSN, protocol.getEndpointId(), g.DATABASE_SSN_STATE_ID.DATABASE_SSN_IDLE_STATE);
                                            logger.debug("| DATABASE change SSN state (SSN INFORMED) -> (IDLE)");
                                            // 1.1.1.1.1.1.1.2.2.~
                                            payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_DCA.RESCODE_SDP_DCA_NOT_AN_ASSOCIATED_SENSOR_WITH_ANY_USER;
                                            protocol.packMsg(g.SDP_MSG_TYPE.SDP_DCA_RSP, payload);

                                            logger.debug(`| DATABASE Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                            res.send(protocol.getPackedMsg());

                                        }
                                    // 1.1.1.1.1.2.~
                                    } else {
                                        // 1.1.1.1.1.2.1~
                                        state.setState(g.ENTITY_TYPE.DATABASE, g.ENDPOINT_ID_TYPE.EI_TYPE_SENSOR_SSN, protocol.getEndpointId(), g.DATABASE_SSN_STATE_ID.DATABASE_SSN_IDLE_STATE);
                                        logger.debug("| DATABASE change SSN state (SSN INFORMED) -> (IDLE)");

                                        // 1.1.1.1.1.2.2.~
                                        payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_DCA.RESCODE_SDP_DCA_NOT_EXIST_USER_SEQUENCE_NUMBER_OR_SENSOR_SERIAL_NUMBER;
                                        protocol.packMsg(g.SDP_MSG_TYPE.SDP_DCA_RSP, payload);

                                        logger.debug(`| DATABASE Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                        res.send(protocol.getPackedMsg());
                                    }
                                }
                            });
                            // 1.1.1.2.~
                        }
                    });
                    // 1.2.~
                } else {
                    // 1.2.1.~ 
                    return state.getState(g.ENTITY_TYPE.DATABASE, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_USN, protocol.getEndpointId(), (resState, searchedKey) => {
                        // 1.2.1.1.~
                        if (g.DATABASE_RECV_STATE_BY_MSG.SDP_DCA_REQ.includes(resState)) {
                            // 1.2.1.1.1.~
                            redisCli.get(`u:info:${protocol.getEndpointId()}:usn`, (err, usn) => {
                                // 1.2.1.1.1.1.~
                                if (usn !== null) {
                                    // 1.2.1.1.1.1.1.~
                                    state.setState(g.ENTITY_TYPE.DATABASE, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_USN, protocol.getEndpointId(), g.DATABASE_USN_STATE_ID.DATABASE_USN_CID_INFORMED_STATE, g.DATABASE_TIMER.T955);
                                    logger.debug("| DATABASE change SSN state (USN INFORMED) -> (CID ALLOCATED)");

                                    // 1.2.1.1.1.1.2.~
                                    payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_DCA.RESCODE_SDP_DCA_OK;
                                    protocol.packMsg(g.SDP_MSG_TYPE.SDP_DCA_RSP, payload);

                                    logger.debug(`| DATABASE Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                    res.send(protocol.getPackedMsg());
                                    // 1.2.1.1.1.2.~
                                } else {
                                    // 1.2.1.1.1.2.1.~
                                    state.setState(g.ENTITY_TYPE.DATABASE, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_USN, protocol.getEndpointId(), g.DATABASE_USN_STATE_ID.DATABASE_USN_IDLE_STATE);
                                    logger.debug("| DATABASE change SSN state (USN INFORMED) -> (IDLE)");
                                    // 1.2.1.1.1.2.2.~
                                    payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_DCA.RESCODE_SDP_DCA_NOT_EXIST_USER_SEQUENCE_NUMBER_OR_SENSOR_SERIAL_NUMBER;
                                    protocol.packMsg(g.SDP_MSG_TYPE.SDP_DCA_RSP, payload);

                                    logger.debug(`| DATABASE Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                    res.send(protocol.getPackedMsg());
                                }
                            });
                            // 1.2.1.2.~
                        } 
                    });
                }

            /**
             * Receive SDP: DCD-NOT
             * Last update: 10.26.2018
             * Author: Junhee Park
             */
            case g.SDP_MSG_TYPE.SDP_DCD_NOT:
                /*
                * Receive SDP: DCD-NOT
                * 1.~ 엔티티 타입 확인
                * 1.1.~ If SSP
                * 1.1.1.~ Check SSN state
                * 1.1.1.1.~ If receivable state
                * 1.1.1.1.1.~ Check the existance of SSN
                * 1.1.1.1.1.1.~ If SSN exist
                * 1.1.1.1.1.1.1.~ Update sensor activation flag to 3
                * 1.1.1.1.1.1.2.~ Update sensor state to IDLE
                * 1.1.1.1.1.1.3.~ Send SDP: DCD-ACK with code 0
                * 1.1.1.1.1.2.~ If SSN not exist
                * 1.1.1.1.1.2.1.~ Update sensor state to IDLE
                * 1.1.1.1.1.2.2.~ Send SDP: DCD-ACK with code 2
                * 1.1.1.2.~ If not recevable state
                * 1.1.1.2.1.~ break;
                * 1.2.~ If SAP
                * 1.2.1.~ Check USN state
                * 1.2.1.1.~ If receivable state
                * 1.2.1.1.1.~ Check the existance of USN
                * 1.2.1.1.1.1.~ If USN exist
                * 1.2.1.1.1.1.1.~ Update USN state to USN INFORMED
                * 1.2.1.1.1.1.2.~ Send SDP: DCD-ACK with code 0
                * 1.2.1.1.1.2.~ If USN not exist
                * 1.2.1.1.1.2.1.~ Update USN state to IDLE
                * 1.2.1.1.1.2.2.~ Send SDP: DCD-ACK with code 2
                * 1.2.1.2.~ If not receivable state
                * 1.2.1.2.1.~ Break
                */
                // 1. & 1.1.~
                if (unpackedPayload.entityType === g.ENTITY_TYPE.SENSOR) {
                    // 1.1.1.~
                    return state.getState(g.ENTITY_TYPE.DATABASE, g.ENDPOINT_ID_TYPE.EI_TYPE_SENSOR_SSN, protocol.getEndpointId(), (resState, searchKey) => {
                        // 1.1.1.1.~ 
                        payload = {};
                        if (g.DATABASE_RECV_STATE_BY_MSG.SDP_DCD_NOT.includes(resState)) {
                            // 1.1.1.1.1.~
                            redisCli.get(`s:info:${protocol.getEndpointId()}:actf`, (err, actf) => {
                                // 1.1.1.1.1.1.~
                                if (actf !== null) {
                                    // 1.1.1.1.1.1.1.
                                    redisCli.set(`s:info:${protocol.getEndpointId()}:actf`, 1);
                                    // 1.1.1.1.1.1.2.
                                    state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_SENSOR_SSN, protocol.getEndpointId(), g.SERVER_SSN_STATE_ID.SERVER_SSN_IDLE_STATE);
                                    logger.debug("| SERVER change SSN state (CID INFORMED) ->  (IDLE)");

                                    // 1.1.1.1.1.1.3.
                                    payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_DCD.RESCODE_SDP_DCD_OK;
                                    protocol.packMsg(g.SDP_MSG_TYPE.SDP_DCD_ACK, payload);

                                    logger.debug(`| DATABASE Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                    res.send(protocol.getPackedMsg());
                                    // 1.1.1.1.1.2.~
                                } else {
                                    // 1.1.1.1.1.2.1.~
                                    state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_SENSOR_SSN, protocol.getEndpointId(), g.SERVER_SSN_STATE_ID.SERVER_SSN_IDLE_STATE);
                                    logger.debug("| SERVER change SSN state (CID INFORMED) ->  (IDLE)");

                                    // 1.1.1.1.1.2.2.~
                                    payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_DCD.RESCODE_SDP_DCD_NOT_EXIST_USER_SEQUENCE_NUMBER_OR_SENSOR_SERIAL_NUMBER;
                                    protocol.packMsg(g.SDP_MSG_TYPE.SDP_DCD_ACK, payload);

                                   logger.debug(`| DATABASE Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                   res.send(protocol.getPackedMsg());
                                }
                            });
                        }
                    });
                    // 1.2.~
                } else if (unpackedPayload.entityType === g.ENTITY_TYPE.APPCLIENT) {
                    // 1.2.1.~
                    return state.getState(g.ENTITY_TYPE.DATABASE, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_USN, protocol.getEndpointId(), (resState, searchKey) => {
                        // 1.2.1.1.~
                        payload = {};
                        if (g.DATABASE_RECV_STATE_BY_MSG.SDP_DCD_NOT.includes(resState)) {
                            // 1.2.1.1.1.~
                            redisCli.get('u:info:' + protocol.getEndpointId() + ':usn', (err, usn) => {
                                // 1.2.1.1.1.1.~
                                if (usn !== null) {
                                    // 1.2.1.1.1.1.1.~
                                    state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_USN, protocol.getEndpointId(), g.SERVER_USN_STATE_ID.SERVER_USN_USN_INFORMED_STATE);
                                    logger.debug("| SERVER change SSN state (CID INFORMED) ->  (USN INFORMED)");

                                    // 1.2.1.1.1.1.2.~
                                    payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_DCD.RESCODE_SDP_DCD_OK;
                                    protocol.packMsg(g.SDP_MSG_TYPE.SDP_DCD_ACK, payload);

                                    logger.debug(`| DATABASE Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                    res.send(protocol.getPackedMsg());
                                // 1.2.1.1.1.2.~
                                } else {
                                    // 1.2.1.1.1.2.1.~
                                    state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_USN, protocol.getEndpointId(), g.SERVER_USN_STATE_ID.SERVER_USN_IDLE_STATE);
                                    logger.debug("| SERVER change SSN state (CID INFORMED) ->  (IDLE)");

                                    // 1.2.1.1.1.2.2.~
                                    payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_DCD.RESCODE_SDP_DCD_NOT_EXIST_USER_SEQUENCE_NUMBER_OR_SENSOR_SERIAL_NUMBER;
                                    protocol.packMsg(g.SDP_MSG_TYPE.SDP_DCD_ACK, payload);

                                    logger.debug(`| DATABASE Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                    res.send(protocol.getPackedMsg());
                                }
                            });
                        }
                    });
                }
            /**
             * Receive SDP: HAV-REQ
             * Last update: 11.07.2018
             * Author: Junhee Park
             */
            case g.SDP_MSG_TYPE.SDP_HAV_REQ:
                return state.getState(g.ENTITY_TYPE.DATABASE, g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_USN, protocol.getEndpointId(), (resState, searchedKey) => {
                    payload = {};
                    if (g.DATABASE_RECV_STATE_BY_MSG.SDP_HAV_REQ.includes(resState)) {
                        //Auth, It should be repfactoring
                        if (protocol.getEndpointId() < 2) {
                            let searchHistoricalData = new dataModule();
                            let nat = unpackedPayload.nat,
                                state = unpackedPayload.state,
                                city = unpackedPayload.city,
                                sTs = unpackedPayload.sTs,
                                eTs = unpackedPayload.eTs;

                            searchHistoricalData.searchHistoricalAirData(nat, state, city, sTs, eTs, (result) => {
                                var historicalAirQualityDataListEncodings = [];
                                if (result) {
                                    for (let i = 0, x = result.length; i < x; i++) {
                                        let dataTuple = result[i];
                                        if (dataTuple.dataList.length > 0){
                                            historicalAirQualityDataListEncodings.push({
                                                wmac: dataTuple.wmac,
                                                lat: dataTuple.geoList[0].split(',')[1],
                                                lng: dataTuple.geoList[0].split(',')[2],
                                                commonDataTierTuple: dataTuple.dataList
                                            });
                                        }
                                        
                                    }
                                }
                                payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_HAV.RESCODE_SDP_HAV_OK;
                                payload.lastFlg = 1;
                                payload.flgSeqNum = 0;
                                payload.historicalAirQualityDataListEncodings = historicalAirQualityDataListEncodings;
                                protocol.packMsg(g.SDP_MSG_TYPE.SDP_HAV_RSP, payload);

                                logger.debug(`| DATABASE Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                res.send(protocol.getPackedMsg());
                            });
                        } else {
                            payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_HAV.RESCODE_SDP_HAV_REQUESTED_BY_AN_UNAUTHORIZED_USER_SEQUENCE_NUMBER;
                            protocol.packMsg(g.SDP_MSG_TYPE.SDP_HAV_RSP, payload);

                            logger.debug(`| DATABASE Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                            res.send(protocol.getPackedMsg());
                        }
                    }
                });
            /**
             * Receive SDP: SHR-REQ
             * Last update: 11.07.2018
             * Author: Junhee Park
             */
            case g.SDP_MSG_TYPE.SDP_SHR_REQ:
                /**
                 * 지역별로 센서정보를 검색하기 위해선 미리 관련된 검색조건이 자료형으로 존재해야함
                 * 지역이 처음등록되는 시점은 ASR(SRG)이후 SAS이후 DCA과정에 일어나야함. 그런데 DCA에서 두가지 경우로 나뉘게 되는데
                 * 첫 번째는 고정형 센서에서 측정하는 맨 처음값이 지역으로 등록되고, 
                 * 두 번째는 이동형 센서에서 측정하는 매 순간의 지역들이 등록된다.
                 * 즉 DCA과정이 일어날 때 지역이 업데이트 되어야 함.
                 * 여기서 고정형 센서는 항상 동일한위치에서 데이터를 측정한다. 그렇다면 가정으로 현재 사용중인 센서의 경우 고정형은 과거에 등록된 위치,
                 * 이동형은 최신위치를 사용한다. 
                 * 
                 */
                if (protocol.getEndpointId() !== 0) {
                    return state.getState(g.ENTITY_TYPE.DATABASE, g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_USN, protocol.getEndpointId(), (resState, searchedKey) => {
                        if (g.DATABASE_RECV_STATE_BY_MSG.SDP_SHR_REQ.includes(resState)) {
                            //센서 관련 내용 검색이 가능해야함
                            //서치옵션을 이용한 센서리스트 확보
                            redisCli.smembers(`search:s:nat:${unpackedPayload.nat}`, (err, ssnList) => {
                                if (err) {} else {
                                    if (ssnList.length === 0) {
                                        payload = {};
                                        payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SHR.RESCODE_SDP_SHR_OK;
                                        payload.historyRecordList = [];
                                        protocol.packMsg(g.SDP_MSG_TYPE.SDP_SHR_RSP, payload);

                                        logger.debug(`Server Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                        res.send(protocol.getPackedMsg());
                                    } else {
                                        let commandSet = [];
                                        for (let i = 0, x = ssnList.length; i < x; i++) {
                                            let keyHead = 's:info:' + ssnList[i] + ':';
                                            commandSet.push(['mget',
                                                `${keyHead}wmac`,
                                                `${keyHead}cgeo`,
                                                `${keyHead}sdt`,
                                                `${keyHead}edt`,
                                                `${keyHead}actf`,
                                                `${keyHead}stat`
                                            ]);
                                        }

                                        //확보된 키를 이용한 센서정보 조회
                                        redisCli.multi(commandSet).exec((err, replies) => {
                                            if (err) {}
                                            let historyRecordList = []
                                            //집계
                                            for (let i = 0, x = replies.length; i < x; i++) {
                                                if (replies[i][1] !== null) {
                                                    historyRecordList.push([
                                                        replies[i][0],
                                                        replies[i][1].split(',')[0],
                                                        replies[i][1].split(',')[1],
                                                        replies[i][2],
                                                        replies[i][3],
                                                        replies[i][4],
                                                        replies[i][5]
                                                    ]);
                                                }
                                                
                                            }
                                            payload = {};
                                            payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SHR.RESCODE_SDP_SHR_OK;
                                            payload.historyRecordList = historyRecordList;
                                            protocol.packMsg(g.SDP_MSG_TYPE.SDP_SHR_RSP, payload);

                                            logger.debug(`| DATABASE Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                            res.send(protocol.getPackedMsg());
                                        });
                                    }
                                }
                            });
                        }
                    });
                } else {
                    redisCli.smembers(`search:s:nat:${unpackedPayload.nat}`, (err, ssnList) => {
                        if (err) { } else {
                            if (ssnList.length === 0) {
                                payload = {};
                                payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SHR.RESCODE_SDP_SHR_OK;
                                payload.historyRecordList = [];
                                protocol.packMsg(g.SDP_MSG_TYPE.SDP_SHR_RSP, payload);

                                logger.debug(`| DATABASE Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                res.send(protocol.getPackedMsg());
                            } else {
                                let commandSet = [];
                                for (let i = 0, x = ssnList.length; i < x; i++) {
                                    let keyHead = `s:info:${ssnList[i]}:`;
                                    commandSet.push(
                                        [
                                            "mget",
                                            `${keyHead}wmac`,
                                            `${keyHead}cgeo`,
                                            `${keyHead}sdt`,
                                            `${keyHead}edt`,
                                            `${keyHead}actf`,
                                            `${keyHead}stat`
                                        ]
                                    );
                                }
                                redisCli.multi(commandSet).exec((err, replies) => {
                                    if (err) { }
                                    let historyRecordList = []
                                    for (let i = 0, x = replies.length; i < x; i++) {
                                        if (replies[i][1] !== null) {
                                            historyRecordList.push([
                                                replies[i][0],
                                                replies[i][1].split(',')[0],
                                                replies[i][1].split(',')[1],
                                                replies[i][2],
                                                replies[i][3],
                                                replies[i][4],
                                                replies[i][5]
                                            ]);
                                        }
                                    }
                                    payload = {};
                                    payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SHR.RESCODE_SDP_SHR_OK;
                                    payload.historyRecordList = historyRecordList;
                                    protocol.packMsg(g.SDP_MSG_TYPE.SDP_SHR_RSP, payload);

                                    logger.debug(`| DATABASE Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                    res.send(protocol.getPackedMsg());
                                });
                            }
                        }
                    });
                }
                break;
            
            /**
             * Receive SDP: HHV-REQ
             * Last update: 11.07.2018
             * Author: Junhee Park
             */
            case g.SDP_MSG_TYPE.SDP_HHV_REQ:
                endpointIdType = g.ENDPOINT_ID_TYPE.EI_TYPE_APP_USN;
                if (unpackedPayload.clientType === g.CLIENT_TYPE.WEB) {
                    endpointIdType = g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_USN;
                }
                return state.getState(g.ENTITY_TYPE.DATABASE, endpointIdType, protocol.getEndpointId(), (resState, searchedKey) => {
                    payload = {};
                    if (g.DATABASE_RECV_STATE_BY_MSG.SDP_HHV_REQ.includes(resState)) {
                        //Auth, It should be repfactoring
                        let nat = '',
                            state = '',
                            city = '',
                            sTs = unpackedPayload.sTs,
                            eTs = unpackedPayload.eTs
                        nat = unpackedPayload.nat === '' ? '*' : unpackedPayload.nat;
                        state = unpackedPayload.state === '' ? '*' : unpackedPayload.state;
                        city = unpackedPayload.city === '' ? '*' : unpackedPayload.city;


                        redisCli.keys(`d:heart:raw:${nat}:${state}:${city}:${protocol.getEndpointId()}`, (err, keys) => {
                            if (err) {} else {
                                if (keys.length > 0) {
                                    keys;
                                    let commandList = [];
                                    for (let i = 0, x = keys.length; i < x; i++) {
                                        commandList.push(['zrangebyscore', keys[i], sTs, eTs]);
                                    }
                                    redisCli.multi(commandList).exec((err, replies) => {
                                        if (err) {} else {
                                            let historicalHeartQualityDataListEncodings = [];
                                            for (let i = 0, x = replies.length; i < x; i++) {
                                                for (let j = 0, y = replies[i].length; j < y; j++) {
                                                    historicalHeartQualityDataListEncodings.push(replies[i][j]);
                                                }
                                            }
                                            payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_HHV.RESCODE_SDP_HHV_OK;
                                            payload.historicalHeartQualityDataListEncodings = historicalHeartQualityDataListEncodings;
                                            protocol.packMsg(g.SDP_MSG_TYPE.SDP_HHV_RSP, payload);

                                            logger.debug(`| DATABASE Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                            res.send(protocol.getPackedMsg());
                                        }
                                    });
                                } else {
                                    payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_HHV.RESCODE_SDP_HHV_OK;
                                    payload.historicalHeartQualityDataListEncodings = [];
                                    protocol.packMsg(g.SDP_MSG_TYPE.SDP_HHV_RSP, payload);

                                    logger.debug(`| DATABASE Send response: ${JSON.stringify(protocol.getPackedMsg())}`);
                                    res.send(protocol.getPackedMsg());
                                }

                            }
                        });
                    }
                });

            default:
                break;
            
    }
});