var uniqid = require('uniqid');
var _ = require('underscore');

module.exports = function(sequelize, DataTypes) {
	return sequelize.define('request', {
		uid: {
			type: DataTypes.STRING,
			primaryKey: true,
			defaultValue: uniqid()
		},
		description: { // description of the request that user wants to make
			type: DataTypes.STRING,
			allowNull: false,
			validate: {
				len: [0, 300]
			},
			defaultValue: ""
		}, 
		GPResponse: { // description of the request that user wants to make
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
				isIn: [['processing', 'accepted' ,'completed', 'cancelled']]
			}
		},
		appointmentTime: { // estimated time to make the appointment with the partner in minutes
			type: DataTypes.DATE,
			allowNull: false,
			validate: {
				len: [1]
			}
		},
		partnerId: {
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
		},
		lastUpdater: {
			type: DataTypes.STRING,
			allowNull: false,
			defaultValue: "creator",
			validate: {
				len: [1, 100]
			}
		}
	}, {
		instanceMethods: {
			toPublicJSON: function() {
				var json = this.toJSON();
				return _.pick(json, 'uid', 'userId', 'partnerId', 
				'description', 'GPResponse' ,'status', 'appointmentTime', 'lastUpdater',
				'createdAt', 'updatedAt'); // only choose 'uid', 'userId', 'partnerId', 'description', 'status', 'appointmentTime' properties to expose to public clients
			}
		}
	});
}