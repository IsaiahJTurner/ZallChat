var mongoose = require('mongoose'),
  Schema = mongoose.Schema,
  ObjectId = Schema.ObjectId,
  badwords = require("../badwords");

var schema = new Schema({
  text: String,
  _user: {
    type: ObjectId,
    ref: 'User'
  },
  deleted: Boolean,
  created_at: {
    type: Date
  },
  updated_at: {
    type: Date
  }
});

schema.pre('save', function(next) {
  now = new Date();
  this.updated_at = now;
  if (!this.created_at) {
    this.created_at = now;
  }
  next();
});
schema.method('toJSON', function() {
  var message = this.toObject();
  for (i = 0; i < badwords.list.length; i++) {
    var word = badwords.list[i];
    if (message.text.indexOf(word) > -1) {
      var stars = "";
      for (ii = 0; ii < word.length; ii++) {
        stars = stars + "*";
        console.log(stars);
      }
      message.text = message.text.replace(word, stars);
    }
  }
  return message;
});



module.exports = mongoose.model('Message', schema);