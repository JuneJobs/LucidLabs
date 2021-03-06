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
                case g.SAP_MSG_TYPE.SAP_SGU_REQ:
                    return this._unpackSapSguReqPayload();
                case g.SWP_MSG_TYPE.SWP_SGU_REQ:
                    return this._unpackSwpSguReqPayload();
                case g.SDP_MSG_TYPE.SDP_SGU_REQ:
                    return this._unpackSdpSguReqPayload();
                case g.SDP_MSG_TYPE.SDP_SGU_RSP:
                    return this._unpackSdpSguRspPayload();
                
                //UVC
                case g.SAP_MSG_TYPE.SAP_UVC_REQ:
                    return this._unpackSapUvcReqPayload();
                case g.SWP_MSG_TYPE.SWP_UVC_REQ:
                    return this._unpackSwpUvcReqPayload();
                case g.SDP_MSG_TYPE.SDP_UVC_REQ:
                    return this._unpackSdpUvcReqPayload();
                case g.SDP_MSG_TYPE.SDP_UVC_RSP:
                    return this._unpackSdpUvcRspPayload();
                
                //SGI
                case g.SAP_MSG_TYPE.SAP_SGI_REQ:
                    return this._unpackSapSgiReqPayload();
                case g.SWP_MSG_TYPE.SWP_SGI_REQ:
                    return this._unpackSwpSgiReqPayload();
                case g.SDP_MSG_TYPE.SDP_SGI_REQ:
                    return this._unpackSdpSgiReqPayload();
                case g.SDP_MSG_TYPE.SDP_SGI_RSP:
                    return this._unpackSdpSgiRspPayload();
                
                //SGO
                case g.SAP_MSG_TYPE.SAP_SGO_NOT:
                    return this._unpackSapSgoNotPayload();
                case g.SWP_MSG_TYPE.SWP_SGO_NOT:
                    return this._unpackSwpSgoNotPayload();
                case g.SDP_MSG_TYPE.SDP_SGO_NOT:
                    return this._unpackSdpSgoNotPayload();
                case g.SDP_MSG_TYPE.SDP_SGO_ACK:
                    return this._unpackSdpSgoAckPayload();

                //UPC
                case g.SAP_MSG_TYPE.SAP_UPC_REQ:
                    return this._unpackSapUpcReqPayload();
                case g.SWP_MSG_TYPE.SWP_UPC_REQ:
                    return this._unpackSwpUpcReqPayload();
                case g.SDP_MSG_TYPE.SDP_UPC_REQ:
                    return this._unpackSdpUpcReqPayload();
                case g.SDP_MSG_TYPE.SDP_UPC_RSP:
                    return this._unpackSdpUpcRspPayload();

                //FPU
                case g.SAP_MSG_TYPE.SAP_FPU_REQ:
                    return this._unpackSapFpuReqPayload();
                case g.SWP_MSG_TYPE.SWP_FPU_REQ:
                    return this._unpackSwpFpuReqPayload();
                case g.SDP_MSG_TYPE.SDP_FPU_REQ:
                    return this._unpackSdpFpuReqPayload();
                case g.SDP_MSG_TYPE.SDP_FPU_RSP:
                    return this._unpackSdpFpuRspPayload();

                //UDR
                case g.SWP_MSG_TYPE.SWP_UDR_REQ:
                    return this._unpackSwpUdrReqPayload();
                case g.SDP_MSG_TYPE.SDP_UDR_REQ:
                    return this._unpackSdpUdrReqPayload();
                case g.SDP_MSG_TYPE.SDP_UDR_RSP:
                    return this._unpackSdpUdrRspPayload();

                //AUV
                case g.SWP_MSG_TYPE.SWP_AUV_REQ:
                    return this._unpackSwpAuvReqPayload();
                case g.SDP_MSG_TYPE.SDP_AUV_REQ:
                    return this._unpackSdpAuvReqPayload();
                case g.SDP_MSG_TYPE.SDP_AUV_RSP:
                    return this._unpackSdpAuvRspPayload();

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
                case g.SAP_MSG_TYPE.SAP_SRG_REQ:
                    return this._unpackSapSrgReqPayload();
                case g.SWP_MSG_TYPE.SWP_SRG_REQ:
                    return this._unpackSwpSrgReqPayload();
                case g.SDP_MSG_TYPE.SDP_SRG_REQ:
                    return this._unpackSdpSrgReqPayload();
                case g.SDP_MSG_TYPE.SDP_SRG_RSP:
                    return this._unpackSdpSrgRspPayload();
                
                //SAS
                case g.SAP_MSG_TYPE.SAP_SAS_REQ:
                    return this._unpackSapSasReqPayload();
                case g.SWP_MSG_TYPE.SWP_SAS_REQ:
                    return this._unpackSwpSasReqPayload();
                case g.SDP_MSG_TYPE.SDP_SAS_REQ:
                    return this._unpackSdpSasReqPayload();
                case g.SDP_MSG_TYPE.SDP_SAS_RSP:
                    return this._unpackSdpSasRspPayload();
                
                //SDD
                case g.SAP_MSG_TYPE.SAP_SDD_REQ:
                    return this._unpackSapSddReqPayload();
                case g.SWP_MSG_TYPE.SWP_SDD_REQ:
                    return this._unpackSwpSddReqPayload();
                case g.SDP_MSG_TYPE.SDP_SDD_REQ:
                    return this._unpackSdpSddReqPayload();
                case g.SDP_MSG_TYPE.SDP_SDD_RSP:
                    return this._unpackSdpSddRspPayload();

                //SLV
                case g.SAP_MSG_TYPE.SAP_SLV_REQ:
                    return this._unpackSapSlvReqPayload();
                case g.SWP_MSG_TYPE.SWP_SLV_REQ:
                    return this._unpackSwpSlvReqPayload();
                case g.SDP_MSG_TYPE.SDP_SLV_REQ:
                    return this._unpackSdpSlvReqPayload();
                case g.SDP_MSG_TYPE.SDP_SLV_RSP:
                    return this._unpackSdpSlvRspPayload();

                //SIR
                case g.SSP_MSG_TYPE.SSP_SIR_REQ:
                    return this._unpackSspSirReqPayload();
                case g.SDP_MSG_TYPE.SDP_SIR_REQ:
                    return this._unpackSdpSirReqPayload();
                case g.SDP_MSG_TYPE.SDP_SIR_RSP:
                    return this._unpackSdpSirRspPayload();

                //DCA
                case g.SSP_MSG_TYPE.SSP_DCA_REQ:
                    return this._unpackSspDcaReqPayload();
                case g.SAP_MSG_TYPE.SAP_DCA_REQ:
                    return this._unpackSapDcaReqPayload();
                case g.SDP_MSG_TYPE.SDP_DCA_REQ:
                    return this._unpackSdpDcaReqPayload();
                case g.SDP_MSG_TYPE.SDP_DCA_RSP:
                    return this._unpackSdpDcaRspPayload();

                //DCD
                case g.SSP_MSG_TYPE.SSP_DCD_NOT:
                    return this._unpackSspDcdNotPayload();
                case g.SAP_MSG_TYPE.SAP_DCD_NOT:
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
                case g.SAP_MSG_TYPE.SAP_RAV_REQ:
                    return this._unpackSapRavReqPayload();
                case g.SWP_MSG_TYPE.SWP_RAV_REQ:
                    return this._unpackSwpRavReqPayload();

                //RHV
                case g.SWP_MSG_TYPE.SWP_RHV_REQ:
                    return this._unpackSwpRhvReqPayload();

                //HAV
                case g.SWP_MSG_TYPE.SWP_HAV_REQ:
                    return this._unpackSwpHavReqPayload();
                case g.SDP_MSG_TYPE.SDP_HAV_REQ:
                    return this._unpackSdpHavReqPayload();
                case g.SDP_MSG_TYPE.SDP_HAV_RSP:
                    return this._unpackSdpHavRspPayload();

                //HHV
                case g.SAP_MSG_TYPE.SAP_HHV_REQ:
                    return this._unpackSapHhvReqPayload();
                case g.SWP_MSG_TYPE.SWP_HHV_REQ:
                    return this._unpackSwpHhvReqPayload();
                case g.SDP_MSG_TYPE.SDP_HHV_REQ:
                    return this._unpackSdpHhvReqPayload();
                case g.SDP_MSG_TYPE.SDP_HHV_RSP:
                    return this._unpackSdpHhvRspPayload();

                //SHR
                case g.SWP_MSG_TYPE.SWP_SHR_REQ:
                    return this._unpackSwpShrReqPayload();
                case g.SDP_MSG_TYPE.SDP_SHR_REQ:
                    return this._unpackSdpShrReqPayload();
                case g.SDP_MSG_TYPE.SDP_SHR_RSP:
                    return this._unpackSdpShrRspPayload();

                //KAS
                case g.SAP_MSG_TYPE.SAP_KAS_REQ:
                    return this._unpackSapKasReqPayload();
                case g.SWP_MSG_TYPE.SWP_KAS_REQ:
                    return this._unpackSwpKasReqPayload();

                default:
                    return false;
            }
        } else {
            return false;
        }
    }

    //SGU
    _unpackSapSguReqPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;

        this.unpackedPayload = {};
        this.unpackedPayload.bdt = payload.bdt;
        this.unpackedPayload.gender = payload.gender;
        this.unpackedPayload.userId = payload.userId;
        this.unpackedPayload.userPw = payload.userPw;
        this.unpackedPayload.userFn = payload.userFn;
        this.unpackedPayload.userLn = payload.userLn;

        return this.unpackedPayload;
    }
    _unpackSwpSguReqPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;

        this.unpackedPayload = {};
        this.unpackedPayload.bdt = payload.bdt;
        this.unpackedPayload.gender = payload.gender;
        this.unpackedPayload.userId = payload.userId;
        this.unpackedPayload.userPw = payload.userPw;
        this.unpackedPayload.userFn = payload.userFn;
        this.unpackedPayload.userLn = payload.userLn;

        return this.unpackedPayload;
    }
    _unpackSdpSguReqPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;

        this.unpackedPayload = {};
        this.unpackedPayload.userId = payload.userId;
        this.unpackedPayload.clientType = payload.clientType;

        return this.unpackedPayload;
    }
    _unpackSdpSguRspPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;

        this.unpackedPayload = {};
        this.unpackedPayload.resultCode = payload.resultCode;

        return this.unpackedPayload;
    }

    //UVC
    _unpackSapUvcReqPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;

        this.unpackedPayload = {};
        this.unpackedPayload.vc = payload.vc;
        this.unpackedPayload.ac = payload.ac;

        return this.unpackedPayload;
    }
    _unpackSwpUvcReqPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;

        this.unpackedPayload = {};
        this.unpackedPayload.vc = payload.vc;
        this.unpackedPayload.ac = payload.ac;

        return this.unpackedPayload;
    }
    _unpackSdpUvcReqPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;

        this.unpackedPayload = {};
        this.unpackedPayload.bdt = payload.bdt;
        this.unpackedPayload.gender = payload.gender;
        this.unpackedPayload.userId = payload.userId;
        this.unpackedPayload.userPw = payload.userPw;
        this.unpackedPayload.userFn = payload.userFn;
        this.unpackedPayload.userLn = payload.userLn;
        this.unpackedPayload.clientType = payload.clientType;

        return this.unpackedPayload;
    }
    _unpackSdpUvcRspPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;

        this.unpackedPayload = {};
        this.unpackedPayload.resultCode = payload.resultCode;

        return this.unpackedPayload;
    }

    //SGI
    _unpackSapSgiReqPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;

        this.unpackedPayload = {};
        this.unpackedPayload.userId = payload.userId;
        this.unpackedPayload.userPw = payload.userPw;

        return this.unpackedPayload;
    }
    _unpackSwpSgiReqPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;

        this.unpackedPayload = {};
        this.unpackedPayload.userId = payload.userId;
        this.unpackedPayload.userPw = payload.userPw;

        return this.unpackedPayload;
    }
    _unpackSdpSgiReqPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;

        this.unpackedPayload = {};
        this.unpackedPayload.userId = payload.userId;
        this.unpackedPayload.userPw = payload.userPw;
        this.unpackedPayload.clientType = payload.clientType;
        
        return this.unpackedPayload;
    }
    _unpackSdpSgiRspPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;

        this.unpackedPayload = {};
        this.unpackedPayload.resultCode = payload.resultCode;
        if (payload.resultCode === g.SDP_MSG_RESCODE.RESCODE_SDP_SGI.RESCODE_SDP_SGI_OK) {
            this.unpackedPayload.usn = payload.usn;
            this.unpackedPayload.ml = payload.ml;
        }
        return this.unpackedPayload;
    }

    //SGO
    _unpackSapSgoNotPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;

        this.unpackedPayload = {};
        this.unpackedPayload.nsc = payload.nsc;

        return this.unpackedPayload;
    }
    _unpackSwpSgoNotPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;
        
        this.unpackedPayload = {};
        this.unpackedPayload.nsc = payload.nsc;

        return this.unpackedPayload;
    }
    _unpackSdpSgoNotPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;

        this.unpackedPayload = {};
        this.unpackedPayload.clientType = payload.clientType;
        
        return this.unpackedPayload;
    }
    _unpackSdpSgoAckPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;

        this.unpackedPayload = {};
        this.unpackedPayload.resultCode = payload.resultCode ;

        return this.unpackedPayload;
    }

    //UPC
    _unpackSapUpcReqPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;

        this.unpackedPayload = {};
        this.unpackedPayload.nsc = payload.nsc;
        this.unpackedPayload.curPw = payload.curPw;
        this.unpackedPayload.newPw = payload.newPw;
        
        return this.unpackedPayload;
    }
    _unpackSwpUpcReqPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;

        this.unpackedPayload = {};
        this.unpackedPayload.nsc = payload.nsc;
        this.unpackedPayload.curPw = payload.curPw;
        this.unpackedPayload.newPw = payload.newPw;
        
        return this.unpackedPayload;
    }
    _unpackSdpUpcReqPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;

        this.unpackedPayload = {};
        this.unpackedPayload.curPw = payload.curPw;
        this.unpackedPayload.newPw = payload.newPw; 
        this.unpackedPayload.clientType = payload.clientType;

        return this.unpackedPayload;
    }
    _unpackSdpUpcRspPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;

        this.unpackedPayload = {};
        this.unpackedPayload.resultCode = payload.resultCode;

        return this.unpackedPayload;
    }

    //FPU
    _unpackSapFpuReqPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;

        this.unpackedPayload = {};
        this.unpackedPayload.bdt = payload.bdt;
        this.unpackedPayload.userId = payload.userId;
        this.unpackedPayload.userFn = payload.userFn;
        this.unpackedPayload.userLn = payload.userLn;

        return this.unpackedPayload;
    }
    _unpackSwpFpuReqPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;

        this.unpackedPayload = {};
        this.unpackedPayload.bdt = payload.bdt;
        this.unpackedPayload.userId = payload.userId;
        this.unpackedPayload.userFn = payload.userFn;
        this.unpackedPayload.userLn = payload.userLn;

        return this.unpackedPayload;
    }
    _unpackSdpFpuReqPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;

        this.unpackedPayload = {};
        this.unpackedPayload.bdt = payload.bdt;
        this.unpackedPayload.userId = payload.userId;
        this.unpackedPayload.userFn = payload.userFn;
        this.unpackedPayload.userLn = payload.userLn;

        this.unpackedPayload.clientType = payload.clientType;

        return this.unpackedPayload;
    }
    _unpackSdpFpuRspPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;

        this.unpackedPayload = {};
        this.unpackedPayload.resultCode = payload.resultCode;
        if (payload.resultCode === 0) this.unpackedPayload.userPw = payload.userPw;

        return this.unpackedPayload;
    }

    //UDR
    _unpackSwpUdrReqPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;

        this.unpackedPayload = {};
        this.unpackedPayload.nsc = payload.nsc;
        this.unpackedPayload.userPw = payload.userPw;

        return this.unpackedPayload;
    }
    _unpackSdpUdrReqPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;

        this.unpackedPayload = {};
        this.unpackedPayload.userPw = payload.userPw;

        return this.unpackedPayload;
    }
    _unpackSdpUdrRspPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;

        this.unpackedPayload = {};
        this.unpackedPayload.resultCode = payload.resultCode;

        return this.unpackedPayload;
    }

    //AUV
    _unpackSwpAuvReqPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;
        this.unpackedPayload.nsc = payload.nsc
        if (typeof payload.regf !== 'undefined') this.unpackedPayload.regf = payload.regf;
        if (typeof payload.signf !== 'undefined') this.unpackedPayload.signf = payload.signf;
        if (typeof payload.ml !== 'undefined') this.unpackedPayload.mlv = payload.ml;
        if (typeof payload.userId !== 'undefined') this.unpackedPayload.userId = payload.userId;
        if (typeof payload.userFn !== 'undefined') this.unpackedPayload.userFn = payload.userFn;
        if (typeof payload.userLn !== 'undefined') this.unpackedPayload.userLn = payload.userLn;
        if (typeof payload.oprset !== 'undefined') this.unpackedPayload.oprset = payload.oprset;
        return this.unpackedPayload;
    }
    _unpackSdpAuvReqPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;
        this.unpackedPayload = {};
        if (typeof payload.regf !== 'undefined') this.unpackedPayload.regf = payload.regf;
        if (typeof payload.signf !== 'undefined') this.unpackedPayload.signf = payload.signf;
        if (typeof payload.mlv !== 'undefined') this.unpackedPayload.mlv = payload.mlv;
        if (typeof payload.userId !== 'undefined') this.unpackedPayload.userId = payload.userId;
        if (typeof payload.userFn !== 'undefined') this.unpackedPayload.userFn = payload.userFn;
        if (typeof payload.userLn !== 'undefined') this.unpackedPayload.userLn = payload.userLn;
        if (typeof payload.oprset !== 'undefined') this.unpackedPayload.oprset = payload.oprset;
        
        return this.unpackedPayload;
    }
    _unpackSdpAuvRspPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;

        this.unpackedPayload = {};
        this.unpackedPayload.resultCode = payload.resultCode
        if (payload.resultCode === 0) this.unpackedPayload.userInfoListEncodings = payload.userInfoListEncodings;
        
        return this.unpackedPayload;
    }

    //ASR
    _unpackSwpAsrReqPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;

        this.unpackedPayload = {};
        this.unpackedPayload.nsc = payload.nsc;
        this.unpackedPayload.wmac = payload.wmac;
        this.unpackedPayload.cmac = payload.cmac;

        return this.unpackedPayload;
    }
    _unpackSdpAsrReqPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;

        this.unpackedPayload = {};
        this.unpackedPayload.wmac = payload.wmac;
        this.unpackedPayload.cmac = payload.cmac;

        return this.unpackedPayload;
    }
    _unpackSdpAsrRspPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;

        this.unpackedPayload = {};
        this.unpackedPayload.resultCode = payload.resultCode;

        return this.unpackedPayload;
    }

    //ASD
    _unpackSwpAsdReqPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;
        this.unpackedPayload.nsc = payload.nsc;
        this.unpackedPayload.wmac = payload.wmac;
        this.unpackedPayload.drgcd = payload.drgcd;
        this.unpackedPayload.userId = payload.userId;

        return this.unpackedPayload;
    }
    _unpackSdpAsdReqPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;

        this.unpackedPayload.wmac = payload.wmac;
        this.unpackedPayload.drgcd = payload.drgcd;
        this.unpackedPayload.userId = payload.userId;

        return this.unpackedPayload;
    }
    _unpackSdpAsdRspPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;
        this.unpackedPayload = {};
        this.unpackedPayload.resultCode = payload.resultCode;
        return this.unpackedPayload;
    }

    //ASV
    _unpackSwpAsvReqPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;
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
        const payload = this.msgPayload;
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
        const payload = this.msgPayload;
        this.unpackedPayload = {};
        this.unpackedPayload.resultCode = payload.resultCode;
        if (payload.resultCode === 0 && payload.existCode === 0) this.unpackedPayload.selectedSensorInformationList = payload.selectedSensorInformationList;
        return this.unpackedPayload;
    }

    //SRG
    _unpackSapSrgReqPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;

        this.unpackedPayload.nsc = payload.nsc;
        this.unpackedPayload.wmac = payload.wmac;
        this.unpackedPayload.cmac = payload.cmac;

        return this.unpackedPayload;
    }
    _unpackSwpSrgReqPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;

        this.unpackedPayload.nsc = payload.nsc;
        this.unpackedPayload.wmac = payload.wmac;
        this.unpackedPayload.cmac = payload.cmac;

        return this.unpackedPayload;
    }
    _unpackSdpSrgReqPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;

        this.unpackedPayload.wmac = payload.wmac;
        this.unpackedPayload.cmac = payload.cmac;
        this.unpackedPayload.clientType = payload.clientType;
        
        return this.unpackedPayload;
    }
    _unpackSdpSrgRspPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;
        this.unpackedPayload = {};
        this.unpackedPayload.resultCode = payload.resultCode;
        return this.unpackedPayload;
    }

    //SAS
    _unpackSapSasReqPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;

        this.unpackedPayload.nsc = payload.nsc;
        this.unpackedPayload.wmac = payload.wmac;
        this.unpackedPayload.mobf = payload.mobf;

        return this.unpackedPayload;
    }
    _unpackSwpSasReqPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;

        this.unpackedPayload.nsc = payload.nsc;
        this.unpackedPayload.wmac = payload.wmac;
        this.unpackedPayload.mobf = payload.mobf;

        return this.unpackedPayload;
    }
    _unpackSdpSasReqPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;

        this.unpackedPayload.wmac = payload.wmac;
        this.unpackedPayload.mobf = payload.mobf;
        this.unpackedPayload.clientType = payload.clientType;

        return this.unpackedPayload;
    }
    _unpackSdpSasRspPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;
        this.unpackedPayload.resultCode = payload.resultCode;
        return this.unpackedPayload;
    }

    //SDD
    _unpackSapSddReqPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;

        this.unpackedPayload.nsc = payload.nsc;
        this.unpackedPayload.wmac = payload.wmac;
        this.unpackedPayload.drgcd = payload.drgcd;

        return this.unpackedPayload;
    }
    _unpackSwpSddReqPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;

        this.unpackedPayload.nsc = payload.nsc;
        this.unpackedPayload.wmac = payload.wmac;
        this.unpackedPayload.drgcd = payload.drgcd;

        return this.unpackedPayload;
    }
    _unpackSdpSddReqPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;

        this.unpackedPayload.wmac = payload.wmac;
        this.unpackedPayload.drgcd = payload.drgcd;
        this.unpackedPayload.clientType = payload.clientType;

        return this.unpackedPayload;
    }
    _unpackSdpSddRspPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;
        this.unpackedPayload = {}
        this.unpackedPayload.resultCode = payload.resultCode;
        return this.unpackedPayload;
    }

    //SLV
    _unpackSapSlvReqPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;
        this.unpackedPayload = {};
        if (typeof payload.nsc !== 'undefined') this.unpackedPayload.nsc = payload.nsc;

        return this.unpackedPayload;
    }
    _unpackSwpSlvReqPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;
        this.unpackedPayload = {};
        if (typeof payload.nsc !== 'undefined') this.unpackedPayload.nsc = payload.nsc;

        return this.unpackedPayload;
    }
    _unpackSdpSlvReqPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;
        this.unpackedPayload.clientType = payload.clientType;

        return this.unpackedPayload;
    }
    _unpackSdpSlvRspPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;
        this.unpackedPayload = {};
        this.unpackedPayload.resultCode = payload.resultCode;
        this.unpackedPayload.existCode = payload.existCode;
        if (payload.resultCode === 0 && payload.existCode === 0) this.unpackedPayload.selectedSensorInformationList = payload.selectedSensorInformationList;
        return this.unpackedPayload;
    }

    //SIR
    _unpackSspSirReqPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;
        this.unpackedPayload = {};

        this.unpackedPayload.wmac = payload.wmac;

        return this.unpackedPayload;
    }
    _unpackSdpSirReqPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;
        this.unpackedPayload = {};

        this.unpackedPayload.wmac = payload.wmac;
        
        return this.unpackedPayload;
    }
    _unpackSdpSirRspPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;
        this.unpackedPayload = {};
        this.unpackedPayload.resultCode = payload.resultCode;
        if (payload.resultCode === 0) this.unpackedPayload.ssn = payload.ssn;
        return this.unpackedPayload;
    }

    //DCA
    _unpackSspDcaReqPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;
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
        const payload = this.msgPayload;

        this.unpackedPayload = {};
        this.unpackedPayload.nsc = payload.nsc;

        return this.unpackedPayload;
    }
    _unpackSdpDcaReqPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;

        this.unpackedPayload = {};
        //If the server received ssp:dca-req message, sdpDcaReq must have following lat, lng
        if (typeof payload.lat !== 'undefined') this.unpackedPayload.lat = payload.lat;
        if (typeof payload.lng !== 'undefined') this.unpackedPayload.lng = payload.lng;

        return this.unpackedPayload;
    }
    _unpackSdpDcaRspPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;
        this.unpackedPayload = {};
        this.unpackedPayload.resultCode = payload.resultCode;
        if (payload.resultCode === 0) {
            if (typeof payload.mti !== 'undefined') this.unpackedPayload.mti = payload.mti;
            if (typeof payload.mobf !== 'undefined') this.unpackedPayload.mobf = payload.mobf;
        }
        return this.unpackedPayload;
    }

    //DCD
    _unpackSspDcdNotPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;

        this.unpackedPayload = {};
        this.unpackedPayload.entityType = payload.entityType;

        return this.unpackedPayload;
    }
    _unpackSapDcdNotPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;

        this.unpackedPayload = {};
        this.unpackedPayload.entityType = payload.entityType;

        return this.unpackedPayload;
    }
    _unpackSdpDcdNotPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;

        this.unpackedPayload = {};
        this.unpackedPayload.entityType = payload.entityType;

        return this.unpackedPayload;
    }
    _unpackSdpDcdAckPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;
        this.unpackedPayload = {};

        this.unpackedPayload.resultCode = payload.resultCode;

        return this.unpackedPayload;
    }

    //RAV
    _unpackSapRavReqPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;
        this.unpackedPayload = {};

        this.unpackedPayload.nsc = payload.nsc;
        this.unpackedPayload.provinceListEncodings = payload.provinceListEncodings;
        this.unpackedPayload.keywordSearchListEncodings = payload.keywordSearchListEncodings;

        return this.unpackedPayload;
    }
    _unpackSwpRavReqPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;
        this.unpackedPayload = {};

        this.unpackedPayload.nsc = payload.nsc;
        this.unpackedPayload.provinceListEncodings = payload.provinceListEncodings;
        this.unpackedPayload.keywordSearchListEncodings = payload.keywordSearchListEncodings;

        return this.unpackedPayload;
    }

    //RHV
    _unpackSwpRhvReqPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;
        this.unpackedPayload = {};

        this.unpackedPayload.nsc = payload.nsc;

        return this.unpackedPayload;
    }

    //HAV
    _unpackSwpHavReqPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;
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
        const payload = this.msgPayload;
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
        const payload = this.msgPayload;
        this.unpackedPayload = {};
        this.unpackedPayload.resultCode = payload.resultCode;
        if (payload.resultCode === 0) this.unpackedPayload.lastFlg = payload.lastFlg;
        if (payload.resultCode === 0) this.unpackedPayload.flgSeqNum = payload.flgSeqNum;
        if (payload.resultCode === 0) this.unpackedPayload.historicalAirQualityDataListEncodings = payload.historicalAirQualityDataListEncodings;
        return this.unpackedPayload;
    }
    
    //HHV
    _unpackSapHhvReqPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;
        this.unpackedPayload = {};
        this.unpackedPayload.nsc = payload.nsc;
        this.unpackedPayload.sTs = payload.sTs;
        this.unpackedPayload.eTs = payload.eTs;
        this.unpackedPayload.nat = payload.nat;
        this.unpackedPayload.state = payload.state;
        this.unpackedPayload.city = payload.city;

        return this.unpackedPayload;
    }
    _unpackSwpHhvReqPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;
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
        const payload = this.msgPayload;
        this.unpackedPayload = {};

        this.unpackedPayload.sTs = payload.sTs;
        this.unpackedPayload.eTs = payload.eTs;
        this.unpackedPayload.nat = payload.nat;
        this.unpackedPayload.state = payload.state;
        this.unpackedPayload.city = payload.city;
        this.unpackedPayload.clientType = payload.clientType;

        return this.unpackedPayload;
    }
    _unpackSdpHhvRspPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;
        this.unpackedPayload = {};
        this.unpackedPayload.resultCode = payload.resultCode;
        if (payload.resultCode === 0) this.unpackedPayload.lastFlg = payload.lastFlg;
        if (payload.resultCode === 0) this.unpackedPayload.flgSeqNum = payload.flgSeqNum;
        if (payload.resultCode === 0) this.unpackedPayload.historicalHeartQualityDataListEncodings = payload.historicalHeartQualityDataListEncodings;
        return this.unpackedPayload;
    }
    //SHR
    _unpackSwpShrReqPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;
        this.unpackedPayload = {};
        this.unpackedPayload.nsc = payload.nsc;
        this.unpackedPayload.nat = payload.nat;
        this.unpackedPayload.state = payload.state;
        this.unpackedPayload.city = payload.city;

        return this.unpackedPayload;
    }
    _unpackSdpShrReqPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;
        this.unpackedPayload = {};

        this.unpackedPayload.nat = payload.nat;
        this.unpackedPayload.state = payload.state;
        this.unpackedPayload.city = payload.city;

        return this.unpackedPayload;
    }
    _unpackSdpShrRspPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;
        this.unpackedPayload = {};
        this.unpackedPayload.resultCode = payload.resultCode;
        if (payload.resultCode === 0) this.unpackedPayload.historyRecordList = payload.historyRecordList;
        return this.unpackedPayload;
    }

    //KAS
    _unpackSapKasReqPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;
        this.unpackedPayload.nsc = payload.nsc;
        return this.unpackedPayload;
    }
    _unpackSwpKasReqPayload() {
        //validation
        //parsing
        const payload = this.msgPayload;
        this.unpackedPayload.nsc = payload.nsc;
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
                case g.SAP_MSG_TYPE.SAP_SGU_RSP:
                    return this._packSapSguRsp(payload);
                case g.SWP_MSG_TYPE.SWP_SGU_RSP:
                    return this._packSwpSguRsp(payload);
                case g.SDP_MSG_TYPE.SDP_SGU_REQ:
                    return this._packSdpSguReq(payload);
                case g.SDP_MSG_TYPE.SDP_SGU_RSP:
                    return this._packSdpSguRsp(payload);

                //UVC
                case g.SAP_MSG_TYPE.SAP_UVC_RSP:
                    return this._packSapUvcRsp(payload);
                case g.SWP_MSG_TYPE.SWP_UVC_RSP:
                    return this._packSwpUvcRsp(payload);
                case g.SDP_MSG_TYPE.SDP_UVC_REQ:
                    return this._packSdpUvcReq(payload);
                case g.SDP_MSG_TYPE.SDP_UVC_RSP:
                    return this._packSdpUvcRsp(payload);

                //SGI
                case g.SAP_MSG_TYPE.SAP_SGI_RSP:
                    return this._packSapSgiRsp(payload);
                case g.SWP_MSG_TYPE.SWP_SGI_RSP:
                    return this._packSwpSgiRsp(payload);
                case g.SDP_MSG_TYPE.SDP_SGI_REQ:
                    return this._packSdpSgiReq(payload);
                case g.SDP_MSG_TYPE.SDP_SGI_RSP:
                    return this._packSdpSgiRsp(payload);

                //SGO    
                case g.SAP_MSG_TYPE.SAP_SGO_ACK:
                    return this._packSapSgoAck(payload);
                case g.SWP_MSG_TYPE.SWP_SGO_ACK:
                    return this._packSwpSgoAck(payload);
                case g.SDP_MSG_TYPE.SDP_SGO_NOT:
                    return this._packSdpSgoNot(payload);
                case g.SDP_MSG_TYPE.SDP_SGO_ACK:
                    return this._packSdpSgoAck(payload);

                //UPC
                case g.SAP_MSG_TYPE.SAP_UPC_RSP:
                    return this._packSapUpcRsp(payload);
                case g.SWP_MSG_TYPE.SWP_UPC_RSP:
                    return this._packSwpUpcRsp(payload);
                case g.SDP_MSG_TYPE.SDP_UPC_REQ:
                    return this._packSdpUpcReq(payload);
                case g.SDP_MSG_TYPE.SDP_UPC_RSP:
                    return this._packSdpUpcRsp(payload);

                //FPU
                case g.SAP_MSG_TYPE.SAP_FPU_RSP:
                    return this._packSapFpuRsp(payload);
                case g.SWP_MSG_TYPE.SWP_FPU_RSP:
                    return this._packSwpFpuRsp(payload);
                case g.SDP_MSG_TYPE.SDP_FPU_REQ:
                    return this._packSdpFpuReq(payload);
                case g.SDP_MSG_TYPE.SDP_FPU_RSP:
                    return this._packSdpFpuRsp(payload);

                //UDR
                case g.SWP_MSG_TYPE.SWP_UDR_RSP:
                    return this._packSwpUdrRsp(payload);
                case g.SDP_MSG_TYPE.SDP_UDR_REQ:
                    return this._packSdpUdrReq(payload);
                case g.SDP_MSG_TYPE.SDP_UDR_RSP:
                    return this._packSdpUdrRsp(payload);

                //AUV
                case g.SWP_MSG_TYPE.SWP_AUV_RSP:
                    return this._packSwpAuvRsp(payload);
                case g.SDP_MSG_TYPE.SDP_AUV_REQ:
                    return this._packSdpAuvReq(payload);
                case g.SDP_MSG_TYPE.SDP_AUV_RSP:
                    return this._packSdpAuvRsp(payload);

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
                case g.SAP_MSG_TYPE.SAP_SRG_RSP:
                    return this._packSapSrgRsp(payload);
                case g.SWP_MSG_TYPE.SWP_SRG_RSP:
                    return this._packSwpSrgRsp(payload);
                case g.SDP_MSG_TYPE.SDP_SRG_REQ:
                    return this._packSdpSrgReq(payload);
                case g.SDP_MSG_TYPE.SDP_SRG_RSP:
                    return this._packSdpSrgRsp(payload);

                //SAS
                case g.SAP_MSG_TYPE.SAP_SAS_RSP:
                    return this._packSapSasRsp(payload);
                case g.SWP_MSG_TYPE.SWP_SAS_RSP:
                    return this._packSwpSasRsp(payload);
                case g.SDP_MSG_TYPE.SDP_SAS_REQ:
                    return this._packSdpSasReq(payload);
                case g.SDP_MSG_TYPE.SDP_SAS_RSP:
                    return this._packSdpSasRsp(payload);

                //SDD
                case g.SAP_MSG_TYPE.SAP_SDD_RSP:
                    return this._packSapSddRsp(payload);
                case g.SWP_MSG_TYPE.SWP_SDD_RSP:
                    return this._packSwpSddRsp(payload);
                case g.SDP_MSG_TYPE.SDP_SDD_REQ:
                    return this._packSdpSddReq(payload);
                case g.SDP_MSG_TYPE.SDP_SDD_RSP:
                    return this._packSdpSddRsp(payload);

                //SLV
                case g.SAP_MSG_TYPE.SAP_SLV_RSP:
                    return this._packSapSlvRsp(payload);
                case g.SWP_MSG_TYPE.SWP_SLV_RSP:
                    return this._packSwpSlvRsp(payload);
                case g.SDP_MSG_TYPE.SDP_SLV_REQ:
                    return this._packSdpSlvReq(payload);
                case g.SDP_MSG_TYPE.SDP_SLV_RSP:
                    return this._packSdpSlvRsp(payload);
                    
                //SIR
                case g.SSP_MSG_TYPE.SSP_SIR_RSP:
                    return this._packSspSirRsp(payload);
                case g.SDP_MSG_TYPE.SDP_SIR_REQ:
                    return this._packSdpSirReq(payload);
                case g.SDP_MSG_TYPE.SDP_SIR_RSP:
                    return this._packSdpSirRsp(payload);

                //DCA
                case g.SSP_MSG_TYPE.SSP_DCA_RSP:
                    return this._packSspDcaRsp(payload);
                case g.SAP_MSG_TYPE.SAP_DCA_RSP:
                    return this._packSapDcaRsp(payload);
                case g.SDP_MSG_TYPE.SDP_DCA_REQ:
                    return this._packSdpDcaReq(payload);
                case g.SDP_MSG_TYPE.SDP_DCA_RSP:
                    return this._packSdpDcaRsp(payload);
                
                //DCD
                case g.SSP_MSG_TYPE.SSP_DCD_ACK:
                    return this._packSspDcdAck(payload);
                case g.SAP_MSG_TYPE.SAP_DCD_ACK:
                    return this._packSapDcdAck(payload);
                case g.SDP_MSG_TYPE.SDP_DCD_NOT:
                    return this._packSdpDcdNot(payload);
                case g.SDP_MSG_TYPE.SDP_DCD_ACK:
                    return this._packSdpDcdAck(payload);

                //RAV
                case g.SAP_MSG_TYPE.SAP_RAV_RSP:
                    return this._packSapRavRsp(payload);
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
                case g.SAP_MSG_TYPE.SAP_HHV_RSP:
                    return this._packSapHhvRsp(payload);
                case g.SWP_MSG_TYPE.SWP_HHV_RSP:
                    return this._packSwpHhvRsp(payload);
                case g.SDP_MSG_TYPE.SDP_HHV_REQ:
                    return this._packSdpHhvReq(payload);
                case g.SDP_MSG_TYPE.SDP_HHV_RSP:
                    return this._packSdpHhvRsp(payload);

                //SHR
                case g.SWP_MSG_TYPE.SWP_SHR_RSP:
                    return this._packSwpShrRsp(payload);
                case g.SDP_MSG_TYPE.SDP_SHR_REQ:
                    return this._packSdpShrReq(payload);
                case g.SDP_MSG_TYPE.SDP_SHR_RSP:
                    return this._packSdpShrRsp(payload);

                //KAS
                case g.SAP_MSG_TYPE.SAP_KAS_RSP:
                    return this._packSwpKasRsp(payload);
                case g.SWP_MSG_TYPE.SWP_KAS_RSP:
                    return this._packSwpKasRsp(payload);
                    
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
    _packSapSguRsp(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SAP_MSG_TYPE.SAP_SGU_RSP,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }
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
    _packSapUvcRsp(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SAP_MSG_TYPE.SAP_UVC_RSP,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }
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
    _packSapSgiRsp(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SAP_MSG_TYPE.SAP_SGI_RSP,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }
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
    _packSapSgoAck(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SAP_MSG_TYPE.SAP_SGO_ACK,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }
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

    //UPC
    _packSapUpcRsp(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SAP_MSG_TYPE.SAP_UPC_RSP,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }
    _packSwpUpcRsp(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SWP_MSG_TYPE.SWP_UPC_RSP,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }
    _packSdpUpcReq(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SDP_MSG_TYPE.SDP_UPC_REQ,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }
    _packSdpUpcRsp(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SDP_MSG_TYPE.SDP_UPC_RSP,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }

    //FPU
    _packSapFpuRsp(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SAP_MSG_TYPE.SAP_FPU_RSP,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }
    _packSwpFpuRsp(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SWP_MSG_TYPE.SWP_FPU_RSP,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }
    _packSdpFpuReq(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SDP_MSG_TYPE.SDP_FPU_REQ,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }
    _packSdpFpuRsp(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SDP_MSG_TYPE.SDP_FPU_RSP,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }


    //UDR
    _packSwpUdrRsp(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SWP_MSG_TYPE.SWP_UDR_RSP,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }
    _packSdpUdrReq(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SDP_MSG_TYPE.SDP_UDR_REQ,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }
    _packSdpUdrRsp(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SDP_MSG_TYPE.SDP_UDR_RSP,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }

    //AUV
    _packSwpAuvRsp(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SWP_MSG_TYPE.SWP_AUV_RSP,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }
    _packSdpAuvReq(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SDP_MSG_TYPE.SDP_AUV_REQ,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }
    _packSdpAuvRsp(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SDP_MSG_TYPE.SDP_AUV_RSP,
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
    _packSapSrgRsp(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SAP_MSG_TYPE.SAP_SRG_RSP,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }
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
    _packSapSasRsp(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SAP_MSG_TYPE.SAP_SAS_RSP,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }
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
    _packSapSddRsp(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SAP_MSG_TYPE.SAP_SDD_RSP,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }
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
    _packSapSlvRsp(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SAP_MSG_TYPE.SAP_SLV_RSP,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }
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

    //SIR
    _packSspSirRsp(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SSP_MSG_TYPE.SSP_SIR_RSP,
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
                "msgType": g.SAP_MSG_TYPE.SAP_DCA_RSP,
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
    _packSapRavRsp(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SAP_MSG_TYPE.SAP_RAV_RSP,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }
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

    //HAV
    _packSwpHavRsp(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SWP_MSG_TYPE.SWP_HAV_RSP,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }
    _packSdpHavReq(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SDP_MSG_TYPE.SDP_HAV_REQ,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }
    _packSdpHavRsp(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SDP_MSG_TYPE.SDP_HAV_RSP,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }

    //HHV
    _packSapHhvRsp(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SAP_MSG_TYPE.SAP_HHV_RSP,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }
    _packSwpHhvRsp(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SWP_MSG_TYPE.SWP_HHV_RSP,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }
    _packSdpHhvReq(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SDP_MSG_TYPE.SDP_HHV_REQ,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }
    _packSdpHhvRsp(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SDP_MSG_TYPE.SDP_HHV_RSP,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }

    //SHR
    _packSwpShrRsp(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SWP_MSG_TYPE.SWP_SHR_RSP,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }
    _packSdpShrReq(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SDP_MSG_TYPE.SDP_SHR_REQ,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }
    _packSdpShrRsp(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SDP_MSG_TYPE.SDP_SHR_RSP,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }

    //KAS
    _packSapKasRsp(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SAP_MSG_TYPE.SAP_KAS_RSP,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }
    _packSwpKasRsp(payload) {
        return this.packedMsg = {
            "header": {
                "msgType": g.SWP_MSG_TYPE.SWP_KAS_RSP,
                "msgLen": 0,
                "endpointId": this.endpointId
            },
            "payload": payload
        }
    }
 }
 module.exports = LlProtocol;
