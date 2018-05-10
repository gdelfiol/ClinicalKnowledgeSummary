import { Component, OnInit, Renderer2 } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/debounceTime';
import 'rxjs/add/operator/distinctUntilChanged';
import { DataService } from '../../services/data.service';
import { Router, ActivatedRoute } from '@angular/router';

import { Utiles } from '../../tools/utiles';

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: []
})

export class SearchComponent implements OnInit {
  textInput: string = '';
  posts: Array<string>;
  conditionsLoaded: Boolean = false;
  medicationsLoaded: Boolean = false;
  problemListIsEmpty: Boolean = true;
  medicationListIsEmpty: Boolean = true;
  conditionList: Array<object> = [];
  medicationList: Array<object> = [];
  status: Boolean = false;
  IsSelected: Boolean = false;
  utiles: any = new Utiles();
  searchList: Array<object> = [];
  queryText: string = '';
  need_patient_banner: Boolean = false;
  patientName: string = '';
  patientAge: number;
  patientGender: string = '';
  currentDate: string = '';
  conditions_allowed: Boolean = false;
  medications_allowed: Boolean = false;
  topSpace: Boolean = true;
  recentHist: Array<object> = [];

  // The search algorithm for the typeahead functionality
  search = (text$: Observable<string>) =>
    text$
      .debounceTime(200)
      .distinctUntilChanged()
      .map(term => term.length < 2 ? []
        : this.posts.filter(v => v.toLowerCase().indexOf(term.toLowerCase()) > -1).slice(0, 10));

  constructor(private dataService: DataService, private router: Router,
    private renderer2: Renderer2, private activatedRoute: ActivatedRoute) { }

  mouseenter (event, focusable) {
    this.renderer2.addClass(event.target, 'mat-elevation-z5');
  }

  mouseleave (event, focusable) {
    this.renderer2.removeClass(event.target, 'mat-elevation-z5');
  }

  ngOnInit() {
    // This gets the MeSh term list used in the typeahead window
    this.dataService.getMeshList().subscribe((posts) => {
      this.posts = posts;
      const history = localStorage.getItem('historyList');
      if (history !== null) {
        this.recentHist = JSON.parse(history);
      }

      // Defines where buttons and items are being pushed for the logging api
      sessionStorage.setItem('pathId', 'search');

      this.status = false;

      this.dataService.currentpatientIDandToken.subscribe(patientIDandToken => {
        if (Object.keys(patientIDandToken).length === 0) {
          this.status = true;
        } else {
          // Defines where buttons and items are being pushed for the logging api
          sessionStorage.setItem('pathId', 'smart');
          this.setPermissions(patientIDandToken['scope']);
          if (patientIDandToken['need_patient_banner'] === true) {
            this.need_patient_banner = true;
          } else {
            this.need_patient_banner = false;
          }
          this.populateLists(patientIDandToken);
        }
      });
    });
  }

  ngAfterViewInit() {
    const history = localStorage.getItem('historyList');
    if (history !== null) {
      this.recentHist = JSON.parse(history);
    }
  }

