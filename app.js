/*
 * Module dependencies
 */
var express = require('express'),
	ejs = require('ejs'),
	expressLayouts = require("express-ejs-layouts"),
	mongoose = require('mongoose'),
	routes = require("./routes"),
	fs = require("fs"),
	bodyParser = require('body-parser'),
	cookieParser = require('cookie-parser'),
	sass = require('node-sass-middleware'),
	path = require('path'),
	Session = require("./models/Session"),
	User = require("./models/User"),
	Setting = require("./models/Setting"),
	Flutter = require('./Flutter'),
	uuid = require('node-uuid'),
	cookie = require('cookie'),
	Message = require('./models/Message');
	if (!process.env.MONGOURL)
		require("./config");
fs.readdirSync("./routes").forEach(function(file) {
	require("./routes/" + file);
});
mongoose.connect(process.env.MONGOURL);
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback() {
	console.log("Database opened.");
});
var app = express()
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views')
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
	extended: false
}));
app.use(expressLayouts);
app.use(cookieParser());
app.use(express.logger('dev'))
app.use(sass({
	src: __dirname + '/public/sass',
	dest: __dirname + '/public/css',
	prefix: '/css',
	debug: true
}));
app.use(express.static(path.join(__dirname, 'public')));
app.use(function(req, res, next) {
	res.header("X-powered-by", "@IsaiahJTurner")
	next()
});
app.use(function(req, res, next) {
	function createSession() {
		var sid = uuid.v1();
		var session = new Session({
			sid: sid
		});
		session.save(function(err) {
			if (err) {
				res.json({
					success: false,
					error: {
						code: 12,
						message: "Unable to save with your session."
					}
				});
				next();
				return;
			}
			req.session = session;
			res.cookie('sid', sid);
			next();
		});
	}
	if (typeof req.cookies === 'undefined' || typeof req.cookies.sid === 'undefined') {
		createSession();
	} else {
		Session.findOne({
			sid: req.cookies.sid
		}).populate('_user').exec(function(err, session) {
			if (!session || err) {
				createSession();
			} else {
				req.session = session;
				next();
			}
		});
	}
});
app.use(function(req, res, next) {
	Setting.find(function(err, settings) {
		if (err) return res.send("Error in app. Section: 2");
		var settingsDict = new Object();
		for (i in settings) {
			var setting = settings[i];
			var key = setting.key;
			settingsDict[key] = setting;
		}
		console.log(settingsDict);
		req.settings = settingsDict;
		res.locals({
			settings: settingsDict,
			session: req.session
		});
		next()
	});
});
var flutter = new Flutter({
	consumerKey: process.env.TWITTER_KEY,
	consumerSecret: process.env.TWITTER_SECRET,
	loginCallback: 'http://zallchat.isaiah.tv/twitter/callback'
});
app.get('/', routes.views.home);
app.get('/messages', routes.views.messages);
app.get('/settings', routes.views.settings);

app.post('/settings', routes.settings.update);

