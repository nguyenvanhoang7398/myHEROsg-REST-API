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
db.user = sequelize.import(__dirname + '/models/user.js');
db.admin = sequelize.import(__dirname + '/models/admin.js');
db.partner = sequelize.import(__dirname + '/models/partner.js');

db.token = sequelize.import(__dirname + '/models/token.js');

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;