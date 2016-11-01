var _ = require('underscore');

var profiles_db = require.main.require('./profiles_db.js');
var requests_db = require.main.require('./requests_db.js');
var middleware_user = require.main.require('./middleware/middleware_user.js')(profiles_db);

var send_verification_email = require.main.require('./emails/verify_email.js');
var send_update_email = require.main.require('./emails/inform_update.js');

/** Create user account providing email and password, then send verification email
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
exports.postUsers = function(req, res) {
	var body = _.pick(req.body, 'firstName', 'lastName', 'email', 'phone', 'password');

	profiles_db.user.create(body).then(function(user) { // Create new user account
		var host = req.get('host');
		send_verification_email(body.email, host).then(function() {
			res.status(200).json(user.toPublicJSON());
		}, function(e) {
			res.status(400).json({
				"errors": "Cannot send verification email"
			});
		});
	}, function(e) {
		res.status(400).json(e.errors);
	});
}

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
exports.postUsersLogin = function(req, res) {
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
	}).catch(function(e) {
		console.log(e);
		res.status(401).send(e.errors);
	});
}

/** Receive user verification from email
 *
 * @author: Nguyen Van Hoang
 *
 * URL: GET /verify
 * 
 * @res:
 * _ body: Public JSON format of verified account
 */
exports.getVerify = function(req, res) {
	var query = req.query;

	if (query.hasOwnProperty('email') && query.email.length > 0) {
		profiles_db.user.verifyEmail(query.email.toString()).then(function(user) {
			user.update({
				verified: true
			}).then(function(user) {
				res.status(200).json(user.toPublicJSON());
			});
		}, function(e) {
			res.status(404).json({
				"errors": "This account does not exist or has been verified"
			});
		});
	}
}

/** Show all available requests providing user
 *
 * @author: Nguyen Van Hoang
 * 
 * URL: GET /history
 *
 * @query:
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
exports.getHistory = function(req, res) {
	var query = req.query;
	var where = {
		userId: req.user.get('uid')
	};
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

	if (query.hasOwnProperty('partnerId') && query.userId.length > 0) {
		where.partner = query.partnerId;
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
			result.count = filteredRequests.count;
			filteredRequests.rows.forEach(function(request) {
				result.requests.push(request);
			});
			res.status(200).json(result);
		}
	}, function() {
		res.status(500).send();
	})
}

exports.getMe = function(req, res) {
	var userId = req.user.get('uid');

	profiles_db.user.findById(userId).then(function(user) {
		if (!user) {
			res.status(404).json({
				"errors": "User not found"
			});
		} else {
			res.status(200).json(user.toPublicJSON());
		}
	}, function() {
		res.status(500).send();
	});
}

/** Request a check up providing partnerId, appointmentTime and description
 * 
 * @author: Nguyen Van Hoang
 *
 * URL: POST /requests
 *
 * @req:
 * _ body: JSON format of 2 properties description (not required) and appointmentTime (required)
 * _ header: 'Auth': valid token for login session  
 * 
 * @res:
 * - body: JSON format of properties:
 *   + userId: uid of the user
 *   + partnerId: uid of the partner
 *   + description: description of the request
 *   + status: status of the request (default is processing)
 *   + appointmentTime: estimated appointment time to meet the partner
 *   + createdAt and updatedAt
 */
exports.postRequests = function(req, res) {
	var body = _.pick(req.body, 'partnerId', 'description', 'appointmentTime');

	profiles_db.partner.findById(body.partnerId).then(function(partner) {
		if (!partner) {
			res.status(404).json({
				"errors": "Partner not found with provided Id"
			});
		} else {
			body.appointmentTime = Date.parse(body.appointmentTime);
			body.userId = req.user.get('uid');

			requests_db.request.create(body).then(function(request) {
				res.status(200).json(request.toPublicJSON());
			}, function(e) {
				res.status(400).json(e);
			});
		}
	}, function() {
		res.status(500).send();
	});
}

exports.getRequestsId = function(req, res) {
	var requestId = req.params.id;

    requests_db.request.findOne({
        where: {
            uid: requestId,
            userId: req.user.get('uid')
        }
    }).then(function(request) {
        if (!!request) {
            res.status(200).json(request.toJSON())
        } else {
            res.status(404).json({
                "errors": "Resquest not found"
            })
        }
    }, function() {
        res.status(500).send();
    });
}

exports.patchRequestsId = function(req, res) {
	var requestId = req.params.id;
    var body = _.pick(req.body, 'partnerId', 'description', 'appointmentTime', 'status');
    var attributes = {};

    if (body.hasOwnProperty('partnerId')) {
        attributes.partnerId = body.partnerId;
    }

    if (body.hasOwnProperty('description')) {
        attributes.description = body.description;
    }

    if (body.hasOwnProperty('appointmentTime')) {
        attributes.appointmentTime = Date.parse(body.appointmentTime);
    }

    if (body.hasOwnProperty('status') && (body.status === 'cancelled' || body.status === 'completed')) {
        attributes.status = body.status;
    }

    requests_db.request.findOne({
        where: {
            uid: requestId,
            userId: req.user.get('uid'),
            status: {
                $in: ['processing', 'accepted']
            }
        }
    }).then(function(request) {
        if (!request) {
            res.status(404).json({
                "errors": "Request not found or expired"
            });
        } else {
            var oldRequest = _.clone(request.toPublicJSON());
            var partnerEmail;

            profiles_db.partner.findById(request.partnerId).then(function(partner) {
                partnerEmail = partner.get('email');
            })

            attributes.lastUpdater = req.user.get('firstName') + " " + req.user.get('lastName');

            request.update(attributes).then(function(updatedRequest) {
                send_update_email(oldRequest, updatedRequest.toPublicJSON(), req.user.get('email')).then(function() {
                    console.log('partner email ' + partnerEmail);
                    send_update_email(oldRequest, updatedRequest.toPublicJSON(), partnerEmail).then(function() {
                        res.status(200).json(request.toPublicJSON());
                    }, function() {
                        console.log("Update email cannot be sent to GPPartner");
                        res.status(400).json({
                            "errors": "Update email cannot be sent to GPPartner"
                        });
                    });
                }, function() {
                    console.log("Update email cannot be sent to user");
                    res.status(400).json({
                        "errors": "Update email cannot be sent to user"
                    })
                })
            }, function(e) {
                console.log(e);
                res.status(400).json({
                    "errors": "Bad data provided"
                });
            })
        }
    })
}

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
exports.deleteUsersLogin = function (req, res) {
	req.token.destroy().then(function() { // Destroy current valid token for login session
        res.status(204).send();
    }).catch(function(e) {
        console.log(e);
        res.status(500).send();
    })
}