const Promise = require('promise');
const globeVars = require('./api_variables.js');
const request = require('request');
const mesh_disease = require('../mesh_files/conditions_mesh.json');
const mesh_terms = require('../mesh_files/sorted_mesh.json');


module.exports = {
  // Returns the URL needed to get UMLS tickets for the conversions
  gettgt: function() {
    var base_uri = globeVars.tgt_uri;
    var username = globeVars.tgt_username;
    var password = globeVars.tgt_password;
    var body = 'username='+username+'&password='+password;
    var headers = {'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'text/plain'};
    return new Promise(function(fulfill, reject) {
      request.post({ url: base_uri, form: body, headers: headers }, function (e, r, bod) {
        if (e) {
          reject(err);
        } else {
          var start = bod.indexOf('<form')+'<form action="'.length;
          var end = bod.indexOf('" method=');
          var tgtURL = bod.substring(start, end);
          fulfill(tgtURL);
        }
      });
    })
  },

  // Returns the MESH term that has been converted from the code or term
  //  Recursively calls itself to try either the code, term, or cui
  // @param:tgtURL => URL needed to get UMLS tickets for the conversions
  // @param:coding_dict => dictionary with the concept's code, code system, and term
  // @param:avail => "code", "term", or "cui" telling which api call to make
  // @param:cui => the cui found in the conversion used to get the term
  getMeshTerm: function(tgtURL, coding_dict_list, avail, count, singleFlag=false, multiplesFlag=false, meshList=[], cui="") {

    if (count === 0) {
      return new Promise(function(fulfill, reject) {
        fulfill(meshList);
      })
    }

    // Want to return the term if a MeSH term has been found successfully
    if (!multiplesFlag) {
      for (var i=0; i<meshList.length; i++) {
        if (meshList[i] !== '-1') {
          return new Promise(function(fulfill, reject) {
            fulfill([meshList[i]]);
          })
        }
      }
    }

    // Check to see if term is already mesh term before making conversion
    if (mesh_terms.indexOf(coding_dict_list[count-1]['term']) !== -1) {
      meshList.push([coding_dict_list[count-1]['term'], count]);
      return new Promise(function(fulfill, reject) {
        module.exports.getMeshTerm(tgtURL, coding_dict_list, "code", count-1, singleFlag, multiplesFlag, meshList=meshList, cui=cui).then(function(meshes) {
          var meshes = meshes.concat(meshList);
          fulfill(meshes);
        })
      })
    }
    if (meshList.length > 0 && singleFlag) {
      return new Promise(function(fulfill, reject) {
        fulfill(meshList);
      })
    }
    coding_dict = coding_dict_list[count-1];
    return new Promise(function(fulfill, reject) {
      // Check if the condition selected is already a mesh term
      if (mesh_disease.indexOf(coding_dict.term) !== -1) {
        fulfill(coding_dict.term);
      } else {
        getST(tgtURL).then(function(ticket) {
          if (avail === "code") {
            getCUIwithCode(coding_dict, ticket).then(function(CUIsucc) {
              CUIsucc = JSON.parse(CUIsucc);
              var cui = CUIsucc.result.results[0].ui;
              if (cui === "NONE") {
                module.exports.getMeshTerm(tgtURL, coding_dict_list, "term", count, singleFlag, multiplesFlag).then(function(CUIsucc2) {
                  fulfill(CUIsucc2);
                });
              } else {
                module.exports.getMeshTerm(tgtURL, coding_dict_list, "cui", count, singleFlag, multiplesFlag, meshList=meshList, cui=cui).then(function(CUIsucc2) {
                  fulfill(CUIsucc2);
                });
              }
            }).catch(function (error) {
              reject(error);
            });
          } else if (avail === "term") {
            getST(tgtURL).then(function(ticket3) {
              getCUIwithTerm(coding_dict, ticket3).then(function(body) {
                body = JSON.parse(body);
                var cui = body.result.results[0].ui;
                if (cui === "NONE") {
                  meshList.push("-1");
                  module.exports.getMeshTerm(tgtURL, coding_dict_list, "code", count-1, singleFlag, multiplesFlag, meshList=meshList, cui=cui).then(function(CUIsucc2) {
                    fulfill(CUIsucc2);
                  })
                } else {
                  module.exports.getMeshTerm(tgtURL, coding_dict_list, "cui", count, singleFlag, multiplesFlag, meshList=meshList, cui=cui).then(function(meshTerm) {
                    fulfill(meshTerm);
                  });
                }
              }).catch(function (error) {
                reject(error);
              });
            }).catch(function (error) {
              reject(error);
            });
          } else { // If 'avail' is 'cui'
            getST(tgtURL).then(function(ticket) {
              getMeshwithCUI(cui, coding_dict, ticket).then(function(meshTerm) {
                if (meshTerm === "There are no results") {
                  meshList.push("-1");
                  module.exports.getMeshTerm(tgtURL, coding_dict_list, "code", count-1, singleFlag, multiplesFlag, meshList=meshList, cui=cui).then(function(CUIsucc2) {
                    fulfill(CUIsucc2);
                  })
                } else {
                  meshList.push(meshTerm)
                  module.exports.getMeshTerm(tgtURL, coding_dict_list, "code", count-1, singleFlag, multiplesFlag, meshList=meshList, cui=cui).then(function(meshes) {
                    fulfill(meshes);
                  }).catch(function (error) {
                    console.log(error);
                    reject(error);
                  });
                }
              })
            }).catch(function (error) {
              console.log(error);
              reject(error);
            });
          }
        }).catch(function (error) {
          reject(error);
        });
      }
    })
  },

  // Returns list of both Systematic reviews and clinical trials
  //    Recursively called if the narrow CT search doesn't work so that a broader search can be done
  // @param:term => MESH term
  // @param:numRetry => either 0 or 1 depending on if the narrow CT search works
  getPMIDs: function(term, numRetry) {
    var dates = constructDates(10);
    var start_date = dates[0];
    var today = dates[1];
    var search_strategy_SR = globeVars.search_strategy_SR_head + '"' + start_date + '"[CDAT] : "' + today + '"[CDAT]'
      + globeVars.search_strategy_tail;
    var full_querySR = '"' + term + '"[MeSH Terms]' + search_strategy_SR;
    var search_strategy_RCT;
    if (numRetry === 0) {
      search_strategy_RCT = globeVars.search_strategy_RCT_head_narrow + '"' + start_date + '"[CDAT] : "' + today + '"[CDAT]'
        + globeVars.search_strategy_tail;
    } else {
      search_strategy_RCT = globeVars.search_strategy_RCT_broad + '"' + start_date + '"[CDAT] : "' + today + '"[CDAT]'
        + globeVars.search_strategy_tail;
    }
    var full_queryCT = '"' + term + '"[MeSH Terms]' + search_strategy_RCT;
    var bothPMIDlists = [];
    return new Promise(function(fulfill, reject) {
      if (numRetry === 0) {
        getPMIDsURL(full_queryCT).then(function(CTresults) {
          CTresults = JSON.parse(CTresults);
          if (CTresults.esearchresult.idlist.length === 0) {
            module.exports.getPMIDs(term,1).then(function(result) {
              fulfill(result);
            }).catch(function (error) {
              reject(error);
            });
          } else {
            bothPMIDlists.push(CTresults.esearchresult.idlist);
            getPMIDsURL(full_querySR).then(function(SRresults) {
              SRresults = JSON.parse(SRresults);
              bothPMIDlists.push(SRresults.esearchresult.idlist);
              fulfill(bothPMIDlists);
            })
          }
        }).catch(function (error) {
          reject(error);
        });
      } else {
        getPMIDsURL(full_queryCT).then(function(CTresults) {
          CTresults = JSON.parse(CTresults);
          bothPMIDlists.push(CTresults.esearchresult.idlist);
          getPMIDsURL(full_querySR).then(function(SRresults) {
            SRresults = JSON.parse(SRresults);
            bothPMIDlists.push(SRresults.esearchresult.idlist);
            fulfill(bothPMIDlists);
          }).catch(function (error) {
            reject(error);
          });
        }).catch(function (error) {
          reject(error);
        });
      }
    })
  },

  // Returns the counts of the CT and SR after going through the Knowledge Summary API
  // @param:CT_SR_list => a list of lists with the PMIDs found above
  getKScounts: function(CT_SR_list) {
    console.log("getKScounts")
    var counts = [];
    var inputCT = formatKSquery(CT_SR_list[0]);
    var inputSR = formatKSquery(CT_SR_list[1]);
    return new Promise(function(fulfill, reject) {
      if (CT_SR_list[0].length === 0 && CT_SR_list[1].length === 0) {
        return;
      } else if (CT_SR_list[1].length === 0) {
        ksQuery(inputCT).then(function(CTdata) {
          counts.push(CTdata[0].feed.length);
          counts.push(0);
          fulfill(counts);
        }).catch(function (error) {
          console.log(error);
          reject(error);
        });
      } else if (CT_SR_list[0].length === 0) {
        ksQuery(inputSR).then(function(SRdata) {
          counts.push(0);
          counts.push(SRdata[0].feed.length);
          fulfill(counts);
        }).catch(function (error) {
          console.log(error);
          reject(error);
        });
      } else {
        ksQuery(inputCT).then(function(CTdata) {
          counts.push(CTdata[0].feed.length);
          ksQuery(inputSR).then(function(SRdata) {
            counts.push(SRdata[0].feed.length);
            fulfill(counts);
          }).catch(function (error) {
            console.log(error);
            reject(error);
          });
        }).catch(function (error) {
          console.log(error);
          reject(error);
        });
      }
    })
  },

  // Returns the CDS hooks card to be passed to the EHR
  // @param:counts => the number of clinical trials and systematic reviews
  // @param:coding_dict => dictionary holding the code, code system, and term
  // @param:meshTerm => the MESH term
  createCard: function(counts, meshTermList, gender, age) {
    var CTlistLength = counts[0];
    var SRlistLength = counts[1];
    var meshTerm;
    if (meshTermList.length > 1) {
      meshTerm = meshTermList[0] + ' AND ' + meshTermList[1][0];
    } else {
      meshTerm = meshTermList[0][0];
    }

    if (CTlistLength === 0 && SRlistLength === 0) {
      fulfill(200);
    } else if (CTlistLength === 0) {
      summary = 'Latest evidence on ' + meshTerm + ': ' + SRlistLength + ' systematic reviews';
    } else if (SRlistLength === 0){
      summary = 'Latest evidence on ' + meshTerm + ': ' + CTlistLength + ' clinical trials';
    } else {
      summary = 'Latest evidence on ' + meshTerm + ': ' + CTlistLength + ' clinical trials and ' + SRlistLength + ' systematic reviews';
    }
    var cksCard = {
      cards: [
        {
          // Use the patient's First and Last name
          summary: summary,
          indicator: 'info',
          links: [
            {
              label: 'View evidence on Clinical Knowledge Summary app',
              url: globeVars.homeURL + '/infobutton?meshList=' + JSON.stringify([meshTerm])
              + '&patientPerson.administrativeGenderCode.c=' + gender + '&age.v.v=' + age + '&age.v.u=a',
              type: 'smart',
              appContext: '{"meshList": ' + JSON.stringify([meshTerm]) + ', "gender": "' + gender + '", "age": "' + age + '"}'
            }
          ]
        }
      ]
    };
    return cksCard;
  },

  // Creates the CDS hooks card for an available condition on the problem list
  // @param:conditionList => List of Condition FHIR resources
  generateConditionCard: function(conditionList, gender, age) {
    conditionList.sort(function(a, b) {
      return Date.parse(a.resource.onsetDateTime) - Date.parse(b.resource.onsetDateTime);
    })
    var Cond_dict_list = [];
    var conditionCode;
    for(var i=0; i<conditionList.length; i++) {
      var conditionTerm = conditionList[i].resource.code.coding[0].display;
      var conditionSystem = conditionList[i].resource.code.coding[0].system;
      var conditionCode = conditionList[i].resource.code.coding[0].code;
      Cond_dict_list.push({'text': conditionTerm, 'system': conditionSystem, 'code': conditionCode});
    }
    var avail;
    if (conditionCode) {
      avail = 'code';
    }
    else avail = 'term';
    var count = Cond_dict_list.length;
    return new Promise(function(fulfill, reject) {
      module.exports.gettgt().then(function (tgtURL) {
        module.exports.getMeshTerm(tgtURL, Cond_dict_list, avail, count, false).then(function(meshTerm) {
          module.exports.getPMIDs(meshTerm[0], 0).then(function(CT_SR_list) {
            if (CT_SR_list === 'error') {
              reject('error');
            }
            else {
              module.exports.getKScounts(CT_SR_list).then(function(counts) {
                fulfill(module.exports.createCard(counts, [meshTerm], gender, age));
              }).catch(function (error) {
                console.log(error);
                reject('KS counts not working');
              });
            }
          }).catch(function (error) {
            console.log(error);
            reject('getPMIDs not working');
          });
        }).catch(function (error) {
          console.log(error);
          reject('getMeshTerm not working');
        });
      }).catch(function (error) {
        console.log(error);
        reject('gettgt not working');
      });
    });
  },

  generateMedicationCard(cdsHooks_req, gender, age, cond) {
    var cond_dict;
    if (cdsHooks_req.context.medications[0].medicationCodeableConcept) {
      return new Promise(function(fulfill, reject) {
        if (cdsHooks_req.context[0]) {  //This is for previous version
          var medicationTerm = cdsHooks_req.context[0].medicationCodeableConcept.coding[0].display;
          var medCodeSystem = cdsHooks_req.context[0].medicationCodeableConcept.coding[0].system;
          var medicationCode = cdsHooks_req.context[0].medicationCodeableConcept.coding[0].code;
          var med_dict = {'text': medicationTerm, 'system': medCodeSystem, 'code': medicationCode};
          if (cond && cdsHooks_req.context[0].reasonCodeableConcept) {
            var conditionTerm = cdsHooks_req.context[0].reasonCodeableConcept.coding[0].display;
            var conditionCodeSystem = cdsHooks_req.context[0].reasonCodeableConcept.coding[0].system;
            var conditionCode = cdsHooks_req.context[0].reasonCodeableConcept.coding[0].code;
            cond_dict = {'text': conditionTerm, 'system': conditionCodeSystem, 'code': conditionCode};
          }
          var med_dict_list = [med_dict];
          var cond_dict_list = [cond_dict];
          var avail;
          var avail2;
          if (medicationCode) {
            avail = 'code';
          } else {
            avail = 'term';
          }
          if (conditionCode) {
            avail2 = 'code';
          }
          else {
            avail2 = 'term';
          };
          var meshList = [];
          if (cond) {
            module.exports.gettgt().then(function (fulfilled) {
              module.exports.getMeshTerm(fulfilled, med_dict_list, avail, 1, true).then(function(meshTerm) {
                module.exports.getMeshTerm(fulfilled, cond_dict_list, avail2, 1, true).then(function(meshTerm2) {
                  meshTerm_query = meshTerm[0] + '"[MeSH Terms] AND "' + meshTerm2;
                  meshList.push(meshTerm[0]);
                  meshList.push(meshTerm2);
                  module.exports.getPMIDs(meshTerm_query, 0).then(function(CT_SR_list) {
                    if (CT_SR_list === 'error') {
                      reject('error');
                    } else {
                      module.exports.getKScounts(CT_SR_list).then(function(counts) {
                        fulfill(module.exports.createCard(counts, meshList, gender, age))
                      }).catch(function (error) {
                        console.log(error);
                        reject('KS counts not working');
                      });
                    }
                  }).catch(function (error) {
                    console.log(error);
                    reject('getPMIDs not working');
                  });
                }).catch(function (error) {
                  console.log(error);
                  reject('second getMeshTerm not working');
                });
              }).catch(function (error) {
                console.log(error);
                reject('getMeshTerm not working');
              });
            }).catch(function (error) {
              console.log(error);
              reject('gettgt not working');
            });
          } else {
            module.exports.gettgt().then(function (fulfilled) {
              module.exports.getMeshTerm(fulfilled, med_dict_list, avail, 1, true).then(function(meshTerm) {
                module.exports.getPMIDs(meshTerm[0], 0).then(function(CT_SR_list) {
                  if (CT_SR_list === 'error') {
                    console.log(error);
                    reject('error');
                  } else {
                    module.exports.getKScounts(CT_SR_list).then(function(counts) {
                      fulfill(module.exports.createCard(counts, [meshTerm], gender, age))
                    }).catch(function (error) {
                      console.log(error);
                      reject('KS counts not working');
                    });
                  }
                }).catch(function (error) {
                  console.log(error);
                  reject('getPMIDs not working');
                });
              }).catch(function (error) {
                console.log(error);
                reject('getMeshTerm not working');
              });
            }).catch(function (error) {
              console.log(error);
              reject('gettgt not working');
            });
          }
        } else {  // This is for the new version
          var medList = cdsHooks_req.context.medications;
          var i = 0;
          var medicationTerm = medList[i].medicationCodeableConcept.coding[0].display;
          var medCodeSystem = medList[i].medicationCodeableConcept.coding[0].system;
          var medicationCode = medList[i].medicationCodeableConcept.coding[0].code;
          var med_dict = {'text': medicationTerm, 'system': medCodeSystem, 'code': medicationCode };
          if (cond && medList[i].reasonCodeableConcept) {
            var conditionTerm = medList[i].reasonCodeableConcept.coding[0].display;
            var conditionCodeSystem = medList[i].reasonCodeableConcept.coding[0].system;
            var conditionCode = medList[i].reasonCodeableConcept.coding[0].code;
            cond_dict = {'text': conditionTerm, 'system': conditionCodeSystem, 'code':conditionCode};
          }
          var med_dict_list = [med_dict];
          var cond_dict_list = [cond_dict];
          var avail;
          var avail2;
          if (medicationCode) {
            avail = 'code';
          } else {
            avail = 'term';
          }
          if (conditionCode) {
            avail2 = 'code';
          }
          else {
            avail2 = 'term';
          }
          var meshList = [];
          if (cond) {
            module.exports.gettgt().then(function (fulfilled) {
              module.exports.getMeshTerm(fulfilled, med_dict_list, avail, 1, true).then(function(meshTerm) {
                module.exports.getMeshTerm(fulfilled, cond_dict_list, avail2, 1, true).then(function(meshTerm2) {
                  meshTerm_query = meshTerm[0] + '"[MeSH Terms] AND "' + meshTerm2;
                  meshList.push(meshTerm[0]);
                  meshList.push(meshTerm2);
                  module.exports.getPMIDs(meshTerm_query, 0).then(function(CT_SR_list) {
                    if (CT_SR_list === 'error') {
                      reject('error');
                    } else {
                      module.exports.getKScounts(CT_SR_list).then(function(counts) {
                        fulfill(module.exports.createCard(counts, meshList, gender, age))
                      }).catch(function (error) {
                        console.log(error);
                        reject('KS counts not working');
                      });
                    }
                  }).catch(function (error) {
                    console.log(error);
                    reject('getPMIDs not working');
                  });
                }).catch(function (error) {
                  console.log(error);
                  reject('second getMeshTerm not working');
                });
              }).catch(function (error) {
                console.log(error);
                reject('getMeshTerm not working');
              });
            }).catch(function (error) {
              console.log(error);
              reject('gettgt not working');
            });
          }
          else {
            module.exports.gettgt().then(function (fulfilled) {
              module.exports.getMeshTerm(fulfilled, med_dict_list, avail, 1, true).then(function(meshTerm) {
                module.exports.getPMIDs(meshTerm[0], 0).then(function(CT_SR_list) {
                  if (CT_SR_list === 'error') {
                    reject('error');
                  } else {
                    module.exports.getKScounts(CT_SR_list).then(function(counts) {
                      fulfill(module.exports.createCard(counts, [meshTerm], gender, age))
                    }).catch(function (error) {
                      console.log(error);
                      reject('KS counts not working');
                    });
                  }
                }).catch(function (error) {
                  console.log(error);
                  reject('getPMIDs not working');
                });
              }).catch(function (error) {
                console.log(error);
                reject('getMeshTerm not working');
              });
            }).catch(function (error) {
              console.log(error);
              reject('gettgt not working');
            });
          }
        }
      })
    } else {
      return new Promise(function(fulfill, reject) {
        fulfill({"cards":[]})
      })
    }
  },

  generateMultipleMedicationsCard (cdsHooks_req, gender, age, cond) {
    var cond_dict = null;
    if (cdsHooks_req.context.medications[0].medicationCodeableConcept) {
      var med_list = []
      for(var i = 0; i < cdsHooks_req.context.medications.length; i++) {
        var medicationTerm = cdsHooks_req.context.medications[i].medicationCodeableConcept.coding[0].display;
        var medCodeSystem = cdsHooks_req.context.medications[i].medicationCodeableConcept.coding[0].system;
        var medicationCode = cdsHooks_req.context.medications[i].medicationCodeableConcept.coding[0].code;
        var med_dict = {'text': medicationTerm, 'system': medCodeSystem, 'code': medicationCode };
        med_list.push(med_dict);
      }

      if (cond && cdsHooks_req.context.medications[0].reasonCodeableConcept) {
        var conditionTerm = cdsHooks_req.context.medications[0].reasonCodeableConcept.coding[0].display;
        var conditionCodeSystem = cdsHooks_req.context.medications[0].reasonCodeableConcept.coding[0].system;
        var conditionCode = cdsHooks_req.context.medications[0].reasonCodeableConcept.coding[0].code;
        cond_dict = {'text': conditionTerm, 'system': conditionCodeSystem, 'code': conditionCode};
      }
      return new Promise(function(fulfill, reject) {
        module.exports.gettgt().then(function (tgt) {
          performMultipleMedicationsSearch(med_list, cond_dict, 0, tgt, gender, age).then(function(result) {
            fulfill(result);
          }).catch(function (error) {
            console.log(error);
            fulfill({"cards": []});
          });
        });
      });
    } else {
      return new Promise(function(fulfill, reject) {
        fulfill({"cards":[]})
      })
    }
  },

  find_age(birthday) {
    birthday = new Date(birthday);
    var ageDifMs = Date.now() - birthday.getTime();
    var ageDate = new Date(ageDifMs); // miliseconds from epoch
    var age =  Math.abs(ageDate.getUTCFullYear() - 1970);
    return age;
  },

  // Converts FHIR standard gender to infobutton standard gender
  // @param:gender => 'male' or 'female'
  convertGender(gender) {
    if (gender === "male") {
      return "M";
    } else if (gender === "female") {
      return "F";
    }
  }
};

// Returns the ticket needed for the UMLS conversions
// @param:tgtURL => URL needed to get UMLS tickets for the conversions
function getST(tgtURL) {
  var st_body = 'service=http://umlsks.nlm.nih.gov';
  var headers = {'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'text/plain'};
  return new Promise(function(fulfill, reject) {
    request.post({ url: tgtURL, form: st_body, headers: headers }, function (e, r, body) {
      if (e) {
        reject(e);
      } else {
        fulfill(body);
      }
    })
  })
}

// Finds a CUI code based on a code
// @param:coding_dict => dictionary holding the code, code system, and term
// @param:ticket => umls ticket needed to access the api
function getCUIwithCode(coding_dict, ticket) {
  var codeSystem = globeVars.codeDict[coding_dict.system];
  var code = coding_dict.code;
  var base_uri = globeVars.cuiCodeURIHead + code + '&sabs=' + codeSystem + '&ticket=' + ticket;
  return new Promise(function(fulfill, reject) {
    request.get(base_uri, function(e, r, body) {
      if (e) {
        reject(e);
      } else {
        fulfill(body);
      }
    })
  })
}

// Finds a CUI code based on a free-text term
// @param:coding_dict => dictionary holding the code, code system, and term
// @param:ticket => umls ticket needed to access the api
function getCUIwithTerm(coding_dict, ticket) {
  var term = coding_dict.term;
  var base_uri = globeVars.cuiTermURIHead + term + '&ticket=' + ticket;
  return new Promise(function(fulfill, reject) {
    request.get(base_uri, function(e, r, body) {
      if (e) {
        reject(e);
      } else {
        fulfill(body);
      }
    })
  })
}

// With a cui found above, a mesh term will be returned
// @param:cui => CUI code
// @param:ticket => umls ticket needed to access the api
function getMeshwithCUI(cui, coding_dict, ticket) {
  var base_uri = globeVars.meshTermfromAPIHead + cui + globeVars.meshTermfromAPImiddle + ticket;
  return new Promise(function(fulfill, reject) {
    request.get(base_uri, function(e, r, body) {
      if (e) {
        reject(e);
      }
      if (body.substring(0,6) === "<html>") {
        var text = coding_dict.text.match(/(\w+\s?\D*)/);
        //transforms the problem name to a searchable, url term
        if (text[0].slice(-1) === " ") {
          text = text[0].slice(0,-1); //take off space at the end if needed
        } else {
          text = text[0];
        }
        var index = mesh_terms.indexOf(text);
        if (index === -1) {
          fulfill("There are no results");
        } else {
          meshTerm = text;
          fulfill(meshTerm);
        }
      } else {
        body = JSON.parse(body);
        text = body.result[0].name;
        meshTerm = text;
        fulfill(meshTerm);
      }
    })
  })
}

// Formats the date in YYYY/MM/DD formatDate
// @param:date => date object
function formatDate(date) {
  var month = '' + (date.getMonth() + 1),
    day = '' + date.getDate(),
    year = date.getFullYear();
  if (month.length < 2) {
    month = '0' + month;
  }
  if (day.length < 2) {
    day = '0' + day;
  }
  return [year, month, day].join('/');
}

// Returns todays date and 10, 5, or 1 year ago's date in the proper formatDate
// @param:yearsBack => the numbers of years back desired
function constructDates(yearsBack) {
  var now = new Date();
  var starting_date = new Date(now);
  starting_date.setDate(starting_date.getDate() - 365 * yearsBack - 3);
  var start_date = formatDate(starting_date);
  var today = formatDate(now);
  return [start_date, today];
}

// With either the SR or CT queries, this function calls the pubmed eutils api and returns a json
// formatted list of pubmed ids
// @param:query => SR or CT query pre-defined
function getPMIDsURL(query) {
  var url = globeVars.PMIDlistURIHead + query;
  return new Promise(function(fulfill, reject) {
    request.get(url, function(e, r, body) {
      if (e) {
        reject(e);
      }
      fulfill(body);
    })
  })
}

//Formats the query sent to the KS api
//@param:pubmedIDs => list of relevant pubmed ids
function formatKSquery(pubmedIDs) {
  var input = '[';
  for (var m = 0 ; m < pubmedIDs.length ; m++ ) {
    if (m === pubmedIDs.length - 1 ) {
      input  += '"' + pubmedIDs[m] + '"]';
    } else {
      input  += '"' + pubmedIDs[m] + '",';
    }
  }
  return input;
}

// Calls the knowledge summary api to receive a json of needed information
// @param:input => query string needed for post call
function ksQuery(input) {
  input = JSON.parse(input);
  var headers = {'Content-Type': "application/json;charset=utf-8"};
  return new Promise(function(fulfill, reject) {
    request.post({ url: globeVars.ksUrl, headers:headers, json:true, body: input }, function (e, r, body) {
      if (e) {
        reject(e);
      }
      fulfill(body);
    })
  })
}

// Returns list of both Systematic reviews and clinical trials
//    Recursively called if the narrow CT search doesn't work so that a broader search can be done
// @param:term => MESH term
// @param:numRetry => either 0 or 1 depending on if the narrow CT search works
function getMultiplesPMIDs(terms, numRetry, count, meshList=[]) {
  if (count === 0) {
    return new Promise(function(fulfill, reject) {
      fulfill(meshList);
    });
  }
  var dates = constructDates(10);
  var start_date = dates[0];
  var today = dates[1];
  var term = terms[count-1];
  var search_strategy_SR = globeVars.search_strategy_SR_head + '"' + start_date + '"[CDAT] : "' + today + '"[CDAT]'
    + globeVars.search_strategy_tail;
  var full_querySR = '"' + term + '"[MeSH Terms]' + search_strategy_SR;
  var search_strategy_RCT;
  if (numRetry === 0) {
    search_strategy_RCT = globeVars.search_strategy_RCT_head_narrow + '"' + start_date + '"[CDAT] : "' + today + '"[CDAT]'
      + globeVars.search_strategy_tail;
  }
  else {
    search_strategy_RCT = globeVars.search_strategy_RCT_broad + '"' + start_date + '"[CDAT] : "' + today + '"[CDAT]'
      + globeVars.search_strategy_tail;
  }
  var full_queryCT = '"' + term + '"[MeSH Terms]' + search_strategy_RCT;
  var bothPMIDlists = [];
  return new Promise(function(fulfill, reject) {
    if (numRetry === 0) {
      getPMIDsURL(full_queryCT).then(function(CTresults) {
        CTresults = JSON.parse(CTresults);
        if (CTresults.esearchresult.idlist.length === 0) {
          module.exports.getPMIDs(terms, 1, count).then(function(result) {
            fulfill(result);
          }).catch(function (error) {
            reject(error);
          });
        } else {
          bothPMIDlists.push(CTresults.esearchresult.idlist);
          getPMIDsURL(full_querySR).then(function(SRresults) {
            SRresults = JSON.parse(SRresults);
            bothPMIDlists.push(SRresults.esearchresult.idlist);
            meshList.push(bothPMIDlists);
            getMultiplesPMIDs(terms, 0, count-1, meshList=meshList).then(function(meshList) {
              fulfill(meshList)
            }).catch(function (error) {
              reject(error);
            });
          })
        }
      }).catch(function (error) {
        reject(error);
      });
    } else {
      getPMIDsURL(full_queryCT).then(function(CTresults) {
        CTresults = JSON.parse(CTresults);
        bothPMIDlists.push(CTresults.esearchresult.idlist);
        getPMIDsURL(full_querySR).then(function(SRresults) {
          SRresults = JSON.parse(SRresults);
          bothPMIDlists.push(SRresults.esearchresult.idlist);
          meshList.push(bothPMIDlists);
          getMultiplesPMIDs(terms, 0, count-1, meshList=meshList).then(function(result) {
            fulfill(result)
          }).catch(function (error) {
            reject(error);
          });
        }).catch(function (error) {
          reject(error);
        });
      }).catch(function (error) {
        reject(error);
      });
    }
  })
}

// Returns the counts of the CT and SR after going through the Knowledge Summary API
// @param:CT_SR_list => a list of lists with the PMIDs found above
function ksMultiplesCounts(CT_SR_list, count, ksQueryList = []) {
  if (count === 0) {
    return new Promise(function(fulfill, reject) {
      fulfill(ksQueryList);
    });
  }
  console.log("getKScounts");
  var counts = [];
  var current_CT_SR_list = CT_SR_list[count-1];
  var inputCT = formatKSquery(current_CT_SR_list[0]);
  var inputSR = formatKSquery(current_CT_SR_list[1]);
  return new Promise(function(fulfill, reject) {
    if (current_CT_SR_list[0].length === 0 && current_CT_SR_list[1].length === 0) {
      ksQueryList.push([0,0]);
      ksMultiplesCounts(CT_SR_list, count-1, ksQueryList=ksQueryList).then(function(counts) {
        fulfill(counts);
      }).catch(function (error) {
        console.log(error);
        reject(error);
      });
    } else if (current_CT_SR_list[1].length === 0) {
      ksQuery(inputCT).then(function(CTdata) {
        counts.push(CTdata[0].feed.length);
        counts.push(0);
        ksQueryList.push(counts);
        ksMultiplesCounts(CT_SR_list, count-1, ksQueryList=ksQueryList).then(function(counts) {
          fulfill(counts);
        }).catch(function (error) {
          console.log(error);
          reject(error);
        });

      }).catch(function (error) {
        console.log(error);
        reject(error);
      });
    } else if (current_CT_SR_list[0].length === 0) {
      ksQuery(inputSR).then(function(SRdata) {
        counts.push(0);
        counts.push(SRdata[0].feed.length);
        ksQueryList.push(counts);
        ksMultiplesCounts(CT_SR_list, count-1, ksQueryList = ksQueryList).then(function(counts) {
          fulfill(counts);
        }).catch(function (error) {
          console.log(error);
          reject(error);
        });
      }).catch(function (error) {
        console.log(error);
        reject(error);
      });
    } else {
      ksQuery(inputCT).then(function(CTdata) {
        counts.push(CTdata[0].feed.length);
        ksQuery(inputSR).then(function(SRdata) {
          counts.push(SRdata[0].feed.length);
          ksQueryList.push(counts);
          ksMultiplesCounts(CT_SR_list, count-1, ksQueryList = ksQueryList).then(function(counts) {
            fulfill(counts);
          }).catch(function (error) {
            console.log(error);
            reject(error);
          });
        }).catch(function (error) {
          console.log(error);
          reject(error);
        });
      }).catch(function (error) {
        console.log(error);
        reject(error);
      });
    }
  })
}

// Returns the CDS hooks card to be passed to the EHR
// @param:counts => the number of clinical trials and systematic reviews
// @param:coding_dict => dictionary holding the code, code system, and term
// @param:meshTerm => the MESH term
function createMultiplesCard(counts, meshTermList, gender, age) {

  var meshTerm;
  var links = [];
  var summary = 'Latest Evidence from the Clinical Knowledge Summary app:';
  var detail = "";
  for (var i = 0; i < meshTermList.length; i++) {
    const CTlistLength = counts[i][0];
    const SRlistLength = counts[i][1];
    meshTerm = meshTermList[i];

    if (CTlistLength === 0 && SRlistLength === 0) {
      continue;
    } else if (CTlistLength === 0) {
      detail +=  meshTerm + ': ' + SRlistLength + ' systematic reviews';
    } else if (SRlistLength === 0){
      detail += meshTerm + ': ' + CTlistLength + ' clinical trials';
    } else {
      detail += meshTerm + ': ' + CTlistLength + ' clinical trials and ' + SRlistLength + ' systematic reviews';
    }
    if (i < meshTermList.length - 1) {
      detail += ' \n ';
    }
    const link = {
      label: 'View evidence for ' + meshTerm,
      url: globeVars.homeURL + '/infobutton?meshList=' + JSON.stringify([meshTerm])
      + '&patientPerson.administrativeGenderCode.c=' + gender + '&age.v.v=' + age + '&age.v.u=a',
      type: 'smart',
      appContext: '{"meshList": ' + JSON.stringify([meshTerm]) + ', "gender": "' + gender + '", "age": "' + age + '"}'
    };
    links.push(link);
  }

  var cksCard = {
    cards: [
      {
        // Use the patient's First and Last name
        summary: summary,
        detail: detail,
        indicator: 'info',
        links: links
      }
    ]
  };
  return cksCard;
}

// When multiple medications are in the hooks call
// @param:med_list => list of medications
// @param:cond => a condition if included in the call
// @param:count => not used, refactoring needed
// @param:tgt => link needed to call umls api
// @param:gender => patient gender
// @param:age => patient age
function performMultipleMedicationsSearch(med_list, cond, count, tgt, gender, age) {
  return new Promise(function(fulfill, reject) {
    if (cond === null) {
      module.exports.getMeshTerm(tgt, med_list, 'code', med_list.length, false, true).then(function(meshList) {
        meshList = meshList.slice(0, med_list.length);
        getMultiplesPMIDs(meshList, 0, med_list.length).then(function(CT_SR_list) {
          ksMultiplesCounts(CT_SR_list, CT_SR_list.length).then(function(ks_counts) {
            fulfill(createMultiplesCard(ks_counts, meshList, gender, age));
          }).catch(function (error) {
            console.log(error);
            reject('ksMultiplesQuery not working');
          });
        }).catch(function (error) {
          console.log(error);
          reject('getMultiplesPMIDs not working');
        });
      });
    }
  })
}
