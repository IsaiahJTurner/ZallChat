var Setting = require("../models/Setting"),
  User = require("../models/User");

exports.update = function(req, res) {
  var key = req.param("key");
  var value = req.param("value");
  if (!req.session._user || !req.session._user.admin)
    return res.json({
      success: false,
      error: {
	        code: 15,
        message: "You must be logged in and be an admin to edit settings."
      }
    });
  if (req.session._user.admin == false)
    return res.json({
      success: false,
      error: {
        code: 16,
        message: "Only admins are allowed to perform this action."
      }
    });

  if (!req.param("key")) {
    res.json({
      success: false,
      error: {
        code: 17,
        message: "Please include a setting key to edit settings."
      }
    });
  }
  Setting.findOne({
    key: key
  }, function(err, setting) {
    if (err || !setting) {
      return res.json({
        success: false,
        error: {
          code: 18,
          message: "Could not find setting."
        }
      });
    }
    if (setting.type == "number") {
      setting.value = new Number(value);
    } else if (setting.type == "longtext") {
      setting.value = new String(value);
    } else if (setting.type == "text") {
      setting.value = new String(value);
    } else {
      setting.value = undefined;
      return res.json({
        success: false,
        error: {
          code: 1001,
          message: "Invalid setting type."
        }
      });
    }
    setting.save(function(err) {
      if (err) {
        return res.json({
          success: false,
          error: {
            code: 1000,
            message: "Unable to save setting."
          }
        });
      }
      res.json({
          success: true
        });
    })
  });
}
