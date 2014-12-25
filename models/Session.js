var mongoose = require('mongoose'),
  Schema = mongoose.Schema,
  ObjectId = Schema.ObjectId;

var schema = new Schema({
  destroyed: Boolean,
  sid: String,
  _user: {
    type: ObjectId,
    ref: 'User'
  },
  oauthRequestTokenSecret: String,
  oauthRequestToken: String,
  oauthAccessToken: String,
  oauthAccessTokenSecret: String,
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

module.exports = mongoose.model('Session', schema);