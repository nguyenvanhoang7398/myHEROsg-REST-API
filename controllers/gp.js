var _ = require('underscore');

var profiles_db = require.main.require('./profiles_db.js');
var requests_db = require.main.require('./requests_db.js');

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
exports.getGps = function (req, res) {
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
}

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
exports.getGpsId = function (req, res) {
	var gpId = req.params.id;

    profiles_db.gp.findById(gpId).then(function(gp) {
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
}