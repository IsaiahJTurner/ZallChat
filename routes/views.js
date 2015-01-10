var User = require("../models/User"),
	Setting = require("../models/Setting"),
	Message = require("../models/Message"),
	badwords = require("../badwords");
exports.home = function(req, res) {
	res.render('index', {
		page: 'Home',
		description: req.settings.description
	});
}
exports.messages = function(req, res) {
	if (!req.session || !req.session._user) res.redirect("/");
	User.find({
		$or: [{
			online: true
		}, {
			owner: true
		}, {
			chatting: true
		}]
	}).where("_id").ne(req.session._user._id).exec(function(err, users) {
		if (err) {
			console.log(err);
			return res.send("Unable to get chat owners.");
		}
		var visiting = new Array();
			var chatting = new Array();
			var owner = new Array();
		for (i = 0; i < users.length; i++) {
			var user = users[i];
			console.log(user._id)
			

			if (user.owner == false && user.chatting == false)
				visiting.push(user);
			else if (user.owner)
				owner.push(user);
			else
				chatting.push(user);
		}
		Message.find().sort({
			created_at: -1
		}).limit(50).populate("_user").exec(function(err, messages) {
			if (err) {
				return res.send("Error getting old messages");
			}
			messages.forEach(function(message) {
				for (i = 0; i < badwords.list.length; i++) {
					var word = badwords.list[i];
					if (message.text.indexOf(word) > -1) {
						var stars = "";
						for (ii = 0; ii < word.length; ii++) {
							stars = stars + "*";
						}
						message.text = message.text.replace(word, stars);
					}
				}
			})
			res.render('messages', {
				page: 'Messages',
				chatting: chatting,
				visiting: visiting,
				owner: owner,
				messages: messages.reverse()
			});
		});

	});
}
exports.settings = function(req, res) {
	if (req.session && req.session._user && req.session._user.admin)
		res.render('settings', {
			page: 'Settings'
		});
}