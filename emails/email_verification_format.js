module.exports = function(link) {
	var format = {
		service: "Gmail",
		user: "emailverifymyherosg",
		pass: "myhero123!@#",
		subject: "<Do not reply> Please confirm your Email from myHEROsg account",
		html: "Hello,<br> Please Click on the link to verify your email.<br><a href="+link+">Click here to verify</a>"
	}
	return format;
}