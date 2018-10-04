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
        this.msg = {};
        this.msgType = {};
        this.endpointId = {};
        this.msgLen = 0;
        this.msgPayload = {};
        this.unpackedPayload = {};
        this.packedMsg = {};
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
    setEndpointId(endpointId){
        if(typeof endpointId !== 'undefined') {
            this.endpointId = endpointId;
            return true;
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
                
                //SGU
                case g.SWP_MSG_TYPE.SWP_SGU_REQ:
                    return this._unpackSwpSguReqPayload();
                case g.SDP_MSG_TYPE.SDP_SGU_REQ:
                    return this._unpackSdpSguReqPayload();
                case g.SDP_MSG_TYPE.SDP_SGU_RSP:
                    return this._unpackSdpSguRspPayload();
                
                //UVC
                case g.SWP_MSG_TYPE.SWP_UVC_REQ:
                    return this._unpackSwpUvcReqPayload();
                case g.SDP_MSG_TYPE.SDP_UVC_REQ:
                    return this._unpackSdpUvcReqPayload();
                case g.SDP_MSG_TYPE.SDP_UVC_RSP:
                    return this._unpackSdpUvcRspPayload();
                
                //SGI
                case g.SWP_MSG_TYPE.SWP_SGI_REQ:
                    return this._unpackSwpSgiReqPayload();
                case g.SDP_MSG_TYPE.SDP_SGI_REQ:
                    return this._unpackSdpSgiReqPayload();
                case g.SDP_MSG_TYPE.SDP_SGI_RSP:
                    return this._unpackSdpSgiRspPayload();
                
                //SGO
                case g.SDP_MSG_TYPE.SDP_SGO_NOT:
                    return this._unpackSdpSgoNotPayload();
                case g.SDP_MSG_TYPE.SDP_SGO_ACK:
                    return this._unpackSdpSgoAckPayload();
                case g.SWP_MSG_TYPE.SWP_SGO_NOT:
                    return this._unpackSwpSgoNotPayload();
                
                //ASR
                case g.SWP_MSG_TYPE.SWP_ASR_REQ:
                    return this._unpackSwpAsrReqPayload();
                case g.SDP_MSG_TYPE.SDP_ASR_REQ:
                    return this._unpackSdpAsrReqPayload();
                case g.SDP_MSG_TYPE.SDP_ASR_RSP:
                    return this._unpackSdpAsrRspPayload();
                
                //ASD
                case g.SWP_MSG_TYPE.SWP_ASD_REQ:
                    return this._unpackSwpAsdReqPayload();
                case g.SDP_MSG_TYPE.SDP_ASD_REQ:
                    return this._unpackSdpAsdReqPayload();
                case g.SDP_MSG_TYPE.SDP_ASD_RSP:
                    return this._unpackSdpAsdRspPayload();
                
                //ASV
                case g.SWP_MSG_TYPE.SWP_ASV_REQ:
                    return this._unpackSwpAsvReqPayload();
                case g.SDP_MSG_TYPE.SDP_ASV_REQ:
                    return this._unpackSdpAsvReqPayload();
                case g.SDP_MSG_TYPE.SDP_ASV_RSP:
                    return this._unpackSdpAsvRspPayload();
                
                //SRG
                case g.SWP_MSG_TYPE.SWP_SRG_REQ:
                    return this._unpackSwpSrgReqPayload();
                case g.SDP_MSG_TYPE.SDP_SRG_REQ:
                    return this._unpackSdpSrgReqPayload();
                case g.SDP_MSG_TYPE.SDP_SRG_RSP:
                    return this._unpackSdpSrgRspPayload();
                
                //SAS
                case g.SWP_MSG_TYPE.SWP_SAS_REQ:
                    return this._unpackSwpSasReqPayload();
                case g.SDP_MSG_TYPE.SDP_SAS_REQ:
                    return this._unpackSdpSasReqPayload();
                case g.SDP_MSG_TYPE.SDP_SAS_RSP:
                    return this._unpackSdpSasRspPayload();
                
                //SDD
                case g.SWP_MSG_TYPE.SWP_SDD_REQ:
                    return this._unpackSwpSddReqPayload();
                case g.SDP_MSG_TYPE.SDP_SDD_REQ:
                    return this._unpackSdpSddReqPayload();
                case g.SDP_MSG_TYPE.SDP_SDD_RSP:
                    return this._unpackSdpSddRspPayload();
                
                //SIR
                case g.SWP_MSG_TYPE.SWP_SIR_REQ:
                    return this._unpackSwpSirReqPayload();
                case g.SDP_MSG_TYPE.SDP_SIR_REQ:
                    return this._unpackSdpSirReqPayload();
                case g.SDP_MSG_TYPE.SDP_SIR_RSP:
                    return this._unpackSdpSirRspPayload();

                //DCA
                case g.SWP_MSG_TYPE.SSP_DCA_REQ:
                    return this._unpackSspDcaReqPayload();
                case g.SWP_MSG_TYPE.SAP_DCA_REQ:
                    return this._unpackSapDcaReqPayload();
                case g.SDP_MSG_TYPE.SDP_DCA_REQ:
                    return this._unpackSdpDcaReqPayload();
                case g.SDP_MSG_TYPE.SDP_DCA_RSP:
                    return this._unpackSdpDcaRspPayload();

                //DCD
                case g.SWP_MSG_TYPE.SSP_DCD_NOT:
                    return this._unpackSspDcdNotPayload();
                case g.SWP_MSG_TYPE.SAP_DCD_NOT:
                    return this._unpackSapDcdNotPayload();
                case g.SDP_MSG_TYPE.SDP_DCD_NOT:
                    return this._unpackSdpDcdNotPayload();
                case g.SDP_MSG_TYPE.SDP_DCD_ACK:
                    return this._unpackSdpDcdAckPayload();

                //RAD
                case g.SWP_MSG_TYPE.SSP_RAD_TRN:
                    return this._unpackSspDcdNotPayload();
                case g.SDP_MSG_TYPE.SDP_RAD_TRN:
                    return this._unpackSdpRadTrnPayload();
                case g.SDP_MSG_TYPE.SDP_RAD_ACK:
                    return this._unpackSdpRadAckPayload();

                //RAV
                case g.SWP_MSG_TYPE.SWP_RAV_REQ:
                    return this._unpackSwpRavReqPayload();

                //RHV
                case g.SWP_MSG_TYPE.SWP_RHV_REQ:
                    return this._unpackSwpRhvReqPayload();

                //HAV
                case g.SWP_MSG_TYPE.SWP_HAV_REQ:
                    return this._unpackSwphavReqPayload();
                case g.SDP_MSG_TYPE.SDP_HAV_REQ:
                    return this._unpackSdpHavReqPayload();
                case g.SDP_MSG_TYPE.SDP_HAV_RSP:
                    return this._unpackSdpHavRspPayload();

                //HHV
                case g.SWP_MSG_TYPE.SWP_HHB_REQ:
                    return this._unpackSwphhvReqPayload();
                case g.SDP_MSG_TYPE.SDP_HHV_REQ:
                    return this._unpackSdpHhvReqPayload();
                case g.SDP_MSG_TYPE.SDP_HHV_RSP:
                    return this._unpackSdpHhvRspPayload();

                default:
                    return fasle;
            }
        } else {
            return false;
        }
    }

    //SGU
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

    //UVC
    _unpackSwpUvcReqPayload() {
        //validation
        //parsing
        var payload = this.msgPayload;
        this.unpackedPayload = {
            "vc": payload.vc,
            "ac": payload.ac
        }
        return this.unpackedPayload;
    }
    _unpackSdpUvcReqPayload() {
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
    _unpackSdpUvcRspPayload() {
        //validation
        //parsing
        var payload = this.msgPayload;
        this.unpackedPayload = {
            "resultCode": payload.resultCode
        }
        return this.unpackedPayload;
    }

    //SGI
    _unpackSwpSgiReqPayload() {
        //validation
        //parsing
        var payload = this.msgPayload;
        this.unpackedPayload = {
            "userId": payload.userId,
            "userPw": payload.userPw
        }
        return this.unpackedPayload;
    }
    _unpackSdpSgiReqPayload() {
        //validation
        //parsing
        var payload = this.msgPayload;
        this.unpackedPayload = {
            "userId": payload.userId,
            "userPw": payload.userPw
        }
        return this.unpackedPayload;
    }
    _unpackSdpSgiRspPayload() {
        //validation
        //parsing
        var payload = this.msgPayload;
        this.unpackedPayload = {
            "resultCode": payload.resultCode
        }
        if (payload.resultCode === g.SDP_MSG_RESCODE.RESCODE_SDP_SGI.RESCODE_SDP_SGI_OK) {
            this.unpackedPayload.usn = payload.usn;
            this.unpackedPayload.ml = payload.ml;
        }
        return this.unpackedPayload;
    }

    //SGO
    _unpackSwpSgoNotPayload() {
        //validation
        //parsing
        var payload = this.msgPayload;
        this.unpackedPayload = {
            "nsc": payload.nsc
        }
        return this.unpackedPayload;
    }
    _unpackSdpSgoNotPayload() {
        //validation
        //parsing
        var payload = this.msgPayload;
        this.unpackedPayload = {}
        return this.unpackedPayload;
    }
    _unpackSdpSgoAckPayload() {
        //validation
        //parsing
        var payload = this.msgPayload;
        this.unpackedPayload = {
            "resultCode": payload.resultCode
        }
        return this.unpackedPayload;
    }

    //ASR
    _unpackSwpAsrReqPayload() {
        //validation
        //parsing
        var payload = this.msgPayload;

        this.unpackedPayload.nsc = payload.nsc;
        this.unpackedPayload.wmac = payload.wmac;
        this.unpackedPayload.cmac = payload.cmac;

        return this.unpackedPayload;
    }
    _unpackSdpAsrReqPayload() {
        //validation
        //parsing
        var payload = this.msgPayload;

        this.unpackedPayload.wmac = payload.wmac;
        this.unpackedPayload.cmac = payload.cmac;

        return this.unpackedPayload;
    }
    _unpackSdpAsrRspPayload() {
        //validation
        //parsing
        var payload = this.msgPayload;
        this.unpackedPayload = {};
        this.unpackedPayload.resultCode = payload.resultCode;
        return this.unpackedPayload;
    }

    //ASD
    _unpackSwpAsdReqPayload() {
        //validation
        //parsing
        var payload = this.msgPayload;
        this.unpackedPayload.nsc = payload.nsc;
        this.unpackedPayload.wmac = payload.wmac;
        this.unpackedPayload.drgcd = payload.drgcd;
        this.unpackedPayload.userId = payload.userId;

        return this.unpackedPayload;
    }
    _unpackSdpAsdReqPayload() {
        //validation
        //parsing
        var payload = this.msgPayload;

        this.unpackedPayload.wmac = payload.wmac;
        this.unpackedPayload.drgcd = payload.drgcd;
        this.unpackedPayload.userId = payload.userId;

        return this.unpackedPayload;
    }
    _unpackSdpAsdRspPayload() {
        //validation
        //parsing
        var payload = this.msgPayload;
        this.unpackedPayload = {};
        this.unpackedPayload.resultCode = payload.resultCode;
        return this.unpackedPayload;
    }

    //ASV
    _unpackSwpAsvReqPayload() {
        //validation
        //parsing
        var payload = this.msgPayload;
        this.unpackedPayload = {};
        if (typeof payload.nsc !== 'undefined') this.unpackedPayload.nsc = payload.nsc;
        if (typeof payload.wmac !== 'undefined') this.unpackedPayload.wmac = payload.wmac;
        if (typeof payload.actf !== 'undefined') this.unpackedPayload.actf = payload.actf;
        if (typeof payload.mobf !== 'undefined') this.unpackedPayload.mobf = payload.mobf;
        if (typeof payload.nat !== 'undefined') this.unpackedPayload.natCd = payload.nat;
        if (typeof payload.state !== 'undefined') this.unpackedPayload.state = payload.state;
        if (typeof payload.city !== 'undefined') this.unpackedPayload.city = payload.city;
        if (typeof payload.userId !== 'undefined') this.unpackedPayload.userId = payload.userId;
        if (typeof payload.oprSet !== 'undefined') this.unpackedPayload.oprSet = payload.oprSet;

        return this.unpackedPayload;
    }
    _unpackSdpAsvReqPayload() {
        //validation
        //parsing
        var payload = this.msgPayload;
        this.unpackedPayload = {};
        if (typeof payload.wmac !== 'undefined') this.unpackedPayload.wmac = payload.wmac;
        if (typeof payload.actf !== 'undefined') this.unpackedPayload.actf = payload.actf;
        if (typeof payload.mobf !== 'undefined') this.unpackedPayload.mobf = payload.mobf;
        if (typeof payload.nat !== 'undefined') this.unpackedPayload.natCd = payload.nat;
        if (typeof payload.state !== 'undefined') this.unpackedPayload.state = payload.state;
        if (typeof payload.city !== 'undefined') this.unpackedPayload.city = payload.city;
        if (typeof payload.userId !== 'undefined') this.unpackedPayload.userId = payload.userId;
        if (typeof payload.oprset !== 'undefined') this.unpackedPayload.oprSet = payload.oprset;
        return this.unpackedPayload;
    }
    _unpackSdpAsvRspPayload() {
        //validation
        //parsing
        var payload = this.msgPayload;
        this.unpackedPayload = {};
        this.unpackedPayload.resultCode = payload.resultCode;
        this.unpackedPayload.selectedSensorInformationList = payload.selectedSensorInformationList;
        return this.unpackedPayload;
    }

    //SRG
    _unpackSwpSrgReqPayload() {
        //validation
        //parsing
        var payload = this.msgPayload;

        this.unpackedPayload.nsc = payload.nsc;
        this.unpackedPayload.wmac = payload.wmac;
        this.unpackedPayload.cmac = payload.cmac;

        return this.unpackedPayload;
    }
    _unpackSdpSrgReqPayload() {
        //validation
        //parsing
        var payload = this.msgPayload;

        this.unpackedPayload.wmac = payload.wmac;
        this.unpackedPayload.cmac = payload.cmac;
        
        return this.unpackedPayload;
    }
    _unpackSdpSrgRspPayload() {
        //validation
        //parsing
        var payload = this.msgPayload;
        this.unpackedPayload = {};
        this.unpackedPayload.resultCode = payload.resultCode;
        return this.unpackedPayload;
    }

    //SAS
    _unpackSwpSasReqPayload() {
        //validation
        //parsing
        var payload = this.msgPayload;

        this.unpackedPayload.nsc = payload.nsc;
        this.unpackedPayload.wmac = payload.wmac;
        this.unpackedPayload.mob = payload.mob;

        return this.unpackedPayload;
    }
    _unpackSdpSasReqPayload() {
        //validation
        //parsing
        var payload = this.msgPayload;

        this.unpackedPayload.wmac = payload.wmac;
        this.unpackedPayload.mob = payload.mob;

        return this.unpackedPayload;
    }
    _unpackSdpSasRspPayload() {
        //validation
        //parsing
        var payload = this.msgPayload;
        this.unpackedPayload = {}
        this.unpackedPayload.resultCode = payload.resultCode;
        return this.unpackedPayload;
    }

    //SDD
    _unpackSwpSddReqPayload() {
        //validation
        //parsing
        var payload = this.msgPayload;

        this.unpackedPayload.nsc = payload.nsc;
        this.unpackedPayload.wmac = payload.wmac;
        this.unpackedPayload.drgcd = payload.drgcd;

        return this.unpackedPayload;
    }
    _unpackSdpSddReqPayload() {
        //validation
        //parsing
        var payload = this.msgPayload;

        this.unpackedPayload.wmac = payload.wmac;
        this.unpackedPayload.drgcd = payload.drgcd;

        return this.unpackedPayload;
    }
    _unpackSdpSddRspPayload() {
        //validation
        //parsing
        var payload = this.msgPayload;
        this.unpackedPayload = {}
        this.unpackedPayload.resultCode = payload.resultCode;
        return this.unpackedPayload;
    }

    //SLV
    _unpackSwpSlvReqPayload() {
        //validation
        //parsing
        var payload = this.msgPayload;
        this.unpackedPayload = {};
        if (typeof payload.nsc !== 'undefined') this.unpackedPayload.nsc = payload.nsc;

        return this.unpackedPayload;
    }
    _unpackSdpSlvReqPayload() {
        //validation
        //parsing
        var payload = this.msgPayload;
        this.unpackedPayload = {};
        return this.unpackedPayload;
    }
    _unpackSdpSlvRspPayload() {
        //validation
        //parsing
        var payload = this.msgPayload;
        this.unpackedPayload = {};
        this.unpackedPayload.resultCode = payload.resultCode;
        this.unpackedPayload.existCode = payload.existCode;
        if (payload.resultCode === 0 && payload.existCode === 0) this.unpackedPayload.ownSensorInfoList = payload.ownSensorInfoList;
        return this.unpackedPayload;
    }

    //SIR
    _unpackSwpSirReqPayload() {
        //validation
        //parsing
        var payload = this.msgPayload;
        this.unpackedPayload = {};

        this.unpackedPayload.wmac = payload.wmac;

        return this.unpackedPayload;
    }
    _unpackSdpSirReqPayload() {
        //validation
        //parsing
        var payload = this.msgPayload;
        this.unpackedPayload = {};

        this.unpackedPayload.wmac = payload.wmac;
        
        return this.unpackedPayload;
    }
    _unpackSdpSirRspPayload() {
        //validation
        //parsing
        var payload = this.msgPayload;
        this.unpackedPayload = {};
        this.unpackedPayload.resultCode = payload.resultCode;
        if (payload.resultCode === 0) this.unpackedPayload.ssn = payload.ssn;
        return this.unpackedPayload;
    }

    //DCA
    _unpackSspDcaReqPayload() {
        //validation
        //parsing
        var payload = this.msgPayload;
        this.unpackedPayload = {};
        this.unpackedPayload.lat = payload.lat;
        this.unpackedPayload.lng = payload.lng;
        this.unpackedPayload.nat = payload.nat;
        this.unpackedPayload.state = payload.state;
        this.unpackedPayload.city = payload.city;

        return this.unpackedPayload;
    }
    _unpackSapDcaReqPayload() {
        //validation
        //parsing
        var payload = this.msgPayload;

        this.unpackedPayload = {};
        this.unpackedPayload.nsc = payload.nsc;

        return this.unpackedPayload;
    }
    _unpackSdpDcaReqPayload() {
        //validation
        //parsing
        var payload = this.msgPayload;

        this.unpackedPayload = {};
        //If the server received ssp:dca-req message, sdpDcaReq must have following lat, lng
        if (typeof payload.lat !== 'undefined') this.unpackedPayload.lat = payload.lat;
        if (typeof payload.lng !== 'undefined') this.unpackedPayload.lng = payload.lng;

        return this.unpackedPayload;
    }
    _unpackSdpDcaRspPayload() {
        //validation
        //parsing
        var payload = this.msgPayload;
        this.unpackedPayload = {};
        this.unpackedPayload.resultCode = payload.resultCode;
        if (payload.resultCode === 0) {
            this.unpackedPayload.cid = payload.cid;
            this.unpackedPayload.cid = payload.mti;
            this.unpackedPayload.cid = payload.tti;
            this.unpackedPayload.mob = payload.mob;
        }
        return this.unpackedPayload;
    }

    //DCD
    _unpackSspDcdNotPayload() {
        //validation
        //parsing
        var payload = this.msgPayload;

        this.unpackedPayload = {};

        return this.unpackedPayload;
    }
    _unpackSapDcdNotPayload() {
        //validation
        //parsing
        var payload = this.msgPayload;

        this.unpackedPayload = {};

        return this.unpackedPayload;
    }
    _unpackSdpDcdNotPayload() {
        //validation
        //parsing
        var payload = this.msgPayload;

        this.unpackedPayload = {};
        this.unpackedPayload.entityType = payload.entityType;

        return this.unpackedPayload;
    }
    _unpackSdpDcdAckPayload() {
        //validation
        //parsing
        var payload = this.msgPayload;
        this.unpackedPayload = {};

        this.unpackedPayload.resultCode = payload.resultCode;

        return this.unpackedPayload;
    }

    //RAV
    _unpackSwpRavReqPayload() {
        //validation
        //parsing
        var payload = this.msgPayload;
        this.unpackedPayload = {};

        this.unpackedPayload.nsc = payload.nsc;

        return this.unpackedPayload;
    }

    //RHV
    _unpackSwpRavReqPayload() {
        //validation
        //parsing
        var payload = this.msgPayload;
        this.unpackedPayload = {};

        this.unpackedPayload.nsc = payload.nsc;

        return this.unpackedPayload;
    }

    //HAV
    _unpackSwpHavReqPayload() {
        //validation
        //parsing
        var payload = this.msgPayload;
        this.unpackedPayload = {};
        this.unpackedPayload.nsc = payload.nsc;
        this.unpackedPayload.ownershipCode = payload.ownershipCode;
        this.unpackedPayload.sTs = payload.sTs;
        this.unpackedPayload.eTs = payload.eTs;
        this.unpackedPayload.numOfHavFlgRetran = payload.numOfHavFlgRetran;
        this.unpackedPayload.nat = payload.nat;
        this.unpackedPayload.state = payload.state;
        this.unpackedPayload.city = payload.city;

        return this.unpackedPayload;
    }
    _unpackSdpHavReqPayload() {
        //validation
        //parsing
        var payload = this.msgPayload;
        this.unpackedPayload = {};

        this.unpackedPayload.ownershipCode = payload.ownershipCode;
        this.unpackedPayload.sTs = payload.sTs;
        this.unpackedPayload.eTs = payload.eTs;
        this.unpackedPayload.numOfHavFlgRetran = payload.numOfHavFlgRetran;
        this.unpackedPayload.nat = payload.nat;
        this.unpackedPayload.state = payload.state;
        this.unpackedPayload.city = payload.city;
        
        return this.unpackedPayload;
    }
    _unpackSdpHavRspPayload() {
        //validation
        //parsing
        var payload = this.msgPayload;
        this.unpackedPayload = {};
        this.unpackedPayload.resultCode = payload.resultCode;
        if (payload.resultCode === 0) this.unpackedPayload.lastHavFlg = payload.lastHavFlg;
        if (payload.resultCode === 0) this.unpackedPayload.havFlgSeqNum = payload.havFlgSeqNum;
        if (payload.resultCode === 0) this.unpackedPayload.historicalAirQualityDataList = payload.historicalAirQualityDataList;
        return this.unpackedPayload;
    }
    
    //HHV
    _unpackSwpHhvReqPayload() {
        //validation
        //parsing
        var payload = this.msgPayload;
        this.unpackedPayload = {};
        this.unpackedPayload.nsc = payload.nsc;
        this.unpackedPayload.sTs = payload.sTs;
        this.unpackedPayload.eTs = payload.eTs;
        this.unpackedPayload.nat = payload.nat;
        this.unpackedPayload.state = payload.state;
        this.unpackedPayload.city = payload.city;

        return this.unpackedPayload;
    }
    _unpackSdpHhvReqPayload() {
        //validation
        //parsing
        var payload = this.msgPayload;
        this.unpackedPayload = {};

        this.unpackedPayload.sTs = payload.sTs;
        this.unpackedPayload.eTs = payload.eTs;
        this.unpackedPayload.nat = payload.nat;
        this.unpackedPayload.state = payload.state;
        this.unpackedPayload.city = payload.city;

        return this.unpackedPayload;
    }
    _unpackSdpHhvRspPayload() {
        //validation
        //parsing
        var payload = this.msgPayload;
        this.unpackedPayload = {};
        this.unpackedPayload.resultCode = payload.resultCode;
        if (payload.resultCode === 0) this.unpackedPayload.lastHavFlg = payload.lastHavFlg;
        if (payload.resultCode === 0) this.unpackedPayload.havFlgSeqNum = payload.havFlgSeqNum;
        if (payload.resultCode === 0) this.unpackedPayload.historicalAirQualityDataList = payload.historicalAirQualityDataList;
        return this.unpackedPayload;
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
    packMsg (msgType, payload) {
        if (msgType !== null) {
            switch (msgType) {

                //SGU
                case g.SWP_MSG_TYPE.SWP_SGU_RSP:
                    return this._packSwpSguRsp(payload);
                case g.SDP_MSG_TYPE.SDP_SGU_REQ:
                    return this._packSdpSguReq(payload);
                case g.SDP_MSG_TYPE.SDP_SGU_RSP:
                    return this._packSdpSguRsp(payload);

                //UVC
                case g.SWP_MSG_TYPE.SWP_UVC_RSP:
                    return this._packSwpUvcRsp(payload);
                case g.SDP_MSG_TYPE.SDP_UVC_REQ:
                    return this._packSdpUvcReq(payload);
                case g.SDP_MSG_TYPE.SDP_UVC_RSP:
                    return this._packSdpUvcRsp(payload);

                //SGI
                case g.SWP_MSG_TYPE.SWP_SGI_RSP:
                    return this._packSwpSgiRsp(payload);
                case g.SDP_MSG_TYPE.SDP_SGI_REQ:
                    return this._packSdpSgiReq(payload);
                case g.SDP_MSG_TYPE.SDP_SGI_RSP:
                    return this._packSdpSgiRsp(payload);

                //SGO    
                case g.SWP_MSG_TYPE.SWP_SGO_ACK:
                    return this._packSwpSgoAck(payload);
                case g.SDP_MSG_TYPE.SDP_SGO_NOT:
                    return this._packSdpSgoNot(payload);
                case g.SDP_MSG_TYPE.SDP_SGO_ACK:
                    return this._packSdpSgoAck(payload);

                //ASR
                case g.SWP_MSG_TYPE.SWP_ASR_RSP:
                    return this._packSwpAsrRsp(payload);
                case g.SDP_MSG_TYPE.SDP_ASR_REQ:
                    return this._packSdpAsrReq(payload);
                case g.SDP_MSG_TYPE.SDP_ASR_RSP:
                    return this._packSdpAsrRsp(payload);

                //ASD
                case g.SWP_MSG_TYPE.SWP_ASD_RSP:
                    return this._packSwpAsdRsp(payload);
                case g.SDP_MSG_TYPE.SDP_ASD_REQ:
                    return this._packSdpAsdReq(payload);
                case g.SDP_MSG_TYPE.SDP_ASD_RSP:
                    return this._packSdpAsdRsp(payload);

                //ASV
                case g.SWP_MSG_TYPE.SWP_ASV_RSP:
                    return this._packSwpAsvRsp(payload);
                case g.SDP_MSG_TYPE.SDP_ASV_REQ:
                    return this._packSdpAsvReq(payload);
                case g.SDP_MSG_TYPE.SDP_ASV_RSP:
                    return this._packSdpAsvRsp(payload);

                //SRG
                case g.SWP_MSG_TYPE.SWP_SRG_RSP:
                    return this._packSwpSrgRsp(payload);
                case g.SDP_MSG_TYPE.SDP_SRG_REQ:
                    return this._packSdpSrgReq(payload);
                case g.SDP_MSG_TYPE.SDP_SRG_RSP:
                    return this._packSdpSrgRsp(payload);

                //SAS
                case g.SWP_MSG_TYPE.SWP_SAS_RSP:
                    return this._packSwpSasRsp(payload);
                case g.SDP_MSG_TYPE.SDP_SAS_REQ:
                    return this._packSdpSasReq(payload);
                case g.SDP_MSG_TYPE.SDP_SAS_RSP:
                    return this._packSdpSasRsp(payload);

                //SDD
                case g.SWP_MSG_TYPE.SWP_SDD_RSP:
                    return this._packSwpSddRsp(payload);
                case g.SDP_MSG_TYPE.SDP_SDD_REQ:
                    return this._packSdpSddReq(payload);
                case g.SDP_MSG_TYPE.SDP_SDD_RSP:
                    return this._packSdpSddRsp(payload);

                //SLV
                case g.SWP_MSG_TYPE.SWP_SLV_RSP:
                    return this._packSwpSlvRsp(payload);
                case g.SDP_MSG_TYPE.SDP_SLV_REQ:
                    return this._packSdpSlvReq(payload);
                case g.SDP_MSG_TYPE.SDP_SLV_RSP:
                    return this._packSdpSlvRsp(payload);
                    
                //SIR
                case g.SWP_MSG_TYPE.SWP_SIR_RSP:
                    return this._packSwpSirRsp(payload);
                case g.SDP_MSG_TYPE.SDP_SIR_REQ:
                    return this._packSdpSirReq(payload);
                case g.SDP_MSG_TYPE.SDP_SIR_RSP:
                    return this._packSdpSirRsp(payload);

                //DCA
                case g.SWP_MSG_TYPE.SSP_DCA_RSP:
                    return this._packSspDcaRsp(payload);
                case g.SWP_MSG_TYPE.SAP_DCA_RSP:
                    return this._packSapDcaRsp(payload);
                case g.SDP_MSG_TYPE.SDP_DCA_REQ:
                    return this._packSdpDcaReq(payload);
                case g.SDP_MSG_TYPE.SDP_DCA_RSP:
                    return this._packSdpDcaRsp(payload);
                
                //DCD
                case g.SWP_MSG_TYPE.SSP_DCD_ACK:
                    return this._packSspDcdAck(payload);
                case g.SWP_MSG_TYPE.SAP_DCD_ACK:
                    return this._packSapDcdAck(payload);
                case g.SDP_MSG_TYPE.SDP_DCD_ACK:
                    return this._packSdpDcdNot(payload);
                case g.SDP_MSG_TYPE.SDP_DCD_RSP:
                    return this._packSdpDcdAck(payload);

                //RAV
                case g.SWP_MSG_TYPE.SWP_RAV_RSP:
                    return this._packSwpRavRsp(payload);

                //RHV
                case g.SWP_MSG_TYPE.SWP_RHV_RSP:
                    return this._packSwpRhvRsp(payload);

                //HAV
                case g.SWP_MSG_TYPE.SWP_HAV_RSP:
                    return this._packSwpHavRsp(payload);
                case g.SDP_MSG_TYPE.SDP_HAV_REQ:
                    return this._packSdpHavReq(payload);
                case g.SDP_MSG_TYPE.SDP_HAV_RSP:
                    return this._packSdpHavRsp(payload);

                //HHV
                case g.SWP_MSG_TYPE.SWP_HHV_RSP:
                    return this._packSwpHhvRsp(payload);
                case g.SDP_MSG_TYPE.SDP_HHV_REQ:
                    return this._packSdpHhvReq(payload);
                case g.SDP_MSG_TYPE.SDP_HHV_RSP:
                    return this._packSdpHhvRsp(payload);

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
    
    //SGU
    _packSwpSguRsp(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SWP_MSG_TYPE.SWP_SGU_RSP, 
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }
    _packSdpSguReq(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SDP_MSG_TYPE.SDP_SGU_REQ,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }
    _packSdpSguRsp(payload){
        return this.packedMsg = {
            "header": {
                "msgType": g.SDP_MSG_TYPE.SDP_SGU_RSP,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }
    
    //UVC
    _packSwpUvcRsp(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SWP_MSG_TYPE.SWP_UVC_RSP,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }
    _packSdpUvcReq(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SDP_MSG_TYPE.SDP_UVC_REQ,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }
    _packSdpUvcRsp(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SDP_MSG_TYPE.SDP_UVC_RSP,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }

    //SGI
    _packSwpSgiRsp(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SWP_MSG_TYPE.SWP_SGI_RSP,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }
    _packSdpSgiReq(payload){
        return this.packedMsg = {
            "header": {
                "msgType": g.SDP_MSG_TYPE.SDP_SGI_REQ,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }
    _packSdpSgiRsp(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SDP_MSG_TYPE.SDP_SGI_RSP,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }

    //SGO
    _packSwpSgoAck(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SWP_MSG_TYPE.SWP_SGO_ACK,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }
    _packSdpSgoNot(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SDP_MSG_TYPE.SDP_SGO_NOT,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }
    _packSdpSgoAck(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SDP_MSG_TYPE.SDP_SGO_ACK,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }

    //ASR
    _packSwpAsrRsp(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SWP_MSG_TYPE.SWP_ASR_RSP,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }
    _packSdpAsrReq(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SDP_MSG_TYPE.SDP_ASR_REQ,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }
    _packSdpAsrRsp(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SDP_MSG_TYPE.SDP_ASR_RSP,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }

    //ASD
    _packSwpAsdRsp(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SWP_MSG_TYPE.SWP_ASD_RSP,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }
    _packSdpAsdReq(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SDP_MSG_TYPE.SDP_ASD_REQ,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }
    _packSdpAsdRsp(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SDP_MSG_TYPE.SDP_ASD_RSP,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }

    //ASV
    _packSwpAsvRsp(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SWP_MSG_TYPE.SWP_ASV_RSP,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }
    _packSdpAsvReq(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SDP_MSG_TYPE.SDP_ASV_REQ,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }
    _packSdpAsvRsp(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SDP_MSG_TYPE.SDP_ASV_RSP,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }

    //SRG
    _packSwpSrgRsp(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SWP_MSG_TYPE.SWP_SRG_RSP,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }
    _packSdpSrgReq(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SDP_MSG_TYPE.SDP_SRG_REQ,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }
    _packSdpSrgRsp(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SDP_MSG_TYPE.SDP_SRG_RSP,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }

    //SAS
    _packSwpSasRsp(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SWP_MSG_TYPE.SWP_SAS_RSP,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }
    _packSdpSasReq(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SDP_MSG_TYPE.SDP_SAS_REQ,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }
    _packSdpSasRsp(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SDP_MSG_TYPE.SDP_SAS_RSP,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }
    
    //SDD
    _packSwpSddRsp(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SWP_MSG_TYPE.SWP_SDD_RSP,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }
    _packSdpSddReq(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SDP_MSG_TYPE.SDP_SDD_REQ,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }
    _packSdpSddRsp(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SDP_MSG_TYPE.SDP_SDD_RSP,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }

    //SLV
    _packSwpSlvRsp(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SWP_MSG_TYPE.SWP_SLV_RSP,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }
    _packSdpSlvReq(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SDP_MSG_TYPE.SDP_SLV_REQ,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }
    _packSdpSlvRsp(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SDP_MSG_TYPE.SDP_SLV_RSP,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }

    //Sir
    _packSwpSirRsp(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SWP_MSG_TYPE.SWP_SIR_RSP,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }
    _packSdpSirReq(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SDP_MSG_TYPE.SDP_SIR_REQ,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }
    _packSdpSirRsp(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SDP_MSG_TYPE.SDP_SIR_RSP,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }

    //DCA
    _packSspDcaRsp(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SSP_MSG_TYPE.SSP_DCA_RSP,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }
    _packSapDcaRsp(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SWP_MSG_TYPE.SAP_DCA_RSP,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }
    _packSdpDcaReq(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SDP_MSG_TYPE.SDP_DCA_REQ,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }
    _packSdpDcaRsp(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SDP_MSG_TYPE.SDP_DCA_RSP,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }

    //DCD
    _packSspDcdAck(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SSP_MSG_TYPE.SSP_DCD_ACK,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }
    _packSapDcdAck(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SWP_MSG_TYPE.SAP_DCD_ACK,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }
    _packSdpDcdNot(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SDP_MSG_TYPE.SDP_DCD_NOT,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }
    _packSdpDcdAck(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SDP_MSG_TYPE.SDP_DCD_ACK,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }
    
    //RAV
    _packSwpRavRsp(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SWP_MSG_TYPE.SWP_RAV_RSP,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }

    //RHV
    _packSwpRhvRsp(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SWP_MSG_TYPE.SWP_RHV_RSP,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }

 }
 module.exports = LlProtocol;
