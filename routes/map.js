const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const uuid = require('uuid/v4');
const path = require('path');
const mv = require('mv');
var probe = require('probe-image-size');
const { header, body, validationResult } = require('express-validator');

const Map = require('../models/Map');
const webTkn = require('../config/keys').webTkn;

const router = express.Router();

// @route POST api/map
// @desc POST Create map
// @access Protected (token required)
router.post(
  '/',
  [
    body('name')
      .isString()
      .isLength({ max: 150 })
      .escape()
      .bail()
      .custom(value => {
        return Map.findOne({ name: value }).then(map => {
          if (map) {
            return Promise.reject('Name already in use');
          }
        });
      }),
    body('description')
      .optional()
      .isString()
      .isLength({ max: 280 })
      .escape(),
    body('mapFileName')
      .isString()
      .isLength({ max: 280 })
      .escape(),
    body('markers')
      .optional()
      .isArray(),
    body('polylines')
      .optional()
      .isArray(),
    header('authorization')
      .isString()
      .bail()
      .custom(value => {
        const tkn = value.split(' ')[1];
        try {
          return jwt.verify(tkn, webTkn);
        } catch (err) {
          return Promise.reject('Invalid Token');
        }
      })
  ],
  async (req, res) => {
    //validation
    var errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    //params
    var name = req.body.name;
    var description = req.body.description ? req.body.description : 'New map!';
    var markers = req.body.markers ? req.body.markers : [];
    var polylines = req.body.polylines ? req.body.polylines : [];

    //image
    let mapFileName = req.body.mapFileName;
    let data = fs.readFileSync(path.resolve('./userUploads', mapFileName));
    data = Buffer.alloc(data.byteLength, data, 'binary').toString('base64');
    var mapRawImage = { data: String(data), contentType: path.extname(mapFileName) };

    var newMap = new Map({
      name,
      description,
      mapFileName,
      mapRawImage,
      markers,
      polylines
    });

    //try to save map
    try {
      await newMap.save();
      map = newMap.toJSON();
      delete map.image;
      res.json({ msg: 'Map saved', map });
    } catch (err) {
      res.status(500).json({ msg: 'Internal server error', err: err });
    }

    //cache Graph
    const cacheGraph = require('../scripts/pathfinding').cacheGraph;
    cacheGraph();
  }
);

// @route POST api/map/name/:name/exists
// @desc POST Check if map exists
// @access Protected (token required)
router.post(
  '/name/:name/exists',
  [
    header('authorization')
      .isString()
      .bail()
      .custom(value => {
        const tkn = value.split(' ')[1];
        try {
          return jwt.verify(tkn, webTkn);
        } catch (err) {
          return Promise.reject('Invalid Token');
        }
      })
  ],
  async (req, res) => {
    //validation
    var errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    //get map
    var name = req.params.name;
    var map = await Map.find({ name }).select('name');

    if (!map[0]) {
      return res.json({ res: false });
    } else {
      return res.json({ res: true });
    }
  }
);

// @route POST api/map/upload
// @desc POST Upload image
// @access Protected (token required)
router.post(
  '/upload',
  [
    header('authorization')
      .isString()
      .bail()
      .custom(value => {
        const tkn = value.split(' ')[1];
        try {
          return jwt.verify(tkn, webTkn);
        } catch (err) {
          return Promise.reject('Invalid Token');
        }
      })
  ],
  async (req, res) => {
    //validation
    var errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    if (typeof req.files.mapImage === 'undefined') {
      return res.status(422).json({ value: 'empty', msg: 'No file supplied', param: 'mapImage' });
    } else {
      var mimetype = req.files.mapImage.mimetype;
      if (!mimetype.includes('image')) {
        return res.status(422).json({ value: 'file', msg: 'Not an image', param: 'mapImage' });
      }
    }

    //rename
    let temp = req.files.mapImage.tempFilePath;
    let type = req.files.mapImage.mimetype;
    let tempNew = path.resolve('./tmp', uuid() + '.' + type.replace('image/', ''));
    fs.renameSync(temp, tempNew);

    var dimensions;
    var imageData = fs.createReadStream(tempNew);
    await probe(imageData).then(res => {
      dimensions = res;
    });

    //move
    mv(tempNew, path.resolve('./userUploads', path.basename(tempNew)), err => {
      if (err) console.error(err);
    });

    //save map
    try {
      res.json({ msg: 'Image saved', fileName: path.basename(tempNew), dimensions: { width: dimensions.width, height: dimensions.height } });
    } catch (err) {
      res.status(500).json({ msg: 'Internal server error', err: err });
    }
  }
);

// @route GET api/map
// @desc GET Get Maps
// @access Protected (token required)
router.get(
  '/',
  [
    header('authorization')
      .isString()
      .bail()
      .custom(value => {
        const tkn = value.split(' ')[1];
        try {
          return jwt.verify(tkn, webTkn);
        } catch (err) {
          return Promise.reject('Invalid Token');
        }
      })
  ],
  async (req, res) => {
    //validation
    var errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    //get maps
    try {
      var maps = await Map.find().select('-__v -mapRawImage');
      res.json({ maps });
    } catch (err) {
      res.status(500).json({ msg: 'Internal server error', err: err });
    }
  }
);

// @route DELETE api/map
// @desc DELETE Delete map
// @access Protected (token required)
router.delete(
  '/:id',
  [
    header('authorization')
      .isString()
      .bail()
      .custom(value => {
        const tkn = value.split(' ')[1];
        try {
          return jwt.verify(tkn, webTkn);
        } catch (err) {
          return Promise.reject('Invalid Token');
        }
      })
  ],
  async (req, res) => {
    //validation
    var errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    //delete map
    try {
      var map = await Map.findByIdAndDelete(req.params.id);
      if (map) {
        res.json({ msg: 'Map deleted', map });
      } else {
        res.status(400).json({ msg: 'Map not found' });
      }
    } catch (err) {
      res.status(500).json({ msg: 'Internal server error', err: err });
    }
  }
);

module.exports = router;
