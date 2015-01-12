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

var socket = io({
  transports: ['websocket']
}); // we use this everywhere so might as well put it at the top

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
    setTimeout(function() {
      notification.close();
    }, 3000);
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
        setTimeout(function() {
          notification.close();
        }, 3000);
      }
    });
  }

}
var currentShape;

function scrollToBottom() {
  if ($(window).width() >= 999)
    var $cont = $(document);
  else
    var $cont = $('#content .messages #reader');
  document.location = "#" + $("#reader").children().last().attr("id");
  $cont[0].scrollTop = $cont[0].scrollHeight;
  setTimeout(function() {
    document.location = "#" + $("#reader").children().last().attr("id");
    $cont[0].scrollTop = $cont[0].scrollHeight;
  }, 200);
}
var refreshDocHeight = function() {
  var h = $(window).height();
  var w = $(window).width();
  if (w <= 999)
    if (currentShape != "small")
      scrollToBottom();
  if (w > 999)
    if (currentShape != "large")
      scrollToBottom();
  currentShape = (w > 999) ? "large" : "small";
  $('#content, .messages, #reader').css("height", (h - 160));
  $('.users').css("height", (h - 86));
  $('.users').css("margin-top", -(h - 160));
};
window.setInterval(refreshDocHeight, 200);
refreshDocHeight();


$(document).ready(scrollToBottom);

$("#message-form").submit(function(e) {
  e.preventDefault();
  sendMessage();
});
$('#message-input').keyup(function(e) {
  if (e.keyCode == 13) {
    sendMessage();
  }
}).focus();

var lastMessage;
function disableInputs(boolean) {
  $('#message-input').attr("disabled", boolean);
  $('#message-file').attr("disabled", boolean);
  $('#send-button').attr("disabled", boolean);
  $('.upload-image').addClass((boolean ? "disabled" : "enabled"));
  $('.upload-image').removeClass((boolean ? "enabled" : "disabled"));
}
function sendMessage() {
  disableInputs(true);
  var finishSend = function(image) {
    var thisMessage = $('#message-input').val();
    if ((lastMessage == thisMessage || thisMessage.length == 0) && !image) return console.log("not ready to send");
    socket.emit('send message', {
      text: thisMessage,
      image: image
    });
    $('#message-input').val("");
    lastMessage = thisMessage;
    setTimeout(function() { disableInputs(false); $("#message-input").focus(); }, 200);
    $("#message-file").val("");
    $(".upload-image").attr("src", "/img/camera.svg");
  }
  if (!$('#message-file')[0].files[0])
    return finishSend();
  var server_endpoint = '/api/1.0/upload',
    server_var_name = 'file',
    filename = "image.jpg";
  var successCallback = function(data) {
    data = JSON.parse(data);
    if (data["success"] == false)
      return alert("Unable to upload your file.");;
    finishSend(data["data"]["image"]);
  }
  var errorCallback = function() {
    alert("Unable to upload your file.");
    setTimeout(function() { disableInputs(false); $("#message-input").focus(); }, 200);
    $("#message-input").focus();
  };
  var duringCallback = function(progressPercent) {
    console.log(progressPercent);
  };
  var customHeaders = {};
  jic.upload($(".upload-image")[0], server_endpoint, server_var_name, filename, successCallback, errorCallback, duringCallback, customHeaders);
}

$("#message-file").change(function(evt) {
  var tgt = evt.target || window.event.srcElement,
    files = tgt.files;

  // FileReader support
  if (FileReader && files && files.length) {
    var fr = new FileReader();
    fr.onload = function() {
      $(".upload-image").attr("src", fr.result);
      var source_image = $(".upload-image")[0],
        target_img = $(".upload-image")[0];

      var quality = 70,
        output_format = 'jpg';
        $(".upload-image").attr("src", jic.compress(source_image, quality, output_format).src);
    }
    fr.readAsDataURL(files[0]);
  } else {

    var error = "The file was selected but not compressed. Your location data may be included in your message. It is recommended that you do NOT send this message. This error will be desplayed 3 times.";
    alert(error);
    alert(error);
    alert(error);
  }
});

