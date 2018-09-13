"use strict";
const bcrypt = require("bcrypt");
class LlHash {
    constructor(){

    }
    getHashedPassword(passwrod) {
        return bcrypt.hashSync(passwrod, 10);
    }
    checkPassword(plain, hash){
        return bcrypt.compareSync(plain, hash);
    }
}
module.exports = LlHash;