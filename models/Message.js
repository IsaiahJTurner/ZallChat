var mongoose = require('mongoose'),
  Schema = mongoose.Schema,
  ObjectId = Schema.ObjectId;

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

module.exports = mongoose.model('Message', schema);
