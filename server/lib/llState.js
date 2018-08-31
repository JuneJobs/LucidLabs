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
    getState(endpointIdType, stateId, cb) {
        var key = '';
        var searchType = '';
        if(this.checkValidType(endpointIdType)) {
            //데이터가 있으면 스테이트 반환
            switch (endpointIdType) {
                case g.ENDPOIONT_ID_TYPE.EI_TYPE_SENSOR_TSI:
                    key = 'c:sta:s:s:tsi:' + stateId + ':*';
                    searchType = 'keys';
                    break;
                case g.ENDPOIONT_ID_TYPE.EI_TYPE_SENSOR_SSN:
                    key = 'c:sta:s:s:ssn:' + stateId;
                    searchType = 'get';
                    break;
                case g.ENDPOIONT_ID_TYPE.EI_TYPE_APP_TCI:
                    key = 'c:sta:s:a:tci:' + stateId + '*';
                    searchType = 'keys';
                    break;
                case g.ENDPOIONT_ID_TYPE.EI_TYPE_APP_USN:
                    key = 'c:sta:s:a:usn:' + stateId;
                    searchType = 'get';
                    break;
                case g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI:
                    key = 'c:sta:s:w:tci:' + stateId + '*';
                    searchType = 'keys';
                    break;
                case g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_USN:
                    key = 'c:sta:s:w:usn:' + stateId;
                    searchType = 'get';
                    break;
            }
            if(searchType === 'keys'){
                redisCli.keys(key, (err, reply) => {
                    if (err) {} else {
                        if (reply === null) {
                            cb(false);
                        } else {
                            redisCli.get(reply[0], (err, reply) => {
                                if (err) {} else {
                                    cb(reply);
                                }
                            });

                        }
                    }
                });
            } else if (searchType === 'get'){
                 redisCli.get(key, (err, reply) => {
                     if (err) {} else {
                         cb(reply);
                     }
                 });
            }
            
        } else {
            // 
            return false;
        }
    }
    //sec
    setState(endpointIdType, stateId, value, timeout) {
        var key = "";
        if (this.checkValidType(endpointIdType)) {
            switch (endpointIdType) {
                case g.ENDPOIONT_ID_TYPE.EI_TYPE_SENSOR_TSI:
                    key = 'c:sta:s:s:tsi:' + stateId[0] + ':' + stateId[1];
                    break;
                case g.ENDPOIONT_ID_TYPE.EI_TYPE_SENSOR_SSN:
                    key = 'c:sta:s:s:ssn:' + stateId;
                    break;
                case g.ENDPOIONT_ID_TYPE.EI_TYPE_APP_TCI:
                    key = 'c:sta:s:a:tci:' + stateId[0] + ':' + stateId[1];
                    break;
                case g.ENDPOIONT_ID_TYPE.EI_TYPE_APP_USN:
                    key = 'c:sta:s:a:usn:' + stateId;
                    break;
                case g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI:
                    key = 'c:sta:s:w:tci:' + stateId[0] + ':' + stateId[1];
                    break;
                case g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_USN:
                    key = 'c:sta:s:w:usn:' + stateId;
                    break;
            }
            redisCli.set(key, value, (err, reply) => {
                if (err) {
                    return false;
                } else {
                    if (reply === null) {
                        return false;
                    } else {
                        if (timeout !== undefined) {
                            redisCli.expire(key, timeout);
                        }
                        return true;
                    }
                }
            });
        } else {
            // 
            return false;
        }
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
module.exports = LlState;
