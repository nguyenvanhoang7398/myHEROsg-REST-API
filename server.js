// npm modules
var express = require('express');
var bcrypt = require('bcrypt');
var _ = require('underscore');
var bodyParser = require('body-parser');
var db = require('./db.js');
var middleware = require('./middleware.js')(db);

var app = express();
var PORT = process.env.PORT || 3000; //PORT 3000 for local host, process.env.PORT for public server 

app.use(bodyParser.json());

// http methods

// Root API
// GET /
app.get('/', function(req, res) {
	res.send('myHEROsg REST API ROOT');
})

/** Get the list of all GPs and query for their availability, name and phone number
 * 
 * @author: Nguyen Van Hoang
 * 
 * URL: GET /gps?available=true&q=name&phone=123456
 * 
 * @query available: availability of the GP
 * @query q: name of the GP
 * @query phone: phone number of the GP
 *
 * @res: 
 * _ body: JSON format of filtered GPs
 */
app.get('/gps', function(req, res) {
	var query = req.query;
	var where = {}; // create 'where' object to find GP

	if (query.hasOwnProperty('available') && query.available === 'true') { // check and add 'available' property to 'where' object
		where.available = true;
	} else if (query.hasOwnProperty('available') && query.available === 'false') {
		where.available = false;
	}

	if (query.hasOwnProperty('q') && query.q.length > 0) { // check and add 'gpName' property to 'where' object
		where.gpName = {
			$like: '%' + query.q + '%'
		};
	}

	if (query.hasOwnProperty('phone') && query.phone.length > 0) { // check and add 'phone' property to 'where' object
		where.phone = {
			$like: '%' + query.phone + '%'
		};
	}

	db.gp.findAll({
		where: where // find GP with 'where' object
	}).then(function (filteredGPs) {
		res.status(200).json(filteredGPs);
	}, function() {
		res.status(500).send();
	});
});

/** Get GP information providing an ID
 *
 * @author: Nguyen Van Hoang
 *
 * URL: GET /gps/id:
 *
 * @params id: id of the GP
 * 
 * @res: 
 * _ body: JSON format of the GP information
 */
app.get('/gps/:id', function(req, res) {
	var gpId = parseInt(req.params.id, 10);

	db.gp.findById(gpId).then(function(gp) {
		if(!!gp) {
			res.status(200).json(gp);
		} else {
			res.status(404).json({"error": "GP not found"});
		}
	}, function() {
		res.status(500).send();
	})
});

/** Create user account providing email and password
 *
 * @author: Nguyen Van Hoang
 *
 * URL: POST /users
 * 
 * @req: 
 * _ body: JSON format of 2 properties email and password
 * 
 * @res: 
 * - body: Pulic JSON format of created account
 */
app.post('/users', function(req, res) {
    var body = _.pick(req.body, 'email', 'password');

    db.user.create(body).then(function(user) { // Create new user account
        res.status(200).json(user.toPublicJSON());
    }, function(e) {
        res.status(400).json(e.errors);
    });
});

/** Login user account provding email and password
 *
 * @author: Nguyen Van Hoang
 *
 * URL: POST /users
 * 
 * @req: 
 * _ body: JSON format of 2 properties email and password
 *
 * @res: 
 * _ body: Public JSON format of login account
 * _ header:
 *   + 'Auth': valid token for login session
 */
app.post('/users/login', function(req, res) {
    var body = _.pick(req.body, 'email', 'password');
    var userInstance;

    db.user.authenticate(body).then(function(user) { // authenticate user account
        var token = user.generateToken('authentication');
        userInstance = user;

        return db.token.create({
            token: token
        });
    }).then(function(tokenInstance) {
        res.header('Auth', tokenInstance.get('token')).json(userInstance.toPublicJSON()); // send valid token for login session by 'Auth' header
    }).catch (function(e) {
        console.log(e);
        res.status(401).send();
    });
})

/** Logout user account
 *
 * @author
 *
 * URL: DELETE /users/login
 * 
 * @req:
 * _ header:
 *   + 'Auth': valid token for login session
 */
app.delete('/users/login', middleware.requireAuthentication, function(req, res) {
    req.token.destroy().then(function () { // Destroy current valid token for login session
        res.status(204).send();
    }).catch(function (e) {
        console.log(e);
        res.status(500).send();
    })
});

db.sequelize.sync({
    force: true
}).then(function() {
    app.listen(PORT, function() {
        console.log('Express listening on port ' + PORT + '!');
    });
});