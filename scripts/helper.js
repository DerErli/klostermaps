const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

const Map = require('../models/Map');
const Event = require('../models/Event');

module.exports = {
  tmpCleanup: function(req, res, next) {
    res.on('finish', () => {
      fs.emptyDirSync(path.resolve('./tmp'));
    });
    next();
  },
  restoreImages: async function() {
    let userUpload = path.resolve('./userUploads');

    //creates folder if it doesnt exist
    if (!fs.existsSync(userUpload)) {
      fs.mkdirSync(userUpload);
    }

    //compares local files to db
    var files = fs.readdirSync(userUpload);

    var graph = files.indexOf('cachedGraphTmp.json');
    if (graph != -1) files.splice(graph);
    var keys = files.indexOf('cachedKeywordsTmp.json');
    if (keys != -1) files.splice(keys);

    let images = await Map.find().select('mapFileName _id');
    let missing = [];

    //check which files exist
    for (key in images) {
      if (files.includes(images[key].mapFileName)) {
        files.splice(files.indexOf(images[key].mapFileName), 1);
      } else {
        missing.push(images[key]);
      }
    }

    //delete all unused files
    for (key in files) {
      fs.unlink(path.resolve('./userUploads', files[key]), err => {
        if (err) console.error(err);
      });
    }

    //create missing files
    for (key in missing) {
      let data = await Map.findById(missing[key]._id).select('mapRawImage');
      data = data.mapRawImage.data;
      data = Buffer.alloc(data.length, data, 'base64');
      fs.writeFileSync(path.resolve('./userUploads', missing[key].mapFileName), data, 'base64');
    }

    if (files.length != 0 || missing.length != 0) console.log("Files in 'userUploads' synced with database!");
  },
  cacheKeywords: async function() {
    try {
      var events = await Event.find({ active: true });

      var keywords = [];
      for (event of events) {
        keywords = keywords.concat(event.keywords);
      }

      keywords = { keywords: keywords };
      var data = JSON.stringify(keywords);

      const cachedKeywords = path.resolve('./userUploads', 'cachedKeywordsTmp.json');

      var update = true;
      if (fs.existsSync(cachedKeywords)) {
        var old = await fs.readJSON(cachedKeywords);
        if (
          crypto
            .createHash('sha256')
            .update(data)
            .digest('base64') ==
          crypto
            .createHash('sha256')
            .update(old)
            .digest('base64')
        )
          update = false;
      }

      if (update) {
        await fs.writeJson(cachedKeywords, data);
        console.log(`Keywords cached : ${keywords.keywords[0] == null ? 0 : keywords.keywords.length}`);
      }
    } catch (err) {
      console.log('Keyword caching failed!');
      console.error(err);
    }
  }
};
