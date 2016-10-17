var _ = require('underscore');

module.exports = function(sequelize, DataTypes) {
	return sequelize.define('request', {
		description: { // description of the request that user wants to make
			type: DataTypes.STRING,
			allowNull: false,
			validate: {
				len: [0, 300]
			},
			defaultValue: ""
		}, 
		status: { // status of the request, can be processing, accepted, completed or canceled
			type: DataTypes.STRING,
			allowNull: false,
			defaultValue: 'processing',
			validate: {
				equals: 'processing' || 'accepted' || 'completed' || 'canceled'
			}
		},
		appointmentTime: { // estimated time to make the appointment with the GP in minutes
			type: DataTypes.DATE,
			allowNull: false,
			validate: {
				len: [1]
			}
		},
		gpId: {
			type: DataTypes.INTEGER,
			allowNull: false,
			validate: {
				isInt: true,
				len: [1]
			}
		},
		userId: {
			type: DataTypes.INTEGER,
			allowNull: false,
			validate: {
				isInt: true,
				len: [1]
			}
		}
	}, {
		instanceMethods: {
			toPublicJSON: function() {
				var json = this.toJSON();
				return _.pick(json, 'id', 'userId', 'gpId', 
				'description', 'status', 'appointmentTime', 
				'createdAt', 'updatedAt'); // only choose 'id', 'userId', 'gpId', 'description', 'status', 'appointmentTime' properties to expose to public clients
			}
		}
	});
}