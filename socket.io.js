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
      badwords = require("./badwords");
    var redisAdapter = require('socket.io-redis');
    var redis = require('redis');
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
          if (session._user.socket) {
            console.log("s");
            socket.broadcast.to(session._user.socket).disconnect('logged in somewhere else');
          }
        }
        session._user.socket = socket.id;
        session._user.save(function(err, user) {
          var userStripped = {
            name: user.name,
            profile: user.profile,
            username: user.username,
            chatting: user.chatting,
            owner: user.owner,
            online: user.online
          }
          if (err) {
            console.log(err);
            return socket.emit('notify', {
              message: "Unable to update your status to online.",
              code: 3,
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
                profile: user.profile,
                username: user.username,
                chatting: user.chatting,
                owner: user.owner,
                online: user.online
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
              redisClient.set("user:" + user._id, (user.chatting) ? 0 : 1); // 1 = chatting; 0 = visitor
              user.chatting = !user.chatting;
              user.save(function(err, user) {
                if (err) {
                  console.log(err);
                  return socket.emit("notify", {
                    message: "Unable to get the user.",
                    code: 10,
                    redirect: "/messages"
                  });
                }
                var userStripped = {
                  name: user.name,
                  profile: user.profile,
                  username: user.username,
                  chatting: user.chatting,
                  owner: user.owner,
                  online: user.online
                }
                io.sockets.emit('update user', user);
              });
            });
          }
        });
        socket.on('send message', function(text) {
          redisClient.get("user:" + session._user._id, function(err, reply) {
            console.log(reply);
            if (reply != 1) // if not chatting
              return socket.emit('notify', {
              message: "Hello there beautiful person who wants to chat! Literally same because I want to hear what you have to say! I pick a few random people from Twitter to join the chat so just give me some time to get to you!",
              code: 1
            });

            // naughty content handling

            for (i = 0; i < badwords.list.length; i++) {
              var word = badwords.list[i];
              if (text.indexOf(word) > -1) {
                socket.emit('notify', {
                  message: "Woah there! Let's try to think of a nicer word than " + word + ".",
                  code: 2
                });

              }
            }



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
                var userStripped = {
                  name: message._user.name,
                  profile: message._user.profile,
                  username: message._user.username,
                  chatting: message._user.chatting,
                  owner: message._user.owner,
                  online: message._user.online
                }
                var messageStripped = {
                  text: message.text,
                  _user: userStripped
                }
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