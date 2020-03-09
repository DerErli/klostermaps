const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const { check, validationResult } = require('express-validator');

const Map = require('../models/Map');
const findPath = require('../scripts/pathfinding').findPath;

const router = express.Router();

// @route GET api/app/map
// @desc GET map by name from db
// @access Public
router.get(
  '/map/:name',
  [
    check('name')
      .isString()
      .escape()
  ],
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
    res.download(path.join(__dirname, '../userUploads', map.image.fileName));
  }
);

// @route GET api/app/navigate/:start/:end
// @desc GET path
// @access Public
router.post(
  '/navigate/:start/:end',
  [
    check('start')
      .isString()
      .escape(),
    check('end')
      .isString()
      .escape()
  ],
  async (req, res) => {
    //validation
    var errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const cachedKeywords = path.resolve('./userUploads', 'cachedKeywordsTmp.json');
    var keywords = fs.readJSONSync(cachedKeywords);
    keywords = JSON.parse(keywords);
    keywords = keywords.keywords;

    var start = keywords.find(key => {
      if (key.key == req.params.start) return true;
    });

    var end = keywords.find(key => {
      if (key.key == req.params.end) return true;
    });

    if (!start || !end) {
      var msg = `${!start ? 'Startpunkt - ' : ''}${!end ? 'Endpunkt - ' : ''}nicht gefunden`;
      return res.status(400).json({ msg });
    }

    var startMap = await Map.findById(start.map).select('name');
    var endMap = await Map.findById(start.map).select('name');

    var weg = findPath(startMap.name, start.pos, endMap.name, end.pos);
    if (!weg) {
      return res.json({ msg: `Kein Weg zwischen '${start.key}' und '${end.key}' gefunden!` });
    }

    var response = {};
    var map;
    let step = -1;
    for (node of weg) {
      if (node.data.map != map || !map) {
        map = node.data.map;
        step++;
        var filename = await Map.findById(map).select('mapFileName');
        response[step] = { mapFileName: filename.mapFileName, polyline: [], markers: [] };
        response[step].markers.push({ lat: node.data.lat, lng: node.data.lng, flag: 'start' });
      }
      response[step].polyline.push({ lat: node.data.lat, lng: node.data.lng });
      response[step].markers[1] = { lat: node.data.lat, lng: node.data.lng, flag: 'stairway' };
    }
    response[step].markers[1].flag = 'goal';
    return res.json(response);
  }
);

//.find({ $text: { $search: searchString }, accepted: true })

module.exports = router;
