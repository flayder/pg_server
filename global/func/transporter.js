const { exec } = require('child_process');

exports.transporter = () => {
	return {
    sendMail(args) {
      var execCode = '';
      for(let arr in args) {
        execCode += `--${arr}="${args[arr]}" `;
      }
      exec(`node ${__dirname}/mail.js ${execCode}`, (err, stdout, stderr) => {
        console.log(`Mail err ${err}\n\nMail stdout ${stdout}\n\nMail stderr ${stderr}`);
      });

      return Promise.resolve();
    }
  }
}