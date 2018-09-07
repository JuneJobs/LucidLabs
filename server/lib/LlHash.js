"use strict";
const bcrypt = require("bcrypt");
class LlHash {
    constructor(){

    }
    getHashedPassword(passwrod) {
        return bcrypt.hashSync(passwrod, 10);
    }
}
module.exports = LlHash;