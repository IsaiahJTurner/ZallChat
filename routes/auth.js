var OAuth = require('oauth').OAuth,
  Twitter = require('simple-twitter'),
  User = require("../models/User"),
  needle = require("needle"),
  s3 = require("s3"),
  fs = require("fs"),
  path = require("path"),
  temp_dir = path.join(process.cwd(), '../tmp/');

var s3Client = s3.createClient({
  maxAsyncS3: 20, // this is the default
  s3RetryCount: 3, // this is the default
  s3RetryDelay: 1000, // this is the default
  multipartUploadThreshold: 20971520, // this is the default (20 MB)
  multipartUploadSize: 15728640, // this is the default (15 MB)
  s3Options: {
    accessKeyId: process.env.AWS_KEY,
    secretAccessKey: process.env.AWS_SECRET
  },
});
var Flutter = module.exports = function(opts) {
  var self = this;

  self.opts = {

    // twitter consumer key
    consumerKey: null,

    // twitter consumer secret
    consumerSecret: null,

    // the URL to redirect to after twitter authorisation
    loginCallback: null,

    // the URL to redirect to after authorisation is complete and we have tokens
    // will not be used if authCallback is overridden
    completeCallback: null,

    // the connection callback to be called after a successful connect (required for error handling)
    connectCallback: function(req, res) {

      if (req.error) {
        return res.send('Error getting oAuth Request Token');
      }
    },
    authCallback: function(req, res, next) {
      if (req.error) {
        console.log(req.error);
        res.send(req.error);
        return;
      }
      twitter = new Twitter(process.env.TWITTER_KEY, process.env.TWITTER_SECRET, req.session.oauthAccessToken, req.session.oauthAccessTokenSecret, 0);
      twitter.get('account/verify_credentials', function(err, data) {
        if (typeof data === 'string') {
          data = JSON.parse(data);
        }
        if (err != null && err != undefined) {
          console.log("Verification error.");
          console.log(err);
          console.log(data);
          return res.send("Unable to get your information from Twitter.");
        }
        var user;
        User.findOne({
          twitterID: data.id
        }, function(err, user) {
          if (err) return res.send("Error looking up username.");

          if (!user) {
            user = new User({
              profile: data.profile_image_url_https,
              name: data.name,
              username: data.screen_name,
              twitterID: data.id,
              oauthAccessToken: req.session.oauthAccessToken,
              oauthAccessTokenSecret: req.session.oauthAccessTokenSecret
            });
            user.save(function(err, user) {
              if (err) {
                res.send("Unable to create your account.")
              }
              req.session._user = user;
              req.session.save(function(err, session) {
                if (err) {
                  console.log(err);
                  return res.send("Unable to link your twitter to your computer.");
                }
                res.redirect('/messages');
              })
            });
          } else {
            user.profile = data.profile_image_url_https;
            user.name = data.name;
            user.oauthAccessToken = req.session.oauthAccessToken,
              user.oauthAccessTokenSecret = req.session.oauthAccessTokenSecret;
            user.username = data.screen_name;
            user.twitterID = data.id;
            user.save(function(err, user) {
              if (err) {
                console.log(err);
                return res.send("Unable to update your profile with your new Twitter information.");
              }
              req.session._user = user;
              req.session.save(function(err, session) {
                if (err) {
                  console.log(err);
                  return res.send("Unable to link your twitter to your computer.");
                }
                res.redirect('/messages');
              })
            })
          }
          data.profile_image_url_https = data.profile_image_url_https.replace('normal', 'bigger');
          if (data.profile_image_url_https != user.profile) {
            if (!fs.existsSync(temp_dir))
              fs.mkdirSync(temp_dir);
            needle.get(data.profile_image_url_https, {
              output: temp_dir + user._id,
              follow: true
            }, function(error, response, imageData) {
              if (error)
                return console.log(error, response, imageData, "error downloading " + data.profile_image_url_https);

              var params = {
                localFile: temp_dir + user._id,

                s3Params: {
                  Bucket: "zallchat-profile-pictures",
                  Key: user._id + "." + data.profile_image_url_https.substr(data.profile_image_url_https.lastIndexOf(".") + 1)
                },
              };
              var uploader = s3Client.uploadFile(params);
              uploader.on('error', function(err) {
                console.error("unable to upload:", err.stack);
              });
              uploader.on('progress', function() {
                console.log("progress", uploader.progressMd5Amount,
                  uploader.progressAmount, uploader.progressTotal);
              });
              uploader.on('end', function() {
                var userStripped = {
                  name: user.name,
                  profile: user.profile.substr(user.profile.lastIndexOf(".") + 1),
                  username: user.username,
                  chatting: user.chatting,
                  owner: user.owner,
                  online: user.online,
                  _id: user._id
                }
                req.io.emit("update user", userStripped);
                req.io.socket.emit("update user", user)
                console.log("done uploading");
              });

            });
          }
        });
      });
    }
  }

  // option overrides
  for (var i in opts) {

    // allow for 1st level nesting nice overrides
    if (typeof opts[i] === 'object') {
      if (typeof self.opts[i] !== 'object') self.opts[i] = opts[i];
      for (var j in opts[i]) {
        self.opts[i][j] = opts[i][j];
      }
      continue;
    }
    self.opts[i] = opts[i]
  }


  self.oauth = new OAuth(
    "https://twitter.com/oauth/request_token",
    "https://twitter.com/oauth/access_token",
    self.opts.consumerKey,
    self.opts.consumerSecret,
    "1.0A",
    self.opts.loginCallback,
    "HMAC-SHA1"
  );

  // Bind these to self, so they can be used without binding
  self.connect = self.connect.bind(self);
  self.auth = self.auth.bind(self);
  self.logout = self.logout.bind(self);
};

Flutter.prototype.connect = function(req, res, next) {
  var self = this;

  self.oauth.getOAuthRequestToken(function(err, token, secret) {
    if (err) {
      req.error = err;
      return self.opts.connectCallback(req, res, next);
    }

    req.session.oauthRequestToken = token;
    req.session.oauthRequestTokenSecret = secret;
    req.session.save(function(err, session) {
      if (err) {
        res.json({
          error: "Unable to set up your computer for chatting. Try again?"
        })
      }
      self.opts.connectCallback(req, res, next);
      res.redirect('https://api.twitter.com/oauth/authenticate?oauth_token=' + token)
    });
  });
};

Flutter.prototype.auth = function(req, res, next) {
  var self = this;

  self.oauth.getOAuthAccessToken(req.session.oauthRequestToken, req.session.oauthRequestTokenSecret, req.query.oauth_verifier, function(err, accessToken, accessTokenSecret, results) {
    if (err) {
      req.error = err;
      req.results = results;
      self.opts.authCallback(req, res, next);
    } else {

      req.session.oauthAccessToken = accessToken;
      req.session.oauthAccessTokenSecret = accessTokenSecret;
      req.session.save(function(err, session) {
        if (err) {
          res.json({
            error: "Unable to save your login information. Try again?"
          })
        }
        req.results = results;
        self.opts.authCallback(req, res, next);
      });
    }
  });
};

Flutter.prototype.logout = function(req, res) {
  var self = this;

  req.session.remove(function(err) {
    if (err) {
      return res.json({
        error: 'Something went wrong when trying to log out.'
      });
    }

    res.redirect("/");
  });
}