const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const resolve = require('path').resolve;
const fileupload = require('express-fileupload');
const cors = require('cors');

const login = require('./routes/login');
const event = require('./routes/event');
const map = require('./routes/map');
const frntend = require('./routes/frontend');

const app = express();

//Middelware
app.use(bodyParser.json());
app.use(
  fileupload({
    useTempFiles: true,
    tempFileDir: './tmp/',
    safeFileNames: true,
    preserveExtension: true,
    abortOnLimit: true,
    limits: { fileSize: 16000000, files: 1 }
  })
);
app.use(cors());

// DB config
const db = require('./config/keys').mongoURI;
mongoose
  .connect(db, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true, useFindAndModify: false })
  .then(() => console.log('MongoDb connected...'))
  .catch(err => console.log(err));

//sync user uploads
const restoreImages = require('./scripts/helper').restoreImages;
restoreImages();

//cache Graph
const cacheGraph = require('./scripts/pathfinding').cacheGraph;
cacheGraph();

//cleanup
const tmpCleanup = require('./scripts/helper').tmpCleanup;
app.use(tmpCleanup);

//serve app
app.use('/', express.static('./client/public'));
app.get('/', (req, res) => {
  res.sendFile(resolve('./client/index.html'));
});
app.use('/api/maps/', express.static('./userUploads'));

// use routes
app.use('/api/login/', login);
app.use('/api/event/', event);
app.use('/api/map/', map);
app.use('/api/app/', frntend);

//Listen to port
const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Listening at port ${port}`));
