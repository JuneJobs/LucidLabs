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
        //get new increased usn from redis
        redisCli.incr("c:key:ssn");
        redisCli.get("c:key:ssn", (err, reply) => {
            return cb(reply);
        });
    }
}
module.exports = sensorModule;