'use strict'

//Import config options for develop
const config = require('./server/config/default.json');
//Import gloabal values
const g = require("./server/config/header");
const bodyParser = require("body-parser");
const express = require("express");
//Import logger module
const llLogger = require("./server/lib/llLogger");
global.logger = new llLogger(config.loggerLevel);
const llCodeGenerator = require("./server/lib/llCodeGenerator")
global.codeGen = new llCodeGenerator();



const _apiPort = config.webServicePort;
global.app = express();
global.router = express.Router();
global.path = __dirname;

app.use(bodyParser.json()); // support json encoded bodies
app.use("/", router);

require('./server/businessLogic/router');


//Server runner
app.listen(_apiPort, function(){
    setInterval( () => {
        logger.debug("server is running");
        //logger.debug(codeGen.getVerificationCode());
        //logger.debug(codeGen.getAuthenticationCode());
    }, 2000);
    
});