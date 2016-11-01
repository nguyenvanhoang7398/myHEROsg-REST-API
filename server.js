// npm modules
var express = require('express');
var router = express.Router();
var bcrypt = require('bcrypt');
var _ = require('underscore');
var bodyParser = require('body-parser');
var nodemailer = require("nodemailer");

var profiles_db = require('./profiles_db.js');
var requests_db = require('./requests_db.js');
var middleware_user = require('./middleware/middleware_user.js')(profiles_db);
var middleware_admin = require('./middleware/middleware_admin.js')(profiles_db);
var middleware_partner = require('./middleware/middleware_partner.js')(profiles_db);

var userController = require('./controllers/user.js');

var send_verification_email = require('./emails/verify_email.js');
var send_update_email = require('./emails/inform_update.js');

var app = express();
var PORT = process.env.PORT || 3000; //PORT 3000 for local host, process.env.PORT for public server 

app.use(bodyParser.json());
app.use('/api', router);

// http methods

// Root API
// GET /
router.get('/', function(req, res) {
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
router.get('/gps', function(req, res) {
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
    }).then(function(filteredGPs) {
        res.status(200).json(filteredGPs);
    }, function() {
        res.status(500).send();
    });
});

/** Get GP information providing an ID
 *
 * @author: Nguyen Van Hoang
 *
 * URL: GET /gps/:id
 *
 * @params id: id of the GP
 * 
 * @res: 
 * _ body: JSON format of the GP information
 */
router.get('/gps/:id', function(req, res) {
    var gpId = req.params.id;

    profiles_db.gp.findbyId(gpId).then(function(gp) {
        if (!!gp) {
            res.status(200).json(gp);
        } else {
            res.status(404).json({
                "error": "GP not found with provided Id"
            });
        }
    }, function() {
        res.status(500).send();
    })
});

router.route('/users')
    .post(userController.postUsers);

router.route('/users/login')
    .post(userController.postUsersLogin)
    .delete(middleware_user.requireAuthentication, userController.deleteUsersLogin);

router.route('/verify')
    .get(userController.getVerify);

router.route('/me')
    .get(middleware_user.requireAuthentication, userController.getMe);

router.route('/history')
    .get(middleware_user.requireAuthentication, userController.getHistory);

router.route('/requests')
    .post(middleware_user.requireAuthentication, userController.postRequests);

router.route('/requests/:id')
    .get(middleware_user.requireAuthentication, userController.getRequestsId)
    .patch(middleware_user.requireAuthentication, userController.patchRequestsId);


// /** Create user account providing email and password, then send verification email
//  *
//  * @author: Nguyen Van Hoang
//  *
//  * URL: POST /users
//  * 
//  * @req: 
//  * _ body: JSON format of 2 properties email and password
//  * 
//  * @res: 
//  * - body: Pulic JSON format of created account
//  */
// router.post('/users', function(req, res) {
//     var body = _.pick(req.body, 'firstName', 'lastName', 'email', 'phone', 'password');

//     profiles_db.user.create(body).then(function(user) { // Create new user account
//         var host = req.get('host');
//         send_verification_email(body.email, host).then(function() {
//             res.status(200).json(user.toPublicJSON());
//         }, function(e) {
//             res.status(400).json({
//                 "errors": "Cannot send verification email"
//             });
//         });
//     }, function(e) {
//         res.status(400).json(e.errors);
//     });
// });

// /** Receive user verification from email
//  *
//  * @author: Nguyen Van Hoang
//  *
//  * URL: GET /verify
//  * 
//  * @res:
//  * _ body: Public JSON format of verified account
//  */
// router.get('/verify', function(req, res) {
//     var query = req.query;

//     if (query.hasOwnProperty('email') && query.email.length > 0) {
//         profiles_db.user.verifyEmail(query.email.toString()).then(function(user) {
//             user.update({
//                 verified: true
//             }).then(function(user) {
//                 res.status(200).json(user.toPublicJSON());
//             });
//         }, function(e) {
//             res.status(404).json({
//                 "errors": "This account does not exist or has been verified"
//             });
//         });
//     }
// })

// /** Login user account provding email and password
//  *
//  * @author: Nguyen Van Hoang
//  *
//  * URL: POST /users
//  * 
//  * @req: 
//  * _ body: JSON format of 2 properties email and password
//  *
//  * @res: 
//  * _ body: Public JSON format of login account
//  * _ header:
//  *   + 'Auth': valid token for login session
//  */
// router.post('/users/login', function(req, res) {
//     var body = _.pick(req.body, 'email', 'password');
//     var userInstance;

//     profiles_db.user.authenticate(body).then(function(user) { // authenticate user account
//         var token = user.generateToken('authentication');
//         userInstance = user;

//         return profiles_db.token.create({
//             token: token
//         });
//     }).then(function(tokenInstance) {
//         res.header('Auth', tokenInstance.get('token')).json(userInstance.toPublicJSON()); // send valid token for login session by 'Auth' header
//     }).catch(function(e) {
//         console.log(e);
//         res.status(401).send(e.errors);
//     });
// });