function renderMessageHTML(message) {
  var messageHTML = $('<div class="message animated fadeIn"><a target="_blank" class="profileLink"><img draggable="true" ondragstart="drag(event)" class="profile" src=""></a><div class="main-content"><a class="name" href="#" target="_blank"></a><time is="relative-time" datetime="" class="time"></time><div class="message"></div></div></div>');
  messageHTML.attr("id", message._id);
  messageHTML.find(".profile").attr("src", "https://s3-us-west-1.amazonaws.com/zallchat-profile-pictures/" + message._user._id + "." + message._user.profile).attr("data-id", message._user._id).error(function() {
    $(this).attr("src", "http://www.gravatar.com/avatar/" + $(this).attr("data-id") + "?d=retro&f=y");
  });
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
  if (message.image) {
    var imgElem = $("<img src='https://s3-us-west-1.amazonaws.com/zallchat-shared-images/" + message.image + "'>");
    messageHTML.find(".message").prepend(imgElem);
  }
  return messageHTML;
}
socket.on("new message", function(message) {
  var messageHTML = renderMessageHTML(message);
  if ("@" + message._user.username != $("#username").html())
    newMessage(message._user.name, message._user.profile, message.text);
  $("#reader").append(messageHTML);
  location.href = "#" + message._id;
});
var isLoadingOldMessages;
$("time").timeago();
var checkIfShouldLoadNewMessages = function() {
  if (!$("#loading").is(":visible")) return; // if there isnt a loading indicator, dont load data
  if (($('#reader').scrollTop() < 160 && $(window).width() > 999) || ($(document).scrollTop() < 150 && $(window).width() <= 999)) {
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
        alert("Erorr getting messages. Refreshing.");
        location.reload();
      }
    });
  }
}
$('#reader').scroll(checkIfShouldLoadNewMessages);
$(document).scroll(checkIfShouldLoadNewMessages);

function insertUser(user) {
  var userHTML = $('<div class="user animated flash" id="' + user._id + '""><a target="_blank" class="profile-link"><img data-id="' + user._id + '" draggable="true" ondragstart="drag(event)" class="profile" src=""></a><a class="name" target="_blank"><span class="real-name"></span><div class="status"></div></a></div>');
  if ("@" + user.username == $("#username").html() && !user.owner)
    userHTML.addClass("me");
  else if (user.owner)
    userHTML.addClass("owner")
  userHTML.find(".profile").attr("src", "https://s3-us-west-1.amazonaws.com/zallchat-profile-pictures/" + user._id + "." + user.profile).error(function() {
    $(this).attr("src", "http://www.gravatar.com/avatar/" + $(this).attr("data-id") + "?d=retro&f=y");
  });
  userHTML.find(".profile-link").attr("href", "https://twitter.com/" + user.username);
  userHTML.find(".name").attr("href", "https://twitter.com/" + user.username);
  userHTML.find(".real-name").text(user.name);
  if (user.online)
    userHTML.find(".status").addClass("online");
  else
    userHTML.find(".status").addClass("offline");
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
    // this is a hacky fix. i talk about it in socket.io.js
    if (!user.online)
      ping();
  }
  $("#" + user._id).remove();
  insertUser(user)

  $("._" + user._id).find(".name").removeClass("me owner visitor");
  console.log(user.chatting);
  if (user.chatting == false)
    $("._" + user._id).find(".name").addClass("visitor");
  else if (user.owner)
    $("._" + user._id).find(".name").addClass("owner");
  else if ("@" + user.username == $("#username").html())
    $("._" + user._id).find(".name").addClass("me");
});
$(".profile").error(function() {
  $(this).attr("src", "http://www.gravatar.com/avatar/" + $(this).attr("data-id") + "?d=retro&f=y");
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
  if (error.code == 1) {
    $("#message-input").blur();
    $("#message-input").val(lastMessage);
    lastMessage = "";
  }
  alert(error.message);
  if (error.redirect)
    window.location.href = error.redirect;
});
socket.on('disconnect', function() {
  var ping = function() {
    console.log("Disconnected, won't ping.")
  };
  alert("Lost connection to server. Reloading page.");
  location.reload();
});

$('.upload-image').bind("click", function() {
  $('#message-file').click();
});

function allowDrop(e) {
  e.preventDefault();
}

function drag(e) {
  var elem = $(e.target);
  e.dataTransfer.setData("user_id", elem.attr("data-id"));
}

function drop(e) {
  e.preventDefault();
  var user_id = e.dataTransfer.getData("user_id");
  if (user_id.length < 1) return console.log(user_id);
  socket.emit('toggle chatting', user_id);
}