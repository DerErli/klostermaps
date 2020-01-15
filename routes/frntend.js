const express = require('express');
const path = require('path');
const { header, validationResult } = require('express-validator');

const Map = require('../models/Map');

const router = express.Router();

// @route GET api/app/map
// @desc GET map by name from db
// @access Public
router.get(
  '/map',
  [
    header('map')
      .isString()
      .isLength({ max: 150 })
      .escape()
  ],
  async (req, res) => {
    //validation
    var errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    //get map
    var name = req.headers.map;
    var map = await Map.find({ name }).select('name image.fileName positions');

    if (map == []) {
      return res.json({ msg: `Map not found: ${name}` });
    }

    map = map[0];

    res.sendFile(path.resolve('./userUploads', map.image.fileName), {
      headers: {
        name: map.name,
        positions: map.positions.toString()
      }
    });
  }
);

// @route GET api/app/key
// @desc GET keyword/s from db
// @access Public

//.find({ $text: { $search: searchString }, accepted: true })

module.exports = router;
