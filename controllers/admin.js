var _ = require('underscore');

var profiles_db = require.main.require('./profiles_db.js');
var requests_db = require.main.require('./requests_db.js');

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
exports.postAdmins = function(req, res) {
	var body = _.pick(req.body, 'email', 'password');

	profiles_db.admin.create(body).then(function(admin) { // Create new admin account
		res.status(200).json(admin.toPublicJSON());
	}, function(e) {
		res.status(400).json(e.errors);
	});
}

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
exports.postAdminsLogin = function(req, res) {
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
	}).catch(function(e) {
		console.log(e);
		res.status(401).send();
	});
}

/** Show all available requests providing partner, users and point of time
 *
 * @author: Nguyen Van Hoang
 * 
 * URL: GET /admins/requests
 *
 * @query:
 * _ partnerId: uid of the partner
 * _ userId: uid of the user
 * _ status: status of the requests
 * _ before: requests before a point of time
 * _ after: requests after a point of time
 * _ offset: Offset the list of returned results by this amount. Default is zero.
 * _ limit: Number of items to retrieve. Default is 5, maximum is 30.
 *
 * @ res:
 * _ body: 
 *   + offset
 *   + limit
 *   + count: total number of requests
 *   + requests: JSON format of all requests
 * _ header: 'Auth': valid token for login session
 */
exports.getAdminsRequests = function(req, res) {
	var query = req.query;
	var where = {};
	var result = {
		offset: 0,
		limit: 5,
		count: 0,
		requests: []
	}

	if (query.hasOwnProperty('offset') && query.offset.length > 0) {
		result.offset = parseInt(query.offset);
	}

	if (query.hasOwnProperty('limit') && parseInt(query.limit) < 30 && query.limit.length > 0) {
		result.limit = parseInt(query.limit);
	}

	if (query.hasOwnProperty('partnerId') && query.partnerId.length > 0) {
		where.partnerId = partnerId;
	}

	if (query.hasOwnProperty('userId') && query.userId.length > 0) {
		where.userId = query.userId;
	}

	if (query.hasOwnProperty('status')) {
		where.status = query.status;
	};


	if ((query.hasOwnProperty('after') && query.after.length > 0) || (query.hasOwnProperty('before') && query.before.length > 0)) {
		where.appointmentTime = {};
		if (query.hasOwnProperty('after')) {
			where.appointmentTime.$gte = Date.parse(query.after);
		}
		if (query.hasOwnProperty('before')) {
			where.appointmentTime.$lte = Date.parse(query.before);
		}
	}

	requests_db.request.findAndCountAll({
		where: where,
		limit: result.limit,
		offset: result.offset
	}).then(function(filteredRequests) {
		if (!filteredRequests) {
			res.status(404).json({
				"errors": "Requests not found"
			})
		} else {
			result.count = filteredRequests.count
			filteredRequests.rows.forEach(function(request) {
				result.requests.push(request);
			});
			res.status(200).json(result);
		}
	}, function() {
		res.status(500).send();
	})
}

/** Show all registered users
 * @author Nguyen Van Hoang
 *
 * URL: GET /admins/users
 * 
 * @req:
 * _ header:
 *   + 'Auth': valid token for login session
 * 
 * @res:
 * _ body: JSON format of all users
 */
exports.getAdminsUsers = function(req, res) {
	var query = req.query;
	var result = {
		offset: 0,
		limit: 5,
		count: 0,
		users: []
	}

	if (query.hasOwnProperty('offset') && query.offset.length > 0) {
		result.offset = parseInt(query.offset);
	}

	if (query.hasOwnProperty('limit') && parseInt(query.limit) < 30 && query.limit.length > 0) {
		result.limit = parseInt(query.limit);
	}

	profiles_db.user.findAndCountAll({
		limit: result.limit,
		offset: result.offset
	}).then(function(filteredUsers) {
		if (!filteredUsers) {
			res.status(404).json({
				"errors": "Users not found"
			})
		} else {
			result.count = filteredUsers.count
			filteredUsers.rows.forEach(function(user) {
				result.users.push(user.toPublicJSON());
			});
			res.status(200).json(result);
		}
	}, function() {
		res.status(500).send();
	})
}

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
exports.getAdminsPartners = function(req, res) {
	var query = req.query;
	var result = {
		offset: 0,
		limit: 5,
		count: 0,
		partners: []
	}

	if (query.hasOwnProperty('offset') && query.offset.length > 0) {
		result.offset = parseInt(query.offset);
	}

	if (query.hasOwnProperty('limit') && parseInt(query.limit) < 30 && query.limit.length > 0) {
		result.limit = parseInt(query.limit);
	}

	profiles_db.partner.findAndCountAll({
		limit: result.limit,
		offset: result.offset
	}).then(function(filteredPartners) {
		if (!filteredPartners) {
			res.status(404).json({
				"errors": "Partners not found"
			})
		} else {
			result.count = filteredPartners.count
			filteredPartners.rows.forEach(function(partner) {
				result.partners.push(partner.toPublicJSON());
			});
			res.status(200).json(result);
		}
	}, function() {
		res.status(500).send();
	})
}

exports.postAdminsGps = function(req, res) {
	var body = _.pick(req.body, 'gpName', 'phone', 'longitude', 'latitude');

	profiles_db.gp.create(body).then(function(gp) { // Create new admin account
		res.status(200).json(gp.toJSON());
	}, function(e) {
		res.status(400).json(e.errors);
	});
}

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
exports.deleteAdminsLogin = function(req, res) {
	req.token.destroy().then(function() { // Destroy current valid token for login session
		res.status(204).send();
	}).catch(function(e) {
		console.log(e);
		res.status(500).send();
	})
}