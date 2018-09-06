'use strict'
/**
 * @description Protocol Object
 * @author Junhee Park (j.jobs1028/gmail.com, Qualcomm Institute)
 * @since       2018. 08. 28.
 * @last update 2018. 08. 28.
 * 
 */
const g = require("../config/header");
class LlProtocol {
    constructor() {
        this.msg = null;
        this.msgType = null;
        this.endpointId = null;
        this.msgLen = 0;
        this.msgPayload = null;
        this.unpackedPayload = null;
        this.packedMsg = null;
    }
    /**
     * @title function setMsg
     * @description Set Message in protocol object
     * @argument rcvdMsg
     * @returns
     */
    setMsg(rcvdMsg) {
        this.msg = rcvdMsg;
    }
    /**
     * @title function verifyHeader
     * @description Verify message header 
     * @argument 
     * @returns boolean
     */
    verifyHeader(){
        if(this._verifyHd()){
            return true;
        } else {
            return false;
        }
    }
    /**
     * @title function getMsgType
     * @description Get message type if verity header in message as well 
     * @argument 
     * @returns msgType
     */
    getMsgType(){
        if(this.msgType !== null){
            return this.msgType
        } else {
            return false;
        }
    }
    /**
     * @title function getEndpointId
     * @description Get endpoint id if verity header in message as well 
     * @argument 
     * @returns endpointId, false
     */
    getEndpointId(){
        if (this.endpointId !== null) {
            return this.endpointId
        } else {
            return false;
        }
    }
    /**
     * @title function unpackPayload
     * @description Unpack payload if verity header in message as well 
     * @argument 
     * @returns payloadObject, false
     */
    unpackPayload(){
        if(this.msgType !== null){
            switch (this.msgType) {
                case g.SSP_MSG_TYPE.SSP_SIR_REQ:
                    return this._unpackSspSirReqPayload();
                case g.SWP_MSG_TYPE.SWP_SGU_REQ:
                    return this._unpackSwpSguReqPayload();
                case g.SDP_MSG_TYPE.SDP_SGU_REQ:
                    return this._unpackSdpSguReqPayload();
                case g.SDP_MSG_TYPE.SDP_SGU_RSP:
                    return this._unpackSdpSguRspPayload();
                default:
                    return fasle;
            }
        } else {
            return false;
        }
    }
    /**
     * @title function getUnpackedMsgPayload
     * @description Get unpacked payload if unpacking successed as well 
     * @argument 
     * @returns payloadObject, false
     */
    getUnpackedMsgPayload(){
        if(this.unpackPayload !== null){
            return this.unpackPayload;
        } else { 
            return false;
        } 
    }
     /**
      * @title function _verifyHd
      * @description Verify message header internally
      * @argument 
      * @returns boolean
      */
    _verifyHd(){
        this.msgType = this.msg.header.msgType;
        this.msgLen = this.msg.header.msgLen;
        this.endpointId = this.msg.header.endpointId;
        this.msgPayload = this.msg.payload;
        //statecheck
        if(this.msgType !== null && this.msgLen !== null && 
            this.endpointId !== null && this.msgPayload !== null) {
            return true;
        } else {
            return false;
        }
    }
    packMsg(msgType, payload) {
        if (msgType !== null) {
            switch (msgType) {
                case g.SSP_MSG_TYPE.SSP_SIR_RSP:
                    return this._packSspSirRsp(payload);
                case g.SDP_MSG_TYPE.SDP_SGU_REQ:
                    return this._packSdpSguReq(payload);
                case g.SDP_MSG_TYPE.SDP_SGU_RSP:
                    return this._packSdpSguRsp(payload);
                default:
                    return false;
            }
        } else {
            return false;
        }
    }
    getPackedMsg() {
        if (this.packedMsg !== null) {
            return this.packedMsg
        } else {
            return false;
        }
    }
    _packSspSirRsp(payload) {
        this.packedMsg = {
            "header": {"msgType": 1},
            "payload": {"resultCode": payload.resultCode}
        }
    }
    _packSdpSguReq(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SDP_MSG_TYPE.SDP_SGU_REQ,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": {
                "userId": payload.userId
            }
        }
    }
    _packSdpSguRsp(payload){
        return this.packedMsg = {
            "header": {
                "msgType": g.SDP_MSG_TYPE.SDP_SGU_RSP,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": {
                "resultCode": payload.resultCode
            }
        }
    }
    //ssp
    _unpackSspSirReqPayload() {
        //validation
        //parsing
        this.unpackedPayload = {
            "wifiMacAddress": this.msgPayload.wifiMacAddress
        }
        return this.unpackedPayload;
    }
    //swp
    _unpackSwpSguReqPayload() {
        //validation
        //parsing
        var payload = this.msgPayload;
        this.unpackedPayload = {
            "birthDate": payload.birthDate,
            "gender": payload.gender,
            "userId": payload.userId,
            "userPw": payload.userPw,
            "userFn": payload.userFn,
            "userLn": payload.userLn
        }
        return this.unpackedPayload;
    }
    //sdp
    _unpackSdpSguReqPayload() {
        //validation
        //parsing
        var payload = this.msgPayload;
        this.unpackedPayload = {
            "userId": payload.userId
        }
        return this.unpackedPayload;
    }
    _unpackSdpSguRspPayload() {
        //validation
        //parsing
        var payload = this.msgPayload;
        this.unpackedPayload = {
            "resultCode": payload.resultCode
        }
        return this.unpackedPayload;
    }
 }
 module.exports = LlProtocol;
