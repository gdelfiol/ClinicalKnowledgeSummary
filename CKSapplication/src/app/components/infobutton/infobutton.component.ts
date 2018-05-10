import { Component, OnInit, Renderer, ElementRef } from '@angular/core';
import { Location } from '@angular/common';
import { Router, ActivatedRoute, Params } from '@angular/router';
import { DataService } from '../../services/data.service';

import * as globeVars from '../../tools/variables';
import { Utiles } from '../../tools/utiles';

@Component({
  selector: 'app-infobutton',
  template: '<div>Loading...</div>'
})

export class InfobuttonComponent implements OnInit {
  query: string;
  meshTerm: string;
  term: string;
  posts: Array<string>;
  utiles: any = new Utiles();
  Infobuttonterm: string;
  Infobuttonsystem: string;
  Infobuttoncode: string;
  age: string;
  gender: string;

  constructor(private renderer: Renderer, private activatedRoute: ActivatedRoute,
              private dataService: DataService, private location: Location,
              private eleRef: ElementRef, private router: Router) { }

  ngOnInit() {
    // This gets the disease list used in the typeahead window
    this.dataService.getMeshList().subscribe((posts) => {
      this.posts = posts;
    });
    let meshList = [];
    setTimeout(() => { // Need to delay the rest of the code so that the session variable 'appContext' can be assigned
      let appContext;
      if (sessionStorage.getItem('appContext')) {
        appContext = JSON.parse(sessionStorage.getItem('appContext'));
      } else {
        appContext = null;
      }

      // This will pull the infobutton parameters from the infobutton call
      this.activatedRoute.queryParams.subscribe((params: Params) => {
        this.Infobuttonterm = params['mainSearchCriteria.v.dn'];
        this.Infobuttonsystem = params['mainSearchCriteria.v.cs'];
        this.Infobuttoncode = params['mainSearchCriteria.v.c'];
        this.gender = params['patientPerson.administrativeGenderCode.c'];
        let age = params['age.v.v'];
        let age_type = params['age.v.u'];
        const age_group = params['ageGroup.v.c'];
        if (appContext !== null) {
          meshList = appContext.meshList;
          this.gender = appContext.gender;
          age = appContext.age;
          age_type = 'a';
        } else if (params['meshList']) {
          const meshs = params['meshList'];
          meshList = JSON.parse(meshs);
        } else {
          meshList = [];
        }
        if (age_group) {
          this.age = globeVars.infobutton_mesh[age_group];
        } else {
          this.age = this.utiles.convertAge(parseInt(age), age_type);
        }
        this.gender = this.utiles.convertGender(this.gender);
      });

      // Want to subscribe the mesh term that will update in all of the areas it is used automatically
      this.dataService.currentTerm.subscribe(term => this.meshTerm = term);
      if (!this.gender) {
        this.gender = '';
      }

      // meshList is passed by the cds hook resource
      if (meshList.length > 0) {
        const params = [];
        for (let i = 0; i < meshList.length; i++) {
          params.push({'text': meshList[i], 'system': '', 'code': '', 'mesh': true, 'gender': this.gender, 'age': this.age});
        }
        this.dataService.changeTermList(params);
        this.router.navigate(['./results']);

      } else { // This is a single infobutton call
        const dict = { 'text': this.Infobuttonterm, 'system': this.Infobuttonsystem, 'code': this.Infobuttoncode, 'mesh': false,
                        'gender': this.gender, 'age': this.age };
        this.dataService.changeTermList([dict]);
        this.router.navigate(['./results']);
      }
    }, 1000);
  }
}
