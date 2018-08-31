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
            this.endpointId !== null && this.payload !== null) {
            return true;
        } else {
            return false;
        }
    }
    _unpackSspSirReqPayload() {
        //validation
        //parsing
        this.unpackedPayload = {
            "wifiMacAddress": this.msgPayload.wifiMacAddress
        }
        return this.unpackedPayload;
    }
    packMsg(msgType, payload) {
        if (this.msgType !== null) {
            switch (msgType) {
                case g.SSP_MSG_TYPE.SSP_SIR_RSP:
                    return this._packSspSirRsp(payload);

                default:
                    return fasle;
            }
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
    getPackedMsg() {
        if (this.packedMsg !== null) {
            return this.packedMsg
        } else {
            return false;
        }
    }
 }
 module.exports = LlProtocol;
