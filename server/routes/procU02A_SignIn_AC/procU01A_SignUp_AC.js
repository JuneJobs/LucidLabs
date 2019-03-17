"use strict";

class procU02A_SignIn_AC {
    constructor() {
    }
    SAP_SGI_REQ(protocol, unpackedPayload, res) {
        return state.getState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_TCI, protocol.getEndpointId(), (resState, searchedKey) => {
            let payload = {};
            //idle state이거나, 재전송인 경우 데이터베이스로 연결하는 로직
            if (resState === false || (resState === g.SERVER_TCI_STATE_ID.SERVER_TCI_HALF_USN_INFORMED_STATE && searchedKey.includes(unpackedPayload.userId))) {
                logger.debug("| SV | GET | APP | TCI STATE | (Idle) or (Half-USN Informed)");
                let userId = unpackedPayload.userId;
                //state변경
                logger.debug("| SV | SET | APP | TCI STATE | (  ^  ) -> (Half-USN Informed)");
                state.setState(g.ENTITY_TYPE.SERVER, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_TCI, [protocol.getEndpointId(), userId], g.SERVER_TCI_STATE_ID.SERVER_TCI_HALF_USN_INFORMED_STATE);
                
                //Database verify request
                logger.debug("| SV | PACK| APP | SDP:SGI-REQ");
                payload.userId = unpackedPayload.userId;
                payload.userPw = unpackedPayload.userPw;
                payload.clientType = g.CLIENT_TYPE.APP;
                payload = protocol.packMsg(g.SDP_MSG_TYPE.SDP_SGI_REQ, payload);

                request.send('http://localhost:8080/databaseapi', payload, (message) => {
                    logger.debug("| SV | RCVD| RSP | SDP:SGI-RSP");

                    logger.debug("| SV | VRFY| HDR | SDP:SGI-RSP");
                    payload = {};
                    protocol.setMsg(message);
                    if (!protocol.verifyHeader()) return;

                    logger.debug("| SV | UNPK| PYLD| SDP:SGI-RSP");
                    unpackedPayload = protocol.unpackPayload();
                    if (!unpackedPayload) return;
                    switch (unpackedPayload.resultCode) {
                        case g.SDP_MSG_RESCODE.RESCODE_SDP_SGI.RESCODE_SDP_SGI_OK:
                            //make buffer data
                            uModule.getNewNumOfSignedInCompls(g.ENTITY_TYPE.APPCLIENT, unpackedPayload.usn, (nsc) => {
                                let keyHead = `c:act:s:${g.ENTITY_TYPE.APPCLIENT}:${unpackedPayload.usn}:`,
                                    expTime = g.SERVER_TIMER.T863,
                                    command = [
                                        ["set", `${keyHead}signf`, "0", "EX", expTime],
                                        ["set", `${keyHead}nsc`, nsc, "EX", expTime],
                                        ["set", `${keyHead}ml`, unpackedPayload.ml, "EX", expTime]
                                    ];
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
    }
}

let procedure = new procU02A_SignIn_AC()
module.exports = procedure;