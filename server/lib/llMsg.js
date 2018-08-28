'use strict'

class llMsg {
    constructor() {

    }
    /**
     * Verify message header using msgType and state
     */
    verifyHeader(rcvdMsg){
        //Temporary architecture
        var rcvdHeader = rcvdMsg.header;
        var rcvdMsgType = rcvdHeader.msgType;
        var rcvdEI = rcvdHeader.endpointId;
        //State check logic
        
        var rcvdPayload = rcvdMsg.payload;
        
        return [rcvdMsgType, rcvdEI, rcvdPayload];
    }
    packing(){
        return true;
    }
    unpacking(msgPayload){
        return msgPayload;
    }
}
module.exports = llMsg;