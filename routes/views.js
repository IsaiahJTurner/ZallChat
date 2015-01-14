var User = require("../models/User"),
	Setting = require("../models/Setting"),
	Message = require("../models/Message"),
	badwords = require("../badwords"),
	Autolinker = require("autolinker"),
	emo = require('emojize');
emo.base('https://github.com/ded/emojize/blob/master/sprite/')

exports.home = function(req, res) {
	res.render('index', {
		page: 'Home',
		description: req.settings.description
	});
}
exports.old = function(req, res) {
	res.render('old', {
		page: 'Browser Outdated',
		description: req.settings.description
	});
}
exports.messages = function(req, res) {
	if (typeof req.session._user === 'undefined') return res.redirect("/");
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
		users.forEach(function(user) {
			user.profile = user.profile.substr(user.profile.lastIndexOf(".") + 1);
		});
		var visiting = new Array();
		var chatting = new Array();
		var owner = new Array();
		for (i = 0; i < users.length; i++) {
			var user = users[i];

			if (user.owner == false && user.chatting == false)
				visiting.push(user);
			else if (user.owner)
				owner.push(user);
			else
				chatting.push(user);
		}
		Message.find({
			$or: [{
				deleted: null
			}, {
				deleted: false
			}]
		}).sort({
			created_at: -1
		}).limit(50).populate("_user").exec(function(err, messages) {
			if (err) {
				return res.send("Error getting old messages");
			}
			messages.forEach(function(message) {
				message.text = message.text.replace(/&/g, '&amp;')
					.replace(/"/g, '&quot;')
					.replace(/'/g, '&#39;')
					.replace(/</g, '&lt;')
					.replace(/>/g, '&gt;').replace(new RegExp('\r?\n', 'g'), '<br />');
				if (message._user.owner || message._user.admin)
					message.text = Autolinker.link(message.text, {
						truncate: 25
					});
				message._user.profile = message._user.profile.substr(message._user.profile.lastIndexOf(".") + 1);
				for (ii = 0; ii < badwords.list.length; ii++) {
					var word = badwords.list[ii];
					if (message.text.toLowerCase().indexOf(word.toLowerCase()) > -1) {

						var stars = "";
						for (iii = 0; iii < word.length; iii++) {
							stars = stars + "*";
						}

						var regex = new RegExp("(" + word + ")", "gi");
						message.text = message.text.replace(regex, stars);
					}
				}
				message.text = emo.emojize(message.text);
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
	if (typeof req.session._user != 'undefined' && (req.session._user.admin || req.session._user.owner))
		res.render('settings', {
			page: 'Settings'
		});
}