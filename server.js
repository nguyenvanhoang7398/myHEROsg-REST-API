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
var partnerController = require('./controllers/partner.js');
var adminController = require('./controllers/admin.js');
var gpController = require('./controllers/gp.js');

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

// /** Get the list of all GPs and query for their availability, name and phone number
//  * 
//  * @author: Nguyen Van Hoang
//  * 
//  * URL: GET /gps?available=true&q=name&phone=123456
//  * 
//  * @query available: availability of the GP
//  * @query q: name of the GP
//  * @query phone: phone number of the GP
//  *
//  * @res: 
//  * _ body: JSON format of filtered GPs
//  */
// router.get('/gps', function(req, res) {
//     var query = req.query;
//     var where = {}; // create 'where' object to find GP

//     if (query.hasOwnProperty('available') && query.available === 'true') { // check and add 'available' property to 'where' object
//         where.available = true;
//     } else if (query.hasOwnProperty('available') && query.available === 'false') {
//         where.available = false;
//     }

//     if (query.hasOwnProperty('q') && query.q.length > 0) { // check and add 'gpName' property to 'where' object
//         where.gpName = {
//             $like: '%' + query.q + '%'
//         };
//     }

//     if (query.hasOwnProperty('phone') && query.phone.length > 0) { // check and add 'phone' property to 'where' object
//         where.phone = {
//             $like: '%' + query.phone + '%'
//         };
//     }

//     profiles_db.gp.findAll({
//         where: where // find GP with 'where' object
//     }).then(function(filteredGPs) {
//         res.status(200).json(filteredGPs);
//     }, function() {
//         res.status(500).send();
//     });
// });

// /** Get GP information providing an ID
//  *
//  * @author: Nguyen Van Hoang
//  *
//  * URL: GET /gps/:id
//  *
//  * @params id: id of the GP
//  * 
//  * @res: 
//  * _ body: JSON format of the GP information
//  */
// router.get('/gps/:id', function(req, res) {
//     var gpId = req.params.id;

//     profiles_db.gp.findbyId(gpId).then(function(gp) {
//         if (!!gp) {
//             res.status(200).json(gp);
//         } else {
//             res.status(404).json({
//                 "error": "GP not found with provided Id"
//             });
//         }
//     }, function() {
//         res.status(500).send();
//     })
// });

router.route('/gps')
    .get(gpController.getGps);

router.route('/gps/:id')
    .get(gpController.getGpsId);

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

router.route('/partners')
    .post(partnerController.postPartners);

router.route('/partners/login')
    .post(partnerController.postPartnersLogin)
    .delete(middleware_partner.requireAuthentication, partnerController.deletePartnersLogin);

router.route('/partners/requests')
    .get(middleware_partner.requireAuthentication, partnerController.getPartnersRequests);

router.route('/partners/requests/:id')
    .get(middleware_partner.requireAuthentication, partnerController.getPartnersRequestsId)
    .patch(middleware_partner.requireAuthentication, partnerController.patchPartnersRequestsId);

router.route('/admins')
    .post(adminController.postAdmins);

router.route('/admins/login')
    .post(adminController.postAdminsLogin)
    .delete(middleware_admin.requireAuthentication, adminController.deleteAdminsLogin);

router.route('/admins/users')
    .get(middleware_admin.requireAuthentication, adminController.getAdminsUsers);

router.route('/admins/partners')
    .get(middleware_admin.requireAuthentication, adminController.getAdminsPartners);

router.route('/admins/requests')
    .get(middleware_admin.requireAuthentication, adminController.getAdminsRequests);

router.route('/admins/gps')
    .post(middleware_admin.requireAuthentication, adminController.postAdminsGps);

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