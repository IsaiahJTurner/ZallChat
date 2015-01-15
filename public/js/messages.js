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
});
var fancyboxParams = {
  openEffect: 'elastic',
  closeEffect: 'elastic',

  helpers: {
    title: {
      type: 'inside'
    }
  }
};
$(".image-light").fancybox(fancyboxParams);

function newMessage(name, profile, text) {
  if (!("Notification" in window)) {
    console.log("This browser does not support desktop notification");
  } else if (Notification.permission === "granted") {
    var notification = new Notification(name, {
      icon: profile,
      body: $('<textarea/>').html(text).val()
    });
    notification.onclick = function(x) {
      window.focus();
    };
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
          body: $('<textarea/>').html(text).val()
        });
        notification.onclick = function(x) {
          window.focus();
        };
        setTimeout(function() {
          notification.close();
        }, 3000);
      }
    });
  }
}
var currentShape;

function scrollToBottom() {
  var width = window.innerWidth ||
    html.clientWidth ||
    body.clientWidth ||
    screen.availWidth;
  if (width >= 999)
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
  var h = window.innerHeight ||
    html.clientHeight ||
    body.clientHeight ||
    screen.availHeight;
  var w = window.innerWidth ||
    html.clientWidth ||
    body.clientWidth ||
    screen.availWidth;

  if (w <= 999)
    if (currentShape != "small")
      scrollToBottom();
  if (w > 999)
    if (currentShape != "large")
      scrollToBottom();
  currentShape = (w > 999) ? "large" : "small";
  $('#content').css("height", (h - 160));
  $("#reader, .messages").css("height", (h - 120 - $("#bar").height()));
  $('.users').css("height", (h - 86));
  $('.users').css("margin-top", -(h - 120 - $("#bar").height()));
};
window.setInterval(refreshDocHeight, 200);
refreshDocHeight();
$(document).on('click', '.image-light', function(e) {
  e.preventDefault();
  return false;
});
$(document).ready(scrollToBottom);
$(document).ready(function() {
  $("#message-input").focus();
});
$(document).keypress(function() {
  $("#message-input").focus();
});
$("#message-form").submit(function(e) {
  e.preventDefault();
  sendMessage();
});
$('#message-input').keyup(function(e) {
  if (e.keyCode == 13 && !e.ctrlKey && !e.altKey && !Modernizr.touch) {
    sendMessage();
  }
});

var lastMessage;

function disableInputs(boolean) {
  $('#message-input').attr("disabled", boolean);
  $('#message-file').attr("disabled", boolean);
  $('#send-button').attr("disabled", boolean);
  $('.upload-image').addClass((boolean ? "disabled" : "enabled"));
  $('.upload-image').removeClass((boolean ? "enabled" : "disabled"));
}

function processCommand(command, param) {
  switch (command) {
    case "help":
      {
        swal("Help", "There are lots of hidden features! Try out these commands.\n\nGeneral Commands\n/help - shows this menu\n/who - lists all users in the chat\n\nAdmin Only Commands\n/toggle [username] - toggles the chatting role of a user");
        break;
      }
    case "toggle":
      {
        socket.emit('toggle chatting', $("[data-username=" + param).attr("id"));
        break;
      }
    case "who":
      {
        var online = new Array();
        var offline = new Array();
        var visiting = new Array();
        var left = new Array();
        $("#chatting").children().each(function(user) {
          $user = $(this);
          console.log($user.html());
          if ($user.find(".status").hasClass("online")) {
            online.push($user);
          } else {
            offline.push($user);
          }
        });
        $("#visiting").children().each(function() {
          $user = $(this);
          if ($user.find(".status").hasClass("online")) {
            visiting.push($user);
          } else {
            left.push($user);
          }
        });
        var groups = [online, offline, visiting, left];
        var groupsStr = new Array();
        console.log(groups);
        for (i = 0; i < groups.length; i++) {
          var group = groups[i];
          var groupStr = "";
          for (ii = 0; ii < group.length; ii++) {
            var $user = group[ii];
            console.log($user);
            groupStr = groupStr + $user.attr("data-username") + ", ";
          }
          groupStr = groupStr.slice(0, -2);
          groupsStr[i] = groupStr;
        }
        swal("Group Members", "Online Users\n" + groupsStr[0] + "\n\nOffline Users\n" + groupsStr[1] + "\n\nVisiting Users\n" + groupsStr[2] + "\n\nRecently Left\n" + groupsStr[3]);
        socket.emit('who');
        break;
      }
    default:
      {
        sweetAlert("Command Not Found", "The command you entered does not exist!", "error");
      }
  }
  $('#message-input').val("");
  $("#message-file").val("");
  $(".upload-image").attr("src", "/static/img/camera.svg");
  disableInputs(false);
}

