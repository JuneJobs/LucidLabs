'use strict'
const codeGenerator = require("node-code-generator");
var generator = new codeGenerator();
class LlCodeGenerator {
    constructor(){
    }
    getVerificationCode() {
        return generator.generateCodes("####", 1, {})[0];
    }
    getAuthenticationCode() {
        return generator.generateCodes("*#*#*#*#*#*#*#*#*#*#", 1, {})[0];
    }
    getSaltCode(){
        return generator.generateCodes("##", 1, {})[0];
    }
}
module.exports = LlCodeGenerator;