"use strict";

class procU01_SignUp_AC {
    constructor() {
    }
    SAP_SGU_REQ(protocol, unpackedPayload, res) {
        state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_TCI, protocol.getEndpointId(), (resState, searchedKey) => {
            let payload = {};
            //처음받지 않을경우
            if (resState) {
                logger.debug("| SV | GET | APP | TCI STATE | (User ID Duplication Requested) or (User ID Availability Confirmed) or (Half-USN Allocated) or (USN Allocated)");
                //아이디가 같을경우 재전송, 다를경우 중복
                if (`c:sta:s:a:tci:${protocol.getEndpointId()}:${unpackedPayload.userId}` === searchedKey) {
                    logger.debug("| SV | SET | APP | TCI STATE | (  ^  ) -> (Idle)");
                    state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_TCI, [protocol.getEndpointId(), unpackedPayload.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_IDLE_STATE);
                    
                    logger.debug("| SV | PACK| APP | SDP:SGU-REQ");
                    payload.clientType = g.CLIENT_TYPE.APP;
                    payload.userId = unpackedPayload.userId;
                    payload = protocol.packMsg(g.SDP_MSG_TYPE.SDP_SGU_REQ, payload);

                    let userInfo = unpackedPayload; //Buffering temporary user information

                    logger.debug(`| SV | SEND| REQ | SDP:SGU-REQ | ${JSON.stringify(protocol.getPackedMsg())}`);
                    logger.debug("| SV | SET | APP | TCI STATE | (Idle) -> (User ID Duplicate Request)");
                    state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_TCI, [protocol.getEndpointId(), unpackedPayload.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_USER_ID_DUPLICATE_REQUESTED_STATE);

                    request.send('http://localhost:8080/apidatabase', payload, (message) => {
                        logger.debug("| SV | RCVD| RSP | SDP:SGU-RSP");

                        logger.debug("| SV | VRFY| HDR | SDP:SGU-RSP");
                        protocol.setMsg(message);
                        if (!protocol.verifyHeader()) return;

                        logger.debug("| SV | UNPK| PYLD| SDP:SGU-RSP");
                        unpackedPayload = protocol.unpackPayload();
                        if (!unpackedPayload) return;
                        switch (unpackedPayload.resultCode) {
                            case g.SDP_MSG_RESCODE.RESCODE_SDP_SGU.RESCODE_SDP_SGU_OK:
                                return state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_TCI, protocol.getEndpointId(), (resState) => {
                                    if (g.SERVER_RECV_STATE_BY_MSG.SDP_SGU_RSP.includes(resState)) {
                                        logger.debug("| SV | GET | APP | TCI STATE | Available");
                                        
                                        logger.debug("| SV | GEN | CODE| Generate Verification Code & Authentication Code");
                                        const ac = codeGen.getAuthenticationCode(),
                                              vc = codeGen.getVerificationCode(),
                                              content = `<H1> Verification code: ${vc}<H1></BR><H1> Authentication code: ${ac}<H1>`;

                                        const keyHead = `u:temp:${protocol.getEndpointId()}:`,
                                            expTime = g.SERVER_TIMER.T862;
                                        logger.debug(`| SV | STOR| APP | Temporary user sign-up information | Expire in: ${expTime} | Data:  ${JSON.stringify(userInfo)}`);
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
                                            }
                                        });

                                        logger.debug(`| SV | PACK| APP | SAP: SGU-RSP`);
                                        payload = {};
                                        payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_SGU.RESCODE_SAP_SGU_OK;
                                        payload.vc = vc;
                                        protocol.packMsg(g.SAP_MSG_TYPE.SAP_SGU_RSP, payload);

                                        logger.debug(`| SV | SEND| MAIL| Send Verification Email | VC:${vc} | AC: ${ac}`);
                                        mailer.sendEmail(userInfo.userId, 'Verification from Airound', content);
                                        
                                        logger.debug("| SV | SET | APP | TCI STATE | (User ID Duplicate Requested) -> (User ID Availability Confirmed)");
                                        state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_TCI, [protocol.getEndpointId(), userInfo.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_USER_ID_AVAILABLITY_CONFIRMED_STATE, g.SERVER_TIMER.T862);

                                        logger.debug(`| SV | SEND| REQ | SAP:SGU-RSP | ${JSON.stringify(protocol.getPackedMsg())}`);
                                        res.send(protocol.getPackedMsg());
                                    }
                                });

                            case g.SDP_MSG_RESCODE.RESCODE_SDP_SGU.RESCODE_SDP_SGU_OTHER:
                                
                                logger.debug(`| SV | PACK| APP | SAP: SGU-RSP`);
                                payload = {};
                                payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_SGU.RESCODE_SAP_SGU_OTHER;
                                protocol.packMsg(g.SAP_MSG_TYPE.SAP_SGU_RSP, payload);

                                logger.debug("| SV | SET | APP | TCI STATE | (User ID Duplicate Requested) -> (Idle)");
                                state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_TCI, [protocol.getEndpointId(), userInfo.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_IDLE_STATE);
                                
                                logger.debug(`| SV | SEND| REQ | SAP:SGU-RSP | ${JSON.stringify(protocol.getPackedMsg())}`);
                                return res.send(protocol.getPackedMsg());

                            case g.SDP_MSG_RESCODE.RESCODE_SDP_SGU.RESCODE_SDP_SGU_DUPLICATE_OF_USER_ID:
                                payload = {};
                                payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_SGU.RESCODE_SAP_SGU_DUPLICATE_OF_USER_ID;
                                protocol.packMsg(g.SAP_MSG_TYPE.SAP_SGU_RSP, payload);

                                logger.debug("| SV | SET | APP | TCI STATE | (User ID Duplicate Requested) -> (Idle)");
                                state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_TCI, [protocol.getEndpointId(), userInfo.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_IDLE_STATE);

                                logger.debug(`| SV | SEND| REQ | SAP:SGU-RSP | ${JSON.stringify(protocol.getPackedMsg())}`);
                                return res.send(protocol.getPackedMsg());
                        }
                    });
                } else {
                    logger.debug(`| SV | PACK| APP | SAP: SGU-RSP`);
                    payload = {};
                    payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_SGU.RESCODE_SAP_SGU_CONFLICT_OF_TEMPORARY_CLIENT_ID
                    protocol.packMsg(g.SAP_MSG_TYPE.SAP_SGU_RSP, payload)

                    logger.debug(`| SV | SEND| REQ | SAP:SGU-RSP | ${JSON.stringify(protocol.getPackedMsg())}`);
                    return res.send(protocol.getPackedMsg());
                }
            } else {
                logger.debug("| SV | GET | APP | TCI STATE | (Null)");
                resState = g.SERVER_TCI_STATE_ID.SERVER_TCI_IDLE_STATE;

                if (g.SERVER_RECV_STATE_BY_MSG.SAP_SGU_REQ.includes(resState)) {
                    
                    logger.debug("| SV | SET | APP | TCI STATE | (null) -> (Idle)");
                    state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_TCI, [protocol.getEndpointId(), unpackedPayload.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_IDLE_STATE);
                    
                    logger.debug(`| SV | PACK| APP | SDP: SGU-REQ`);
                    payload.userId = unpackedPayload.userId;
                    payload.clientType = g.CLIENT_TYPE.APP;
                    payload = protocol.packMsg(g.SDP_MSG_TYPE.SDP_SGU_REQ, payload);

                    logger.debug("| SV | SET | APP | TCI STATE | (Idle) -> (User ID Duplicate Request)");
                    state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_TCI, [protocol.getEndpointId(), unpackedPayload.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_USER_ID_DUPLICATE_REQUESTED_STATE);
                    
                    let userInfo = unpackedPayload;
                    logger.debug(`| SV | SEND| REQ | SDP:SGU-REQ | ${JSON.stringify(protocol.getPackedMsg())}`);
                    request.send('http://localhost:8080/apidatabase', payload, (message) => {
                        logger.debug("| SV | RCVD| RSP | SDP:SGU-RSP");

                        logger.debug("| SV | VRFY| HDR | SDP:SGU-RSP");
                        protocol.setMsg(message);
                        if (!protocol.verifyHeader()) return;

                        logger.debug("| SV | UNPK| PYLD| SDP:SGU-RSP");
                        unpackedPayload = protocol.unpackPayload();
                        if (!unpackedPayload) return;

                        switch (unpackedPayload.resultCode) {
                            case g.SDP_MSG_RESCODE.RESCODE_SDP_SGU.RESCODE_SDP_SGU_OK:
                                return state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_TCI, protocol.getEndpointId(), (resState) => {
                                    logger.debug("| SV | GET | APP | TCI STATE | Available");
                                    if (g.SERVER_RECV_STATE_BY_MSG.SDP_SGU_RSP.includes(resState)) {

                                        logger.debug("| SV | GEN | CODE| Get VC, AC code");
                                        const ac = codeGen.getAuthenticationCode(),
                                            vc = codeGen.getVerificationCode(),
                                            contect = `<H1> Verification code: ${vc}<H1></BR><H1> Authentication code: ${ac}<H1>`;

                                        logger.debug(`| SV | SEND| MAIL| Send Verification Email | VC:${vc} | AC: ${ac}`);
                                        mailer.sendEmail(userInfo.userId, 'Verification from Airound', contect);

                                        const keyHead = `u:temp:${protocol.getEndpointId()}:`,
                                            expTime = g.SERVER_TIMER.T862;
                                        logger.debug(`| SV | STOR| APP | Temporary user sign-up information | Expire in: ${expTime} | Data:  ${JSON.stringify(userInfo)}`);

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
                                            }
                                        });

                                        logger.debug(`| SV | PACK| APP | SAP: SGU-RSP`);
                                        payload = {};
                                        payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_SGU.RESCODE_SAP_SGU_OK;
                                        payload.vc = vc;
                                        protocol.packMsg(g.SAP_MSG_TYPE.SAP_SGU_RSP, payload);

                                        logger.debug("| SV | SET | APP | TCI STATE | (User ID Duplicate Requested) -> (User ID Availability Confirmed)");
                                        state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_TCI, [protocol.getEndpointId(), userInfo.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_USER_ID_AVAILABLITY_CONFIRMED_STATE, g.SERVER_TIMER.T862);

                                        logger.debug(`| SV | SEND| REQ | SDP:SGU-RSP | ${JSON.stringify(protocol.getPackedMsg())}`);
                                        return res.send(protocol.getPackedMsg());
                                    }
                                });

                            case g.SDP_MSG_RESCODE.RESCODE_SDP_SGU.RESCODE_SDP_SGU_OTHER:

                                logger.debug(`| SV | PACK| APP | SAP: SGU-RSP`);
                                payload = {};
                                payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_SGU.RESCODE_SAP_SGU_OTHER;
                                protocol.packMsg(g.SAP_MSG_TYPE.SAP_SGU_RSP, payload);
                                
                                logger.debug("| SV | SET | APP | TCI STATE | (User ID Duplicate Requested) -> (Idle)");
                                state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_TCI, [protocol.getEndpointId(), userInfo.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_IDLE_STATE);

                                logger.debug(`| SV | SEND| REQ | SDP:SGU-RSP | ${JSON.stringify(protocol.getPackedMsg())}`);
                                return res.send(protocol.getPackedMsg());

                            case g.SDP_MSG_RESCODE.RESCODE_SDP_SGU.RESCODE_SDP_SGU_DUPLICATE_OF_USER_ID:

                                logger.debug(`| SV | PACK| APP | SAP: SGU-RSP`);
                                payload = {};
                                payload.resultCode = g.SAP_MSG_RESCODE.RESCODE_SAP_SGU.RESCODE_SAP_SGU_DUPLICATE_OF_USER_ID;
                                protocol.packMsg(g.SAP_MSG_TYPE.SAP_SGU_RSP, payload);
                                
                                logger.debug("| SV | SET | APP | TCI STATE | (User ID Duplicate Requested) -> (Idle)");
                                state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_TCI, [protocol.getEndpointId(), userInfo.userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_IDLE_STATE);
                                
                                logger.debug(`| SV | SEND| REQ | SDP:SGU-RSP | ${JSON.stringify(protocol.getPackedMsg())}`);
                                return res.send(protocol.getPackedMsg());
                        }
                    });
                }
            }
        });
    }
    SAP_UVC_REQ(protocol, unpackedPayload, res) {
        state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_TCI, protocol.getEndpointId(), (resState, searchedKey) => {
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
                                                            request.send('http://localhost:8080/apidatabase', payload, (message) => {
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
    }
}

let procedure = new procU01_SignUp_AC()
module.exports = procedure;