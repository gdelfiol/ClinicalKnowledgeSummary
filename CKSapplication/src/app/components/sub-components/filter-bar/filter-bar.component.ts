import {Component, OnInit, Input, Output, EventEmitter, SimpleChanges} from '@angular/core';

import * as globeVars from '../../../tools/variables';
import { Utiles } from '../../../tools/utiles';

@Component({
  selector: 'app-filter-bar',
  templateUrl: './filter-bar.component.html',
  styleUrls: []
})

export class FilterBarComponent implements OnInit {
  utiles: any = new Utiles();
  MED_LIST_MIN: number = globeVars.MED_LIST_MIN;
  MED_LIST_MORE: number = globeVars.MED_LIST_MORE;
  moreDisFlag = false;
  moreMedFlag = false;
  clearAllFlag;

  @Input() patientAgeCat;
  @Input() patientGender;
  @Input() age_exists_bool;
  @Input() age_group_bool;
  @Input() gender_bool;
  @Input() gender_exists_bool;
  @Input() fiveYear;
  @Input() oneYear;
  @Input() medications;
  @Input() selectedMedCodes;

  @Output() updateOptionsEmit = new EventEmitter<any>();
  updateOptions(checked, item) {
    this.updateOptionsEmit.emit({checked, item});
  }

  @Output() clearAllEmit = new EventEmitter<any>();
  clearAll() {
    this.clearAllFlag = true;
    this.clearAllEmit.emit(false);
  }

  @Output() clearCategoryEmit = new EventEmitter<any>();
  clearCategory(category) {
    this.clearCategoryEmit.emit(category);
  }

  @Output() updateCheckedOptionsEmit = new EventEmitter<any>();
  updateCheckedOptions(event, checked, entry) {
    this.clearAllFlag = false;
    this.updateCheckedOptionsEmit.emit({event, checked, entry})
  }

  constructor() { }

  ngOnInit() { }

  ngOnChanges(changes: SimpleChanges) {
    // Activated when a term is selected from recent history list, not when the clear all button is pressed
    if (this.clearAllFlag === false) {
      this.moreDisFlag = false;
      this.moreMedFlag = false;
    }
  }

  // This function will have the 'clear' buttons appear only when there are boxes that are checked
  // as described by whether they are found in the selectedMedCodes array
  // @param:category => 'Treatment' or 'Disease'
  checkIfCategoryEmpty(category) {
    let index;
    if (category === 'Treatment') {
      for (let j = 0; j < this.medications.medarr[0].subCategories.length; j++) {
        index = this.selectedMedCodes.indexOf(this.medications.medarr[0].subCategories[j]['entry'].term);
        if (index !== -1) {
          return true;
        }
      }
      return false;
    } else {
      for (let i = 0; i < this.medications.medarr[1].subCategories.length; i++) {
        index = this.selectedMedCodes.indexOf(this.medications.medarr[1].subCategories[i]['entry'].term);
        if (index !== -1) {
          return true;
        }
      }
      return false;
    }
  }

  // Activated when the 'more' or 'less' button is clicked on the med or dis lists
  // @param:i => index indicating whether it's the medication or disease list
  // @param:bool => true means the 'more' button is pressed, false means the 'less' button
  toggleMedList(i, bool) {
    if (bool === true) {
      if (i === 0) {
        this.moreMedFlag = true;
      } else {
        this.moreDisFlag = true;
      }
    } else {
      if (i === 0) {
        this.moreMedFlag = false;
      } else {
        this.moreDisFlag = false;
      }
    }
    this.modifyHeightDynamically();
  }

  // Changes the height of the black box as 'more' or 'less' buttons are being pressed
  modifyHeightDynamically() {
    setTimeout(() => {
      const sr = document.getElementById('srBox');
      const ct = document.getElementById('ctBox');
      let srHeight, ctHeight;
      if (sr !== null) {
        srHeight = sr.children[0].children[0].clientHeight + 50;
      } else {
        srHeight = 0;
      }
      if (ct !== null) {
        ctHeight = ct.children[0].children[0].clientHeight + 50;
      } else {
        ctHeight = 0;
      }
      const meds = document.getElementById('medBox');
      const viewHeightMeds = meds.children[0].children[0].children[0].clientHeight;
      let max = Math.max(viewHeightMeds, srHeight, ctHeight, window.innerHeight);
      max += 20;
      const hap = document.getElementById('blackOut');
      if (hap !== null) {
        hap.setAttribute('style', 'height:' + max + 'px;');
      }
    }, 5);
  }
}
