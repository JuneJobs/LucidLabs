'use strict';

const redis = require("redis");
//Connect with Redis client
const redisCli = redis.createClient();
//Import gloabal values
const g = require("../config/header");

class sensorModule {
    constructor() {

    }
    getNewSensorSerialNum(cb){
        //get new increased ssn from redis
        redisCli.incr("c:key:ssn");
        redisCli.get("c:key:ssn", (err, reply) => {
            return cb(reply);
        });
    }
    getNewSensorSerialNum(cb) {
        //check the last ssn
        //get new increased ssn from redis
        redisCli.incr("c:key:ssn");
        redisCli.get("c:key:ssn", (err, reply) => {
            return cb(reply);
        });
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
}
module.exports = sensorModule;