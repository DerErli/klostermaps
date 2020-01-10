const mongoose = require('mongoose');
const Schema = mongoose.Schema;

//Create Schema
const CardSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  image: {
    type: String,
    required: true
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
