var nodemailer = require("nodemailer");

var format = require('./formats/email_inform_update_format.js');

module.exports = function(oldRequest, updatedRequest, email) {
	return new Promise(function(resolve, reject) {
		var email_format = format(oldRequest, updatedRequest);
		var mailOptions = { // mail options
			to: email,
			subject: email_format.subject,
			html: email_format.html
		}
		var smtpTransport = nodemailer.createTransport("SMTP", {
			service: email_format.service,
			auth: {
				user: email_format.user,
				pass: email_format.pass
			}
		});

		smtpTransport.sendMail(mailOptions, function(error, response){
     		if(error){
            	console.log(error);
        		reject();
     		} else {
            	console.log("Message sent: " + response.message);
        		resolve();
         	}
        })
	});
}