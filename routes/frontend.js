const express = require('express');
const path = require('path');
const { header, validationResult } = require('express-validator');

const Map = require('../models/Map');

const router = express.Router();

// @route GET api/app/map
// @desc GET map by name from db
// @access Public
router.get(
  '/map/:name',
  async (req, res) => {
    //validation
    var errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    //get map
    var name = req.params.name;
    var map = await Map.find({ name }).select('name image.fileName positions');

    if (!map[0]) {
      return res.json({ msg: `Map not found: ${name}` });
    }

    map = map[0];
    res.download(path.join(__dirname, '../userUploads', map.image.fileName))
  }
);

// @route GET api/app/key
// @desc GET keyword/s from db
// @access Public

//.find({ $text: { $search: searchString }, accepted: true })

module.exports = router;
