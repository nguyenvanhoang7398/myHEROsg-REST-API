var _ = require('underscore');

var profiles_db = require.main.require('./profiles_db.js');
var requests_db = require.main.require('./requests_db.js');

var send_update_email = require.main.require('./emails/inform_update.js');

exports.postPartners = function (req, res) {
	var body = _.pick(req.body, 'partnerName', 'email', 'address', 'phone', 'password');

    profiles_db.partner.create(body).then(function(partner) { // Create new partner account
        res.status(200).json(partner.toPublicJSON());
    }, function(e) {
        res.status(400).json(e.errors);
    });
}

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
exports.postPartnersLogin = function (req, res) {
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
    }).catch(function(e) {
        console.log(e);
        res.status(401).send();
    });
}

/** Show all available requests providing partner
 *
 * @author: Nguyen Van Hoang
 * 
 * URL: GET /partners/requests
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
exports.getPartnersRequests = function (req, res) {
	var query = req.query;
    var where = {
        partnerId: req.partner.get('uid')
    };
    var result = {
        offset: 0,
        limit: 5,
        count: 0,
        requests: []
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
        if(!filteredRequests) {
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

exports.getPartnersRequestsId = function (req, res) {
	var requestId = req.params.id;

    requests_db.request.findOne({
        where: {
            uid: requestId,
            partnerId: req.partner.get('uid')
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

exports.patchPartnersRequestsId = function (req, res) {
	var requestId = req.params.id;
    var body = _.pick(req.body, 'GPResponse', 'appointmentTime', 'status');
    var attributes = {};

    if (body.hasOwnProperty('GPResponse')) {
        attributes.GPResponse = body.GPResponse;
    }

    if (body.hasOwnProperty('status') && (body.status === 'cancelled' || body.status === 'completed' || body.status === 'accepted')) {
        attributes.status = body.status;
    }

    requests_db.request.findOne({
        where: {
            uid: requestId,
            partnerId: req.partner.get('uid'),
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
            var userEmail;

            profiles_db.user.findById(request.userId).then(function(user) {
                userEmail = user.get('email');
            })

            attributes.lastUpdater = req.partner.get('partnerName');

            request.update(attributes).then(function(updatedRequest) {
                send_update_email(oldRequest, updatedRequest.toPublicJSON(), userEmail).then(function() {
                    send_update_email(oldRequest, updatedRequest.toPublicJSON(), req.partner.get('email')).then(function() {
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
exports.deletePartnersLogin = function (req, res) {
	req.token.destroy().then(function() { // Destroy current valid token for login session
        res.status(204).send();
    }).catch(function(e) {
        console.log(e);
        res.status(500).send();
    })
}
