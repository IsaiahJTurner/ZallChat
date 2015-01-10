var ping = function() {
  $.ajax({
    type: "POST",
    url: '/api/1.0/ping',
    complete: function() {
      setTimeout(function() {
        ping();
      }, 300000); // ping every 5 minutes
    }
  });
};
ping();

var socket = io(); // we use this everywhere so might as well put it at the top

/*

  Keeps the left body and right sidebar in their place.

*/

function newMessage(name, profile, text) {
  if (!("Notification" in window)) {
    alert("This browser does not support desktop notification");
  } else if (Notification.permission === "granted") {
    var notification = new Notification(name, {
      icon: profile,
      body: text
    });
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission(function(permission) {

      if (!('permission' in Notification)) {
        Notification.permission = permission;
      }

      if (permission === "granted") {
        var notification = new Notification(name, {
          icon: profile,
          body: text
        });
      }
    });
  }

}
var refreshDocHeight = function() {
  var h = $(window).height();
  // I'm not actually sure why this code works but it does so let's be happy and move on. ;)
  $('#content, .messages, #reader').css("height", (h - 150));
  $('.users').css("height", (h - 86));
  $('.users').css("margin-top", -(h - 150));
};
window.setInterval(refreshDocHeight, 200);
/*

  Keeps the chat scrolled to the bottom.

*/
var $cont = $('#content .messages #reader');
$cont[0].scrollTop = $cont[0].scrollHeight;
$('#message-input').keyup(function(e) {
  if (e.keyCode == 13) {
    sendMessage();
  }
}).focus();

setTimeout(function() {
  $cont[0].scrollTop = $cont[0].scrollHeight;
}, 200);
$("#message-form").submit(function(e) {
  e.preventDefault();
  sendMessage();
});
var lastMessage;

function sendMessage() {
  var thisMessage = $('#message-input').val();
  if (lastMessage == thisMessage || thisMessage.length == 0) return;
  socket.emit('send message', thisMessage);
  $('#message-input').val("");
  lastMessage = thisMessage;
}

function renderMessageHTML(message) {
  var messageHTML = $('<div class="message"><a target="_blank" class="profileLink"><img class="profile" src=""></a><div class="main-content"><a class="name" href="#" target="_blank"></a><time is="relative-time" datetime="" class="time"></time><div class="message"></div></div></div>');
  messageHTML.attr("id", message._id);
  messageHTML.find(".profile").attr("src", message._user.profile);
  messageHTML.find(".profileLink").attr("href", "https://twitter.com/" + message._user.username);
  messageHTML.find(".name").text(message._user.name).attr("href", "https://twitter.com/" + message._user.username);
  messageHTML.addClass("_" + message._user._id);
  if (message._user.chatting == false)
    messageHTML.find(".name").addClass("visitor");
  else if (message._user.owner)
    messageHTML.find(".name").addClass("owner");
  else if ("@" + message._user.username == $("#username").html())
    messageHTML.find(".name").addClass("me");
  messageHTML.find(".time").attr("datetime", message.created_at);
  messageHTML.find(".message").text(message.text);
  return messageHTML;
}
socket.on("new message", function(message) {
  var messageHTML = renderMessageHTML(message);
  if ("@" + message._user.username != $("#username").html())
    newMessage(message._user.name, message._user.profile, message.text);
  $("#reader").append(messageHTML);
  $cont[0].scrollTop = $cont[0].scrollHeight;
});
$cont[0].scrollTop = $cont[0].scrollHeight;
var isLoadingOldMessages;
$("time").timeago();
$('#reader').scroll(function() {
  console.log("l");
  if (!$("#loading").is(":visible")) return; // if there isnt a loading indicator, dont load data
  if ($('#reader').scrollTop() < 160) {
    if (isLoadingOldMessages) return;
    isLoadingOldMessages = true;
    var topMessage = $($("#reader").children()[1]).attr("id");
    $.ajax({
      type: "GET",
      url: '/api/1.0/messages?date=' + $($("#reader").children()[1]).find(".time").attr("datetime"),
      complete: function() {
        setTimeout(function() {
          ping();
        }, 300000); // ping every 5 minutes
        isLoadingOldMessages = false;
        location.href = "#" + topMessage;
        $("time").timeago();
      },
      success: function(data, textStatus, jqXHR) {
        // reload. unable to fetch old messages.
        if (data["success"] == false) {
          return alert(data["error"]["message"]);
        }
        if (data["data"]["messages"].length < 50) {
          $("#loading").hide();
        }
        for (i = 0; i < data["data"]["messages"].length; i++) {
          var message = data["data"]["messages"][i];
          $("#loading").after(renderMessageHTML(message));
        }
      },
      error: function(jqXHR, textStatus, errorThrown) {
        // reload. unable to fetch old messages.
        console.log(errorThrown);
        alert("Erorr getting messages. Try refreshing.");
      }
    });
  }
});

