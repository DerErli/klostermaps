const mongoose = require('mongoose');
const Schema = mongoose.Schema;

//Create Schema
const CardSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  image: {
    data: String,
    contentType: String,
    fileName: String
  },
  positions: [
    {
      id: { type: Number },
      posx: { type: Number },
      posy: { type: Number }
    }
  ]
});

module.exports = Card = mongoose.model('card', CardSchema);
