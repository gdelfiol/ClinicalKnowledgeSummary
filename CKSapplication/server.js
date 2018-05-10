// https://scotch.io/tutorials/mean-app-with-angular-2-and-the-angular-cli

// Get dependencies
const express = require('express');
const path = require('path');
const http = require('http');
const https = require('https');
const fs = require('fs');
const bodyParser = require('body-parser');
const pem = require("pem");

// Get our API routes
const logging_api = require('./server/routes/logging_api');
const cds_service = require('./server/routes/cds-services');
const umls_call = require('./server/routes/umls_call');
const manifest = require('./server/routes/manifest');

const app = express();

// Parsers for POST data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Point static path to dist
app.use(express.static(path.join(__dirname, 'dist')));


app.use((request, response, next) => {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Credentials', 'true');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Origin, Accept, Range');
  response.setHeader('Access-Control-Expose-Headers', 'Origin, Accept, Content-Location, ' +
    'Location, X-Requested-With');
  // Pass to next layer of middleware
  next();
});

// Set our api routes
app.use('/logging_api', logging_api);
app.use('/cds-services', cds_service);
app.use('/umls_call', umls_call);
app.use('/.well-known', manifest);

// Catch all other routes and return the index file
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/index.html'));
});

if(process.env.NODE_ENV === 'prod') {
  // Get port from environment and store in Express.
  const port = process.env.PORT || '80';
  app.set('port', port);

  const pfx = fs.readFileSync("./keystore.p12");
  pem.readPkcs12(pfx, { p12Password: "password" }, (err, cert) => {
    var options = {
        key: cert.key,
        cert: cert.cert
    };
    const server = https.createServer(options, app);
    // Listen on provided port, on all network interfaces.
    server.listen(port, "dev-newservice.oib.utah.edu", () => console.log(`API running on https://dev-newservice.oib.utah.edu:${port}`));
  });
}
else {
  // Get port from environment and store in Express.
  const port = process.env.PORT || '3000';
  app.set('port', port);

  // Create HTTP server.
  const server = http.createServer(app);

  // Listen on provided port, on all network interfaces.
  server.listen(port, () => console.log(`API running on localhost:${port}`));
}
