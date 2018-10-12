//Connect with Redis client
const redis = require("redis"),
      redisCli = redis.createClient();
//ex nat: Q1, state: Q2, City: Q3

/**
 * 
 * zadd d:data:air:raw:1:Q1:Q2:Q3 1 11,22,33,44,55,66,77,88,99:1
 * zadd d:data:air:aqi:1:Q1:Q2:Q3 5 aa,bb,cc,dd,ee,ff,gg,hh,ii:5
 * zadd d:data:air:raw:
 * revrangebyscore d:data:air:raw:1:Q1:Q2:Q3 5 1 WITHSCORES LIMIT 0 1
 */

//test sensor 1, 2, 3
class searchHistoricalDataModule {
    constructor() {

    }
    searchHistoricalAirData(nation, state, city, sTs, eTs, cb) {
        let keyHead = 'd:data:air:geo:*' + ':' + nation + ':' + state + ':' + city;
        this._getKeys(keyHead, (keys) => {
            if(keys.length === 0){
                cb(false);
            }
            let commandList = this._makeSearchHisticalAirDataCommand(keys, nation, state, city, sTs, eTs);
            this._executeAirCommandList(commandList, (dataOfSensors)=> {
                this._interporationAirGeoList(keys, dataOfSensors, nation, state, city, (result) => {
                    cb(dataOfSensors);
                });
            });
        });
    }
    _executeAirCommandList(commandList, cb) {
        redisCli.multi(commandList).exec((err, replies) => {
            let dataOfSensors = [];
            for (let i = 0, x = replies.length / 3; i < x; i++) {
                dataOfSensors.push({
                    wmac: replies[i * 3],
                    geoList: replies[i * 3 + 1],
                    dataList: replies[i * 3 + 2]
                });
            }
            cb(dataOfSensors);
        });
    }
    _makeSearchHisticalAirDataCommand(keys, nation, state, city, sTs, eTs) {
        let commandList = [];
        for (let i = 0, x = keys.length; i < x; i++) {
            let key = keys[i].split(':')[4],
                geoString = ':' + nation + ':' + state + ':' + city;

            commandList.push(
                ['get', 's:info:' + key + ':wmac'],
                ['zrangebyscore', 'd:data:air:geo:' + key + geoString, sTs, eTs],
                ['zrangebyscore', 'd:data:air:data:' + key + geoString, sTs, eTs])
        }
        return commandList;
    }
    _interporationAirGeoList(keys, dataOfSensors, nation, state, city, cb) {
        //1. GPS값 보정
        var differentialSensorIdxs = []; //현재 가지고 있는센서의 인덱스, 센서시리얼넘버, 현재 가지고있는 센서의 첫번째 타임스탬프
        dataOfSensors.forEach((dataOfSensor, idx) => {
            //TS 셋팅
            //검색한 기간에 GPS정보가 존재하는 경우
            if (dataOfSensor.geoList.length > 0) {
                let firstTsOfData = dataOfSensor.dataList[0].split(',')[0],
                    firstTsOfGeo = dataOfSensor.geoList[0].split(',')[0];
                //첫번째 GPS가 첫번째 TS와 맞아 떨어지는 경우
                //skip
                //첫번째 GPS가 첫번째 TS와 맞아 떨어지지 않는 경우
                if (firstTsOfData !== firstTsOfGeo) {
                    //리스트에 타임스탬프 받음
                    differentialSensorIdxs.push([idx, keys[idx].split(':')[4], Number(firstTsOfData)]);
                }
            } else {
                differentialSensorIdxs.push([idx, keys[idx].split(':')[4], Number(firstTsOfData)]);
            }
        });
        //2. 빈 GPS값 가져오기
        let commandList = []; //
        for (let i = 0, x = differentialSensorIdxs.length; i < x; i++) {
            commandList.push(
                ['zrevrangebyscore', 'd:data:air:geo:' + differentialSensorIdxs[i][1] + ':' + nation + ':' + state + ':' + city, differentialSensorIdxs[i][2] - 1, 0, 'LIMIT', 0, 1]
            );
        }
        redisCli.multi(commandList).exec((err, differentialSensorGeos) => {
            differentialSensorGeos.forEach((differentialSensorGeo, idx) => {
                let latestSensorGeo = differentialSensorGeo[0].split(',');
                latestSensorGeo.shift();
                latestSensorGeo.unshift(differentialSensorIdxs[idx][2].toString());
                latestSensorGeo = latestSensorGeo.toString();
                dataOfSensors[differentialSensorIdxs[idx][0]].geoList.unshift(latestSensorGeo);
                cb(true);
            });
        });
    }
    searchHistoricalHeartData(usn, nation, state, city, sTs, eTs, cb) {
        let keyHead = 'd:data:heart:geo:' + usn + ':' + nation + ':' + state + ':' + city;
        this._getKeys(keyHead, (keys) => {
            if (keys.length === 0) {
                cb(false);
            }
            let commandList = this._makeSearchHisticalHeartDataCommand(keys, nation, state, city, sTs, eTs);
            this._executeHeartCommandList(commandList, (dataOfSensors) => {
                this._interporationGeoList(keys, dataOfSensors, nation, state, city, (result) => {
                    cb(dataOfSensors);
                });
            });
        });
    }
    _getKeys(keyHead, cb) {
         redisCli.keys(keyHead, (err, keys) => {
            if (err) {} else {
                cb(keys);
            }
        });
    }
    _executeHeartCommandList(commandList, cb) {
        redisCli.multi(commandList).exec((err, replies) => {
            let dataOfSensors = [];
            for (let i = 0, x = replies.length / 2; i < x; i++) {
                dataOfSensors.push({
                    geoList: replies[i * 2],
                    dataList: replies[i * 2 + 1]
                });
            }
            cb(dataOfSensors);
        });
    }
    _makeSearchHisticalHeartDataCommand(keys, nation, state, city, sTs, eTs) {
        let commandList = [];
        for (let i = 0, x = keys.length; i < x; i++) {
            let key = keys[i].split(':')[4],
                geoString = ':' + nation + ':' + state + ':' + city;

            commandList.push(
                ['zrangebyscore', 'd:data:heart:geo:' + key + geoString, sTs, eTs],
                ['zrangebyscore', 'd:data:heart:data:' + key + geoString, sTs, eTs])
        }
        return commandList;
    }
    _interporationHeartGeoList(keys, dataOfUsers, nation, state, city, cb) {
        //1. GPS값 보정
        var differentialUserIdxs = []; //현재 가지고 있는센서의 인덱스, 센서시리얼넘버, 현재 가지고있는 센서의 첫번째 타임스탬프
        dataOfUsers.forEach((dataOfUser, idx) => {
            //TS 셋팅
            //검색한 기간에 GPS정보가 존재하는 경우
            if (dataOfUser.geoList.length > 0) {
                let firstTsOfData = dataOfUser.dataList[0].split(',')[0],
                    firstTsOfGeo = dataOfUser.geoList[0].split(',')[0];
                //첫번째 GPS가 첫번째 TS와 맞아 떨어지는 경우
                //skip
                //첫번째 GPS가 첫번째 TS와 맞아 떨어지지 않는 경우
                if (firstTsOfData !== firstTsOfGeo) {
                    //리스트에 타임스탬프 받음
                    differentialUserIdxs.push([idx, keys[idx].split(':')[4], Number(firstTsOfData)]);
                }
            } else {
                differentialUserIdxs.push([idx, keys[idx].split(':')[4], Number(firstTsOfData)]);
            }
        });
        //2. 빈 GPS값 가져오기
        let commandList = []; //
        for (let i = 0, x = differentialUserIdxs.length; i < x; i++) {
            commandList.push(
                ['zrevrangebyscore', 'd:data:heart:geo:' + differentialUserIdxs[i][1] + ':' + nation + ':' + state + ':' + city, differentialUserIdxs[i][2] - 1, 0, 'LIMIT', 0, 1]
            );
        }
        redisCli.multi(commandList).exec((err, differentialUserGeos) => {
            differentialUserGeos.forEach((differentialUserGeo, idx) => {
                let latestUserGeo = differentialUserGeo[0].split(',');
                latestUserGeo.shift();
                latestUserGeo.unshift(differentialUserIdxs[idx][2].toString());
                latestUserGeo = latestUserGeo.toString();
                dataOfUsers[differentialUserIdxs[idx][0]].geoList.unshift(latestUserGeo);
                cb(true);
            });
        });
    }
}
module.exports = searchHistoricalDataModule;