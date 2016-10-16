var bcrypt = require('bcrypt');
var _ = require('underscore');
var cryptojs = require('crypto-js');
var jwt = require('jsonwebtoken');
var crypto_encrypt_password = require('./crypto_encrypt_password.js');
var token_sign_password = require('./token_sign_password.js');

module.exports = function(sequelize, DataTypes) {
	var user = sequelize.define('user', { 
		email: { // email property of the user
			type: DataTypes.STRING,
			allowNull: false,
			unique: true,
			validate: {
				isEmail: true
			}
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
				return new Promise(function(resolve, reject) {
					if (!(_.isString(body.email) && _.isString(body.password))) { // reject if email and password is not string
						return reject();
					}

					user.findOne({
						where: {
							email: body.email
						}
					}).then(function(user) {
						if (!user || !(bcrypt.compareSync(body.password, user.get('password_hash')))) { // reject if user not found or wrong password
							return reject();
						}

						resolve(user);
					}, function() {
						reject();
					})
				})
			},
			findByToken: function(token) { // find user by a given token at 'Auth' header of a request
				return new Promise(function (resolve, reject) {
					try {
						var decodedJWT = jwt.verify(token, token_sign_password);
						var bytes = cryptojs.AES.decrypt(decodedJWT.token, crypto_encrypt_password); // decrypt token
						var tokenData = JSON.parse(bytes.toString(cryptojs.enc.Utf8)); // convert JSON format to object

						user.findById(tokenData.id).then(function (user) { // find user by token id
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
			}
		},
		instanceMethods: {
			toPublicJSON: function() {
				var json = this.toJSON();
				return _.pick(json, 'id', 'email', 'createdAt', 'updatedAt'); // only choose 'id', 'email', 'createdAt', 'updatedAt' properties to expose to public clients
			},
			generateToken: function (type) { // generate new token
				if (!(_.isString(type))) {
					return undefined;
				}

				try {
					var stringData = JSON.stringify({ // stringify an object into JSON format
						id: this.get('id'),
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