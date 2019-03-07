'use strict'

//Import config options for develop
const config = require('./server/config/default.json');
const bodyParser = require("body-parser");
const express = require("express");
//Import logger module
const LlLogger = require("./server/lib/LlLogger");
global.logger = new LlLogger(config.loggerLevel);
//Import msg module
const LlMsg = require("./server/lib/LlMsg");
global.msg = new LlMsg();

const LlState = require("./server/lib/LlState");
//global.msg = new LlMsg();

const _apiPort = config.webServicePort;
global.app = express();
global.router = express.Router();
global.path = __dirname;

app.use(bodyParser.json()); // support json encoded bodies
app.use("/", router);

//require('./server/businessLogic/router');
require('./server/routes/Core');

//Server runner
app.listen(_apiPort, function(){
    setInterval( () => {
        logger.debug("Running on port " + _apiPort);
        //logger.debug(codeGen.getVerificationCode());
        //logger.debug(codeGen.getAuthenticationCode());
    }, 60000);
    
});