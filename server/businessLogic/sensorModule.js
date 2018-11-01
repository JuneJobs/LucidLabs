'use strict';

const redis = require("redis");
//Connect with Redis client
const redisCli = redis.createClient();
//Import gloabal values
const g = require("../config/header");

class sensorModule {
    constructor() {

    }
    getNewSensorSerialNum(userType, cb) {
        if (userType === g.USER_TYPE.SUPER || userType === g.USER_TYPE.ADMIN) {
         //get new increased ssn from redis
         redisCli.incr("c:key:ssn:system");
         redisCli.get("c:key:ssn:system", (err, reply) => {
             return cb(reply);
         });
        } else if (userType === g.USER_TYPE.USER) {
            //check the last ssn
            redisCli.get("c:key:ssn:user", (err, reply) => {
                if (reply === null) {
                    //last 12bit for the custom 
                    redisCli.set("c:key:ssn:user", 2147479552);
                    redisCli.get("c:key:ssn:user", (err, reply) => {
                        return cb(reply);
                    });
                } else {
                    redisCli.get("c:key:ssn:user", (err, reply) => {
                        return cb(reply);
                    });
                }
            });
            //get new increased ssn from redis
        }
    }
    searchSensor(searchSet, cb){
        redisCli.sinter(searchSet, (err, arrSsn) => {
            //get ssns include in search option sets.
            var arrCommand =[];
            for (let index = 0; index < arrSsn.length; index++) {
                arrCommand.push(["keys", 's:info:' + arrSsn[index] + ':*']);
            }
            //get all keys for the ssns
            redisCli.multi(arrCommand).exec((err, replies) => {
                console.log(replies);
                var searchKes = [];
                for (let index = 0; index < replies.length; index++) {
                    searchKes.push(['mget',replies[index]]);
                }
                //get values by keys
                redisCli.multi(searchKes).exec(function(err, values) {
                    var result = [];
                    for (let rowIndex = 0; rowIndex < values.length; rowIndex++) {
                        var row = {};
                        //make row
                        var ssn = replies[rowIndex][0].split(":")[2];
                        for (let itemIndex = 0; itemIndex < replies[rowIndex].length; itemIndex++) {
                            row[replies[rowIndex][itemIndex].split("s:info:" + ssn + ":")[1]] = values[rowIndex][itemIndex];
                        }
                        //insert row to result obj
                        result.push(row);
                    }
                    cb(result);
                });
            });
        });
    }
    getNewConnId(cidType, cb) {
        if (cidType === g.CID_TYPE.SENSOR) {
            redisCli.incr("c:key:cid:sensor");
            redisCli.get("c:key:cid:sensor", (err, reply) => {
                return cb(reply);
            });
        } else if (cidType === g.CID_TYPE.APP) {
            redisCli.incr("c:key:cid:app");
            redisCli.get("c:key:cid:app", (err, reply) => {
                return cb(reply);
            });

        }
    }
    confirmStationalGps(ssn, lat, lng, cb){
        if (typeof ssn === 'undefined' || typeof lat === 'undefined' || typeof lng === 'undefined') {
            cb(false);
        } else {
            var keyHead = 's:info:' + ssn + ':';
            redisCli.mget([keyHead + 'lat', keyHead + 'lng'], (err, geo) => {
                if(lat === geo[0] && lng === geo[0]) {
                    cb(true);
                } else {
                    cb(false);
                }
            });
        }
    }
    /*
     * 1.~ init
     * 1.1.~ parse tuple
     * 1.1.1.~ if ts[1]
     * 1.1.1.1.~ lastTs = ts[1]
     * 1.1.1.2.~ arrSuccessTs.push(ts[1])
     * 1.1.1.3.~ arrSuccessfulRcvdData.push(ts[1].data)
     * 1.1.1.4.~ expTs = ts[1] + length * tts
     * 1.1.2.~ else if ts[n]
     * 1.1.2.1.~ if ts[n] >= ts[n-1] + tts && ts[n] < ts[n-1] + 2*tts
     * 1.1.2.1.1.~ arrSuccessTs.push(ts[n])
     * 1.1.2.1.2.~ lastTs = ts[n]
     * 1.1.2.1.3.~ arrSuccessfulRcvdData.push(ts[n].data)
     * 1.1.2.2.~ else
     * 1.1.2.2.1.~ arrSuccessTs.push(ts[n])
     * 1.1.2.2.2.~ conSuccesfulRcpt = 0
     * 1.1.2.2.3.~ arrSuccessfulRcvdData.push(ts[n])
     * 1.1.2.2.4.~ retranReqFlg = 1
     * 1.1.2.2.5.~ conRetransReq = 0
     * 1.1.2.2.6.~ cntOfSkippedTs = (ts[n] - ts[n - 1]) / tts 
     * 1.1.2.2.7.~ for (var i = 1 ; i <= cntOfSkippedTs; i ++)
     * 1.1.2.2.7.1.~ lastTs = lastTs + tts * i 
     * 1.1.2.2.7.2.~ arrUnsucessTs.push(lastTs)
     * 1.2.~ Check lastTs
     * 1.2.1.~ If expTs === lastTs
     * 1.2.1.1.~ done.
     * 1.2.2.~ Else if expTs !== lastTs
     * 1.2.2.1.~ If ConRetransReq === 0
     * 1.2.2.1.1.~ arrUnsuccessTs.push(expTs)
     * 1.2.2.1.2.~ If arrUnsuccessTs.length === 1
     * 1.2.2.1.2.1.~ arrUnsuccessTs.push(lastTs + tts)
     * 1.2.2.2.~ If ConRetransReq === 1
     * 1.2.2.2.1.~ cntOfSkieepedTs = expTs - lastTs
     * 1.2.2.2.2.~ for (var i = 1 ; i <= cntOfSkippedTs; i ++)
     * 1.2.2.2.2.1.~ lastTs = lastTs + tts * i 
     * 1.2.2.2.2.2.~ arrUnsucessTs.push(lastTs)
     * 1.2.2.2.3.~ done.
     */
    unpackTrnPayload(entityType, payload, mti) {
        // 1.~
        var arrSuccessfulTs = [];
        var arrUnsuccessfulTs = [];
        var successfulRcptFlg = 0;
        var retransReqFlg = 0;
        var continuityOfSuccessfulRcpt = 1;
        var continuityOfRetransReq = 1;
        var numOfSuccessfulRcpt = 1;
        var numOfRetransReq = 0;
        var arrSuccessfulRcvdData = [];
        var expTs = 0;
        var lastTs = 0;
        var tuples = [];
        var count = 0;
        var dataLen = 0;
        if (entityType == g.ENTITY_TYPE.SENSOR) {
            tuples = payload.airQualityDataListEncodings.airQualityDataTuples;
            count = payload.airQualityDataListEncodings.airQualityDataTuples.length;
            expTs = tuples[0][0] + (payload.airQualityDataListEncodings.dataTupleLen - 1) * mti;
            dataLen = payload.airQualityDataListEncodings.dataTupleLen;
        } else {
            tuples = payload.heartRelatedDataListEncodings.heartRelatedDataTuples;
            count = payload.heartRelatedDataListEncodings.heartRelatedDataTuples.length;
            expTs = tuples[0][0] + (payload.heartRelatedDataListEncodings.dataTupleLen - 1) * mti;
            dataLen = payload.heartRelatedDataListEncodings.dataTupleLen;
        }
        // 1.1.~
        if (count !== 0) successfulRcptFlg = 1;
        // 1.1.1. & 1.1.1.1.~
        lastTs = tuples[0][0];
        // 1.1.1.2.~
        arrSuccessfulTs.push(lastTs);
        // 1.1.1.3.~s
        arrSuccessfulRcvdData.push(tuples[0]);
        // 1.1.1.4

        for (var index = 1; index < count; index++) {
            // 1.1.2.~ 1.1.2.1.~
            if (tuples[index][0] >= tuples[index - 1][0] + mti && tuples[index][0] < tuples[index - 1][0] + (2 * mti)) {
                // 1.1.2.1.1.~
                arrSuccessfulTs.push(tuples[index][0]);
                numOfSuccessfulRcpt++;
                // 1.1.2.1.2.~
                lastTs = tuples[index][0];
                // 1.1.2.1.3.~
                arrSuccessfulRcvdData.push(tuples[index]);
                // 1.1.2.2.~
            } else {
                // 1.1.2.2.1.~
                arrSuccessfulTs.push(tuples[index][0]);
                numOfSuccessfulRcpt++;
                lastTs = tuples[index][0];
                // 1.1.2.2.2.~
                continuityOfSuccessfulRcpt = 0;
                // 1.1.2.2.3.~
                arrSuccessfulRcvdData.push(tuples[index]);
                // 1.1.2.2.4.~
                retransReqFlg = 1;
                // 1.1.2.2.5.~
                continuityOfRetransReq = 0;
                // 1.1.2.2.6.~
                var cntOfSkippedTs = ((tuples[index][0] - tuples[index - 1][0]) / mti) - 1;
                // 1.1.2.2.7.~
                for (var sindex = 1; sindex <= cntOfSkippedTs; sindex++) {
                    // 1.1.2.2.7.1.~
                    var rcvdlastTs = tuples[index - 1][0] + mti * sindex;
                    // 1.1.2.2.7.2.~
                    arrUnsuccessfulTs.push(rcvdlastTs);
                }
            }
        }
        // 1.2. & 1.2.1.~
        if (lastTs === expTs) {
            // 1.2.2.~
        } else {
            // 1.2.2.1.~
            if (continuityOfRetransReq === 1) {
                retransReqFlg = 1;
                // 1.2.2.1.1.
                arrUnsuccessfulTs.push(expTs);
                if (arrUnsuccessfulTs.length === 1) {
                    arrUnsuccessfulTs.unshift(lastTs + mti);
                }
                if (arrSuccessfulTs.length === 1) {
                    arrSuccessfulTs.push(lastTs);
                }
                // 1.2.2.2.~
            } else if (continuityOfRetransReq === 0) {
                var cntOfSkippedTs = (expTs - lastTs) / mti;
                for (var sindex = 1; sindex <= cntOfSkippedTs; sindex++) {
                    lastTs = lastTs + mti;
                    arrUnsuccessfulTs.push(lastTs);
                }
            }

        }
        if (continuityOfSuccessfulRcpt === 1) {
            var arrFirstLastTs = [];
            arrFirstLastTs.push(arrSuccessfulTs.shift());
            arrFirstLastTs.push(arrSuccessfulTs.pop());
            arrSuccessfulTs = arrFirstLastTs;
        }
        var objResult = {
            success: {
                successfulRcptFlg: successfulRcptFlg,
                continuityOfSuccessfulRcpt: continuityOfSuccessfulRcpt,
                arrSuccessfulTs: arrSuccessfulTs,
                arrSuccessfulRcvdData: arrSuccessfulRcvdData,
                numOfSuccessfulRcpt: numOfSuccessfulRcpt
            },
            fail: {
                retranReqFlg: retransReqFlg,
                continuityOfRetransReq: continuityOfRetransReq,
                arrUnsuccessfulTs: arrUnsuccessfulTs,
                numOfRetransReq: dataLen - numOfSuccessfulRcpt
            }
        }
        return objResult;

    }
}
module.exports = sensorModule;