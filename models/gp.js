var uniqid = require('uniqid');

module.exports = function(sequelize, DataTypes) {
	return sequelize.define('gp', {
		uid: {
			type: DataTypes.STRING,
			primaryKey: true,
			defaultValue: uniqid()
		},
		gpName: { // name of the GP
			type: DataTypes.STRING,
			allowNull: false,
			validate: {
				len: [1, 250]
			}
		},
		phone: { // phone number of the GP
			type: DataTypes.STRING,
			allowNull: false,
			validate:{
				len: [1]
			}
		},
		available: { // availability of the GP
			type: DataTypes.BOOLEAN,
			allowNull: false,
			defaultValue: false
		},
		queueTime: {
			type: DataTypes.INTEGER,
			allowNull: true,
			validate: {
				isInt: true
			}
		},
		longitude: {
			type: DataTypes.DOUBLE,
			allowNull: false,
			validate: {
				isDecimal: true
			}
		},
		latitude: {
			type: DataTypes.DOUBLE,
			allowNull: false,
			validate: {
				isDecimal: true
			}
		},
		isPartner: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
			defaultValue: false
		}
	});
};