app.get('/twitter', flutter.connect);
app.get('/twitter/logout', flutter.logout);
app.get('/twitter/callback', flutter.auth);
var port = Number(process.env.PORT || 3000);
var server = app.listen(port, function() {
	console.log("Listening on " + port);
});
/*

	BEGIN MESSAGING CODE

*/
var io = require('socket.io')(server);
io.on('connection', function(socket) {
	var cookies = cookie.parse(socket.handshake.headers['cookie']);
	if (!cookies || !cookies.sid) {
		return socket.disconnect('unauthorized');
	} else {
		Session.findOne({
			sid: cookies.sid
		}).populate('_user').exec(function(err, session) {
			if (!session || err || !session._user) {
				return socket.disconnect('unauthorized');
			} else {
				if (!session._user.online) {
					session._user.online = true;
					if (session._user.socket)
						if (io.sockets.connected[session._user.socket]) {
						console.log("bye bye" +io.sockets.connected[session._user.socket]);
							io.sockets.connected[session._user.socket].disconnect('logged in somewhere else');
						}
							
					session._user.socket = socket.id;
					session._user.save(function(err, user) {
						if (err) {
							console.log(err);
							return socket.emit('notify', {
								message: "Unable to update your status to online.",
								code: 3,
								redirect: "/messages"
							});
						}
						if (session._user.chatting) io.sockets.emit('update user', user);
						else io.sockets.emit('add user', user);
					});
				}
				socket.on('disconnect', function() {
					if (session && session._user) {
						session._user.online = false;
						session._user.save(function(err, user) {
							if (err) {
								console.log(err);
							}
							if (session._user.chatting) io.sockets.emit('update user', user);
							else io.sockets.emit('remove user', user);
						});
					}
					console.log('disconnected user');
				});
				socket.on('update session', function() {
					Session.findOne({
			sid: cookies.sid
		}).populate('_user').exec(function(err, newSession) {
			if (!session || err || !session._user) {
				return socket.disconnect('unauthorized');
			} else {
				// user is logged in
				 session = newSession;
				 console.log(newSession);
				}
				});
				});
				socket.on("toggle chatting", function(userID) {
					if (session && session._user && session._user.admin) {
						User.findOne({
							_id: userID
						}, function(err, user) {
							if (err) {
								console.log(err);
								return socket.emit("notify", {
									message: "Unable to get the user.",
									code: 9,
									redirect: "/messages"
								});
							}
							if (user.owner)
								return socket.emit("notify", {
									message: "You can't edit the group owner.",
									code: 11
								});
							else if (user._id == session._user._id)
								return socket.emit("notify", {
									message: "You can't edit yourself.",
									code: 12
								});
							user.chatting = !user.chatting;
							if (io.sockets.connected[user.socket])
								io.sockets.connected[user.socket].disconnect('logged in somewhere else');
								
							user.save(function(err, user) {
								if (err) {
									console.log(err);
									return socket.emit("notify", {
										message: "Unable to get the user.",
										code: 10,
										redirect: "/messages"
									});
								}
								console.log("changing")
								io.sockets.emit('update user', user);
							});
						});
					}
				});
				Message.find().sort({
					created_at: -1
				}).limit(50).populate("_user").exec(function(err, messages) {
					if (err) {
						return socket.emit('notify', {
							message: "There was a database error.",
							code: 6,
							redirect: "/messages"
						});
					}
					socket.emit('old messages', messages);
					socket.on("old messages", function(date) {
						Message.find({
							"created_at": {
								$lt: new Date(date)
							}
						}).sort({
							created_at: -1
						}).limit(50).populate("_user").exec(function(err, messages) {
							if (err) {
								return socket.emit('notify', {
									message: "There was a database error.",
									code: 7,
									redirect: "/messages"
								});
							}
							socket.emit('old messages', messages);
						});
					});
				});
				User.find({
					$or: [{
						chatting: true
					}, {
						online: true
					}]
				}).exec(function(err, users) {
					socket.emit('users list', users);
				});
				socket.on('send message', function(text) {
					if (!session._user.chatting) return socket.emit('notify', {
						message: "Hello there beautiful person who wants to chat! Literally same because I want to hear what you have to say! I pick a few random people from Twitter to join the chat so just give me some time to get to you!",
						code: 1
					});
					var message = new Message({
						_user: session._user,
						text: text
					});
					message.save(function(err, message) {
						if (err) {
							return socket.emit("notify", {
								message: "Couldn't send the message.",
								code: 2,
								redirect: "/messages"
							});
						}
						Message.populate(message, {
							path: "_user"
						}, function(err, message) {
							if (err) {
								return socket.emit('notify', {
									message: "Could not get your information.",
									code: 2,
									redirect: "/messages"
								});
							}
							io.sockets.emit('new message', message);
						});
					})
				});
			}
		});
	}
	socket.on('disconnect', function() {
		console.log('disconnected');
	});
});