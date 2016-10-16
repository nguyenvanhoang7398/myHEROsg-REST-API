var cryptojs = require('crypto-js');

module.exports = function(sequelize, DataTypes	) {
	return sequelize.define('token', {
		token: {
			type: DataTypes.VIRTUAL, // do not show token in database
			allowNull: false,
			validate: {
				len: [1]
			},
			set: function (value) {
				var hash = cryptojs.MD5(value).toString(); // hash token when created

				this.setDataValue('token', value),
				this.setDataValue('tokenHash', hash)
			}
		},
		tokenHash: { // hashed value of token
			type: DataTypes.STRING
		}
	})
}