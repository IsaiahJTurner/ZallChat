var User = require("../models/User"),
	Setting = require("../models/Setting");
exports.home = function(req, res) {
	res.render('index', {
		page: 'Home',
		description: req.settings.description
	});
}
exports.messages = function(req, res) {
	if (!req.session || !req.session._user) res.redirect("/");
	User.find({
		owner: true
	}, function(err, users) {
		if (err) {
			console.log(err);
			return res.send("Unable to get chat owners.");
		}
		res.render('messages', {
			page: 'Messages',
			owners: users
		});
	});
}
exports.settings = function(req, res) {
if (req.session && req.session._user && req.session._user.admin) 
		res.render('settings', {
			page: 'Settings'
		});
}