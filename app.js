const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const fileupload = require('express-fileupload');

const login = require('./routes/api/login');
const event = require('./routes/api/event');
const map = require('./routes/api/map');

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

// DB config
const db = require('./config/keys').mongoURI;
mongoose
  .connect(db, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true, useFindAndModify: false })
  .then(() => console.log('MongoDb connected...'))
  .catch(err => console.log(err));

//cleanup
const tmpCleanup = require('./config/helper').tmpCleanup;
app.use(tmpCleanup);

// use routes
app.use('/api/login/', login);
app.use('/api/event/', event);
app.use('/api/map/', map);

//Listen to port
const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Listening at port ${port}`));
