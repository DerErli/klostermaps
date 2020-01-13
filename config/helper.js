const fs = require('fs-extra');
const path = require('path');

module.exports = {
  tmpCleanup: function(req, res, next) {
    res.on('finish', () => {
      fs.emptyDirSync(path.resolve('./tmp'));
    });
    next();
  }
};
