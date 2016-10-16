var cryptojs = require('crypto-js');

module.exports = function(db) {

	return {
		requireAuthentication: function(req, res, next) {
			var token = req.get('Auth') || ''; // Get token for login session through 'Auth' header

			db.token.findOne({
				where: {
					tokenHash: cryptojs.MD5(token).toString() // hash the token
				}
			}).then(function(tokenInstance) { 
				if (!tokenInstance) {
					throw new Error();
				}

				req.token = tokenInstance;
				return db.user.findByToken(token); // find user with the hashed value of the valid token
			}).then(function(user) {
				req.user = user; // add 'user' property to the request of the authentication-required URL
				next();
			}).catch(function() {
				res.status(401).send();
			})
		}
	};

};