'use strict';

//Import gloabal values
const g = require("../config/header");

class commonModule {
    constructor() {

    }
    getCurrentDate() {
        return Math.floor(new Date().getTime() / 1000).toString();
    }
}
module.exports = commonModule;