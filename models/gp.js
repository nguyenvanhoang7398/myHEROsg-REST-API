module.exports = function(sequelize, DataTypes) {
	return sequelize.define('gp', {
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
		}
	});
};