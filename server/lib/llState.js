'use strict'
/**
 *
     const llBuffer = require("./server/lib/llBuffer");
     global.buffer = new llBuffer();
 */

class llState {
    constructor(){

    }
    getState(endpointIdType, endpointId){
        try {
            switch (endpointIdType) {
                case ENDPOIONT_ID_TYPE.EI_TYPE_SENSOR_TSI:
                    //EI검색을 해보고 요청하고 없으면 IDLE상태
                    
                    state = "";
                    break;
            }

            return state;
        } catch (error) {

            return state;
        }
         
    }
    setState(){

    }
}