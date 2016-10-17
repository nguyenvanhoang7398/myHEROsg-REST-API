var Sequelize = require('sequelize');
var env = process.env.NODE_ENV || 'development';
var sequelize;

if (env === 'production') { // use postgres database for server
	sequelize = new Sequelize(process.env.DATABASE_URL, {
		'dialect': 'postgres'
	});
} else { // use sqlite database for local host
	sequelize = new Sequelize(undefined, undefined, undefined, {
		'dialect': 'sqlite',
		'storage': __dirname + '/data/requests.sqlite' // store data in local memory
	});
}

var requests_db = {};
 
// import local contents of models

requests_db.request = sequelize.import(__dirname + '/models/request.js');

requests_db.sequelize = sequelize;
requests_db.Sequelize = Sequelize;

module.exports = requests_db;