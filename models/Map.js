const mongoose = require('mongoose');
const Schema = mongoose.Schema;

//Create Schema
const CardSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  mapFileName: {
    type: String
  },
  mapRawImage: {
    data: String,
    contentType: String
  },
  dimensions: {
    width: { type: Number },
    height: { type: Number }
  },
  markers: [
    {
      id: { type: Number },
      position: { type: Object },
      roomType: { type: String },
      stairwayDetails: { type: Object }
    }
  ],
  polylines: [{ nodes: { type: Array } }]
});

module.exports = Card = mongoose.model('card', CardSchema);
