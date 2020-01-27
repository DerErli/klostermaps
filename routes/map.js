const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const uuid = require('uuid/v4');
const path = require('path');
const mv = require('mv');
const { header, body, validationResult } = require('express-validator');

const Map = require('../models/Map');
const webTkn = require('../config/keys').webTkn;

const router = express.Router();

// @route POST api/map
// @desc POST Create/Update map
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
    body('positions')
      .optional()
      .isArray(),
    body('positions.*.id')
      .optional()
      .isInt({ min: 0, max: 1500 }),
    body('positions.*.posx')
      .optional()
      .isInt({ min: 0, max: 4000 }),
    body('positions.*.posy')
      .optional()
      .isInt({ min: 0, max: 4000 }),
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

    //params
    var name = req.body.name;
    var positions = req.body.postions ? req.body.postions : [];

    //image
    //rename
    let temp = req.files.mapImage.tempFilePath;
    let type = req.files.mapImage.mimetype;
    let tempNew = path.resolve('./tmp', uuid() + '.' + type.replace('image/', ''));
    fs.renameSync(temp, tempNew);

    //read file
    let data = fs.readFileSync(tempNew);
    data = Buffer.alloc(data.byteLength, data, 'binary').toString('base64');

    //move / prepare file to be saved
    mv(tempNew, path.resolve('./userUploads', path.basename(tempNew)), err => {
      if (err) console.error(err);
    });
    var image = { data: String(data), contentType: type, fileName: path.basename(tempNew) };

    var newMap = new Map({
      name,
      positions,
      image
    });

    //save map
    try {
      await newMap.save();
      map = newMap.toJSON();
      delete map.image;
      res.json({ msg: 'Map saved', map });
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
      }),
    header('withimage').isBoolean()
  ],
  async (req, res) => {
    //validation
    var errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    //get maps
    var withimage = req.headers.withimage ? req.headers.withimage : false;

    try {
      if (withimage) {
        var maps = await Map.find().select('-__v ');
      } else {
        var maps = await Map.find().select('-__v -image');
      }
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
  '/',
  [
    header('mapid').isMongoId(),
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
      var map = await Map.findByIdAndDelete(req.headers.mapid);
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
