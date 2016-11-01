var nodemailer = require("nodemailer");
var cryptojs = require("crypto-js");

var format = require('./formats/email_verification_format.js'); // mail format
var encrypt_email_code = require.main.require('./encrypt_and_hash_code/email_verification_password.js');

var Crypt = require('cryptr');
crypt = new Crypt(encrypt_email_code);

module.exports = function(email, host) {
	return new Promise(function(resolve, reject) {
		console.log("Send verification email to: " + email);
		var encryptedEmail = crypt.encrypt(email); // encrypt email

		var link = "http://" + host + "/api/verify?email=" + encryptedEmail; // verifying link sent to user
		var email_format = format(link);

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
		console.log(mailOptions);
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
};