import { Injectable } from '@angular/core';
import { Http, Headers, RequestOptions } from '@angular/http';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/catch';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import 'rxjs/add/observable/of';
import { parseString } from 'xml2js';
import * as globeVars from '../tools/variables';

import { environment } from '../../environments/environment';
import 'rxjs/add/operator/map';

@Injectable()
export class DataService {
  private meshTerm = new BehaviorSubject<string>('-1');
  private termList = new BehaviorSubject<any>([]);
  private patientIDandToken = new BehaviorSubject<Object>({});
  currentTerm = this.meshTerm.asObservable();
  currentpatientIDandToken = this.patientIDandToken.asObservable();

  constructor(public http: Http) {
  }

  // Calls the FHIR server to get the needed metadata
  // @param:issuerUrl => address to FHIR server
  getConformance(issuerUrl) {
    return this.http.get(issuerUrl + '/metadata')
      .map(response => response.json());
  }

  // Gives you the authorization token and patient ID from the EHR
  // @param:tokenURL => Url given in last step of authorization
  // @param:clientId => ID created by the EHR environment for deployment of the app
  // @param:redirectUri => Url that will be opened after authorization is complete
  // @param:code => code used for environment privleges
  getAuthorization(tokenUrl, clientId, redirectUri, code) {
    const headers = new Headers({'Content-Type': 'application/x-www-form-urlencoded'});
    const options = new RequestOptions({headers: headers});
    const body = 'code=' + encodeURIComponent(code) +
      '&grant_type=authorization_code' +
      '&redirect_uri=' + encodeURIComponent(redirectUri) +
      '&client_id=' + encodeURIComponent(clientId);
    return this.http.post(tokenUrl, body, options).map(response => response.json());
  }

  // The next four functions retrieve their respective lists from the EHR
  // @param:patientID => ID of patient in EHR environment
  // @param:accessToken => token the FHIR server needs to give you access to the server
  getPatientInfo(patientID, accessToken) {
    let options;
    if (environment.oauth2Enabled) {
      const headers = new Headers({'Authorization': 'Bearer ' + accessToken});
      options = new RequestOptions({headers: headers});
    }
    const fhir = sessionStorage.getItem('iss');
    return this.http.get(fhir + '/Patient/' + patientID , options)
      .map(response => response.json());
  }
  getConditions(patientID, accessToken) {
    let options;
    if (environment.oauth2Enabled) {
      const headers = new Headers({'Authorization': 'Bearer ' + accessToken});
      options = new RequestOptions({headers: headers});
    }
    const fhir = sessionStorage.getItem('iss');
    return this.http.get(fhir + '/Condition?patient=' + patientID , options)
      .map(response => response.json());
  }
  getMedications(patientID, accessToken) {
    let options;
    if (environment.oauth2Enabled) {
      const headers = new Headers({'Authorization': 'Bearer ' + accessToken});
      options = new RequestOptions({headers: headers});
    }
    const fhir = sessionStorage.getItem('iss');
    return this.http.get(fhir + '/MedicationOrder?patient=' + patientID ,
      options)
      .map(response => response.json());
  }
  getMedicationStatements(patientID, accessToken) {
    let options;
    if (environment.oauth2Enabled) {
      const headers = new Headers({'Authorization': 'Bearer ' + accessToken});
      options = new RequestOptions({headers: headers});
    }
    const fhir = sessionStorage.getItem('iss');
    return this.http.get(fhir + '/MedicationStatement?patient=' + patientID, options)
      .map(response => response.json());
  }

  // returns a mesh term item
  getMesh(queryTerms) {
    const url = '/umls_call/getMeshTerm';
    return this.http.post(url, {'queryTerms' : queryTerms })
      .map(res => res.text());
  }

  // Returns list of mesh terms
  getTermList() {
    return this.termList;
  }

  // adds a click event to the mongo database
  postFreq(eventName) {
    return this.http.post('/logging_api/postClicks', eventName)
      .map(res => res.json());
  }

  // Gets the diseases from the json file
  getMeshList() {
    return this.http.get('../assets/sorted_mesh.json')
      .map(res => res.json());
  }

  // This is where the mesh term is updated to be grabbed from all components of the app
  changeTerm(meshTerm: string) {
    this.meshTerm.next(meshTerm);
  }

  changeTermList(terms: Object) {
    this.termList.next(terms);
  }

  changePatientIDandAccess(patientID: string, accessToken: string, need_patient_banner: Boolean, scope: string) {
    this.patientIDandToken.next({'patientID': patientID, 'accessToken': accessToken,
      'need_patient_banner': need_patient_banner, 'scope': scope});
  }

  // With a cui found above, a mesh term will be returned
  // @param:cui => CUI code
  // @param:ticket => umls ticket needed to access the api
  getMeshTerm(cui, ticket) {
    const base_uri = globeVars.meshTermfromAPIHead + cui + globeVars.meshTermfromAPImiddle + ticket;
    return this.http.get(base_uri)
      .map(res => res.json());
  }

  // With either the SR or CT queries, this function calls the pubmed eutils api and returns a json
  // formatted list of pubmed ids
  // @param:query => SR or CT query pre-defined
  getPMIDsURL(query) {
    const url = globeVars.PMIDlistURIHead + query;
    return this.http.get(url)
      .map(res => res.json());
  }

  // Calls the knowledge summary api to receive a json of needed information
  // @param:input => query string needed for post call
  ksQuery(input) {
    const headers = new Headers();
    headers.append('Content-Type', 'application/json;charset=utf-8');
    return this.http.post(globeVars.ksUrl, input, { headers: headers })
      .map(res => res.json());
  }

  // Calls eutils to get the results sections or abstracts needed when pressing the 'more'
  // buttons in the body of the results
  // @param:id => pubmed id
  pubmedQuery(id) {
    const pubmedURL = globeVars.eutilsUrl + id;
    const headers = new Headers();
    headers.append('Accept', 'application/xml');
    return this.http.get(pubmedURL, { headers: headers })
      .map(res => res.text());
  }
}
