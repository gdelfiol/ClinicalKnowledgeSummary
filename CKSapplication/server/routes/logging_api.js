const express = require('express');
const router = express.Router();
const globeVars = require('../utiles/api_variables.js');

/* GET api listing. */
router.get('/', (req, res) => {
  res.send('api works');
});

module.exports = router;

const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

mongoose.connect(globeVars.mongodb_url, {
  useMongoClient: true
}).then(() =>  console.log('Connected to Database'))
  .catch((err) => console.error(err));

const conn = mongoose.connection;
const Schema = mongoose.Schema;

const clickSchema = new Schema({
  name: String,
  frequency: Number,
  path: String,
  app: String,
  sessId: String,
  time: String
});

const click = conn.model('click', clickSchema); //Create new collection if it doesn't already exist

// Returns a list of all instances in the click collection
router.get('/clicks', (req, res) => {
    mongoose.model('click').find(function (err, clicks) {
      res.send(JSON.stringify(clicks));
    })
});

router.post('/postClicks', (req, res) => {
  const Name = req.body.clickedItem;
  const Path = req.body.path;
  const App = req.body.app;
  const SessId = req.body.sessId;
  const Time = req.body.time;
  click.findOneAndUpdate({name:Name, path:Path, app:App, sessId:SessId, time:Time}, {$inc:{frequency:1}}, function(err, clicks){
    if (err) {
      return res.send(500, {error: err});
    }
    if (clicks === null) {
      click.findOneAndUpdate({name:Name, path:Path, app:App, sessId:SessId, time:Time}, {name:Name, frequency:1, path:Path, sessId:SessId, time:Time, app:App}, {upsert:true}, function(err, doc){
        if (err) {
          return res.send(500, { error: err });
        }
        if (doc !== null) {
          res.send(doc);
        }
        else {
          res.send({});
        }
      });
    } else {
      res.send(clicks);
    }
  });
});
