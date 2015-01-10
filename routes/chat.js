exports.ping = function(req, res) {
  if (typeof req.session._user === 'undefined') {
    return res.json({
      success: false,
      error: {
        code: 13,
        message: "Not logged in."
      }
    });
  }
  req.session._user.last_seen = new Date();
  req.session._user.save(function(err, user) {
    if (err) {
      console.log(err);
      return res.json({
        success: false,
        error: {
          code: 12,
          message: "Unable to save user."
        }
      });
    }
    res.json({
      success: true
    });
  })

}