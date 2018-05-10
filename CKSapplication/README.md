# Clinical Knowledge Summary

App used for high level Pubmed searches for diseases and medications. This has three different components:
1. Search - the main search page with a search bar.
2. Results (/results) - where the display of the results are shown. This can be shown both on a desktop or mobile device.
3. Infobutton (/infobutton) - can accept HL7 compliant infobutton parameters and display results.

### SMART on FHIR
This app can be run with an EHR/sandbox with its built in Oauth2 exchange. See the environment files for configuration.

### Dependencies
node, npm, and angular-cli

or docker

### Development server

2 options:

1 - node/npm

Run the following commands to start the application

`npm install`

`npm install -g @angular/cli`

`ng build` or `ng build --env=prod` for production

`node server.js` or `export NODE_ENV=prod && node server.js` for production.

Or you can just run the `run_local.sh` or `run_prod.sh` files

In prod, you also need to add `export NODE_TLS_REJECT_UNAUTHORIZED=0`

2 - docker (local only)

run `run_local_docker.sh`

### CDS-Hooks

This app has a `cds-services` endpoint with three services:

1. `cks-person`: Searches through the patient's condition list in the order of most recently diagnosed and returns the first 
condition that successfully converted to a MeSH term. Triggered on `patient-view` hook

2. `cks-medication`: Attempts to convert medication name to MeSH term and, if successfull, returns results. 
Triggered on `medication-prescribe` hook

3. `cks-medicationForCondition`: the same as `cks-medication` but also integrates the condition for which the medication 
is being prescribed. Triggered on `medication-prescribe` when a condition is also in the context

### MongoDB

This app can connect to a Mongo database to track user interactions with the app. See "sever.js" for implementation.
To get the JSON object showing held in the database, perform the following command:

`localhost:3000/logging_api/clicks`

or

`https://dev-newservice.oib.utah.edu:80/logging_api/clicks`

Each item has three components of importance:

* name - the name of the item clicked which maps to a UI element instance (a button, link, etc.)
* path - where the user performed the click
  * search - in the opening search page
  * results - in a normally accessed results page
  * infobutton - accessed through an infobutton call
  * smart - all elements in a SMART on FHIR call
* frequency - the total number of times that element has be clicked
* app - whether the app is from the 'CKS' or 'CKS-RCTComp'
* time - timestamp of action in milliseconds
* sessId - uuid to identify the session of app use

You can find what the 'name' component means in the `/assets/tracking.html` or use the `/assets/tracking.json` to map 
the 'name' component to what element it represents

To start up on production server so it runs in the background:
`mongod --fork --logpath /var/log/mongod.log`

To remove the data in the database to wipe it clean:
1. `sudo rm -rf /data/db`
2. `sudo mkdir /data/db`
3. `sudo chmod -R go+w /data/db` - gives this directory write privlages

You'll need to restart the server and the app to recognize the change
