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
router.get(
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
    console.log(weg);

    /**
     * Beispiel Array für die Rückgabe der Navigation:
     * Die Indices 0, 1, 2... entspricht Schritt Nr. 1, 2, 3... wenn mehrere Schritte erforderlich sind.
     * Jeder Schritt hat eine Map die angezeigt wird und die Polylines die dein Pathfinding ausrechnet, jeweils die Eckpunkte (gleiche Art wie sie auch
     * abgespeichert werden).
     * Wenn es einen nächsten Schritt gibt dann auch ein Array mit Markern die zB das Treppenhaus markieren.
     * Im Frontend kann ich dann durch jeden Schritt loopen bis der Nutzer am Ziel ist.
     */
    return res.json({
      0: {
        mapFileName: '43bab25f-2340-4499-aacd-2782de11de73.jpeg',
        polylines: [
          [
            { Lat: 12, Lng: 30 },
            { Lat: 20, Lng: 24 }
          ], // oder wie auch immer polylines abgespeichert sind
          [
            { Lat: 12, Lng: 30 },
            { Lat: 20, Lng: 24 }
          ],
          [
            { Lat: 12, Lng: 30 },
            { Lat: 20, Lng: 24 }
          ]
        ],
        markers: [
          { pos: { Lat: 12, Lng: 25 }, roomType: 'stairway', key: 'Treppenhaus' } // oder wie auch immer marker abgespeichert sind
        ]
      },
      1: {
        mapFileName: 'kljojkgidhjndrj.jpg',
        polylines: [
          [
            { Lat: 12, Lng: 30 },
            { Lat: 20, Lng: 24 }
          ],
          [
            { Lat: 12, Lng: 30 },
            { Lat: 20, Lng: 24 }
          ],
          [
            { Lat: 12, Lng: 30 },
            { Lat: 20, Lng: 24 }
          ]
        ],
        markers: [{ pos: { Lat: 12, Lng: 25 }, roomType: 'stairway', key: 'Treppenhaus' }]
      }
    });
  }
);

//.find({ $text: { $search: searchString }, accepted: true })

module.exports = router;
