/*
  Defines the API for the CDS hooks capabilities of the CKS app
*/

const express = require('express');
const request = require('request');
const tools = require('../utiles/api_tools.js');
const globeVars = require('../utiles/api_variables.js');

const router = express.Router();

//Sends the EHR environment a description of each CDS-hooks card available
router.get('/', (req, res) => {
  var cksMedications = {
    hook: 'medication-prescribe',
    id: 'cks-medication',
    title: 'Clinical Knowledge Summary for Medication hooks',
    description: 'A specialized pubmed search interface when a medication is prescribed',
    prefetch: {
      patient: "Patient/{{Patient.id}}"
    }
  };

  var cksMedications2 = {
    hook: 'medication-prescribe',
    id: 'cks-medicationForCondition',
    title: 'Clinical Knowledge Summary for Medication hooks',
    description: 'A specialized pubmed search interface when a medication is prescribed for a specific disease.',
    prefetch: {
      patient: "Patient/{{Patient.id}}"
    }
  };

  var cksPerson = {
    hook: 'patient-view',
    id: 'cks-person',
    title: 'Clinical Knowledge Summary for Patient-view hooks',
    description: 'A specialized pubmed search interface for results of the most recently diagnosed problem list that is '
    + 'item that can be transformed into a MESH term',
    prefetch: {
      patientConditions: "Condition?patient={{Patient.id}}",
      patient: "Patient/{{Patient.id}}"
    }
  }
  var discoveryEndpointServices = {
    services: [ cksMedications, cksPerson, cksMedications2 ]
  };
  res.send(JSON.stringify(discoveryEndpointServices, null, 2));
});

module.exports = router;

//Each post below returns a CDS hooks card for the categories shown above

// CDS hook service that works when a medication is prescribed
router.post('/cks-medication', (req, res) => {
  var gender, dob, age, options;
  var cdsHooks_req = req.body;
  var url_patient = globeVars.homeURL + '/cds-services/get-patientResource';
  var patient;
  if(cdsHooks_req.patient) {  // This is from a previous cds-hooks version
    patient = cdsHooks_req.patient;
  } else {
    patient = cdsHooks_req.context.patientId;
  }
  if(cdsHooks_req.fhirAuthorization) {
    options = {"fhirServer": cdsHooks_req.fhirServer, "patient": patient,
      "access_token": cdsHooks_req.fhirAuthorization.access_token};
  } else {
    options = {"fhirServer": cdsHooks_req.fhirServer, "patient": patient};
  }
  if(cdsHooks_req.prefetch.patient) {
    gender = cdsHooks_req.prefetch.patient.resource.gender;
    gender = tools.convertGender(gender)
    dob = cdsHooks_req.prefetch.patient.resource.birthDate;
    age = tools.find_age(dob);
    tools.generateMedicationCard(cdsHooks_req, gender, age, cond=false).then(function(result) {
      res.send(result);
    }).catch(function (error) {
      console.log(error);
      res.send({"cards": []});
    });
  } else {
    new Promise(function(fulfill, reject) {
      request.post({ url:url_patient, json:true, body: options }, function(e, r, body) {
        if(e) reject(e);
        fulfill(body);
      })
    }).then(function(result) {
      gender = result.gender;
      dob = result.birthDate;
      age = tools.find_age(dob);
      if (cdsHooks_req.context.medications.length > 1) {
        tools.generateMultipleMedicationsCard(cdsHooks_req, gender, age, cond=false).then(function(result) {
          res.send(result);
        }).catch(function (error) {
          console.log(error);
          res.send({"cards": []});
        });
      } else {
        tools.generateMedicationCard(cdsHooks_req, gender, age, cond=false).then(function(result) {
          res.send(result);
        }).catch(function (error) {
          console.log(error);
          res.send({"cards": []});
        });
      }

    })
  }
});

// CDS hook service that works when a medication is prescribed with a specific disease
router.post('/cks-medicationForCondition', (req, res) => {
  var gender, dob, age;
  var cdsHooks_req = req.body;
  var url_patient = globeVars.homeURL + '/cds-services/get-patientResource';
  var patient;
  if(cdsHooks_req.patient) {  // This is from a previous cds-hooks version
    patient = cdsHooks_req.patient;
  } else {
    patient = cdsHooks_req.context.patientId;
  }

  if(cdsHooks_req.fhirAuthorization) {
    options = {"fhirServer": cdsHooks_req.fhirServer, "patient": patient,
      "access_token": cdsHooks_req.fhirAuthorization.access_token};
  } else {
    options = {"fhirServer": cdsHooks_req.fhirServer, "patient": patient};
  }

  if(cdsHooks_req.prefetch.patient) {
    gender = cdsHooks_req.prefetch.patient.resource.gender;
    gender = tools.convertGender(gender)
    dob = cdsHooks_req.prefetch.patient.resource.birthDate;
    age = tools.find_age(dob);
    tools.generateMedicationCard(cdsHooks_req, gender, age, cond=true).then(function(result) {
      res.send(result);
    }).catch(function (error) {
      console.log(error);
      res.send({"cards": []});
    });
  } else {
    new Promise(function(fulfill, reject) {
      request.post({ url:url_patient, json:true, body: options }, function(e, r, body) {
        if(e) reject(e);
        fulfill(body);
      })
    }).then(function(result) {
      gender = result.gender;
      dob = result.birthDate;
      age = tools.find_age(dob);
      tools.generateMedicationCard(cdsHooks_req, gender, age, cond=true).then(function(result) {
        res.send(result);
      }).catch(function (error) {
        console.log(error);
        res.send({"cards": []});
      });
    })
  }
});