  // Takes the patient's problem and medication lists and presents them as checkbox listSelection
  // @param:patientIDandToken => object holding the patient id and access token needed to get the information
  populateLists(patientIDandToken) {
    if (this.need_patient_banner && this.conditions_allowed && this.medications_allowed) {
      this.dataService.getPatientInfo(patientIDandToken.patientID, patientIDandToken.accessToken).subscribe(patient => {
        this.setPatientData(patient);
        this.dataService.getConditions(patientIDandToken.patientID, patientIDandToken.accessToken).subscribe(conditions => {
          this.conditionsPrep(conditions);
          this.dataService.getMedications(patientIDandToken.patientID, patientIDandToken.accessToken).subscribe(medications => {
            this.dataService.getMedicationStatements(patientIDandToken.patientID, patientIDandToken.accessToken).subscribe(medications2 => {
              this.medicationsPrep(medications, medications2);
              this.checkToAddTopSpace();
            });
          });
        });
      });
    } else if (this.need_patient_banner && this.conditions_allowed) {
      this.dataService.getPatientInfo(patientIDandToken.patientID, patientIDandToken.accessToken).subscribe(patient => {
        this.setPatientData(patient);
        this.dataService.getConditions(patientIDandToken.patientID, patientIDandToken.accessToken).subscribe(conditions => {
          this.conditionsPrep(conditions);
          this.checkToAddTopSpace();
        });
      });
    } else if (this.conditions_allowed && this.medications_allowed) {
      this.dataService.getConditions(patientIDandToken.patientID, patientIDandToken.accessToken).subscribe(conditions => {
        this.conditionsPrep(conditions);
        this.dataService.getMedications(patientIDandToken.patientID, patientIDandToken.accessToken).subscribe(medications => {
          this.dataService.getMedicationStatements(patientIDandToken.patientID, patientIDandToken.accessToken).subscribe(medications2 => {
            this.medicationsPrep(medications, medications2);
            this.checkToAddTopSpace();
          });
        });
      });
    } else if (this.need_patient_banner && this.medications_allowed) {
      this.dataService.getPatientInfo(patientIDandToken.patientID, patientIDandToken.accessToken).subscribe(patient => {
        this.setPatientData(patient);
        this.dataService.getMedications(patientIDandToken.patientID, patientIDandToken.accessToken).subscribe(medications => {
          this.dataService.getMedicationStatements(patientIDandToken.patientID, patientIDandToken.accessToken).subscribe(medications2 => {
            this.medicationsPrep(medications, medications2);
            this.checkToAddTopSpace();
          });
        });
      });
    } else if (this.need_patient_banner) {
      this.dataService.getPatientInfo(patientIDandToken.patientID, patientIDandToken.accessToken).subscribe(patient => {
        this.setPatientData(patient);
        this.checkToAddTopSpace();
      });
    } else if (this.conditions_allowed) {
      this.dataService.getConditions(patientIDandToken.patientID, patientIDandToken.accessToken).subscribe(conditions => {
        this.conditionsPrep(conditions);
        this.checkToAddTopSpace();
      });
    } else if (this.medications_allowed) {
      this.dataService.getMedications(patientIDandToken.patientID, patientIDandToken.accessToken).subscribe(medications => {
        this.dataService.getMedicationStatements(patientIDandToken.patientID, patientIDandToken.accessToken).subscribe(medications2 => {
          this.medicationsPrep(medications, medications2);
          this.checkToAddTopSpace();
        });
      });
    }
  }

  // Keeps track of what's being selected and what's in the search bar and changes either accordingly
  // @param:e => the checkbox event element
  // @param:checked => true means the checkbox has been checked, false means it's unchecked
  // @param:element => gives the object associated with the check box, either a condition or medication
  listSelection(checked: boolean, element) {
    this.IsSelected = true;
    let tempObj = {};
    let displayText, codeSystem, HL7code;
    if (checked) {
      element.checked = true;
      if (element.content.resource.code) {
        displayText = element.content.resource.code.text;
        codeSystem = element.content.resource.code.coding[0]['system'];
        HL7code = element.content.resource.code.coding[0]['code'];
        tempObj = { 'text': displayText, 'system': codeSystem, 'code': HL7code, 'mesh': false };
      } else {
        // Extracts the drug name and drops the dosing info
        displayText = element.content.resource.medicationCodeableConcept.text.match(/(\w+\s?\D*)/);
        let temp_string;
        if (displayText[0].slice(-1) === ' ') {  // transforms the problem name to a searchable, url term
            temp_string = displayText[0].slice(0, -1); // take off space at the end if needed
        } else {
          temp_string = displayText[0];
        }
        displayText = this.utiles.toTitleCase(temp_string);
        codeSystem = element.content.resource.medicationCodeableConcept.coding[0]['system'];
        HL7code = element.content.resource.medicationCodeableConcept.coding[0]['code'];
        tempObj = { 'text': displayText, 'system': codeSystem, 'code': HL7code, 'mesh': false };
      }
      this.searchList.push(tempObj);
      if (this.textInput !== '') {
        this.textInput += ' AND ' + displayText;
      } else {
        this.textInput = displayText;
      }
    } else {
      element.checked = false;
      if (element.content.resource.code) {
        this.searchList = this.searchList.filter(function(el) {
            return el['code'] !== element.content.resource.code.coding[0]['code'];
        });
        displayText = element.content.resource.code.text;
      } else {
        this.searchList = this.searchList.filter(function(el) {
            return el['code'] !== element.content.resource.medicationCodeableConcept.coding[0]['code'];
        });
        displayText = element.content.resource.medicationCodeableConcept.text;
      }
      const ind = this.textInput.indexOf(displayText);
      let temp_string;
      let AND_ind;
      if (ind === 0) {
        if (this.textInput.indexOf('AND') !== -1) {
          temp_string = displayText + ' AND ';
          this.textInput = this.textInput.substring(temp_string.length, this.textInput.length);
        } else {
          this.textInput = '';
        }
      } else {
        AND_ind = this.textInput.indexOf(displayText + ' AND ');
        if (AND_ind === -1) { // If it's the last element in list
          temp_string = ' AND ' + displayText;
          AND_ind = this.textInput.indexOf(temp_string);
          this.textInput = this.textInput.substring(0, AND_ind);
        } else {
          temp_string = ' AND ' + displayText;
          const temp_string1 = this.textInput.substring(0, AND_ind - 5);
          const temp_string2 = this.textInput.substring(AND_ind + temp_string.length - 5, this.textInput.length);
          this.textInput = temp_string1 + temp_string2;
        }
      }
    }
  }