// /** Show all available requests providing user
//  *
//  * @author: Nguyen Van Hoang
//  * 
//  * URL: GET /history
//  *
//  * @query:
//  * _ userId: uid of the user
//  * _ status: status of the requests
//  * _ before: requests before a point of time
//  * _ after: requests after a point of time
//  * _ offset: Offset the list of returned results by this amount. Default is zero.
//  * _ limit: Number of items to retrieve. Default is 5, maximum is 30.
//  *
//  * @ res:
//  * _ body: 
//  *   + offset
//  *   + limit
//  *   + count: total number of requests
//  *   + requests: JSON format of all requests
//  * _ header: 'Auth': valid token for login session
//  */
// router.get('/history', middleware_user.requireAuthentication, function(req, res) {
//     var query = req.query;
//     var where = {
//         userId: req.user.get('uid')
//     };
//     var result = {
//         offset: 0,
//         limit: 5,
//         count: 0,
//         requests: []
//     }

//     if (query.hasOwnProperty('offset') && query.offset.length > 0) {
//         result.offset = parseInt(query.offset);
//     }

//     if (query.hasOwnProperty('limit') && parseInt(query.limit) < 30 && query.limit.length > 0) {
//         result.limit = parseInt(query.limit);
//     }

//     if (query.hasOwnProperty('partnerId') && query.userId.length > 0) {
//         where.partner = query.partnerId;
//     }

//     if (query.hasOwnProperty('status')) {
//         where.status = query.status;
//     };

//     if ((query.hasOwnProperty('after') && query.after.length > 0) || (query.hasOwnProperty('before') && query.before.length > 0)) {
//         where.appointmentTime = {};
//         if (query.hasOwnProperty('after')) {
//             where.appointmentTime.$gte = Date.parse(query.after);
//         }
//         if (query.hasOwnProperty('before')) {
//             where.appointmentTime.$lte = Date.parse(query.before);
//         }
//     }
    
//     requests_db.request.findAndCountAll({
//         where: where,
//         limit: result.limit,
//         offset: result.offset
//     }).then(function(filteredRequests) {
//         if(!filteredRequests) {
//             res.status(404).json({
//                 "errors": "Requests not found"
//             })
//         } else {
//             result.count = filteredRequests.count;
//             filteredRequests.rows.forEach(function(request) {
//                 result.requests.push(request);
//             });
//             res.status(200).json(result);
//         }
//     }, function() {
//         res.status(500).send();
//     })
// });

// router.get('/me', middleware_user.requireAuthentication, function(req, res) {
//     var userId = req.user.get('uid');

//     profiles_db.user.findById(userId).then(function(user) {
//         if (!user) {
//             res.status(404).json({
//                 "errors": "User not found"
//             });
//         } else {
//             res.status(200).json(user.toPublicJSON());
//         }
//     }, function() {
//         res.status(500).send();
//     });
// });

// /** Request a check up providing partnerId, appointmentTime and description
//  * 
//  * @author: Nguyen Van Hoang
//  *
//  * URL: POST /requests
//  *
//  * @req:
//  * _ body: JSON format of 2 properties description (not required) and appointmentTime (required)
//  * _ header: 'Auth': valid token for login session  
//  * 
//  * @res:
//  * - body: JSON format of properties:
//  *   + userId: uid of the user
//  *   + partnerId: uid of the partner
//  *   + description: description of the request
//  *   + status: status of the request (default is processing)
//  *   + appointmentTime: estimated appointment time to meet the partner
//  *   + createdAt and updatedAt
//  */
// router.post('/requests', middleware_user.requireAuthentication, function(req, res) {
//     var body = _.pick(req.body, 'partnerId', 'description', 'appointmentTime');

//     profiles_db.partner.findById(body.partnerId).then(function(partner) {
//         if (!partner) {
//             res.status(404).json({
//                 "errors": "Partner not found with provided Id"
//             });
//         } else {
//             body.appointmentTime = Date.parse(body.appointmentTime);
//             body.userId = req.user.get('uid');

//             requests_db.request.create(body).then(function(request) {
//                 res.status(200).json(request.toPublicJSON());
//             }, function(e) {
//                 res.status(400).json(e);
//             });
//         }
//     }, function() {
//         res.status(500).send();
//     });
// });

// router.get('/requests/:id', middleware_user.requireAuthentication, function(req, res) {
//     var requestId = req.params.id;

//     requests_db.request.findOne({
//         where: {
//             uid: requestId,
//             userId: req.user.get('uid')
//         }
//     }).then(function(request) {
//         if (!!request) {
//             res.status(200).json(request.toJSON())
//         } else {
//             res.status(404).json({
//                 "errors": "Resquest not found"
//             })
//         }
//     }, function() {
//         res.status(500).send();
//     });
// });

