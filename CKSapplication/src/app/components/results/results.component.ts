import {Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { DataService } from '../../services/data.service';
import { trigger, style, animate, transition } from '@angular/animations';

import { Medication } from '../../models/medications';
import { SR } from '../../models/SR';
import { CT } from '../../models/CT';

import * as globeVars from '../../tools/variables';
import { Utiles } from '../../tools/utiles';

@Component({
  selector: 'app-results',
  host: {
    // when a click event occurs, the input box focus closes
   '(document:click)': 'closeBlur($event)',
   '(window:resize)': 'onResize($event)'
  },
  // animation is for the black window that comes up when searching
  animations: [
    trigger('fadeInOut', [
      transition('void => *', [
        style({opacity: 0}), // style only for transition transition (after transiton it removes)
        animate(40, style({opacity: 0.5})) // the new state of the transition(after transiton it removes)
      ]),
      transition('* => void', [
        animate(40, style({opacity: 0})) // the new state of the transition(after transiton it removes)
      ])
    ])
  ],
  templateUrl: './results.component.html',
  styleUrls: []
})

export class ResultsComponent implements OnInit {
  numRetry: number = 0;
  meshTerm: string;
  displayTerm: string = '';
  searchText: string = '';
  srcontent: any;
  ctcontent: any;
  noSummarySR: any;
  noSummaryCT: any;
  medications: any = new Medication();
  sr: any = new SR();
  ct: any = new CT();
  utiles: any = new Utiles();
  pubmedIDsSR: Array<string>;
  pubmedIDsCT: Array<string>;
  selectedMeds: Array<string> = [];
  selectedMedCodes: Array<string> = [];
  SRpage: number = 1;
  CTpage: number = 1;
  srPubmedReturn: Boolean;
  ctPubmedReturn: Boolean;
  status: Boolean = false;
  srFullScreen: Boolean = false;
  ctFullScreen: Boolean = false;
  inputFocus: Boolean = false;
  oneYear: Boolean = false;
  fiveYear: Boolean = false;
  year: number = 10;
  selected: string;
  queryTerms: Array<Object>;
  meshTerms: Array<string> = [];
  nonMeshTerms: Array<Object> = [];
  recentHist: Array<Object> = [];
  need_patient_banner: Boolean = false;
  patient_perm: Boolean = false;
  patientName: string = '';
  patientAge: number;
  patientGender: string = '';
  currentDate: string = '';
  age: string;
  age_group_bool: Boolean = false;
  age_exists_bool: Boolean = false;
  gender_bool: Boolean = false;
  gender_exists_bool: Boolean = false;
  patientAgeCat: string = '';
  showMeds: Boolean = false;
  mobile: Boolean = false;

  // Used to get the height of each of these elements for the black box element
  @ViewChild('systematic') elementView: ElementRef;
  @ViewChild('clinical') elemenView: ElementRef;
  @ViewChild('meds') eleView: ElementRef;

  constructor( private activatedRoute: ActivatedRoute, private dataService: DataService,
               private eleRef: ElementRef, private router: Router) { }

  ngOnInit() {
    if (window.innerWidth <= 1020) {
      this.mobile = true;
    }
    const history = localStorage.getItem('historyList');
    if (history !== null) {
      this.recentHist = JSON.parse(history);
    }

    // Defines where buttons and items are being pushed for the logging api
    sessionStorage.setItem('pathId', 'results');

    this.dataService.getTermList().subscribe(res => {
      // So that a user won't go straight to the /results
      if (Object.keys(res).length === 0) {
        this.router.navigate(['./']);
      } else {
        this.queryTerms = res;
        // This is for infobutton calls
        if (res[0]['gender'] && res[0]['gender'] !== '') {
          // Defines where buttons and items are being pushed for the logging api
          sessionStorage.setItem('pathId', 'infobutton');
          this.age_exists_bool = true;
          this.patientGender = res[0]['gender'];
        }
        if (res[0]['age'] && res[0]['age'] !== '') {
          this.gender_exists_bool = true;
          this.patientAgeCat = res[0]['age'];
        }
      }
    });
    // This is for SMART calls
    let patient = sessionStorage.getItem('patient');
    patient = JSON.parse(patient);
    if (patient) {
      // Defines where buttons and items are being pushed for the logging api
      sessionStorage.setItem('pathId', 'smart');
      this.setPatientData(patient);
    }

    this.dataService.currentpatientIDandToken.subscribe(patientIDandToken => {
      if (Object.keys(patientIDandToken).length !== 0) {
        if (patientIDandToken['need_patient_banner'] === true) {
          this.need_patient_banner = true;
        }
        if (patientIDandToken['scope'].split(' ').indexOf('patient/Patient.read') === -1) {
          this.need_patient_banner = false;
        } else {
          this.patient_perm = true;
        }
      }
    });
    const allTerms = new Array();
    if (this.queryTerms !== undefined) {
      for (let i = 0; i < this.queryTerms.length; i++) {
        if (this.queryTerms[i]['mesh'] === true) {
          this.meshTerms.push(this.queryTerms[i]['text']);
          allTerms.push(this.queryTerms[i]['text']);
        } else {
          this.nonMeshTerms.push(this.queryTerms[i]);
          allTerms.push(this.queryTerms[i]['text']);
        }
      }
    }

    // If opened with secure cds-hooks
    if (sessionStorage.getItem('patientId')) {
      this.dataService.getPatientInfo(sessionStorage.getItem('patientId'), sessionStorage.getItem('accessToken'))
        .subscribe((patientInfo) => {
          this.setPatientData(patientInfo);
        });
    }

    this.dataService.getMesh(this.nonMeshTerms).subscribe((mesh) => {
      mesh = JSON.parse(mesh);
      if (mesh.indexOf('-1') === -1) {
        for (let i = 0; i < mesh.length; i++) {
          this.meshTerms.push(mesh[i]);
        }
        const query = this.createMeshQuery(this.meshTerms);
        this.meshTerm = query;
        if (this.checkIfTermAlreadyInHist(query)) {
          this.changeToRecent(query);
        } else {
          this.getPMIDs(query);
        }
      } else {
        this.createMeshQuery(allTerms);
        this.srPubmedReturn = this.ctPubmedReturn = false;
        this.status = true;
      }
      this.adjustHeaderSize();
    });

  }

  // closeBlur will close the typeahead box when clicked out of
  // @param:event => click event recorded by interface
  closeBlur(event) {
    if (event.target !== null) {
      if (event.target.id === 'menu-nav' || event.target.id === 'menu-nav-icon') {
        this.showMeds = !this.showMeds;
      } else if (event.target.offsetParent !== undefined && event.target.offsetParent !== null) {
        if (event.target.offsetParent.id !== 'medication' && this.mobile) {
          if (document.getElementById('leftColumn') !== null || document.getElementById('summary') !== null) {
            document.getElementById('leftColumn').classList.remove('side-bar-closed');
            document.getElementById('summary').classList.remove('side-bar-closed-body');
            this.inputFocus = false;
            this.showMeds = false;
          }
        }
      }
    }
  }

  // Tracks when the screen size is changed to make necessary size adjustments to elements
  // @param:event => the web document
  onResize(event) {
    this.adjustHeaderSize();
    if (event.target.innerWidth <= 1020) {
      if (this.mobile === false) {
        this.showMeds = !this.showMeds;
      }
      this.mobile = true;
    } else {
      if (this.mobile === true) {
        if (document.getElementById('leftColumn') !== null && document.getElementById('summary') !== null) {
          document.getElementById('leftColumn').classList.remove('side-bar-closed');
          document.getElementById('summary').classList.remove('side-bar-closed-body');
          this.showMeds = !this.showMeds;
        }
      }
      this.inputFocus = false;
      this.mobile = false;
    }
  }

  // Changes the height of the blackOut box to match the tallest element so it will
  // reach the bottom
  // @param:bool => boolean which only allows the calculations to be done when the
  //                med box is open
  modifyHeight() {
    let srHeight, ctHeight;
    if (this.elementView !== null && this.elementView !== undefined) {
      srHeight = this.elementView.nativeElement.children[0].children[0].clientHeight + 50;
    } else {
      srHeight = 0;
    }

    if (this.elemenView != null && this.elemenView !== undefined) {
      ctHeight = this.elemenView.nativeElement.children[0].children[0].clientHeight + 50;
    } else {
      ctHeight = 0;
    }

    setTimeout(() => {
      let viewHeightMeds;
      if (this.eleView !== null && this.eleView !== undefined) {
        viewHeightMeds = this.eleView.nativeElement.children[0].children[0].children[0].clientHeight;
      } else {
        viewHeightMeds = 0;
      }

      let max = Math.max(viewHeightMeds, srHeight, ctHeight, window.innerHeight);
      if (max > 0) {
        max += 20;
        const hap = document.getElementById('blackOut');
        hap.setAttribute('style', 'height:' + max + 'px;');
      }
    }, 50);
  }

  // This is the starting point of populating the main box with the information
  // @param:term => the meshterm passed from refresh or ngOnInit
  getPMIDs(term) {
    debugger;
    // create the pubmed url searches
    const dates = this.utiles.constructDates(this.year);
    const start_date = dates[0];
    const today = dates[1];

    let possible_tail = '';
    if (this.gender_bool) {
      possible_tail += ' AND "' + this.patientGender + '"[MeSH Terms]';
    }
    if (this.age_group_bool) {
      possible_tail += ' AND "' + this.patientAgeCat + '"[MeSH Terms]';
    }

    // This is for cds-hooks
    if(sessionStorage.getItem('pathId') === 'infobutton') {
      const text_list = term.split(' AND ');
      if (text_list.length > 1) {
        term = text_list[0] + '"[MeSH] "' + text_list[1];
      }
    }

    const search_strategy_SR = globeVars.search_strategy_SR_head + '"' + start_date + '"[CDAT] : "' + today + '"[CDAT]'
      + globeVars.search_strategy_tail;
    const full_querySR = '"' + term + '"[MeSH]' + search_strategy_SR + possible_tail;
    let search_strategy_RCT;
    if (this.numRetry === 0) {
      search_strategy_RCT = globeVars.search_strategy_RCT_head_narrow + '"' + start_date + '"[CDAT] : "' + today + '"[CDAT]'
        + globeVars.search_strategy_tail;
    } else {
      search_strategy_RCT = globeVars.search_strategy_RCT_broad + '"' + start_date + '"[CDAT] : "' + today + '"[CDAT]'
        + globeVars.search_strategy_tail;
    }
    const full_queryCT = '"' + term + '"[MeSH]' + search_strategy_RCT + possible_tail;
    this.srPubmedReturn = false;  // Used to determine whether we get any results from pubmed
    this.ctPubmedReturn = false;

    if (term === '') {  // a blank query still returns results, need to set up a case when query is blank
      this.status = true; // change the status to true so the spinner stop showing
      this.ctcontent = null;
      this.srcontent = null;
    } else {
      // call dataService to return a list of pubmed ids pertaining to the mesh term
      // need a call for the SRs and CTs seperately
      if (this.numRetry === 0) { // Don't need to repeat the SR call on the retry
        this.dataService.getPMIDsURL(full_querySR).subscribe((data) => {
          const pubmedIDsSR = data.esearchresult.idlist;
          this.pubmedIDsSR = pubmedIDsSR;
          if (pubmedIDsSR.length === 0) {
            this.srcontent = null;
          } else {
            this.srPubmedReturn = true;
            this.getKSdataSR(pubmedIDsSR);
          }
        }, (error) => {
          this.status = true;
          alert('Error in retrieving PMID list for Systematic Reviews. Please try again.');
        });
      }

      this.dataService.getPMIDsURL(full_queryCT).subscribe((data) => {
        const pubmedIDsCT = data.esearchresult.idlist;
        this.pubmedIDsCT = pubmedIDsCT;
        if (pubmedIDsCT.length === 0) {
          if (this.numRetry === 0) {
            this.numRetry = 1;
            this.getPMIDs(term);
          } else {
            this.status = true;
            this.ctcontent = null;
          }
        } else {
          this.ctPubmedReturn = true;
          this.getKSdataCT(pubmedIDsCT);
        }
      }, (error) => {
        this.status = true;
        alert('Error in retrieving PMID list for Clinical Trials. Please try again.');
      });
    }
  }

  // Call the KS api to format the pubmed articles into a usable json formatKSquery
  // @param:pubmedIDsSR or pubmedIDsCT => list of applicable pubmed ids
  getKSdataSR(pubmedIDsSR) {
    const input = this.utiles.formatKSquery(pubmedIDsSR);
    this.dataService.ksQuery(String(input)).subscribe((data) => {
      if (data[0].feed.length === 0) {
        this.srcontent = null;
      } else {
        this.srcontent = data;
      }
    }, (error) => {
      this.status = true;
      alert('Error with KS Query API for Systematic Reviews. Please try again.');
    });
  }
  getKSdataCT(pubmedIDsCT) {
    const input = this.utiles.formatKSquery(pubmedIDsCT);
    this.dataService.ksQuery(String(input)).subscribe((data) => {
      if (data[0].feed.length === 0) {
        this.ctcontent = null;
      } else {
        this.ctcontent = data;
      }
      this.loadView(this.ctcontent);
    }, (error) => {
      this.status = true;
      alert('Error with KS Query API for Clinical Trials. Please try again.');
    });
  }

  // Function to load all contents in the knowledge summary section
  // The variable reachResultPage is only passed when the search result page is
  // initially loaded so that medication code and medication list is only reset in that case
  // @param:ctcontent => filled CT object
  loadView(ctcontent) {
    if (this.srcontent === undefined || ctcontent === undefined) {
      return;
    }
    this.sr = new SR();
    this.ct = new CT();
    this.SRpage = 1;
    this.CTpage = 1;
    const medTermCodes = new Array();
    this.noSummarySR = this.utiles.checkNullSummary(this.srcontent);
    this.noSummaryCT = this.utiles.checkNullSummary(ctcontent);
    this.ctcontent = ctcontent;
    this.loadSRAndCT(medTermCodes);
    this.medications.setMedContent(this.srcontent, ctcontent, this.sr, this.ct);
    this.addToRecentList(this.displayTerm);
    this.medications = this.utiles.sortMedications(this.medications);
    this.status = true;
  }

  // takes all of the content up to this points and populates the sr and ct objects
  // @param:medTermCodes => empty array to be filled with medications found in the articles for each category
  loadSRAndCT(medTermCodes) {
    this.sr.setSRContent(this.srcontent, this.noSummarySR, this.pubmedIDsSR, medTermCodes);
    this.ct.setCTContent(this.ctcontent, this.noSummaryCT, this.pubmedIDsCT, medTermCodes);
  }

  // Upper cases all of the words in a string
  // @param:str => the string to capitalize
  toTitleCase(str) {
    return str.replace(/\w\S*/g, function (txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
  }

  // Activated when a year or patient category checkbox is checked or unchecked
  // @param:checked => boolean of whether the box was checked or unchecked
  // @param:item => item checked
  updateOptions(item) {
    const checked = item.checked;
    item = item.item;
    this.inputFocus = false;
    this.status = false;
    this.showMeds = false;
    if (checked) {
      if (item === 1) {
        this.year = item;
        this.oneYear = true;
        this.fiveYear = false;
      }
      if (item === 5) {
        this.year = item;
        this.fiveYear = true;
        this.oneYear = false;
      }
      if (item === 'gender') {
        this.gender_bool = true;
      }
      if (item === 'age') {
        this.age_group_bool = true;
      }
      this.getPMIDs(this.meshTerm);
    } else {
      this.fiveYear = false;
      this.oneYear = false;
      if (item === 'gender') {
        this.gender_bool = false;
      }
      if (item === 'age') {
        this.age_group_bool = false;
      }
      if (item === 1 || item === 5) {
        this.year = 10;
      }
      this.getPMIDs(this.meshTerm);
    }
  }

  // Activated when a treatment/disease checkbox is checked or unchecked
  // @param:e => click event
  // @param:checked => boolean of whether the box was checked or unchecked
  // @param:medEntry => medEntry object
  updateCheckedOptions(event) {
    const e = event.event;
    const checked = event.checked;
    const medEntry = event.entry;
    const name = e.target.getAttribute('name');
    const code = e.target.getAttribute('value');
    if (checked) {
      this.selectedMeds.push(name);
      this.selectedMedCodes.push(code);
      this.SRpage = 1;
      this.CTpage = 1;
      this.sr = new SR();
      this.sr.setSRContent(this.srcontent, this.noSummarySR, this.pubmedIDsSR, this.selectedMedCodes);
      this.ct = new CT();
      this.ct.setCTContent(this.ctcontent, this.noSummaryCT, this.pubmedIDsCT, this.selectedMedCodes);
      medEntry.checked = true;
    } else {
      const indexName = this.selectedMeds.indexOf(name);
      this.selectedMeds.splice(indexName, 1);
      const indexCode = this.selectedMedCodes.indexOf(code);
      this.selectedMedCodes.splice(indexCode, 1);
      this.sr = new SR();
      this.sr.setSRContent(this.srcontent, this.noSummarySR, this.pubmedIDsSR, this.selectedMedCodes);
      this.ct = new CT();
      this.ct.setCTContent(this.ctcontent, this.noSummaryCT, this.pubmedIDsCT, this.selectedMedCodes);
      medEntry.checked = false;
    }
  }

  // Activated when the 'clear all' button is pushed. Clears all of the checkboxes in both categories
  // and updates the page.
  // @param:searchButton => Boolean: true if the search button is pressed, false if the selection
  //                        is from the recent history dropbox
  clearAll(searchButton) {

    this.selectedMeds = [];
    this.selectedMedCodes = [];
    this.status = false;
    if ((this.oneYear || this.fiveYear || this.gender_bool || this.age_group_bool) && !searchButton) {
      this.status = false;
      this.oneYear = false;
      this.fiveYear = false;
      this.gender_bool = false;
      this.age_group_bool = false;
      this.year = 10;
      this.showMeds = false;
      this.inputFocus = false;
      this.getPMIDs(this.meshTerm);
    } else if (searchButton) {
      //this.getPMIDs(this.meshTerm);
      // do nothing
    } else {
      this.sr = new SR();
      this.sr.setSRContent(this.srcontent, this.noSummarySR, this.pubmedIDsSR, this.selectedMedCodes);
      this.ct = new CT();
      this.ct.setCTContent(this.ctcontent, this.noSummaryCT, this.pubmedIDsCT, this.selectedMedCodes);

      this.status = true;

      for (let i = 0; i < this.medications.medarr.length; i++) {
        for (let j = 0; j < this.medications.medarr[i].subCategories.length; j++) {
          this.medications.medarr[i].subCategories[j]['entry'].checked = false;
        }
      }
    }
  }

  // Activated when either of the 'clear' buttons are pushed and will clear the boxes of all the
  // terms in that list. It then updates the page.
  // @param:category => 'Treatment' or 'Disease'
  clearCategory(category) {
    let index;

    if (category === 'Year') {
      this.status = false;
      this.oneYear = false;
      this.fiveYear = false;
      this.year = 10;
      this.showMeds = false;
      this.inputFocus = false;
      this.getPMIDs(this.meshTerm);
    } else if (category === 'Patient_Cats') {
      this.status = false;
      this.gender_bool = false;
      this.age_group_bool = false;
      this.showMeds = false;
      this.inputFocus = false;
      this.getPMIDs(this.meshTerm);
    } else if (category === 'Treatment') {
      for (let j = 0; j < this.medications.medarr[0].subCategories.length; j++) {
        index = this.selectedMedCodes.indexOf(this.medications.medarr[0].subCategories[j]['entry'].term);
        if (index !== -1) {
          this.selectedMedCodes.splice(index, 1);
          this.selectedMeds.splice(index, 1);
        }
        this.medications.medarr[0].subCategories[j]['entry'].checked = false;
      }
    } else {
      for (let i = 0; i < this.medications.medarr[1].subCategories.length; i++) {
        index = this.selectedMedCodes.indexOf(this.medications.medarr[1].subCategories[i]['entry'].term);
        if (index !== -1) {
          this.selectedMedCodes.splice(index, 1);
          this.selectedMeds.splice(index, 1);
        }
        this.medications.medarr[1].subCategories[i]['entry'].checked = false;
      }
    }
    this.sr = new SR();
    this.sr.setSRContent(this.srcontent, this.noSummarySR, this.pubmedIDsSR, this.selectedMedCodes);
    this.ct = new CT();
    this.ct.setCTContent(this.ctcontent, this.noSummaryCT, this.pubmedIDsCT, this.selectedMedCodes);
  }

  // Adds the mesh term to a list that populates the Recent History dropdown list
  // @param:term => term in question
  addToRecentList(term) {
    const history = localStorage.getItem('historyList');
    if (history === null) {
      localStorage.setItem('historyList', JSON.stringify(
        [{'term': term}]));
    } else {
      const lis = JSON.parse(history);
      const possibleIndex = this.recentHist.findIndex(x => x['term'] === term);
      // Don't want duplicates in the list
      if (possibleIndex !== -1) {
        this.recentHist.splice(possibleIndex, 1);
      }
      // Only put it in the Recent history tab if there were actually results returned
      if (this.srcontent !== null || this.ctcontent !== null) {
        const dict = {'term': term};
        this.recentHist.unshift(dict);
      }
      localStorage.setItem('historyList', JSON.stringify(this.recentHist));
    }
  }

  // Clears the Recent History list from top right menu
  clearHistory() {
    localStorage.setItem('historyList', JSON.stringify([]));
    this.recentHist = [];
  }

  // Changes to a term in the recent history list
  // @param:term => term in question
  changeToRecent(term) {
    this.status = false;
    this.inputFocus = false;
    this.checkIfTermAlreadyInHist(term);
    // Below is used for track how many times a user performs a search
    this.dataService.changeTerm(term);
    this.numRetry = 0;
    this.oneYear = false;
    this.fiveYear = false;
    this.gender_bool = false;
    this.age_group_bool = false;
    this.year = 10;
    this.selectedMeds = new Array();
    this.clearAll(true);
    const index = this.recentHist.findIndex(x => x['term'] === term);
    const newTerm = this.createMeshQuery(this.recentHist[index]['term'].split(' AND '));
    this.getPMIDs(newTerm);
    this.displayTerm = term;
    this.srPubmedReturn = true;  // Used to determine whether we get any results from pubmed
    this.ctPubmedReturn = true;
    this.adjustHeaderSize();
    this.addToRecentList(term);
  }

  // Sets the information about the patient in the patient banner if needed
  // @param:patient => patient fhir object
  setPatientData(patient) {
    this.patientName = patient.name[0].given[0] + ' ' + patient.name[0].family;
    const today = new Date();
    const birthDate = new Date(patient.birthDate);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    this.patientAge = age;
    this.patientAgeCat = this.utiles.convertAge(age, 'a');
    this.patientGender = this.toTitleCase(patient.gender);
    if (this.patientAgeCat !== '') {
      this.gender_exists_bool = true;
    }
    if (this.patientAgeCat !== '') {
      this.age_exists_bool = true;
    }
    const date = new Date(Date.now());
    this.currentDate = (date.getMonth() + 1) + '/' + date.getDate() + '/' + date.getFullYear();
  }

  // Creates the string containing the mesh terms to be used in the pubmed searched
  // @param:list => list of mesh terms
  createMeshQuery(list) {
    let meshquery = '';
    this.meshTerm = '';
    for (let j = 0; j < list.length; j++) {
      if (j === 0) {
        meshquery += list[j];
        this.displayTerm += list[j];
      } else {
        meshquery += '"[MeSH] AND "' + list[j];
        this.displayTerm += ' AND ' + list[j];
      }
    }
    this.meshTerm = meshquery;
    return meshquery;
  }

  // Allows both card components to pass these variables to each other to control the full screen functionality
  // @param:event => object with type (SR or CT) and bool (whether it's to go full screen or not
  changeFullScreen(event) {
    const type = event.type;
    const bool = event.bool;
      if (type === 'SR') {
        this.srFullScreen = bool;
      }
      if (type === 'CT') {
        this.ctFullScreen = bool;
      }
  }

  // When the top left menu-nav is clicked, this will open the filter menu
  changeSideView() {
    if (this.showMeds === false) {
      if (this.mobile) {
        this.inputFocus = true;
        this.modifyHeight();
      }
      if (document.getElementById('leftColumn') !== null && document.getElementById('summary') !== null) {
        document.getElementById('leftColumn').classList.add('side-bar-closed');
        document.getElementById('summary').classList.add('side-bar-closed-body');
      }
    } else {
      if (document.getElementById('leftColumn') !== null && document.getElementById('summary') !== null) {
        document.getElementById('leftColumn').classList.remove('side-bar-closed');
        document.getElementById('summary').classList.remove('side-bar-closed-body');
      }
      if (this.mobile) {
        this.inputFocus = false;
      }
    }
  }

  // Looks to see if a term is in recent history so it doesn't have to redo the search
  // @param:term => the term in question
  checkIfTermAlreadyInHist(term) {
    const possibleIndex = this.recentHist.findIndex(x => x['term'] === term);
    // Don't want duplicates in the list
    if (possibleIndex !== -1) {
      return true;
    }
    return false;
  }

  // Adjusts the size of the Header term according to string length and size of screen
  adjustHeaderSize() {
    if (this.displayTerm.length === 0 || document.getElementById('headerTerm') === null) {
      return;
    }
    if (this.displayTerm.length > 50) {
      if (window.innerWidth < 400) {
        document.getElementById('headerTerm').style.fontSize = '.6rem';
      } else if (window.innerWidth < 500) {
        document.getElementById('headerTerm').style.fontSize = '.7rem';
      } else if (window.innerWidth < 800) {
        document.getElementById('headerTerm').style.fontSize = '.85rem';
      } else {
        document.getElementById('headerTerm').style.fontSize = '1rem';
      }
    } else if (this.displayTerm.length > 150) {
      document.getElementById('headerTerm').style.fontSize = '.6rem';
    } else {
      if (window.innerWidth < 600) {
        document.getElementById('headerTerm').style.fontSize = '14px';
      } else if (window.innerWidth < 820) {
        document.getElementById('headerTerm').style.fontSize = '20px';
      } else if (window.innerWidth < 1020) {
        document.getElementById('headerTerm').style.fontSize = '1.2rem';
      } else {
        document.getElementById('headerTerm').style.fontSize = '1.4rem';
      }
    }
  }
}