function sendMessage() {

  disableInputs(true);
  var text = $('#message-input').val();
  if (text.charAt(0) == "/") {
    var command = text.split(' ', 1)[0].replace('/', '');
    return processCommand(command, text.split(command + " ")[1])
  }
  var finishSend = function(image) {
    var thisMessage = $('#message-input').val();
    if ((lastMessage == thisMessage || thisMessage.length == 0) && !image) {
      disableInputs(false);
      return console.log("not ready to send");
    }
    socket.emit('send message', {
      text: thisMessage,
      image: image
    });
    $('#message-input').val("");
    lastMessage = thisMessage;
    setTimeout(function() {
      disableInputs(false);
      $("#message-input").focus();
    }, 200);
    $("#message-file").val("");
    $(".upload-image").attr("src", "/static/img/camera.svg");
  }
  if (!$('#message-file')[0].files[0])
    return finishSend();
  var server_endpoint = '/api/1.0/upload',
    server_var_name = 'file',
    filename = $('#message-file')[0].files[0].name;
  var successCallback = function(data) {
    data = JSON.parse(data);
    if (data["success"] == false) {
      disableInputs(false);
      return sweetAlert("Oops...", "Unable to upload your file.", "error");
    }

    finishSend(data["data"]["image"]);
  }
  var errorCallback = function() {
    alert("Unable to upload your file.");
    setTimeout(function() {
      disableInputs(false);
      $("#message-input").focus();
    }, 200);
  };
  var duringCallback = function(progressPercent) {
    console.log(progressPercent);
  };
  var customHeaders = {};
  jic.upload($(".upload-image")[0], server_endpoint, server_var_name, filename, successCallback, errorCallback, duringCallback, customHeaders);
}
$(".upload-image").error(function() {
  $("#message-file").val("");
  $(".upload-image").attr("src", "/static/img/camera.svg");
  sweetAlert("Oops...", "Error getting image. Try again?", "error");
});
$("#message-file").change(function(evt) {
  var target = evt.target || window.event.srcElement,
    file = target.files[0];

  if (FileReader && file) {
    var fr = new FileReader();
    fr.onload = function(event) {
      $(".upload-image").attr("src", event.target.result);
      console.log(file.type);
      if (file.type.match('image/jpeg') || file.type.match('image/jpg') || file.type.match('image/png') || file.type.match('image/pjpeg')) {
        setTimeout(function() { // reason for this delay is because ios is shit
          var source_image = $(".upload-image")[0],
            target_img = $(".upload-image")[0];

          var quality = 70,
            output_format = 'jpg';
          $(".upload-image").attr("src", jic.compress(source_image, quality, output_format).src);

        }, 1000);
      }
    }
    fr.readAsDataURL(file);
  } else {

    var error = "The file was selected but not compressed. Your location data may be included in your message. It is recommended that you do NOT send this message. This error will be desplayed 3 times.";
    sweetAlert("Error", error, "error");
  }
});

$(document).on("click", ".fancybox-wrap", function(e) {
  $.fancybox.close();
})
$("div[src]").css("background-image", function() {
  return "url('" + $(this).attr("src") + "')"
});