function insertUser(user) {
  var userHTML = $('<div class="user"><a target="_blank" class="profile-link"><img draggable="true" ondragstart="drag(event)" class="profile" src=""></a><a class="name" target="_blank"><span class="real-name"></span><div class="status"></div></a></div>');
  userHTML.attr("id", user._id);
  if ("@" + user.username == $("#username").html() && !user.owner)
    userHTML.addClass("me");
  else if (user.owner)
    userHTML.addClass("owner")
  userHTML.find(".profile").attr("src", user.profile);
  userHTML.find(".profile-link").attr("href", "https://twitter.com/" + user.username);
  userHTML.find(".name").attr("href", "https://twitter.com/" + user.username);
  userHTML.find(".real-name").text(user.name);
  if (user.online)
    userHTML.find(".status").addClass("online");
  else
    userHTML.find(".status").addClass("offline");
  if (user.chatting == false)
    $('<style>#content .messages #reader .message._' + user._id + ' .main-content .name { color: #B0B0B0; }</style>').appendTo('body');
  $("#reader .message._ .name" + ' + user._id + ').css("color", "");
  if (user.owner) {
    if ($("#chatting").find(".user.me").length > 0)
      userHTML.insertAfter($("#chatting").find(".user.me").last());
    else
      $("#chatting").prepend(userHTML);
  } else if (user.chatting) {
    if ("@" + user.username == $("#username").html() && !user.owner)
      $("#chatting").prepend(userHTML);
    else
      $("#chatting").find(".user.owner").last().after(userHTML);
  } else {
    if ($("#visiting").find(".user.me").length > 0) {
      $("#visiting").find(".user.me").after(userHTML);
    } else {
      $("#visiting").prepend(userHTML);
    }
  }
}
socket.on('users list', function(users) {
  users.forEach(function(user) {
    $("#" + user._id).remove();
    insertUser(user);
  });
});
var chatting;
socket.on('update user', function(user) {
  if ("@" + user.username == $("#username").html()) {
    if (typeof chatting === 'undefined') chatting = user.chatting;
    else if (user.chatting != chatting) {
      console.log(user);

      chatting = user.chatting;
      if (chatting) {
        $("#message-input").attr("placeholder", "Say something!");
      } else {
        $("#message-input").attr("placeholder", "Say something...");
      }
    }
  }
  $("." + user._id).find(".name").removeClass("owner visitor");
  console.log(user.chatting);
  if (user.chatting == false)
    $("." + user._id).find(".name").addClass("visitor");
  else if (user.owner)
    $("." + user._id).find(".name").addClass("owner");
  $("#" + user._id).remove();
  insertUser(user)
});
socket.on('add user', function(user) {
  $("#" + user._id).remove();
  insertUser(user)
});
socket.on('remove user', function(user) {
  $("#" + user._id).remove();
});
socket.on('notify', function(error) {
  if (error.code < 0) return console.log(error);
  alert(error.message);
  if (error.redirect)
    window.location.href = error.redirect;
});
socket.on('disconnect', function() {
  alert("Lost connection to server. Reloading page.");
  location.reload();
});


function allowDrop(e) {
  e.preventDefault();
}

function drag(e) {
  var elem = $(e.target);
  e.dataTransfer.setData("user_id", elem.closest(".user").attr("id"));
}

function drop(e) {
  e.preventDefault();
  var user_id = e.dataTransfer.getData("user_id");
  console.log(user_id);
  socket.emit('toggle chatting', user_id);
}