var mongoose = require('mongoose'),
  Schema = mongoose.Schema,
  ObjectId = Schema.ObjectId;

var schema = new Schema({
  label: String, // for frontend editing
  key: {
    type: String,
    unique: true,
    lowercase: true
  }, // for easier dictionary access, no spaces pl0x
  type: String, // currently coded for admin panel: number, text, longtext
  // future types: date, time, datetime
  // future idea: allowing arrays of options by wrapping in []
  value: Schema.Types.Mixed,
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

module.exports = mongoose.model('Setting', schema);