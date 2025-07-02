require('dotenv').config();
const nodemailer = require("nodemailer");
const minimist = require('minimist');
const args = minimist(process.argv.slice(2));

const mailArgs = {};

for(let arr in args) {
    if(arr != '_')
        mailArgs[arr] = args[arr];
}

//console.log(`mailArgs ${JSON.stringify(mailArgs)}`);

if(!mailArgs?.to) return;

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  requireTLS: true,
  logger: true,
  error: true
});

transporter.sendMail(mailArgs);