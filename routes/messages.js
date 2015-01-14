var Message = require("../models/Message"),
  badwords = require("../badwords"),
  mongoose = require("mongoose"),
  Autolinker = require('autolinker'),
  emo = require('emojize');
emo.base('https://github.com/ded/emojize/blob/master/sprite/')

exports.get = function(req, res) {
  if (typeof req.session._user === 'undefined') {
    return res.json({
      success: false,
      error: {
        code: 13,
        message: "Not logged in."
      }
    });
  }
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
        profile: message._user.profile.substr(message._user.profile.lastIndexOf(".") + 1),
        username: message._user.username,
        chatting: message._user.chatting,
        owner: message._user.owner,
        online: message._user.online,
        _id: message._user._id
      }
      var messageStripped = {
        text: message.text,
        _id: message._id,
        _user: userStripped,
        created_at: message.created_at
      }
      messageStripped.text = messageStripped.text.replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(new RegExp('\r?\n', 'g'), '<br />');
      if (message._user.owner || message._user.admin)
        messageStripped.text = Autolinker.link(messageStripped.text, {
          truncate: 25
        });
      if (message.image)
        messageStripped.image = message.image;
      for (ii = 0; ii < badwords.list.length; ii++) {
        var word = badwords.list[ii];
        if (messageStripped.text.toLowerCase().indexOf(word.toLowerCase()) > -1) {

          var stars = "";
          for (iii = 0; iii < word.length; iii++) {
            stars = stars + "*";
          }

          var regex = new RegExp("(" + word + ")", "gi");
          messageStripped.text = messageStripped.text.replace(regex, stars);
        }
      }
      messageStripped.text = emo.emojize(messageStripped.text);
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

exports.delete = function(req, res) {
  var message = req.param("id");
  if (!mongoose.Types.ObjectId.isValid(message) || typeof req.session._user === 'undefined' || (!req.session._user.admin && !req.session._user.owner))
    return res.json({
      success: false,
      error: {
        code: 40,
        message: "You are not an admin or an owner or your message id is invalid. Are you logged in?"
      }
    });
  Message.update({
    _id: message
  }, {
    deleted: true
  }).exec(function(err, numUpdated) {
    if (err) {
      console.log(err);
      return res.json({
        success: false,
        error: {
          code: 41,
          message: "Unable to update message."
        }
      });
    }
    req.io.emit("delete message", message);
    res.json({
      success: true,
      data: {
        updated: numUpdated
      }
    });
  });
}