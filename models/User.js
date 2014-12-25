var mongoose = require('mongoose'),
  Schema = mongoose.Schema,
  ObjectId = Schema.ObjectId;

var schema = new Schema({
  name: String,
  profile: String,
  username: String,
  socket: String,
  twitterID: Number,
  chatting: { type: Boolean, default: false },
  owner: { type: Boolean, default: false },
  online: { type: Boolean, default: false },
  admin: { type: Boolean, default: false },
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

module.exports = mongoose.model('User', schema);
