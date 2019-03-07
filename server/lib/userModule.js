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
    checkUserSignedInState(entityType, clientType, usn, nsc, cb) {
        if(entityType === undefined || clientType === undefined || usn === undefined || nsc === undefined) {
            cb(0);
        } else {
            //here!
            let keyHead = '',
                clientKey = g.ENTITY_TYPE.APPCLIENT;
            if(clientType === g.CLIENT_TYPE.WEB) {
                clientKey = g.ENTITY_TYPE.WEBCLIENT;
            } 
            
            keyHead = `c:act:s:${clientKey}:${usn}`;
            
            redisCli.get(`${keyHead}:nsc`, (err, reply) => {
                if (err) {} else {
                    //not exist userId
                    if (reply === null) {
                        cb(2);
                    } else {
                        //okay
                        //it should be fixed
                        try {
                            if (reply === nsc.toString()) {
                                cb(1);
                                //incorrect nsc
                            } else {
                                cb(3);
                            }
                        } catch (error) {
                            
                        }
                    }
                }
                return;
            });
        }
    }
    removeActiveUserInfo(entityType, usn, cb) {
        if(entityType === undefined || usn === undefined) {
            return false;
        } else {
            var keyHead = '';
            if(entityType === g.ENTITY_TYPE.APPCLIENT) {
                keyHead = "c:act:s:" + g.ENTITY_TYPE.APPCLIENT + ":" + usn + ":";
            } else if (entityType === g.ENTITY_TYPE.WEBCLIENT) {
                keyHead = "c:act:s:" + g.ENTITY_TYPE.WEBCLIENT + ":" + usn + ":";
            }
             var result = false;
             redisCli.multi([
                 ["del", keyHead + "signf"],
                 ["del", keyHead + "nsc"],
                 ["del", keyHead + "ml"]
             ]).exec(function (err, replies) {
                 if (err) {
                     result = false;
                 } else {
                     result = true;
                 }
                 cb(result);
             });
        }
       
    }
    updateUserSignedInState(entityType, usn, cb){
        if (entityType === undefined || usn === undefined) {
            return cb(false);
        } else {
            var keyHead = '';
            var expTime = '';
            if (entityType === g.ENTITY_TYPE.APPCLIENT) {
                expTime = g.SERVER_TIMER.T833;
                keyHead = "c:act:s:" + g.ENTITY_TYPE.APPCLIENT + ":" + usn + ":";
            } else if (entityType === g.ENTITY_TYPE.WEBCLIENT) {
                expTime = g.SERVER_TIMER.T863;
                keyHead = "c:act:s:" + g.ENTITY_TYPE.WEBCLIENT + ":" + usn + ":";
            }

            //업데이트 치기
            redisCli.multi([
                ["expire", keyHead + "signf", expTime],
                ["expire", keyHead + "nsc", expTime],
                ["expire", keyHead + "ml", expTime]
            ]).exec(function (err, replies) {
                if (err) {
                    return cb(false);
                } else {
                    return cb(true);
                }
            });
        }
    }
}
module.exports = userModule;

