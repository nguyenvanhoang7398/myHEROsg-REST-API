var bcrypt = require('bcrypt');
var _ = require('underscore');
var cryptojs = require('crypto-js');
var jwt = require('jsonwebtoken');
var crypto_encrypt_password = require.main.require('./encrypt_and_hash_code/crypto_encrypt_password.js');
var token_sign_password = require.main.require('./encrypt_and_hash_code/token_sign_password.js');
var encrypt_email_code = require.main.require('./encrypt_and_hash_code/email_verification_password.js');

var Crypt = require('cryptr');
crypt = new Crypt(encrypt_email_code);

module.exports = function(sequelize, DataTypes) {
	var user = sequelize.define('user', { 
		userName: {
			type: DataTypes.STRING,
			allowNull: false,
			validate: {
				len: [1, 100]
			}
		},
		email: { // email property of the user
			type: DataTypes.STRING,
			allowNull: false,
			unique: true,
			validate: {
				isEmail: true
			}
		},
		phone: {
			type: DataTypes.STRING,
			allowNull: true,
			unique: true,
			validate: {
				len: [1, 20]
			}
		},
		verified: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
			defaultValue: false
		},
		salt: { // salt created for hashing password
			type: DataTypes.STRING
		},
		password_hash: { // password after hash
			type: DataTypes.STRING
		},
		password: { // raw password
			type: DataTypes.VIRTUAL,
			allowNull: false,
			validate: {
				len: [7, 100]
			},
			set: function(value) { // call back function to hash raw password after being created
				var salt = bcrypt.genSaltSync(10);
				var hashedPassword = bcrypt.hashSync(value, salt);

				this.setDataValue('password', value);
				this.setDataValue('salt', salt);
				this.setDataValue('password_hash', hashedPassword);
			}
		}
	}, {
		hooks: { // hook to verify 
			beforeValidate: function(user, option) {
				if (typeof(user.email) === 'string') {
					user.email = user.email.toLowerCase();
				}
			}
		},
		classMethods: { 
			authenticate: function(body) { // authenticate a given login body
				var errorAuth = {
					errors: "Authentication failed or email not verified"
				};
				return new Promise(function(resolve, reject) {
					if (!(_.isString(body.email) && _.isString(body.password))) { // reject if email and password is not string
						return reject(errorAuth);
					}

					user.findOne({
						where: {
							email: body.email
						}
					}).then(function(user) {
						console.log("status: " + user.get('verified'));
						if (!user || !(bcrypt.compareSync(body.password, user.get('password_hash'))) || user.get('verified') === false) { // reject if user not found or wrong password
							return reject(errorAuth);
						}

						resolve(user);
					}, function() {
						reject(errorAuth);
					})
				})
			},
			findByToken: function(token) { // find user by a given token at 'Auth' header of a request
				return new Promise(function (resolve, reject) {
					try {
						var decodedJWT = jwt.verify(token, token_sign_password);
						var bytes = cryptojs.AES.decrypt(decodedJWT.token, crypto_encrypt_password); // decrypt token
						var tokenData = JSON.parse(bytes.toString(cryptojs.enc.Utf8)); // convert JSON format to object

						user.findById(tokenData.userId).then(function (user) { // find user by token id
							if (user) {
								resolve(user);
							} else {
								reject();
							}
						}, function(e) {
							console.log(e);
							reject();
						})
					} catch (e) {
						console.log(e);
						reject();
					}
				})
			},
			verifyEmail: function(encrypted_email) { // verify email of the user given a string of encrypted email at the end of id
				var errorsVerify = { // Verifying error message
					errors: "Cannot verify this email"
				}
				return new Promise(function (resolve, reject) { 
					try {
						var emailData = crypt.decrypt(encrypted_email); // decrypt email
						console.log("email after decrypted" + emailData);
						user.findOne({ // search in user database
							where: {
								email: emailData
							}
						}).then(function(user) {
							if (user && user.get('verified') === false) { // user must not be verified before
								resolve(user);
							} else {
								reject();
							}
						})
					} catch (e) {
						console.log(e);
						reject();
					}
				})
			}
		},
		instanceMethods: {
			toPublicJSON: function() {
				var json = this.toJSON();
				return _.pick(json, 'id', 'userName', 'email', 'phone', 'createdAt', 'updatedAt', 'verified'); // only choose 'id', 'email', 'createdAt', 'updatedAt' properties to expose to public clients
			},
			generateToken: function (type) { // generate new token
				if (!(_.isString(type))) {
					return undefined;
				}

				try {
					var stringData = JSON.stringify({ // stringify an object into JSON format
						userId: this.get('id'),
						type: type
					})
					var encryptedData = cryptojs.AES.encrypt(stringData, crypto_encrypt_password).toString(); // encrypt token
					var token = jwt.sign({ // sign token
						token: encryptedData
					}, token_sign_password);

					return token;
				} catch (e) { // return undefined if cannot generate new token
					console.log(e);
					return undefined;
				}
			}
		}
	});
	return user;
};