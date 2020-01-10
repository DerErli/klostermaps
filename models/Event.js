const mongoose = require('mongoose');
const Schema = mongoose.Schema;

//Create Schema
const EventSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  keywords: [
    {
      key: { type: String },
      map: { type: Schema.Types.ObjectId },
      pos: { type: Number }
    }
  ],
  active: {
    type: Boolean,
    default: false
  }
});

module.exports = Event = mongoose.model('event', EventSchema);
