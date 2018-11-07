//Connect with Redis client
const redis = require("redis"),
      redisCli = redis.createClient();




class historicalAirDataModule {
    constructor(cid) {
        this.cid = cid;
        this.air_data_set = [];
        this.geo_data_set = [];
    }
    _getSensorType(ssn, cb) {
        redisCli.get(`s:info:${ssn}:mobf`, (err, mobf) => {
            if (err) {} else {
                cb(ssn, mobf);
            }
        })
    }
    _getLastGeoData(sensorType, nation, state, city, ssn, cb) {
        //ZREVRANGEBYSCORE myset +inf -inf WITHSCORES LIMIT 0 1
        redisCli.zrevrangebyscore(`d:air:${sensorType}:geo:${nation}:${state}:${city}:${ssn}`, '+inf', '-inf', 'WITHSCORES', 'LIMIT', 0, 1, (err, geo) => {
            if (err) {} else {
                if (geo === null) {
                    cb(false)
                } else {
                    cb(geo)
                }
            }
        })
    }
    _categorizeData(rawDataSet) {
        let uniqueGeoByTs = [[
                rawDataSet[0][0], 
                rawDataSet[0][1],
                rawDataSet[0][2], 
                rawDataSet[0][3], 
                rawDataSet[0][4]
            ]],
            airDataSet = [[
                rawDataSet[0][0],   //ts
                rawDataSet[0][2], 
                rawDataSet[0][3], 
                rawDataSet[0][4],
                rawDataSet[0][5],   //temp
                rawDataSet[0][6],   //CO
                rawDataSet[0][7],   //O3
                rawDataSet[0][8],   //NO2
                rawDataSet[0][9],   //SO2
                rawDataSet[0][10],  //PM2.5
                rawDataSet[0][11],  //PM10
                rawDataSet[0][12],  //CO AQI
                rawDataSet[0][13],  //O3 AQI
                rawDataSet[0][14],  //NO2 AQI
                rawDataSet[0][15],  //SO2 AQI
                rawDataSet[0][16],  //PM2.5 AQI
                rawDataSet[0][17]   //PM10 AQI
            ]];
        for (let i = 1, x = rawDataSet.length; i < x; i++) {
            if(uniqueGeoByTs[uniqueGeoByTs.length-1][1] !== rawDataSet[i][1]){
                uniqueGeoByTs.push([
                    [rawDataSet[i][0], rawDataSet[i][1], rawDataSet[i][2], rawDataSet[i][3], rawDataSet[i][4]]
                ]);
            }
            airDataSet.push([
                rawDataSet[i][0], rawDataSet[i][2], rawDataSet[i][3], rawDataSet[i][4], rawDataSet[i][5], rawDataSet[i][6], rawDataSet[i][7], rawDataSet[i][8], rawDataSet[i][9], rawDataSet[i][10], rawDataSet[i][11], rawDataSet[i][12], rawDataSet[i][13], rawDataSet[i][14], rawDataSet[i][15], rawDataSet[i][16], rawDataSet[i][17]
            ])
        }
        this.geo_data_set = uniqueGeoByTs;
        this.air_data_set = airDataSet;
    }
    _storeGeoData(ssn, sensorType) {
        let commandList = [],
            geo_data_set = this.geo_data_set;
        for (let i = 0, x = this.geo_data_set.length; i < x; i++) {
            commandList.push([
                'zadd', `d:air:${sensorType}:geo:${geo_data_set[i][2]}:${geo_data_set[i][3]}:${geo_data_set[i][4]}:${ssn}`, 
                 geo_data_set[i][0], 
                 geo_data_set[i][1]
            ])
        }
        redisCli.multi(commandList).exec((err, replies) => {
           
        });

    }
    _storeAirData(ssn, sensorType) {
        let commandList = [],
            air_data_set = this.air_data_set;
        for (let i = 0, x = this.air_data_set.length; i < x; i++) {
            commandList.push([
                'zadd', 
                `d:air:${sensorType}:raw:${air_data_set[i][1]}:${air_data_set[i][2]}:${air_data_set[i][3]}:${ssn}`,
                air_data_set[i][0],
                `${air_data_set[i][4]},${air_data_set[i][5]},${air_data_set[i][6]},${air_data_set[i][7]},${air_data_set[i][8]},${air_data_set[i][9]},${air_data_set[i][10]},${air_data_set[i][11]},${air_data_set[i][12]},${air_data_set[i][13]},${air_data_set[i][14]},${air_data_set[i][15]},${air_data_set[i][16]},${air_data_set[i][17]},`
            ])
        }
        redisCli.multi(commandList).exec((err, replies) => {

        });
    }
    storeData(ssn, rcvdDataSet, cb) {
        this._categorizeData(rcvdDataSet);

        this._getSensorType(ssn, (mobf) => {
            
            let sensorType = ''
            if(mobf === "0") { 
                sensorType = 'p'
            } else if (mobf === "1") {
                sensorType = 's'
            }
            let firstData = this.geo_data_set[0];
            this._getLastGeoData(sensorType, firstData[2], firstData[3], firstData[4], ssn, (geo) => {
                if(geo) {
                    if(geo === this.geo_data_set[1]) {
                        this.geo_data_set.pop();
                    }
                }
                this._storeGeoData(ssn, sensorType);
                this._storeAirData(ssn, sensorType);
                cb(true);
            });
        })

    }
}

