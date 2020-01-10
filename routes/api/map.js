const express = require('express');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');

const Map = require('../../models/Map');

const router = express.Router();

// @route POST api/map
// @desc POST Create/Update map
// @access Protected (token required)

// @route GET api/map
// @desc GET Get Maps
// @access Protected (token required)

// @route DELETE api/map
// @desc DELETE Delete map
// @access Protected (token required)

module.exports = router;
