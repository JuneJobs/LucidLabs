'use strict'
/**
 * arrSuccessTs = []
 * arrUnsucessTs = []
 * conSuccessfulRcpt = 1
 * conRetransReq = 1
 * numOfSuccessfulRcpt = 0
 * numOfUnsuccessfulReq = 0
 * arrSuccessfulRcvdData = []
 * retransReqFlg = 0
 * expTs = 0
 * lastTs = 0
 * tts = 5 //transfer time interval
 * 
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

function unpackRadTrn(payload, tts){
    // 1.~
    var arrSuccessfulTs = [];
    var arrUnsuccessfulTs = [];
    var continuityOfSuccessfulRcpt = 1;
    var continuityOfRetransReq = 1;
    var numOfSuccessfulRcpt = 0;
    var numOfUnsuccessfulReq = 0;
    var arrSuccessfulRcvdData = [];
    var retransReqFlg = 0;
    var expTs = 0;
    var lastTs = 0;

    var tuples = payload.tuples;
    // 1.1.~
    var count = payload.tuples.length;
    // 1.1.1. & 1.1.1.1.~
    lastTs = tuples[0].ts;
    // 1.1.1.2.~
    arrSuccessfulTs.push(lastTs);
    // 1.1.1.3.~s
    arrSuccessfulRcvdData.push(tuples[0]);
    // 1.1.1.4
    expTs = tuples[0].ts + (payload.tupleSize -1) * tts;

    for (var index = 1; index < count; index++) {
        // 1.1.2.~ 1.1.2.1.~
        if(tuples[index].ts >= tuples[index-1].ts + tts && tuples[index].ts < tuples[index -1].ts + (2*tts)) {
            // 1.1.2.1.1.~
            arrSuccessfulTs.push(tuples[index].ts);
            // 1.1.2.1.2.~
            lastTs = tuples[index].ts;
            // 1.1.2.1.3.~
            arrSuccessfulRcvdData.push(tuples[index]);
        // 1.1.2.2.~
        } else {
            // 1.1.2.2.1.~
            arrSuccessfulTs.push(tuples[index].ts);
            lastTs = tuples[index].ts;
            // 1.1.2.2.2.~
            continuityOfSuccessfulRcpt = 0;
            // 1.1.2.2.3.~
            arrSuccessfulRcvdData.push(tuples[index]);
            // 1.1.2.2.4.~
            retransReqFlg = 1;
            // 1.1.2.2.5.~
            continuityOfRetransReq = 0;
            // 1.1.2.2.6.~
            var cntOfSkippedTs = ((tuples[index].ts - tuples[index - 1].ts) / tts) - 1;
            // 1.1.2.2.7.~
            for (var sindex = 1; sindex <= cntOfSkippedTs; sindex++) {
                // 1.1.2.2.7.1.~
                var rcvdlastTs = tuples[index - 1].ts + tts * sindex;
                // 1.1.2.2.7.2.~
                arrUnsuccessfulTs.push(rcvdlastTs);
            }
        }
    }
    // 1.2. & 1.2.1.~
    if (lastTs === expTs) {
        return [arrSuccessfulTs, arrUnsuccessfulTs];
    // 1.2.2.~
    } else {
        // 1.2.2.1.~
        if(continuityOfRetransReq === 1){
            // 1.2.2.1.1.
            arrUnsuccessfulTs.push(expTs);
            if(arrUnsuccessfulTs.length === 1){
                arrUnsuccessfulTs.unshift(lastTs + tts);
            }
            if(arrSuccessfulTs.length === 1) {
                arrSuccessfulTs.push(lastTs);
            }
        // 1.2.2.2.~
        } else if (continuityOfRetransReq === 0) {
            var cntOfSkieepedTs = (expTs - lastTs) / tts;
            for (var sindex = 1; sindex <= cntOfSkieepedTs; sindex++) {
                lastTs = lastTs + tts;
                arrUnsuccessfulTs.push(lastTs);
            }
        }
        return [arrSuccessfulTs, arrUnsuccessfulTs];
    }
    
 }
 var tts = 1;
 var payload = {
     tupleSize: 15,
     tuples: [{
         ts: 1
     }, {
         ts: 8
     }, {
         ts: 9
     }, {
         ts: 10
     }, {
         ts: 11
     }]
 }
 var result = unpackRadTrn(payload, tts);
 console.log(result)