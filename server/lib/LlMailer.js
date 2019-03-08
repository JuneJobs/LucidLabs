const nodemailer = require('nodemailer');

class LlMailer {
    constructor(){
        this.transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: 'airound2019@gmail.com',
                pass: 'jackmason'
            }
        });
        this.mailOptions = {};
        this.mailOptions.from = 'airound2019@gmail.com';
        this.mailOptions.to = '';
        this.mailOptions.subject = '';
        this.mailOptions.html = '';
    }
    sendEmail (recevier, subject, contents) {
        this._setReceiver (recevier);
        this._setSubject (subject);
        this._setContents (contents)

        this.transporter.sendMail (this.mailOptions, (err, info) => {
            if(err){
                console.error(err);
            } else {
                //console.log('Mail sento to ', recevier);
            }
            this.transporter.close();
        })
    }
    _setSubject (subject){
        this.mailOptions.subject = subject;
    }
    _setContents(contents) {
        this.mailOptions.html = contents;
    }
    _setReceiver(recevier) {
        this.mailOptions.to = recevier;
    }
}
module.exports = LlMailer;