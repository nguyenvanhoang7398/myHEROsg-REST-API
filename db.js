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
		'storage': __dirname + '/data/dev-myHEROsg-api.sqlite' // store data in local memory
	});
}

var db = {};

// import local content of models
db.gp = sequelize.import(__dirname + '/models/gp.js'); 
db.sequelize = sequelize;
db.Sequelize = Sequelize;

db.user = sequelize.import(__dirname + '/models/user.js');

db.token = sequelize.import(__dirname + '/models/token.js');

module.exports = db;