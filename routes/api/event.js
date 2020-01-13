const express = require('express');
const jwt = require('jsonwebtoken');
const { header, body, validationResult } = require('express-validator');

const Event = require('../../models/Event');
const webTkn = require('../../config/keys').webTkn;

const router = express.Router();

// @route POST api/event
// @desc POST Create event
// @access Protected (token required)
router.post(
  '/',
  [
    body('name')
      .isString()
      .isLength({ max: 200 })
      .bail()
      .custom(value => {
        return Event.findOne({ name: value }).then(event => {
          if (event) {
            return Promise.reject('Name already in use');
          }
        });
      })
      .escape(),
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

    //create new Event
    const newEvent = new Event({
      name: req.body.name
    });

    //save Event
    try {
      var evnt = await newEvent.save();
      res.json({ msg: 'New event created', evnt });
    } catch (err) {
      res.status(500).json({ msg: 'Internal server error', err: err });
    }
  }
);

// @route GET api/event
// @desc GET Get Events
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

    //get events
    try {
      var events = await Event.find().select('-__v');
      res.json({ events });
    } catch (err) {
      res.status(500).json({ msg: 'Internal server error', err: err });
    }
  }
);

// @route DELETE api/event
// @desc DELETE Delete Event
// @access Protected (token required)
router.delete(
  '/',
  [
    body('eventid').isMongoId(),
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

    //delete Event
    try {
      var event = await Event.findByIdAndDelete(req.body.eventid);
      if (event) {
        res.json({ msg: 'Event deleted', event });
      } else {
        res.status(400).json({ msg: 'Event not found' });
      }
    } catch (err) {
      res.status(500).json({ msg: 'Internal server error', err: err });
    }
  }
);

// @route POST api/event/activate
// @desc POST Toogle activation of event
// @access Protected (token required)
router.post(
  '/activate',
  [
    body('eventid').isMongoId(),
    body('state')
      .isString()
      .isBoolean(),
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

    //update event
    var eventid = req.body.eventid;
    var state = req.body.state;

    try {
      var event = await Event.findByIdAndUpdate(eventid, { active: state }).select('-__v');
      event.active = state;
      if (event) {
        res.json({ msg: `Event activation is set to ${state}`, event });
      } else {
        res.status(400).json({ msg: 'Event update failed' });
      }
    } catch (err) {
      res.status(500).json({ msg: 'Internal server error', err: err });
    }
  }
);

// @route POST api/event/keyword
// @desc POST Update keywords of an event
// @access Protected (token required)
router.post(
  '/keyword',
  [
    body('eventid').isMongoId(),
    body('keywords').isArray(),
    body('keywords.*.key')
      .isString()
      .escape()
      .isLength({ max: 100 }),
    body('keywords.*.map').isMongoId(),
    body('keywords.*.pos').isInt({ min: 0, max: 1000 }),
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

    //update keywords
    var eventid = req.body.eventid;
    var keywords = req.body.keywords;

    try {
      var event = await Event.findByIdAndUpdate(eventid, { keywords }).select('-__v');
      if (event) {
        var keys = [];
        for (obj in keywords) {
          keys.push(keywords[obj].key);
        }
        var diff = event.keywords.filter(x => !keys.includes(x.key));
        if (diff.length == 0) diff = 'No diff found';
        res.json({ msg: 'Event keywords updated', diff });
      } else {
        res.status(400).json({ msg: 'Event update failed' });
      }
    } catch (err) {
      res.status(500).json({ msg: 'Internal server error', err: err });
    }
  }
);

module.exports = router;