// router.patch('/request/:id', middleware_user.requireAuthentication, function(req, res) {
//     var requestId = req.params.id;
//     var body = _.pick(req.body, 'partnerId', 'description', 'appointmentTime', 'status');
//     var attributes = {};

//     if (body.hasOwnProperty('partnerId')) {
//         attributes.partnerId = body.partnerId;
//     }

//     if (body.hasOwnProperty('description')) {
//         attributes.description = body.description;
//     }

//     if (body.hasOwnProperty('appointmentTime')) {
//         attributes.appointmentTime = Date.parse(body.appointmentTime);
//     }

//     if (body.hasOwnProperty('status') && (body.status === 'cancelled' || body.status === 'completed')) {
//         attributes.status = body.status;
//     }

//     requests_db.request.findOne({
//         where: {
//             uid: requestId,
//             userId: req.user.get('uid'),
//             status: {
//                 $in: ['processing', 'accepted']
//             }
//         }
//     }).then(function(request) {
//         if (!request) {
//             res.status(404).json({
//                 "errors": "Request not found or expired"
//             });
//         } else {
//             var oldRequest = _.clone(request.toPublicJSON());
//             var partnerEmail;

//             profiles_db.partner.findById(request.partnerId).then(function(partner) {
//                 partnerEmail = partner.get('email');
//             })

//             attributes.lastUpdater = req.user.get('firstName') + " " + req.user.get('lastName');

//             request.update(attributes).then(function(updatedRequest) {
//                 send_update_email(oldRequest, updatedRequest.toPublicJSON(), req.user.get('email')).then(function() {
//                     console.log('partner email ' + partnerEmail);
//                     send_update_email(oldRequest, updatedRequest.toPublicJSON(), partnerEmail).then(function() {
//                         res.status(200).json(request.toPublicJSON());
//                     }, function() {
//                         console.log("Update email cannot be sent to GPPartner");
//                         res.status(400).json({
//                             "errors": "Update email cannot be sent to GPPartner"
//                         });
//                     });
//                 }, function() {
//                     console.log("Update email cannot be sent to user");
//                     res.status(400).json({
//                         "errors": "Update email cannot be sent to user"
//                     })
//                 })
//             }, function(e) {
//                 console.log(e);
//                 res.status(400).json({
//                     "errors": "Bad data provided"
//                 });
//             })
//         }
//     })
// });

// /** Logout user account
//  *
//  * @author
//  *
//  * URL: DELETE /users/login
//  * 
//  * @req:
//  * _ header:
//  *   + 'Auth': valid token for login session
//  */
// router.delete('/users/login', middleware_user.requireAuthentication, function(req, res) {
//     req.token.destroy().then(function() { // Destroy current valid token for login session
//         res.status(204).send();
//     }).catch(function(e) {
//         console.log(e);
//         res.status(500).send();
//     })
// });

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
router.post('/partners', function(req, res) {
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
router.post('/partners/login', function(req, res) {
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
})

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
router.get('/partners/requests', middleware_partner.requireAuthentication, function(req, res) {
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
});

router.get('/partners/requests/:id', middleware_partner.requireAuthentication, function(req, res) {
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
});

router.patch('/partners/request/:id', middleware_partner.requireAuthentication, function(req, res) {
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
});

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

router.delete('/partners/login', middleware_partner.requireAuthentication, function(req, res) {
    req.token.destroy().then(function() { // Destroy current valid token for login session
        res.status(204).send();
    }).catch(function(e) {
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
router.post('/admins', function(req, res) {
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
router.post('/admins/login', function(req, res) {
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
})

/** Show all available requests providing partner, users and point of time
 *
 * @author: Nguyen Van Hoang
 * 
 * URL: GET /partners/requests
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
router.get('/admins/requests', middleware_admin.requireAuthentication, function(req, res) {
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
router.get('/admins/users', middleware_admin.requireAuthentication, function(req, res) {
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
        if(!filteredUsers) {
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
router.get('/admins/partners', middleware_admin.requireAuthentication, function(req, res) {
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
        if(!filteredPartners) {
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
});

router.post('/admins/gps', middleware_admin.requireAuthentication, function(req, res) {
    var body = _.pick(req.body, 'gpName', 'phone', 'longitude', 'latitude');

    profiles_db.admin.create(body).then(function(admin) { // Create new admin account
        res.status(200).json(admin.toPublicJSON());
    }, function(e) {
        res.status(400).json(e.errors);
    });
});

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
router.delete('/admins/login', middleware_admin.requireAuthentication, function(req, res) {
    req.token.destroy().then(function() { // Destroy current valid token for login session
        res.status(204).send();
    }).catch(function(e) {
        console.log(e);
        res.status(500).send();
    })
});

profiles_db.sequelize.sync({
    force: true
}).then(function() {
    requests_db.sequelize.sync({
        force: true
    });
}).then(function() {
    app.listen(PORT, function() {
        console.log('Express listening on port ' + PORT + '!');
    });
});