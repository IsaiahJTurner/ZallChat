/*
  BEGIN MESSAGING CODE
*/
var exports = module.exports = {
  init: function(server) {
    var io = require('socket.io')(server);
    var cookie = require('cookie'),
      Message = require('./models/Message'),
      Session = require("./models/Session"),
      User = require("./models/User"),
      badwords = require("./badwords"),
  emo = require('emojize');
emo.base('https://github.com/ded/emojize/blob/master/sprite/')

    var redisAdapter = require('socket.io-redis');
    var redis = require('redis'),
      Autolinker = require("autolinker");
    var pub = redis.createClient(process.env.REDIS_PORT, process.env.REDIS_HOST);
    pub.auth(process.env.REDIS_PASSWORD);
    var sub = redis.createClient(process.env.REDIS_PORT, process.env.REDIS_HOST, {
      detect_buffers: true
    });
    sub.auth(process.env.REDIS_PASSWORD);
    var redisClient = redis.createClient(process.env.REDIS_PORT, process.env.REDIS_HOST);
    redisClient.auth(process.env.REDIS_PASSWORD);

    io.set('transports', [
      'websocket'
    ]);
    io.adapter(redisAdapter({
      pubClient: pub,
      subClient: sub
    }));
    var permissions = new Object();
    io.on('connection', function(socket) {
      var cookies = cookie.parse(socket.handshake.headers['cookie']);
      if (!cookies || !cookies.sid) {
        return console.log('unauthorized');
      }
      Session.findOne({
        sid: cookies.sid
      }).populate('_user').exec(function(err, session) {
        if (!session || err || !session._user) {
          return console.log('unauthorized');
        }
        if (!session._user.online) {
          session._user.online = true;
          console.log(session._user.socket);
          console.log(socket.id);
          /*  this is strange code. my original idea was that you could only be logged
              in to one place at a time because otherwise there are "status": 
              online issues but i gave up. this is a bug. if someone knows a fix to disconnect
              a client by it's id let me know. it has to work over redis is the main issue.
              the hacky fix i use is in the client js. if the client is marked as offline
              it sends a ping to fix it. shit fix but it works.
          */
          if (session._user.socket) {
            //socket.broadcast.to(session._user.socket).disconnect('logged in somewhere else');
          }
        }
        session._user.socket = socket.id;
        session._user.save(function(err, user) {
          var userStripped = {
            name: user.name,
            profile: user.profile.substr(user.profile.lastIndexOf(".") + 1),
            username: user.username,
            chatting: user.chatting,
            owner: user.owner,
            online: user.online,
            _id: user._id
          }
          if (err) {
            console.log(err);
            return socket.emit('notify', {
              message: "Unable to update your status to online.",
              code: 3,
              type: 'error',
              redirect: "/messages"
            });
          }
          if (session._user.chatting)
            io.sockets.emit('update user', userStripped);
          else
            io.sockets.emit('add user', userStripped);
          redisClient.set("user:" + session._user._id, (session._user.chatting) ? 1 : 0); // 1 = chatting; 0 = visitor

        });
        socket.on('disconnect', function() {
          if (session && session._user) {
            session._user.online = false;
            session._user.save(function(err, user) {
              if (err) {
                console.log(err);
              }
              var userStripped = {
                name: user.name,
                profile: user.profile.substr(user.profile.lastIndexOf(".") + 1),
                username: user.username,
                chatting: user.chatting,
                owner: user.owner,
                online: user.online,
                _id: user._id
              }
              redisClient.get("user:" + session._user._id, function(err, reply) {
                if (reply == 1) io.sockets.emit('update user', userStripped);
                else io.sockets.emit('remove user', userStripped);
              });

            });
          }
          console.log('disconnected user');
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
                  redirect: "/messages",
                  type: 'error'
                });
              }
              if (user.owner)
                return socket.emit("notify", {
                  message: "You can't edit the group owner.",
                  code: 11,
                  type: 'error'
                });
              else if (user._id == session._user._id)
                return socket.emit("notify", {
                  message: "You can't edit yourself.",
                  code: 12,
                  type: 'error'
                });
              redisClient.set("user:" + user._id, (user.chatting) ? 0 : 1); // 1 = chatting; 0 = visitor
              user.chatting = !user.chatting;
              user.save(function(err, user) {
                if (err) {
                  console.log(err);
                  return socket.emit("notify", {
                    message: "Unable to get the user.",
                    code: 10,
                    redirect: "/messages",
                    type: 'error'
                  });
                }
                var userStripped = {
                  name: user.name,
                  profile: user.profile.substr(user.profile.lastIndexOf(".") + 1),
                  username: user.username,
                  chatting: user.chatting,
                  owner: user.owner,
                  online: user.online,
                  _id: user._id
                }
                io.sockets.emit('update user', userStripped);
              });
            });
          }
        });
        socket.on('send message', function(data) {
          redisClient.get("user:" + session._user._id, function(err, reply) {
            if (reply != 1 && !session._user.admin && !session._user.owner) // if not chatting and not an owner or admin
              return socket.emit('notify', {
              message: "Hello there beautiful person who wants to chat! Literally same because I want to hear what you have to say! I pick a few random people from Twitter to join the chat so just give me some time to get to you!",
              code: 50,
              type: 'warning'

            });
            for (var word in badwords.bannedWords) {
              if (Object.prototype.hasOwnProperty.call(badwords.bannedWords, word)) {
                if (data["text"].toLowerCase().indexOf(word.toLowerCase()) > -1) {
                  return socket.emit('notify', {
                    message: badwords.bannedWords[word],
                    code: 51,
                    type: 'error'

                  });
                }
              }
            }

            var message = new Message({
              _user: session._user,
              text: data["text"]
            });
            if (session._user.admin || session._user.owner)
              message["image"] = data["image"];
            message.save(function(err, message) {
              if (err) {
                return socket.emit("notify", {
                  message: "Couldn't send the message.",
                  code: 52,
                  redirect: "/messages",
                  type: 'error'
                });
              }
              Message.populate(message, {
                path: "_user"
              }, function(err, message) {
                if (err) {
                  return socket.emit('notify', {
                    message: "Could not get your information.",
                    code: 53,
                    redirect: "/messages",
                    type: 'error'
                  });
                }
                var userStripped = {
                  name: message._user.name,
                  profile: message._user.profile.substr(message._user.profile.lastIndexOf(".") + 1),
                  username: message._user.username,
                  chatting: message._user.chatting,
                  owner: message._user.owner,
                  online: message._user.online,
                  _id: message._user._id
                }
                var messageStripped = {
                  text: message.text,
                  _user: userStripped,
                  _id: message._id,
                  created_at: message.created_at
                }
                messageStripped.text = messageStripped.text.replace(/&/g, '&amp;')
                  .replace(/"/g, '&quot;')
                  .replace(/'/g, '&#39;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;');
                messageStripped.text = Autolinker.link(messageStripped.text, {
                  truncate: 25
                });
                for (ii = 0; ii < badwords.list.length; ii++) {
                  var word = badwords.list[ii];
                  if (messageStripped.text.toLowerCase().indexOf(word.toLowerCase()) > -1) {
                    socket.emit('notify', {
                      message: "Woah there! Let's try to think of a nicer word than " + word + ".",
                      code: 54,
                      type: 'warning'
                    });
                    var stars = "";
                    for (iii = 0; iii < word.length; iii++) {
                      stars = stars + "*";
                    }

                    var regex = new RegExp("(" + word + ")", "gi");
                    messageStripped.text = messageStripped.text.replace(regex, stars);
                  }
                }
                message.text = emo.emojize(message.text);
                if (message.image)
                  messageStripped.image = message.image;
                io.sockets.emit('new message', messageStripped);
              });
            });
          });
        });
      });
      socket.on('disconnect', function() {
        console.log('disconnected');
      });
    });
  }
};