  // Transforms search term in the input box into a list of objects that has the information needed to make
  // the most accurate search
  prepareParameters(text) {
    const text_list = text.split(' AND ');
    let temp_string;
    let dis_ind;
    const upper_mesh = this.posts.map(function(x){ return x.toUpperCase(); });
    for (let i = 0; i < text_list.length; i++) {
      temp_string = text_list[i];
      const ind = this.searchList.findIndex(j => j['text'] === text_list[i]);
      if (ind !== -1) {
        this.searchList[ind]['text'] = temp_string;
      } else {
        this.searchList.push({'text': temp_string, 'system': '', 'code': '', 'mesh': false});
      }
      dis_ind = upper_mesh.indexOf(temp_string.toUpperCase());
      if (dis_ind !== -1) {
        this.searchList[i]['mesh'] = true;
      }
    }
    return this.searchList;
  }

  // Triggered by a change in the text in the input box. It will change the checkboxes according to whether
  // they exist in the input box text or not.
  checkTerm() {
    const temp_string = this.textInput.toUpperCase();
    for (let i = 0; i < this.conditionList.length; i++) {
      if (temp_string.indexOf(this.conditionList[i]['content'].resource.code.text.toUpperCase()) === -1) {
        this.conditionList[i]['checked'] = false;
      } else {
        this.conditionList[i]['checked'] = true;
      }
    }
    for (let i = 0; i < this.medicationList.length; i++) {
      if (temp_string.indexOf(this.medicationList[i]['content'].resource.medicationCodeableConcept.text.toUpperCase()) === -1) {
        this.medicationList[i]['checked'] = false;
      } else {
        this.medicationList[i]['checked'] = true;
      }
    }
  }

  // Adds items to the pubmed query under the search box
  changeQuery() {
    if (this.queryText === '') {
      this.queryText = this.utiles.toTitleCase(this.textInput);
    } else if (this.textInput !== '') {
      this.queryText += ' AND ' + this.utiles.toTitleCase(this.textInput);
    }
    this.textInput = '';
    this.clearLists();
  }

  // Removes the query text under the search box
  clearQuery() {
    this.queryText = '';
  }

  // Clears the medication and conditions lists for SMART
  clearLists() {
    for (let i = 0; i < this.conditionList.length; i++) {
      this.conditionList[i]['checked'] = false;
    }
    for (let i = 0; i < this.medicationList.length; i++) {
      this.medicationList[i]['checked'] = false;
    }
  }

  // Sets the information about the patient in the patient banner if needed
  // @param:patient => patient fhir object
  setPatientData(patient) {
    sessionStorage.setItem('patient', JSON.stringify(patient));
    this.patientName = patient.name[0].given[0] + ' ' + patient.name[0].family;
    const today = new Date();
    const birthDate = new Date(patient.birthDate);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    this.patientAge = age;
    this.patientGender = this.utiles.toTitleCase(patient.gender);
    const date = new Date(Date.now());
    this.currentDate = (date.getMonth() + 1) + '/' + date.getDate() + '/' + date.getFullYear();
  }

