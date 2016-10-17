// npm modules
var express = require('express');
var bcrypt = require('bcrypt');
var _ = require('underscore');
var bodyParser = require('body-parser');
var profiles_db = require('./profiles_db.js');
var requests_db = require('./requests_db.js');
var middleware_user = require('./middleware/middleware_user.js')(profiles_db);
var middleware_admin = require('./middleware/middleware_admin.js')(profiles_db);
var middleware_partner = require('./middleware/middleware_partner.js')(profiles_db);

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

	profiles_db.gp.findAll({
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

	profiles_db.gp.findbyId(gpId).then(function(gp) {
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
    var body = _.pick(req.body, 'userName', 'email', 'phone', 'password');

    profiles_db.user.create(body).then(function(user) { // Create new user account
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

    profiles_db.user.authenticate(body).then(function(user) { // authenticate user account
        var token = user.generateToken('authentication');
        userInstance = user;

        return profiles_db.token.create({
            token: token
        });
    }).then(function(tokenInstance) {
        res.header('Auth', tokenInstance.get('token')).json(userInstance.toPublicJSON()); // send valid token for login session by 'Auth' header
    }).catch (function(e) {
        console.log(e);
        res.status(401).send();
    });
})

/** Request a check up providing gpId, appointmentTime and description
 * 
 * @author: Nguyen Van Hoang
 *
 * URL: POST /requests
 *
 * @query: gpId (required)
 *
 * @req:
 * _ body: JSON format of 2 properties description (not required) and appointmentTime (required)
 * _ header: 'Auth': valid token for login session  
 * 
 * @res:
 * - body: JSON format of properties:
 *   + userId: Id of the user
 *   + gpId: Id of the GP
 *   + description: description of the request
 *   + status: status of the request (default is processing)
 *   + appointmentTime: estimated appointment time to meet the GP
 *   + createdAt and updatedAt
 */
app.post('/requests', middleware_user.requireAuthentication, function(req, res) {
    var body = _.pick(req.body, 'description', 'appointmentTime');
    var query = req.query;

    if(query.hasOwnProperty('gpId') && query.gpId.length > 0) {
        body.gpId = parseInt(query.gpId, 10);
    }

    body.userId = req.user.get('id');

    requests_db.request.create(body).then(function(request) {
        res.status(200).json(request.toPublicJSON());
    }, function(e) {
        res.status(400).json(e);
    });
});

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
app.delete('/users/login', middleware_user.requireAuthentication, function(req, res) {
    req.token.destroy().then(function () { // Destroy current valid token for login session
        res.status(204).send();
    }).catch(function (e) {
        console.log(e);
        res.status(500).send();
    })
});

/** Create partner account providing email and password
 *
 * @author: Nguyen Van Hoang
 *
 * URL: POST /partners
 * 
 * @req: 
 * _ body: JSON format of 2 properties email and password
 * 
 * @res: 
 * - body: Pulic JSON format of created account
 */
app.post('/partners', function(req, res) {
    var body = _.pick(req.body, 'partnerName', 'email', 'address', 'phone', 'password');

    profiles_db.partner.create(body).then(function(partner) { // Create new partner account
        res.status(200).json(partner.toPublicJSON());
    }, function(e) {
        res.status(400).json(e.errors);
    });
});

/** Login partner account provding email and password
 *
 * @author: Nguyen Van Hoang
 *
 * URL: POST /partners
 * 
 * @req: 
 * _ body: JSON format of 2 properties email and password
 *
 * @res: 
 * _ body: Public JSON format of login account
 * _ header:
 *   + 'Auth': valid token for login session
 */
app.post('/partners/login', function(req, res) {
    var body = _.pick(req.body, 'email', 'password');
    var partnerInstance;

    profiles_db.partner.authenticate(body).then(function(partner) { // authenticate partner account
        var token = partner.generateToken('authentication');
        partnerInstance = partner;

        return profiles_db.token.create({
            token: token
        });
    }).then(function(tokenInstance) {
        res.header('Auth', tokenInstance.get('token')).json(partnerInstance.toPublicJSON()); // send valid token for login session by 'Auth' header
    }).catch (function(e) {
        console.log(e);
        res.status(401).send();
    });
})

/** Logout partner account
 *
 * @author Nguyen Van Hoang
 *
 * URL: DELETE /partners/login
 * 
 * @req:
 * _ header:
 *   + 'Auth': valid token for login session
 */
app.delete('/partners/login', middleware_partner.requireAuthentication, function(req, res) {
    req.token.destroy().then(function () { // Destroy current valid token for login session
        res.status(204).send();
    }).catch(function (e) {
        console.log(e);
        res.status(500).send();
    })
});

/** Create admin account providing email and password
 *
 * @author: Nguyen Van Hoang
 *
 * URL: POST /admins
 * 
 * @req: 
 * _ body: JSON format of 2 properties email and password
 * 
 * @res: 
 * - body: Pulic JSON format of created account
 */
app.post('/admins', function(req, res) {
    var body = _.pick(req.body, 'email', 'password');

    profiles_db.admin.create(body).then(function(admin) { // Create new admin account
        res.status(200).json(admin.toPublicJSON());
    }, function(e) {
        res.status(400).json(e.errors);
    });
});

/** Login admin account provding email and password
 *
 * @author: Nguyen Van Hoang
 *
 * URL: POST /admins
 * 
 * @req: 
 * _ body: JSON format of 2 properties email and password
 *
 * @res: 
 * _ body: Public JSON format of login account
 * _ header:
 *   + 'Auth': valid token for login session
 */
app.post('/admins/login', function(req, res) {
    var body = _.pick(req.body, 'email', 'password');
    var adminInstance;

    profiles_db.admin.authenticate(body).then(function(admin) { // authenticate admin account
        var token = admin.generateToken('authentication');
        adminInstance = admin;

        return profiles_db.token.create({
            token: token
        });
    }).then(function(tokenInstance) {
        res.header('Auth', tokenInstance.get('token')).json(adminInstance.toPublicJSON()); // send valid token for login session by 'Auth' header
    }).catch (function(e) {
        console.log(e);
        res.status(401).send();
    });
})

/** Logout admin account
 *
 * @author Nguyen Van Hoang
 *
 * URL: DELETE /admins/login
 * 
 * @req:
 * _ header:
 *   + 'Auth': valid token for login session
 */
app.delete('/admins/login', middleware_admin.requireAuthentication, function(req, res) {
    req.token.destroy().then(function () { // Destroy current valid token for login session
        res.status(204).send();
    }).catch(function (e) {
        console.log(e);
        res.status(500).send();
    })
});

/** Show all registered users
 * @author Nguyen Van Hoang
 *
 * URL: GET /admins/admins
 * 
 * @req:
 * _ header:
 *   + 'Auth': valid token for login session
 * 
 * @res:
 * _ body: JSON format of all users
 */
app.get('/admins/users', middleware_admin.requireAuthentication, function(req, res) {
    profiles_db.user.findAll().then(function(users) {
        var publicUsers = [];
        users.forEach(function(user) {
            publicUsers.push(user.toPublicJSON());
        })
        res.status(200).json(publicUsers);
    }, function() {
        res.status(500).send();
    });
});

/** Show all registered partners
 * @author Nguyen Van Hoang
 *
 * URL: GET /admins/partners
 * 
 * @req:
 * _ header:
 *   + 'Auth': valid token for login session
 * 
 * @res:
 * _ body: JSON format of all partners
 */
app.get('/admins/partners', middleware_admin.requireAuthentication, function(req, res) {
    profiles_db.partner.findAll().then(function(partners) {
        var publicPartners = [];
        partners.forEach(function(partner) {
            publicPartners.push(partner.toPublicJSON());
        })
        res.status(200).json(publicPartners);
    }, function() {
        res.status(500).send();
    });
});

profiles_db.sequelize.sync({
    force: true
}).then(function(){
    requests_db.sequelize.sync({
        force: true
    });
}).then(function() {
    app.listen(PORT, function() {
        console.log('Express listening on port ' + PORT + '!');
    });
});