'use strict'
const request = require("request");
class LlRequest {
    constructor() {
        
    }
    /**
     * Verify message header using msgType and state
     */
    send(url, packedMsg, cb) {
        var options = {
            method: 'POST',
            url: url,
            headers: {
                'Cache-Control': 'no-cache',
                'Content-Type': 'application/json'
            },
            body: packedMsg,
            json: true
        };
        request(options, function (error, response, body) {
            if (error) throw new Error(error);
            cb(body);
        });
    }
}
module.exports = LlRequest;