  // Takes the scope that is given by SMART user and changes the app accordingly
  // @param:scope => scope returned by user as a string
  setPermissions(scope) {
    scope = scope.split(' ');
    if (scope.indexOf('patient/Condition.read') !== -1) {
      this.conditions_allowed = true;
    }
    if (scope.indexOf('patient/Patient.read') !== -1) {
      this.need_patient_banner = true;
    } else {
      this.need_patient_banner = false;
    }
    if (scope.indexOf('patient/MedicationOrder.read') !== -1 || scope.indexOf('patient/MedicationRequest.read') !== -1) {
      this.medications_allowed = true;
    }
  }

  // With Condition bundle, populate the appropriate variables
  // @param:conditions => Bundle FHIR resource with conditions list, can be empty
  conditionsPrep(conditions) {
    const tempList = [];
    if (!conditions.entry) {
      this.conditionList = [];
    } else {
      this.conditionList = this.utiles.sortList(conditions.entry, 'conditions');
      for (let i = 0; i < this.conditionList.length; i++) {
        tempList.push({'content': this.conditionList[i], 'checked': false});
      }
      this.conditionList = tempList;
      this.conditionsLoaded = true;
      this.problemListIsEmpty = false;
    }
  }
  // With MedicationOrder and MedicationStatement bundles, populate the appropriate variables
  // @param:medications => Bundle MedicationOrder FHIR resource with conditions list, can be empty
  // @param:medications2 => Bundle MedicationStatement FHIR resource with conditions list, can be empty
  medicationsPrep(medications, medications2) {
    if (!medications.entry) {
      medications = [];
    } else {
      medications = medications.entry;
    }
    if (!medications2.entry) {
      medications2 = [];
    } else {
      medications2 = medications2.entry;
    }
    medications = medications.concat(medications2);
    const tempList = [];
    if (medications.length === 0) {
      this.medicationList = [];

    }  else {
      this.medicationList = this.utiles.sortList(medications, 'medications');
      for (let i = 0; i < this.medicationList.length; i++) {
        tempList.push({'content': this.medicationList[i], 'checked': false});
      }
      this.medicationList = tempList;
      this.medicationsLoaded = true;
      this.medicationListIsEmpty = false;
    }
    this.status = true;
  }

  // Will see whether the space filling div above the title is necessary
  checkToAddTopSpace() {
    if ((!this.problemListIsEmpty || !this.medicationListIsEmpty)) {
      this.topSpace = false;
    }
  }

  // Changes the results to one of the items in the history list
  changeToRecent(term) {
    this.textInput = term;
  }

  // Clears the Recent History list from top right menu
  clearHistory() {
    localStorage.setItem('historyList', JSON.stringify([]));
    this.recentHist = [];
  }

  // Adds the mesh term to a list that populates the Recent History dropdown list
  // @param:term => term to be added to the list
  addToRecentList(term) {
    const history = localStorage.getItem('historyList');
    if (history === null) {
      localStorage.setItem('historyList', JSON.stringify(
        [{'term': term}]));
    } else {
      const possibleIndex = this.recentHist.findIndex(x => x['term'] === term);
      // Don't want duplicates in the list
      let dict;
      if (possibleIndex !== -1) {
        dict = this.recentHist[possibleIndex];
        // Only want to add terms to the list that are mesh terms
        if (this.posts.indexOf(term) !== -1) {
          this.recentHist.splice(possibleIndex, 1);
          this.recentHist.unshift(dict);
        }
      } else {
        if (this.posts.indexOf(term) !== -1) {
          dict = {'term': term};
          this.recentHist.unshift(dict);
        }
      }
      localStorage.setItem('historyList', JSON.stringify(this.recentHist));
    }
  }

  // Called when the search button is pressed and will redirect the user to the results page
  //    with the search term.
  // param:event => the means by which this function was called - search button or enter
  redirect(event) {
    if (!event.target.classList.contains('open')) {
      if (event.target.classList.contains('form-control')) {
        // Only captures frequency of when enter is pressed
        const path = sessionStorage.getItem('pathId');
        this.dataService.postFreq({'clickedItem': 'searchEnter', 'path': path}).subscribe(res => res);
      }
      let params;
      if (this.queryText !== '') {
        this.dataService.changeTerm(this.queryText);
        params = this.prepareParameters(this.queryText);
        this.addToRecentList(this.queryText);
      } else {
        this.dataService.changeTerm(this.textInput);
        params = this.prepareParameters(this.textInput);
        this.addToRecentList(this.textInput);
      }
      this.dataService.changeTermList(params);
      this.router.navigate(['./results'] );
    }
  }
}
