'use strict'
/**
 *
     const llBuffer = require("./server/lib/llBuffer");
     global.buffer = new llBuffer();
 */
const g = require("../config/header");
const redis = require("redis");
//Connect with Redis client
var redisCli = redis.createClient();

class LlState {
    constructor(){

    }
    getState(endpointIdType, stateId){
        if(this.checkValidType(endpointIdType)) {
                //데이터가 있으면 스테이트 반환
                switch (endpointIdType) {
                    case g.ENDPOIONT_ID_TYPE.EI_TYPE_SENSOR_TSI:
                        redisCli.get('c:sta:s:s:'+stateId[0]+':'+stateId[1], (err, reply)=>{
                            if (err){
                                return false;
                            } else {
                                if(reply === null){
                                    return false;
                                } else {
                                    return reply;
                                }
                            }
                        });
                    case g.ENDPOIONT_ID_TYPE.EI_TYPE_SENSOR_SSN:
                        redisCli.get('c:sta:s:s:'+stateId, (err, reply) => {
                            if (err) {
                                return false;
                            } else {
                                if (reply === null) {
                                    return false;
                                } else {
                                    return reply;
                                }
                            }
                        });
                    case g.ENDPOIONT_ID_TYPE.EI_TYPE_APP_TCI:
                        redisCli.get('c:sta:s:a:' + stateId[0] + ':' + stateId[1], (err, reply) => {
                            if (err) {
                                return false;
                            } else {
                                if (reply === null) {
                                    return false;
                                } else {
                                    return reply;
                                }
                            }
                        });
                    case g.ENDPOIONT_ID_TYPE.EI_TYPE_APP_USN:
                        redisCli.get('c:sta:s:a:' + stateId, (err, reply) => {
                            if (err) {
                                return false;
                            } else {
                                if (reply === null) {
                                    return false;
                                } else {
                                    return reply;
                                }
                            }
                        });
                    case g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI:
                        redisCli.get('c:sta:s:w:' + stateId[0] + ':' + stateId[1], (err, reply) => {
                            if (err) {
                                return false;
                            } else {
                                if (reply === null) {
                                    return false;
                                } else {
                                    return reply;
                                }
                            }
                        });
                    case g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_USN:
                        redisCli.get('c:sta:s:a:' + stateId, (err, reply) => {
                            if (err) {
                                return false;
                            } else {
                                if (reply === null) {
                                    return false;
                                } else {
                                    return reply;
                                }
                            }
                        });
                    default:
                    
                        break;
                }
                //데이터가 없으면 false
        } else {
            // 
            return false;
        }
    }
    setState(endpointIdType, stateId){

    }
    checkValidType(endpointIdType){
        if (endpointIdType === g.ENDPOIONT_ID_TYPE.EI_TYPE_SENSOR_TSI ||
            endpointIdType === g.ENDPOIONT_ID_TYPE.EI_TYPE_SENSOR_SSN ||
            endpointIdType === g.ENDPOIONT_ID_TYPE.EI_TYPE_APP_TCI ||
            endpointIdType === g.ENDPOIONT_ID_TYPE.EI_TYPE_APP_USN ||
            endpointIdType === g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI ||
            endpointIdType === g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_USN) {
            return true;
        } else {
            return false;
        }

    }
}
var state = new LlState();
state.getState(g.ENDPOIONT_ID_TYPE.EI_TYPE_SENSOR_TSI, ["1", "3c:15:c2:e2:e9:cc"]);