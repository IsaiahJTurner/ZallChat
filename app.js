/*
 * Module dependencies
 */
if (!process.env.MONGOURL)
	require("./config");
var express = require('express'),
	ejs = require('ejs'),
	expressLayouts = require("express-ejs-layouts"),
	mongoose = require('mongoose'),
	routes = require("./routes"),
	fs = require("fs"),
	bodyParser = require('body-parser'),
	cookieParser = require('cookie-parser'),
	path = require('path'),
	Session = require("./models/Session"),
	User = require("./models/User"),
	Setting = require("./models/Setting"),
	Flutter = require('./routes/auth'),
	uuid = require('node-uuid'),
	multer  = require('multer'),
	io = require('socket.io-emitter')({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    pass: process.env.REDIS_PASSWORD
  })

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
app.use(multer({ dest: './tmp/'}))
app.use(bodyParser.urlencoded({
	extended: false
}));
app.use(expressLayouts);
app.use(cookieParser());
// app.use(express.logger('tiny'))

app.use(express.static(path.join(__dirname, 'public')));
app.use(function(req, res, next) {
	res.header("X-powered-by", "@IsaiahJTurner")
	next()
});

var minutes = 5,
	the_interval = minutes * 60 * 1000;
console.log("Error: the next mongo should be a find and set (not update) and should then emit the update to all clients.")

var setInactiveUsersOffline = function() {
	var time = new Date();
	time.setMinutes(time.setMinutes() - 25); // there is an inacuracy of 30 minutes if the server crashes, unfortunatly
	User.update({
		$or: [{
			$and: [
				{
					last_seen: {
						$lt: time
					}
				}, {
					online: true
				}
			]
		}, {
			last_seen: null
		}]
	}, {
		$set: {
			online: false
		}
	}, {
		multi: true
	}, function(err, numAffected) {
		if (numAffected > 0) console.log("THIS IS BAD! " + numAffected + " users were not marked as offline!");
	})
}
setInterval(setInactiveUsersOffline, the_interval); // run every minute
setInactiveUsersOffline();

// this will probably really fuck you up in the future and leave your running in circles.
// basically, with iOS web apps the standard res.redirect will leave the web app (that looks like a real app)
// and open in safari. by using a js redirect, the user stays in the app.
express.response.redirect = function(url) {
	this.send('<html><head><title>Redirect</title><script type="text/javascript"> location.href = "' + url + '";</script></head><body><a href="' + url + '">redirecting to ' + url + '</a></body></html>')
};
app.use(function(req, res, next) {
	function createSession() {
		var sid = uuid.v1();
		var session = new Session({
			sid: sid
		});
		session.save(function(err) {
			if (err) {
				console.log(err);
				return res.json({
					success: false,
					error: {
						code: 12,
						message: "Unable to save with your session."
					}
				});
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
		req.settings = settingsDict;
		res.locals({
			settings: settingsDict,
			session: req.session
		});
		next()
	});
});
app.use(function(req, res, next) {
	req.io = io;
	next();
});
var flutter = new Flutter({
	consumerKey: process.env.TWITTER_KEY,
	consumerSecret: process.env.TWITTER_SECRET,
	loginCallback: process.env.TWITTER_CALLBACK
});
app.get('/', routes.views.home);
app.get('/messages', routes.views.messages);
app.get('/settings', routes.views.settings);

app.post('/api/1.0/ping', routes.chat.ping);
app.post('/api/1.0/upload', routes.chat.upload);
app.get('/api/1.0/messages', routes.messages.get);
app.delete('/api/1.0/messages/:id', routes.messages.delete);

// deprecated method implementations
app.post('/settings', routes.settings.update);
app.get('/twitter', flutter.connect);
app.get('/twitter/logout', flutter.logout);
app.get('/twitter/callback', flutter.auth);
// future method implementations
app.post('/api/1.0/settings', routes.settings.update);
app.get('/api/1.0/twitter', flutter.connect);
app.get('/api/1.0/twitter/logout', flutter.logout);
app.get('/api/1.0/twitter/callback', flutter.auth);

var port = Number(process.env.PORT || 3000);
var server = app.listen(port, function() {
	console.log("Listening on " + port);
});
require("./socket.io").init(server);