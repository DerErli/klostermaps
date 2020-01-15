const express = require('express');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');
const crypto = require('crypto');

const admin = require('../config/keys').admin;
const webTkn = require('../config/keys').webTkn;

const router = express.Router();

// @route POST api/login
// @desc POST login and get token
// @access Public
router.post(
  '/',
  [
    check('user')
      .isString()
      .custom(value => {
        if (value != admin.user) {
          return Promise.reject('Login failed');
        }
        return true;
      }),
    check('pass')
      .isString()
      .custom(value => {
        const hash = crypto
          .createHash('sha256')
          .update(value)
          .digest('base64');
        if (hash != admin.pass) {
          return Promise.reject('Login failed');
        }
        return true;
      })
  ],
  async (req, res) => {
    //validation
    var errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ msg: 'Login failed', err: errors.array() });
    }

    //create token
    jwt.sign({ user: admin }, webTkn, (err, token) => {
      res.json({ msg: 'Du bist eingeloggt', token });
    });
  }
);

module.exports = router;
