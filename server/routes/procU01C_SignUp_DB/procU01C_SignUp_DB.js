"use strict";

class procU01C_SignUp_DB {
    constructor() {
    }
    SDP_SGU_REQ(protocol, unpackedPayload, res) {
        //state check
        if (unpackedPayload.clientType === g.CLIENT_TYPE.APP) {
            logger.debug("      | DB | SET | APP | TCI STATE | (Null) -> (Idle)");
            state.setState(g.ENTITY_TYPE.DATABASE, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_TCI, [protocol.getEndpointId(), unpackedPayload.userId], g.DATABASE_TCI_STATE_ID.DATABASE_TCI_IDLE_STATE);
        } else {
            logger.debug("      | DB | SET | WEB | TCI STATE | (Null) -> (Idle)");
            state.setState(g.ENTITY_TYPE.DATABASE, g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_TCI, [protocol.getEndpointId(), unpackedPayload.userId], g.DATABASE_TCI_STATE_ID.DATABASE_TCI_IDLE_STATE);
        }
        redisCli.get("u:info:id:" + unpackedPayload.userId, (err, reply) => {
            
            logger.debug("      | DB | PACK| APP | SDP:SGU-RSP");
            let payload = {},
                sdpSguRspCode = 0;
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
            protocol.packMsg(g.SDP_MSG_TYPE.SDP_SGU_RSP, payload);

            logger.debug(`      | DB | SET | WEB | TCI STATE | (Idle) -> (Unique User ID Confirmed)`);
            if (unpackedPayload.clientType === g.CLIENT_TYPE.APP) {
                state.setState(g.ENTITY_TYPE.DATABASE, g.ENDPOINT_ID_TYPE.EI_TYPE_APP_TCI, [protocol.getEndpointId(), unpackedPayload.userId], g.DATABASE_TCI_STATE_ID.DATABASE_TCI_UNIQUE_USER_ID_CONFIRMED_STATE, g.DATABASE_TIMER.T954);
            } else {
                state.setState(g.ENTITY_TYPE.DATABASE, g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_TCI, [protocol.getEndpointId(), unpackedPayload.userId], g.DATABASE_TCI_STATE_ID.DATABASE_TCI_UNIQUE_USER_ID_CONFIRMED_STATE, g.DATABASE_TIMER.T954);
            }

            logger.debug(`      | DB | SEND| REQ | SDP:SGU-RSP | ${JSON.stringify(protocol.getPackedMsg())}`);
            return res.send(protocol.getPackedMsg());
        });
    }
    SDP_UVC_REQ(protocol, unpackedPayload, res) {
        let endpointIdType = g.ENDPOINT_ID_TYPE.EI_TYPE_APP_TCI;
        if (unpackedPayload.clientType === g.CLIENT_TYPE.WEB) {
            endpointIdType = g.ENDPOINT_ID_TYPE.EI_TYPE_WEB_TCI;
        }
        state.getState(g.ENTITY_TYPE.DATABASE, endpointIdType, [protocol.getEndpointId(), unpackedPayload.userId], (resState, searchedKey) => {
            if (g.DATABASE_RECV_STATE_BY_MSG.SDP_SGU_REQ.includes(resState)) {
                //Initial state
                if (resState === g.DATABASE_TCI_STATE_ID.DATABASE_TCI_UNIQUE_USER_ID_CONFIRMED_STATE) {
                    //Insert user info
                    logger.debug("      | DB | GET | WEB | TCI STATE | (Unique User ID Confirmed)");
                    let userInfo = unpackedPayload;
                    redisCli.keys("u:info:" + unpackedPayload.userId, (err, reply) => {
                        if (err) {
                            logger.debug("      | DB | PACK| APP | SDP: UVC-RSP");
                            payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_SGU.RESCODE_SDP_SGU_OTHER;
                            protocol.packMsg(g.SDP_MSG_TYPE.SDP_UVC_RSP, payload)
                           
                            logger.debug(`      | DB | SEND| REQ | SDP: UVC-RSP | ${JSON.stringify(protocol.getPackedMsg())}`);
                            return res.send(protocol.getPackedMsg());
                        } else {
                            if (reply.length === 0) {
                                uModule.getNewUserSeqNum((newUsn) => {
                                    let payload = {};
                                    userInfo.regf = 0;
                                    userInfo.ml = 0;
                                    userInfo.mti = 0;
                                    userInfo.tti = 0;
                                    userInfo.ass = 0;
                                    userInfo.expd = 0;
                                    userInfo.newUsn = newUsn;
                                    let keyHead = "u:info:" + newUsn + ":";
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
                                            logger.debug("      | DB | PACK| APP | SDP: UVC-RSP");
                                            payload = {
                                                "resultCode": g.SDP_MSG_RESCODE.RESCODE_SDP_UVC.RESCODE_SDP_UVC_OTHER
                                            }
                                            protocol.packMsg(g.SDP_MSG_TYPE.SDP_UVC_RSP, payload);
                                            state.setState(g.ENTITY_TYPE.DATABASE, endpointIdType, [protocol.getEndpointId(), userInfo.userId], g.DATABASE_TCI_STATE_ID.DATABASE_USN_ALLOCATED_STATE, g.DATABASE_TIMER.T902);
                                            
                                            logger.debug(`      | DB | SEND| REQ | SDP: UVC-RSP | ${JSON.stringify(protocol.getPackedMsg())}`);
                                            return res.send(protocol.getPackedMsg());
                                        } else {
                                            logger.debug(`      | DB | STOR| APP | User information | Data:  ${JSON.stringify(userInfo)}`);

                                            logger.debug("      | DB | PACK| APP | SDP: UVC-RSP");
                                            payload = {
                                                "resultCode": g.SDP_MSG_RESCODE.RESCODE_SDP_UVC.RESCODE_SDP_UVC_OK
                                            }
                                            protocol.packMsg(g.SDP_MSG_TYPE.SDP_UVC_RSP, payload);
                                            state.setState(g.ENTITY_TYPE.DATABASE, endpointIdType, [protocol.getEndpointId(), userInfo.userId], g.DATABASE_TCI_STATE_ID.DATABASE_USN_ALLOCATED_STATE, g.DATABASE_TIMER.T902);
                                            
                                            logger.debug(`      | DB | SEND| REQ | SDP: UVC-RSP | ${JSON.stringify(protocol.getPackedMsg())}`);
                                            return res.send(protocol.getPackedMsg());
                                        }
                                    });

                                });
                            } else {
                                logger.debug("      | DB | PACK| APP | SDP: UVC-RSP");
                                payload.resultCode = g.SDP_MSG_RESCODE.RESCODE_SDP_UVC.RESCODE_SDP_UVC_DUPLICATE_OF_USER_ID;
                                protocol.packMsg(g.SDP_MSG_TYPE.SDP_UVC_RSP, payload)
                                
                                logger.debug(`      | DB | SEND| REQ | SDP: UVC-RSP | ${JSON.stringify(protocol.getPackedMsg())}`);
                                return res.send(protocol.getPackedMsg());
                            }
                        }
                    });
                    //Retries state
                } else if (resState === g.DATABASE_TCI_STATE_ID.DATABASE_USN_ALLOCATED_STATE) {
                    logger.debug("      | DB | GET | WEB | TCI STATE | (USN Allocated)");
                    payload = {
                        "resultCode": g.SDP_MSG_RESCODE.RESCODE_SDP_UVC.RESCODE_SDP_UVC_OK
                    }
                    protocol.packMsg(g.SDP_MSG_TYPE.SDP_UVC_RSP, payload);

                    logger.debug(`      | DB | SEND| REQ | SDP: UVC-RSP | ${JSON.stringify(protocol.getPackedMsg())}`);
                    return res.send(protocol.getPackedMsg());
                }
            } else {
                logger.debug("      | DB | GET | WEB | TCI STATE | (USN Allocated)");
                payload = {
                    "resultCode": g.SDP_MSG_RESCODE.RESCODE_SDP_UVC.RESCODE_SDP_UVC_OTHER
                }
                protocol.packMsg(g.SDP_MSG_TYPE.SDP_UVC_RSP, payload);

                logger.debug(`      | DB | SEND| REQ | SDP: UVC-RSP | ${JSON.stringify(protocol.getPackedMsg())}`);
                return res.send(protocol.getPackedMsg());
            }
        });
    }
}

let procedure = new procU01C_SignUp_DB()
module.exports = procedure;