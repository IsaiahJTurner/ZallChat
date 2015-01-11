var Message = require("../models/Message"),
  badwords = require("../badwords");

exports.get = function(req, res) {
  if (!req.param("date")) {
    return res.json({
      success: false,
      error: {
        code: 19,
        message: "You must include a date."
      }
    });
  }
  query = {
    $or: [{
      deleted: null,
      created_at: {
        $lt: new Date(req.param("date"))
      }
    }, {
      deleted: false,
      created_at: {
        $lt: new Date(req.param("date"))
      }
    }]
  }
  Message.find(query).sort({
    created_at: -1
  }).limit(50).populate("_user").exec(function(err, messages) {
    if (err) {
      return res.json({
        success: false,
        error: {
          code: 7,
          message: "There was a database error."
        }
      });
    }
    var messagesStripped = new Array();
    for (var i = 0; i < messages.length; i++) {
      var message = messages[i];
      var userStripped = {
        name: message._user.name,
        profile: message._user.profile,
        username: message._user.username,
        chatting: message._user.chatting,
        owner: message._user.owner,
        online: message._user.online
        _id: message._user._id
      }
      var messageStripped = {
        text: message.text,
        _id: message._id,
        _user: userStripped
      }
      for (i = 0; i < badwords.list.length; i++) {
        var word = badwords.list[i];
        if (messageStripped.text.indexOf(word) > -1) {
          var stars = "";
          for (ii = 0; ii < word.length; ii++) {
            stars = stars + "*";
          }
          messageStripped.text = messageStripped.text.replace(word, stars);
        }
      }
      console.log(messageStripped);
      messagesStripped.push(messageStripped);
    }
    res.json({
      success: true,
      data: {
        messages: messagesStripped
      }
    });
  });
}