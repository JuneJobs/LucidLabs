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
    getState(entity,endpointIdType, stateId, cb) {
        var key = '';
        var searchType = '';
        if(this.checkValidType(endpointIdType)) {
            //데이터가 있으면 스테이트 반환
            switch (endpointIdType) {
                case g.ENDPOIONT_ID_TYPE.EI_TYPE_SENSOR_TSI:
                    if (entity === g.ENTITY_TYPE.SERVER) {
                        key = 'c:sta:s:s:tsi:' + stateId + ':*';
                    } else if (entity === g.ENTITY_TYPE.DATABASE) {
                        key = 'c:sta:d:s:tsi:' + stateId + ':*';
                    }
                    searchType = 'keys';
                    break;
                case g.ENDPOIONT_ID_TYPE.EI_TYPE_SENSOR_SSN:
                    if (entity === g.ENTITY_TYPE.SERVER) {
                        key = 'c:sta:s:s:ssn:' + stateId;
                    } else if (entity === g.ENTITY_TYPE.DATABASE) {
                        key = 'c:sta:d:s:ssn:' + stateId;
                    }
                    searchType = 'get';
                    break;
                case g.ENDPOIONT_ID_TYPE.EI_TYPE_APP_TCI:
                    if (entity === g.ENTITY_TYPE.SERVER) {
                        key = 'c:sta:s:a:tci:' + stateId + ':*';
                    } else if (entity === g.ENTITY_TYPE.DATABASE) {
                        key = 'c:sta:d:a:tci:' + stateId + ':*';
                    }
                    searchType = 'keys';
                    break;
                case g.ENDPOIONT_ID_TYPE.EI_TYPE_APP_USN:
                    if (entity === g.ENTITY_TYPE.SERVER) {
                        key = 'c:sta:s:a:usn:' + stateId;
                    } else if (entity === g.ENTITY_TYPE.DATABASE) {
                        key = 'c:sta:d:a:usn:' + stateId;
                    }
                    searchType = 'get';
                    break;
                case g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI:
                    if (entity === g.ENTITY_TYPE.SERVER) {
                        key = 'c:sta:s:w:tci:' + stateId + ':*';
                    } else if (entity === g.ENTITY_TYPE.DATABASE) {
                        key = 'c:sta:d:w:tci:' + stateId + ':*';
                    }
                    searchType = 'keys';
                    break;
                case g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_USN:
                    if (entity === g.ENTITY_TYPE.SERVER) {
                        key = 'c:sta:s:w:usn:' + stateId;
                    } else if (entity === g.ENTITY_TYPE.DATABASE) {
                        key = 'c:sta:d:w:usn:' + stateId;
                    }
                    searchType = 'get';
                    break;
            }
            if(searchType === 'keys'){
                redisCli.keys(key, (err, searchedKey) => {
                    if (err) {} else {
                        if (searchedKey.length === 0) {
                            cb(false);
                        } else {
                            redisCli.get(searchedKey[0], (err, reply) => {
                                if (err) {} else {
                                    cb(Number(reply), searchedKey[0]);
                                }
                            });

                        }
                    }
                });
            } else if (searchType === 'get'){
                 redisCli.get(key, (err, reply) => {
                     if (err) {} else {
                         cb(Number(reply));
                     }
                 });
            }
            
        } else {
            // 
            return false;
        }
    }
    //sec
    setState(entity, endpointIdType, stateId, value, timeout) {
        var key = "";
        // var entityName ='';
        // if(entity === g.ENTITY_TYPE.SERVER){
        //     entityName = "SERVER";
        // }else {
        //     entityName = "DATABASE";
        // }
        // var endpointIdTypeName = '';
        if (this.checkValidType(endpointIdType)) {
            switch (endpointIdType) {
                case g.ENDPOIONT_ID_TYPE.EI_TYPE_SENSOR_TSI:
                    //endpointIdTypeName = "TSI";
                    if (entity === g.ENTITY_TYPE.SERVER) {
                        key = 'c:sta:s:s:tsi:' + stateId[0] + ':' + stateId[1];
                    } else if (entity === g.ENTITY_TYPE.DATABASE) {
                        key = 'c:sta:d:s:tsi:' + stateId[0] + ':' + stateId[1];
                    }
                    break;
                case g.ENDPOIONT_ID_TYPE.EI_TYPE_SENSOR_SSN:
                    //endpointIdTypeName = "SSN";
                    if (entity === g.ENTITY_TYPE.SERVER) {
                        key = 'c:sta:s:s:ssn:' + stateId;
                    } else if (entity === g.ENTITY_TYPE.DATABASE) {
                        key = 'c:sta:d:s:ssn:' + stateId;
                    }
                    break;
                case g.ENDPOIONT_ID_TYPE.EI_TYPE_APP_TCI:
                    //endpointIdTypeName = "APP TCI";
                    if (entity === g.ENTITY_TYPE.SERVER) {
                        key = 'c:sta:s:a:tci:' + stateId[0] + ':' + stateId[1];
                    } else if (entity === g.ENTITY_TYPE.DATABASE) {
                        key = 'c:sta:d:a:tci:' + stateId[0] + ':' + stateId[1];
                    }
                    break;
                case g.ENDPOIONT_ID_TYPE.EI_TYPE_APP_USN:
                    //endpointIdTypeName = "APP USN";
                    if (entity === g.ENTITY_TYPE.SERVER) {
                        key = 'c:sta:s:a:usn:' + stateId;
                    } else if (entity === g.ENTITY_TYPE.DATABASE) {
                        key = 'c:sta:d:a:usn:' + stateId;
                    }
                    break;
                case g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_TCI:
                    //endpointIdTypeName = "WEB TCI";
                    if (entity === g.ENTITY_TYPE.SERVER) {
                        if(stateId[1] === undefined){
                            console.log(stateId[0]);
                        }
                        key = 'c:sta:s:w:tci:' + stateId[0] + ':' + stateId[1];
                    } else if (entity === g.ENTITY_TYPE.DATABASE) {
                        key = 'c:sta:d:w:tci:' + stateId[0] + ':' + stateId[1];
                    }
                    break;
                case g.ENDPOIONT_ID_TYPE.EI_TYPE_WEB_USN:
                    //endpointIdTypeName = "WEB USN";
                    if (entity === g.ENTITY_TYPE.SERVER) {
                        key = 'c:sta:s:w:usn:' + stateId;
                    } else if (entity === g.ENTITY_TYPE.DATABASE) {
                        key = 'c:sta:d:w:usn:' + stateId;
                    }
                    break;
            }
            if(value === 0x1) {
                redisCli.del(key, (err, reply) => {
                    if(err){
                        return false;
                    }
                    //logger.debug("| " + entityName + " change " + endpointIdTypeName + " state to (IDLE)");
                    return true;
                });
            } else {
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
            }
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