function renderMessageHTML(message) {
  var messageHTML = $('<div class="message"><a target="_blank" class="profileLink"><img draggable="true" ondragstart="drag(event)" class="profile" src=""></a><div class="main-content"><a class="name" href="#" target="_blank"></a><time is="relative-time" datetime="" class="time"></time><div class="message"><span class="body"></span></div></div></div>');
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
  messageHTML.find(".message .body").html(message.text);
  if (message.image) {
    var imageURL = 'https://s3-us-west-1.amazonaws.com/zallchat-shared-images/' + message.image;
    var imgElem = $('<a class="image-light" href="' + imageURL + '"><div src="' + imageURL + '"></div></a>');
    imgElem.find("div[src]").css('background-image', "url('" + imageURL + "')");
    imgElem.find(".image-light").fancybox(fancyboxParams);
    messageHTML.find(".message").prepend(imgElem);
  }
  return messageHTML;
}
socket.on("new message", function(message) {
  var messageHTML = renderMessageHTML(message);
  if ("@" + message._user.username != $("#username").html())
    newMessage(message._user.name, $("#" + message._user._id).find("img").attr("src"), message.text);
  $("#reader").append(messageHTML);
  location.href = "#" + message._id;
});
var updateTimestamps = function() {
  function timeDifference(current, previous) {

    var msPerMinute = 60 * 1000;
    var msPerHour = msPerMinute * 60;
    var msPerDay = msPerHour * 24;
    var msPerMonth = msPerDay * 30;
    var msPerYear = msPerDay * 365;

    var elapsed = current - previous;

    if (elapsed < msPerMinute) {
      var seconds = Math.round(elapsed / 1000);
      if (seconds < 30)
        return 'just now';
      return '30s';
    } else if (elapsed < msPerHour) {
      return Math.round(elapsed / msPerMinute) + 'm';
    } else if (elapsed < msPerDay) {
      return Math.round(elapsed / msPerHour) + 'h';
    } else if (elapsed < msPerMonth) {
      return Math.round(elapsed / msPerDay) + 'd';
    } else if (elapsed < msPerYear) {
      return Math.round(elapsed / msPerMonth) + ' months ago';
    } else {
      return Math.round(elapsed / msPerYear) + ' years ago';
    }
  }
  $("time").each(function(index) {
    var previous = new Date($(this).attr("datetime")),
      current = new Date();
    $(this).text(timeDifference(current, previous));
  })
}
setInterval(updateTimestamps, 200);
updateTimestamps();
$(document).on("click", "time, .message .message .body", function(e) {
  if (e.target.nodeName == "A") return;
  if (!$("#messages").hasClass("admin") && !$("#messages").hasClass("owner"))
    return console.log("Not admin.");
  var messageID = $(this).closest(".message[id]").attr("id");
  swal({
    title: "Are you sure?",
    text: "This message will be hidden from public view. A record of the message will be retained.",
    type: "warning",
    showCancelButton: true,
    confirmButtonColor: "#DD6B55",
    confirmButtonText: "Yes, delete it!",
    closeOnConfirm: false
  }, function() {
    $.ajax({
      type: "DELETE",
      url: '/api/1.0/messages/' + messageID,
      success: function(data, textStatus, jqXHR) {
        // reload. unable to fetch old messages.
        if (data["success"] == false || data["data"]["updated"] == 0) {
          return sweetAlert("Oops...", data["error"]["message"], "error");
        }
        swal({
          title: "Deleted!",
          text: "The message was deleted.",
          type: "success",
          timer: 2000
        });
      },
      error: function(jqXHR, textStatus, errorThrown) {
        // reload. unable to fetch old messages.
        console.log(errorThrown);
        swal({
          title: "Oops...",
          text: "Erorr deleting message. Try again?",
          type: "warning"
        }, function() {

        });
      }
    });
  });
});
var isLoadingOldMessages;
var checkIfShouldLoadNewMessages = function() {
  if (!$("#loading").is(":visible")) return; // if there isnt a loading indicator, dont load data
  var width = window.innerWidth ||
    html.clientWidth ||
    body.clientWidth ||
    screen.availWidth;
  if (($('#reader').scrollTop() < 160 && width > 999) || ($(document).scrollTop() < 150 && width <= 999)) {
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
      },
      success: function(data, textStatus, jqXHR) {
        // reload. unable to fetch old messages.
        if (data["success"] == false) {
          return sweetAlert("Oops...", data["error"]["message"], "error");
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
        swal({
          title: "Oops...",
          text: "Erorr getting messages. Refreshing.",
          type: "warning",
          closeOnConfirm: false
        }, function() {
          location.reload();
        });

      }
    });
  }
}
$('#reader').scroll(checkIfShouldLoadNewMessages);
$(document).scroll(checkIfShouldLoadNewMessages);

function insertUser(user) {
  var userHTML = $('<div class="user animated flash" id="' + user._id + '" data-username="' + user.username + '"><a target="_blank" class="profile-link"><img data-id="' + user._id + '" draggable="true" ondragstart="drag(event)" class="profile" src=""></a><a class="name" target="_blank"><span class="real-name"></span><div class="status"></div></a></div>');
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
socket.on('delete message', function(message) {
  $("#" + message).remove();
});
socket.on('remove user', function(user) {
  $("#" + user._id).remove();
});
var curVersion;
socket.on('current version', function(version) {
  if (curVersion && version != curVersion) {
    socket.disconnect();
    return swal({
      title: "ZallChat Updated",
      text: "ZallChat was just updated! Click below to refresh and take advantage of the new features!",
      type: "info",
      confirmButtonText: "Update ZallChat"
    }, function() {
      location.reload();
    });
  }
  if (typeof curVersion != 'undefined')
    swal({
      title: "",
      timer: 1
    });
  curVersion = version;
});
socket.on('notify', function(error) {
  if (error.code < 0) return console.log(error);
  if (error.code == 1) {
    $("#message-input").blur();
    $("#message-input").val(lastMessage);
    lastMessage = "";
  }
  if (error.code >= 50 && error.code < 60) {
    disableInputs(false);
  }
  swal({
    title: "Notification",
    text: error.message,
    type: error.type
  }, function() {
    if (error.redirect)
      window.location.href = error.redirect;
  });

});
socket.on('disconnect', function() {
  /*
  swal({
    title: "Lost Connection",
    text: "Lost connection to server. Rec.",
    type: "warning",
    closeOnConfirm: false
  }, function() {
    location.reload();
  });
*/
  // ping should be paused now
  waitForConnection();
});

function waitForConnection() {
  swal({
    title: "Lost connection!",
    text: "The connection to ZallChat was lost! Would you like to try to connect again?",
    type: "warning",
    confirmButtonColor: "#DD6B55",
    confirmButtonText: "Retry",
    closeOnConfirm: false
  }, function() {
    console.log(this);
    if (socket.connected)
      return swal({
        title: "",
        timer: 1
      });
    else
      waitForConnection();
  });
}
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

$(document).on("click", ".image-light", function(e) {
  e.preventDefault();
});