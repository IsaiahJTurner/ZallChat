var Message = require("../models/Message");
exports.get = function(req, res) {
  if (req.param("date")) {
    query = {
      "created_at": {
        $lt: new Date(req.param("date"))
      }
    }
  } else {
    query = new Object();
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
    res.json({
      success: true,
      data: {
        messages: messages
      }
    });
  });
}