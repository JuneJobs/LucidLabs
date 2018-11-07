//Connect with Redis client
const redis = require("redis"),
      redisCli = redis.createClient();

class searchHistoricalDataModule {
    constructor() {

    }
    searchHistoricalAirData(nation, state, city, sTs, eTs, cb) {
        let keyHead = `d:air:s:geo:${nation}:${state}:${city}:*`;
        this._getKeys(keyHead, (keys) => {
            if (keys.length === 0) {
                cb(false);
            }
            let commandList = this._makeSearchHisticalAirDataCommand(keys, nation, state, city, sTs, eTs);
            this._executeCommandList(commandList, (dataOfSensors) => {
                this._interporationGeoList(keys, dataOfSensors, (result) => {
                    if (result) {
                        cb(dataOfSensors);
                    } else {
                        cb([]);
                    }
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
    _makeSearchHisticalAirDataCommand(keys, nation, state, city, sTs, eTs) {
        let commandList = [];
        for (let i = 0, x = keys.length; i < x; i++) {
            let key = keys[i].split(':')[7],
                geoString = `:${nation}:${state}:${city}`;

            commandList.push(
                ['get', 's:info:' + key + ':wmac'],
                ['zrangebyscore', `d:air:s:geo${geoString}:${key}`, sTs, eTs],
                ['zrangebyscore', `d:air:s:raw${geoString}:${key}`, sTs, eTs])
        }
        return commandList;
    }
    _executeCommandList(commandList, cb) {
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
    _interporationGeoList(keys, dataOfSensors, cb) {
        //1. GPS값 보정
        let differentialSensorIdxs = []; //현재 가지고 있는센서의 인덱스, 센서시리얼넘버, 현재 가지고있는 센서의 첫번째 타임스탬프
        dataOfSensors =  dataOfSensors.filter(((object) => {
            return object.dataList.length !== 0
        }))
        dataOfSensors.forEach((dataOfSensor, idx) => {
            if(dataOfSensor.dataList.length !== 0) {
                //TS 셋팅
                let firstTsOfData = dataOfSensor.dataList[0].split(',')[0];
                //검색한 기간에 GPS정보가 존재하는 경우
                if (dataOfSensor.geoList.length > 0) {
                    let firstTsOfGeo = dataOfSensor.geoList[0].split(',')[0];
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
            } else {
                
            }
        });
        if(dataOfSensors.length > 0) {
            //2. 빈 GPS값 가져오기
            let commandList = []; //
            for (let i = 0, x = differentialSensorIdxs.length; i < x; i++) {
                commandList.push(
                    ['zrevrangebyscore', keys[i], differentialSensorIdxs[i][2] - 1, 0, 'LIMIT', 0, 1]
                );
            }
            redisCli.multi(commandList).exec((err, differentialSensorGeos) => {
                differentialSensorGeos.forEach((differentialSensorGeo, idx) => {
                    let latestSensorGeo = differentialSensorGeo[0].split(',');
                    latestSensorGeo.shift();
                    latestSensorGeo.unshift(differentialSensorIdxs[idx][2].toString());
                    latestSensorGeo = latestSensorGeo.toString();
                    dataOfSensors[differentialSensorIdxs[idx][0]].geoList.unshift(latestSensorGeo);
                });
                cb(true);
            });
        } else {
            cb(false);
        }
        
    }
}
module.exports = searchHistoricalDataModule;
