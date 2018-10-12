var keyHead = 'd:data:air:geo:*:Q1:Q2:Q3';
var sTs = 3;
var eTs = 5;
redisCli.keys(keyHead, (err, keys) => {
    if (err) {} else {
        console.log(keys);
        // for (let index = 0; index < array.length; index++) {
        //     const element = array[index];

        // }
        //redisCli.zrangebyscore('d:data:air:geo:'+'keys' )

        //데이터를 호출하는 스크립트를 만들어야 함
        //각각의 키별 데이터 리턴값 객체
        var makeObject = function () {

        };
        let commandList = [];
        for (let i = 0, x = keys.length; i < x; i++) {
            key = keys[i].split(':')[4];
            commandList.push(
                ['get', 's:info:' + key + ':wmac'],
                ['zrangebyscore', 'd:data:air:geo:' + key + ':Q1:Q2:Q3', sTs, eTs],
                ['zrangebyscore', 'd:data:air:raw:' + key + ':Q1:Q2:Q3', sTs, eTs],
                ['zrangebyscore', 'd:data:air:aqi:' + key + ':Q1:Q2:Q3', sTs, eTs])

        }
        redisCli.multi(commandList).exec((err, replies) => {
            let dataOfSensors = [];
            for (let i = 0, x = replies.length / 4; i < x; i++) {
                dataOfSensors.push({
                    wmac: replies[i * 4],
                    geoList: replies[i * 4 + 1],
                    rawList: replies[i * 4 + 2],
                    aqiList: replies[i * 4 + 3]
                });

            }
            console.log(dataOfSensors);


            //검색할 때 필요한 정보
            //센서번호 
            //1. GPS값 보정
            var differentialSensorIdxs = []; //현재 가지고 있는센서의 인덱스, 센서시리얼넘버, 현재 가지고있는 센서의 첫번째 타임스탬프
            dataOfSensors.forEach((dataOfSensor, idx) => {
                //TS 셋팅
                //검색한 기간에 GPS정보가 존재하는 경우
                if (dataOfSensor.geoList.length > 0) {
                    let firstTsOfRaw = dataOfSensor.rawList[0].split(',')[0],
                        firstTsOfGeo = dataOfSensor.geoList[0].split(',')[0];
                    //첫번째 GPS가 첫번째 TS와 맞아 떨어지는 경우
                    //skip
                    //첫번째 GPS가 첫번째 TS와 맞아 떨어지지 않는 경우
                    if (firstTsOfRaw !== firstTsOfGeo) {
                        //리스트에 타임스탬프 받음
                        differentialSensorIdxs.push([idx, keys[idx].split(':')[4], Number(firstTsOfRaw)]);
                    }
                } else {
                    console.log('');
                }
            });
            //2. 빈 GPS값 가져오기
            commandList = []; //
            for (let i = 0, x = differentialSensorIdxs.length; i < x; i++) {
                commandList.push(
                    ['zrevrangebyscore', 'd:data:air:geo:' + differentialSensorIdxs[i][1] + ':Q1:Q2:Q3', differentialSensorIdxs[i][2] - 1, 0, 'LIMIT', 0, 1]
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
                console.log(dataOfSensors);
            });
            /*
                        redisCli.zrevrangebyscore('d:data:air:geo:1:Q1:Q2:Q3', firstTsOfGeo - 1, 0, 'LIMIT', 0, 1, (err, geoData) => {
                            dataOfSensor.geoList.shift(geoData);
                        });

                        
            */
            //첫번째 GPS가 첫번째 TS와 맞아 떨어지는 경우
            //첫번째 GPS가 첫번째 TS와 맞아 떨어지지 않는 경우
            //마지막 GPS를 불러옴
            //GPS를 첫번째 TS와 매칭해줌
            //GPS가 한건 인 경우
            //
            //검색한 기간에 GPS정보가 존재하지 않는경우
            //마지막 GPS를 불러옴
            //GPS를 첫번째 TS와 매칭해줌

            /*
            var airdata = [];
            for (let i = 0, x = replies.length; i < x; i += 3) {
                replies[0][1] !==  replies[1][1] ? function() {
                    
                }()
                : 
                function(){
                    
                }();
                airTuples.push({
                    geo: replies[i],
                    raw: replies[i + 1],
                    aqi: replies[i + 2]
                })

            }
            replies[0][1] !==  replies[1][1] ? function() {
                redisCli.zrevrangebyscore('d:data:air:raw:' + key + ':Q1:Q2:Q3', 1, 0, 'WITHSCORES', 'LIMIT', 0, 1, (err, initialGeo) => {
                    replies[i].shift(initialGeo);
                    
                });
            }()
            : 
            function(){
                
            }();
            
            console.log(airTuples);
            var sTs = 1,
                eTs = 5,
                nation = 'Q1',
                state = 'Q2',
                city = 'Q3';


            */

            //시작하는 타임스템프
            //원하는 아웃풋
            var arr = [{
                wmac: 'macaddress',
                lat: 'lat',
                lng: 'lng',
                tuples: [
                    ['ts', 'temp', 'co', 'o3', 'no2', 'so2'],
                    ['ts', 'temp', 'co', 'o3', 'no2', 'so2'],
                    ['ts', 'temp', 'co', 'o3', 'no2', 'so2'],
                    ['ts', 'temp', 'co', 'o3', 'no2', 'so2'],
                    ['ts', 'temp', 'co', 'o3', 'no2', 'so2'],
                    ['ts', 'temp', 'co', 'o3', 'no2', 'so2'],
                ]
            }, {
                wmac: 'macaddress',
                lat: 'lat',
                lng: 'lng',
                tuples: [
                    ['ts', 'temp', 'co', 'o3', 'no2', 'so2'],
                    ['ts', 'temp', 'co', 'o3', 'no2', 'so2'],
                    ['ts', 'temp', 'co', 'o3', 'no2', 'so2'],
                    ['ts', 'temp', 'co', 'o3', 'no2', 'so2'],
                    ['ts', 'temp', 'co', 'o3', 'no2', 'so2'],
                    ['ts', 'temp', 'co', 'o3', 'no2', 'so2'],
                ]
            }, {
                wmac: 'macaddress',
                lat: 'lat',
                lng: 'lng',
                tuples: [
                    ['ts', 'temp', 'co', 'o3', 'no2', 'so2'],
                    ['ts', 'temp', 'co', 'o3', 'no2', 'so2'],
                    ['ts', 'temp', 'co', 'o3', 'no2', 'so2'],
                    ['ts', 'temp', 'co', 'o3', 'no2', 'so2'],
                    ['ts', 'temp', 'co', 'o3', 'no2', 'so2'],
                    ['ts', 'temp', 'co', 'o3', 'no2', 'so2'],
                ]
            }]
        });
    }
});