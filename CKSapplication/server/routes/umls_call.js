/*
  Defines an API that makes calls to the UMLS API to convert codes or terms
  into a MeSH term.
*/

const express = require('express');
const router = express.Router();
const tools = require('../utiles/api_tools.js');

module.exports = router;

// Returns a potential mesh term after transformation
router.post('/getMeshTerm', (req, res) => {
  const queryTerms = req.body.queryTerms;
  tools.gettgt().then(function (tgt) {
    tools.getMeshTerm(tgt, queryTerms, 'code', queryTerms.length).then(function (mesh) {
      res.send(mesh);
    }).catch(function (error) {
      console.log(error);
      res.send('error');
    })
  });
});
