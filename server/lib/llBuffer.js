const redis = require("redis");
const g = require("../config/header");
var redisCli = redis.createClient();
//버퍼
//데이터 확인
//초기데이터 저장
//데이터 업데이트
//타이머 적용

class LlBuffer {
    constructor(){
    }
    /**
     * @param: key, datasets
     * 
     */
    //STATE:TSI:1   (TSI):(STATE):(ETC) EXPIRE TIME
    setBuffer(key, value, expire){
        //키에 해당하는 sequence가 없을 때
        /*
        redisCli.get(key, function (err, reply) {
            if (err) {
                console.log(err);
            } else {
                if (reply == null) {
                    redisCli.set(key, "1");
                } else {
                    redisCli.incr(key);
                }
                var multi = redisCli.multi();
                multi.set(key + ":" + reply, value, redis.print);
                if (expire != null)
                multi.expire(key + ":" + reply, g.SERVER_TIMER.T832);
                multi.exec((err, reply) => {});
            }
        });
        */
        redisCli.get(key, (err, reply)=> {
            if(err) {
        
            } else {
                if (reply == null) {
                    redisCli.set(key, 1);
                    add(1);
                } else {
                    redisCli.incr(key);
                    add(reply + 1);
                }
            }
        })
        async function add(id) {
            await redisCli.set(key + ":" + id, value, 'EX', 30, redis.print);
            await redisCli.set(key + ":" + id, value, 'EX', 30, redis.print);
            return "OK";
        }
    }
    getBuffer(){

    }
}

var buf = new LlBuffer()
buf.setBuffer("STATE:TSI", 1);
buf.setBuffer("STATE:TSI", 2);