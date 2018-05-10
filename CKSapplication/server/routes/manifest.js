const express = require('express');
const router = express.Router();
const manifest = require('../../src/.well-known/smart/manifest.json');

router.get('/smart/manifest.json', (req, res) => {
  res.send(manifest);
});

module.exports = router;
