'use strict';
/**
 * Header: Type, Length, EndpointID
 * Body: Payload
 */

//import protocol manager module
global.LlProtocol = require('../../lib/LlProtocol');
//import state manager module
let LlState = require('../../lib/LlState');
//Import request manager module
let LlRequest = require("../../lib/LlRequest");

//Import codegenerator manager module
global.LlCodeGenerator = require("../../lib/LlCodeGenerator")

//Import gloabal values

global.g = require("../../config/header");

//Import hash manager module
let LlHash = require('../../lib/LlHash');
//Mail Sender modul
let LlMailer = require('../../lib/LlMailer');

let userModule = require('../../lib/userModule');

global.redis = require("redis");
//Connect with Redis client
global.redisCli = redis.createClient();
global.state = new LlState();
global.request = new LlRequest();
global.codeGen = new LlCodeGenerator();
global.mailer = new LlMailer();
global.uModule = new userModule();
global.hash = new LlHash();

const procU01A_SignUp_AC = require("../procU01A_SignUp_AC");
const procU01B_SignUp_WC = require("../procU01B_SignUp_WC");
const procU01C_SignUp_DB = require("../procU01C_SignUp_DB");

router.post("/apiserver", (req, res) => {
    let protocol = new LlProtocol();
    protocol.setMsg(req.body);
    if (!protocol.verifyHeader()) return;
    let unpackedPayload = protocol.unpackPayload();
    //unpacking
    if (!unpackedPayload) return;

    switch (protocol.getMsgType()) {
        case g.SAP_MSG_TYPE.SAP_SGU_REQ:
            return procU01A_SignUp_AC.SAP_SGU_REQ(protocol, unpackedPayload, res);
        case g.SAP_MSG_TYPE.SAP_UVC_REQ:
            return procU01A_SignUp_AC.SAP_UVC_REQ(protocol, unpackedPayload, res);
        case g.SWP_MSG_TYPE.SWP_SGU_REQ:
            return procU01B_SignUp_WC.SWP_SGU_REQ(protocol, unpackedPayload, res);
        case g.SWP_MSG_TYPE.SWP_UVC_REQ:
            return procU01B_SignUp_WC.SWP_UVC_REQ(protocol, unpackedPayload, res);
    }

});

router.post("/apidatabase", (req, res) => {
    let protocol = new LlProtocol();
    protocol.setMsg(req.body);
    if (!protocol.verifyHeader()) return;
    let unpackedPayload = protocol.unpackPayload();
    //unpacking
    if (!unpackedPayload) return;
    let endpointIdType = 0,
        signfbit = 0,
        payload = {};

    switch (protocol.getMsgType()) {
        case g.SDP_MSG_TYPE.SDP_SGU_REQ:
            return procU01C_SignUp_DB.SDP_SGU_REQ(protocol, unpackedPayload, res);
        case g.SDP_MSG_TYPE.SDP_UVC_REQ:
            return procU01C_SignUp_DB.SDP_UVC_REQ(protocol, unpackedPayload, res);
    }


});