module.exports = historicalAirDataModule;

// let test = new historicalAirDataModule(51);
// let dataSet = [
//     [1541542329, "32.88247,-117.23484", "Q30", "Q99", "Q16552", 25, 9.31, 76.57, 32.21, 41.68, 93.67, 53.32, 255, 167, 90, 200, 82, 156],
//     [1541542330, "32.88247,-117.23484", "Q30", "Q99", "Q16552", 21, 36.78, 62.55, 45.87, 22.11, 75.47, 16.16, 330, 194, 64, 1, 248, 96],
//     [1541542331, "32.88247,-117.23484", "Q30", "Q99", "Q16552", 24, 8.03, 33.96, 52.63, 82.27, 68.22, 83.33, 404, 461, 451, 150, 151, 89],
//     [1541542332, "32.88247,-117.23484", "Q30", "Q99", "Q16552", 29, 1.47, 82.5, 5.26, 7.56, 63.43, 92.07, 389, 263, 161, 260, 58, 185],
//     [1541542333, "32.88247,-117.23484", "Q30", "Q99", "Q16552", 28, 47.71, 46.83, 77.58, 79.74, 51.8, 55.57, 268, 170, 399, 397, 98, 404],
//     [1541542334, "32.88247,-117.23484", "Q30", "Q99", "Q16552", 23, 29.36, 72.94, 55.52, 49.61, 82.99, 87.74, 436, 346, 495, 283, 43, 320],
//     [1541542335, "32.88247,-117.23484", "Q30", "Q99", "Q16552", 27, 8.5, 25.22, 58.27, 96.36, 35.95, 85.33, 208, 489, 243, 371, 198, 406],
//     [1541542336, "32.88247,-117.23484", "Q30", "Q99", "Q16552", 25, 41.42, 65.73, 17.83, 83.99, 91.42, 34.65, 232, 214, 354, 394, 449, 378],
//     [1541542337, "32.88247,-117.23484", "Q30", "Q99", "Q16552", 25, 27.78, 20.11, 57.03, 50.26, 70.74, 49.98, 20, 126, 90, 16, 88, 26],
//     [1541542338, "32.88247,-117.23484", "Q30", "Q99", "Q16552", 22, 47.02, 83.44, 89.66, 86.74, 35.44, 82.62, 144, 187, 270, 134, 255, 433]
// ];

// test.storeData(dataSet);

/*
    저장되어야 하는 포맷
    d:air:p:geo:Q30:Q99:Q16552:1    154164274   "32.88247,-117.23484"
                                    154164284   "32.88246,-117.23484"
                                    154164384   "32.88246,-117.23486"

    d:air:p:air:Q30:Q99:Q16552:1    154164274   25, 9.31, 76.57, 32.21, 41.68, 93.67, 53.32, 255, 167, 90, 200, 82, 156
                                    154164284   25, 9.31, 76.57, 32.21, 41.68, 93.67, 53.32, 255, 167, 90, 200, 82, 156
                                    154164294   25, 9.31, 76.57, 32.21, 41.68, 93.67, 53.32, 255, 167, 90, 200, 82, 156
                                    154164304   25, 9.31, 76.57, 32.21, 41.68, 93.67, 53.32, 255, 167, 90, 200, 82, 156

*/