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
		'storage': __dirname + '/data/profiles.sqlite' // store data in local memory
	});
}

var profiles_db = {};

// import local contents of models
profiles_db.gp = sequelize.import(__dirname + '/models/gp.js'); 
profiles_db.user = sequelize.import(__dirname + '/models/user.js');
profiles_db.admin = sequelize.import(__dirname + '/models/admin.js');
profiles_db.partner = sequelize.import(__dirname + '/models/partner.js');

profiles_db.token = sequelize.import(__dirname + '/models/token.js');

profiles_db.sequelize = sequelize;
profiles_db.Sequelize = Sequelize;

module.exports = profiles_db;