'use strict';

const redis = require("redis");
//Connect with Redis client
const redisCli = redis.createClient();
//Import gloabal values
const g = require("../config/header");

class userModule {
    constructor() {

    }
    async getNewUserSeqNum(cb) {
        //get new increased usn from redis
        redisCli.incr("c:key:usn");
        redisCli.get("c:key:usn", (err, reply) => {
            return cb(reply);
        });
    }
    getNewNumOfSignedInCompls(entity, usn, cb) {
        var entityType = '';
        if(entity === g.ENTITY_TYPE.APPCLIENT) {
            entityType = 'a';
        } else if (entity === g.ENTITY_TYPE.WEBCLIENT) {
            entityType = 'w';
        }
        //get Number of signed in complitions from the redis buffer
        redisCli.get("c:act:s:" + entityType+ ":" + usn + ":nsc", (err, reply) => {
            //if buffer already have nsc
            if (err) {} else {
                if (reply === null){
                    //nsc don't need to set 1 an initial value
                    redisCli.set("c:act:s:" + entityType + ":" + usn + ":nsc", "1", () => {
                        if (err) {} else {
                            redisCli.get("c:act:s:" + entityType + ":" + usn + ":nsc", (err, reply) => {
                                if (err) {} else {
                                    cb(reply);
                                }
                            })
                        }
                    })
                }
                //or not
                else {
                    //here.
                    redisCli.incr("c:act:s:" + entityType + ":" + usn + ":nsc");
                    redisCli.get("c:act:s:" + entityType + ":" + usn + ":nsc", (err, reply) => {
                        if (err) {} else {
                            cb(reply);
                        }
                    })
                }
            }
        }) 
    }
}
module.exports = userModule;

