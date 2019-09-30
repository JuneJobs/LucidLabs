'use strict'

//Import config options for develop
const config = require('./server/config/default.json');
const bodyParser = require("body-parser");
const express = require("express");
const cors = require('cors');
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
let corsOptions = {
    origin: 'http://localhost:3000', // 허락하고자 하는 요청 주소
    credentials: true // true로 하면 설정한 내용을 response 헤더에 추가 해줍니다.
} 
app.use(cors(corsOptions));

require('./server/businessLogic/router');
//require('./server/routes/Core');

//Server runner
app.listen(_apiPort, function(){
    setInterval( () => {
        logger.debug("Running on port " + _apiPort);
        //logger.debug(codeGen.getVerificationCode());
        //logger.debug(codeGen.getAuthenticationCode());
    }, 60000);
    
});