// CDS hook service that works when a patient is first pulled up in the EHR
// Shows the latest disease with a working MeSH term
router.post('/cks-person', (req, res) => {
  var conditionList, gender, dob, age, age, options;
  var cdsHooks_req = req.body;
  var patient;
  if(cdsHooks_req.patient) {  // This is from a previous cds-hooks version
    patient = cdsHooks_req.patient;
  } else {
    patient = cdsHooks_req.context.patientId;
  }
  var url_patient = globeVars.homeURL + '/cds-services/get-patientResource';
  var url_conditions = globeVars.homeURL + '/cds-services/get-conditions';

  if(cdsHooks_req.fhirAuthorization) {
    options = {"fhirServer": cdsHooks_req.fhirServer, "patient": patient,
      "access_token": cdsHooks_req.fhirAuthorization.access_token};
  } else {
    options = {"fhirServer": cdsHooks_req.fhirServer, "patient": patient};
  }

  if(cdsHooks_req.prefetch.patient&&cdsHooks_req.prefetch.patientConditions) {
    gender = cdsHooks_req.prefetch.patient.resource.gender;
    gender = tools.convertGender(gender)
    dob = cdsHooks_req.prefetch.patient.resource.birthDate;
    age = tools.find_age(dob);
    conditionList = cdsHooks_req.prefetch.patientConditions.resource.entry;
    tools.generateConditionCard(conditionList, gender, age).then(function(card) {
      res.send(card);
    }).catch(function (error) {
      console.log(error);
      res.send({"cards": []});
    });
  } else if(cdsHooks_req.prefetch.patient) {
    gender = cdsHooks_req.prefetch.patient.resource.gender;
    gender = tools.convertGender(gender);
    dob = cdsHooks_req.prefetch.patient.resource.birthDate;
    age = tools.find_age(dob);
    new Promise(function(fulfill, reject) {
      request.post({ url:url_conditions, json:true, body: options }, function(e, r, body) {
        if(e) reject(e);
        fulfill(body);
      })
    }).then(function(results) {
      conditionList = results.entry;
      tools.generateConditionCard(conditionList, gender, age).then(function(card) {
        res.send(card);
      }).catch(function (error) {
        console.log(error);
        res.send({"cards": []});
      });
    }).catch(function (error) {
      console.log(error);
      res.send({"cards": []});
    });
  } else if(cdsHooks_req.prefetch.patientConditions) {
    conditionList = cdsHooks_req.prefetch.patientConditions.entry;
    new Promise(function(fulfill, reject) {
      request.post({ url:url_patient, json:true, body: options }, function(e, r, body) {
        if(e) reject(e);
        fulfill(body);
      })
    }).then(function(result) {
      gender = result.gender;
      dob = result.birthDate;
      age = tools.find_age(dob);
      tools.generateConditionCard(conditionList, gender, age).then(function(card) {
        res.send(card);
      }).catch(function (error) {
        console.log(error);
        res.send({"cards": []});
      });
    }).catch(function (error) {
      console.log(error);
      res.send({"cards": []});
    });
  } else {
    new Promise(function(fulfill, reject) {
      request.post({ url:url_patient, json:true, body: options }, function(e, r, body) {
        if(e) reject(e);
        fulfill(body);
      })
    }).then(function(result) {
      gender = result.gender;
      dob = result.birthDate;
      age = tools.find_age(dob);
      new Promise(function(fulfill, reject) {
        request.post({ url:url_conditions, json:true, body: options }, function(e, r, body) {
          if(e) reject(e);
          fulfill(body);
        })
      }).then(function(results) {
        conditionList = results.entry;
        tools.generateConditionCard(conditionList, gender, age).then(function(card) {
          res.send(card);
        }).catch(function (error) {
          console.log(error);
          res.send({"cards": []});
        });
      }).catch(function (error) {
        console.log(error);
        res.send({"cards": []});
      });
    }).catch(function (error) {
      console.log(error);
      res.send({"cards": []});
    });
  }
});

router.post('/get-patientResource', (req, res) => {
  var fhirServer = req.body.fhirServer;
  var patient = req.body.patient;
  if(req.body.access_token) {
    var options = {
      url: fhirServer + '/Patient/' + patient,
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + req.body.access_token
      }
    };

    new Promise(function(fulfill, reject) {
      request(options, function(e, r, body) {
        if(e) reject(e);
        fulfill(body);
      })
    }).then(function(result) {
      res.send(result);
    })
  }
  else {
    const url = fhirServer + "/Patient/" + patient;
    new Promise(function(fulfill, reject) {
      request.get(url, function(e, r, body) {
        if (e) {
          reject(e);
        }
        fulfill(body);
      })
    }).then(function(result) {
      res.send(result);
    });
  }
});

router.post('/get-conditions', (req, res) => {
  const fhirServer = req.body.fhirServer;
  const patient = req.body.patient;
  if(req.body.access_token) {
    const access_token = req.body.access_token;
    const options = {
      url: fhirServer + '/Condition?patient=' + patient,
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + access_token
      }
    };

    new Promise(function(fulfill, reject) {
      request(options, function(e, r, body) {
        if (e) {
          reject(e);
        }
        fulfill(body);
      })
    }).then(function(result) {
      res.send(result);
    })
  }
  else {
    var url = fhirServer+"/Condition?patient="+patient;
    new Promise(function(fulfill, reject) {
      request.get(url, function(e, r, body) {
        if (e) {
          reject(e);
        }
        fulfill(body);
      })
    }).then(function(result) {
      res.send(result);
    });
  }
});
