import * as globeVars from '../tools/variables';

export class Medication {
  srJson: any = null;
  ctJson: any = null;
  medarr: Array<any> = new Array();

  constructor() { }

  // Set the json content.
  // @param:ctContent => the json format response from the KS api about the CTs
  // @param:srContent => the json format response from the KS api about the SRs
  setJson(srContent, ctContent) {
    this.srJson = srContent;
    this.ctJson = ctContent;
  }

  // Sets the content from the ks query into a medication object holding a list of all
  // the medication and disease filter data
  // @param:ctContent => the json format response from the KS api about the CTs
  // @param:srContent => the json format response from the KS api about the SRs
  // @param:sr => systematic review object
  // @param:ct => clinical trial object
  setMedContent(srContent, ctContent, sr, ct) {
    let lowerlevelarrSR;
    let lowerlevelarrCT;
    if (srContent  === null && ctContent === null) {
      return;
    }
    this.setJson(srContent, ctContent);
    if (this.srJson === null && this.ctJson  === null) {
      return;
    }
    if (this.srJson !== null) {
      lowerlevelarrSR = this.srJson[0].filters;
    }
    if (this.ctJson !== null) {
      lowerlevelarrCT = this.ctJson[0].filters;
    }
  	// Indices to create the upper level filters.
  	// The filter consists of treatment and disease.
    let lowerTreatIdx = 0 ;
    let lowerDisIdx = 0 ;
  	// This is an temporary repository for medarr. it will be deleted
  	// after removing duplicates that comes from SR and CT.
    const tempTreatArr = new MedicationEntry() ;
    tempTreatArr.label = 'Treatment';
    const tempDisArr = new MedicationEntry() ;
    tempDisArr.label = 'Disease';
    if (this.srJson !== null) {
      for (let i = 0; i < lowerlevelarrSR.length; i++) {
        if (lowerlevelarrSR[i].semanticGroup === 'CHEM') {
          tempTreatArr.subCategories[lowerTreatIdx] = this.ConvertToMedicationEntry(lowerlevelarrSR[i], sr, ct);
          lowerTreatIdx += 1;
        } else if (lowerlevelarrSR[i].semanticGroup === 'DISO') {
          tempDisArr.subCategories[lowerDisIdx] = this.ConvertToMedicationEntry(lowerlevelarrSR[i], sr, ct);
          lowerDisIdx += 1;
        }
      }
    }
  	// The filters are needed to be retrieved from systematic review and clinical trials and to be merged.
    if (this.ctJson !== null) {
      for (let i = 0; i < lowerlevelarrCT.length; i++) {
        if (lowerlevelarrCT[i].semanticGroup === 'CHEM') {
          tempTreatArr.subCategories[lowerTreatIdx] = this.ConvertToMedicationEntry(lowerlevelarrCT[i], sr, ct);
          lowerTreatIdx += 1;
        } else if (lowerlevelarrCT[i].semanticGroup === 'DISO') {
          tempDisArr.subCategories[lowerDisIdx] = this.ConvertToMedicationEntry(lowerlevelarrCT[i], sr, ct);
          lowerDisIdx += 1;
        }
      }
    }
  	// This part is to reorder medSubcategories according to tfidf score
    this.sortByTfidf(tempTreatArr.subCategories);
    this.sortByTfidf(tempDisArr.subCategories);
  	// This part is to remove duplicate medications from SR and CT
  	// and filter out less important filters according to tfidf score
    let idx = 0;
    let tempArr = new MedicationEntry();
  	// A label to set up how many filters are going to be used.
    tempArr.label = 'Treatment';
    this.medarr[0] = tempArr;
    let page = 0;
    const page1_count = globeVars.MED_LIST_MIN;
    const page2_count = globeVars.MED_LIST_MORE + globeVars.MED_LIST_MIN;
    let count = 0;
    for (let i = 0; i < tempTreatArr.subCategories.length; i++) {
      let duplicate = false;
      for (let j = 0 ; j < this.medarr[0].subCategories.length; j++) {
        if (tempTreatArr.subCategories[i].label === this.medarr[0].subCategories[j].entry.label) {
          duplicate = true;
          break;
        }
      }
  		// Use filters if there is no duplicate and the tf-idf value is larer than the threshold tf-idf
  		// Medication has already been sorted by tf-idf
      if (!duplicate) {
        if (tempTreatArr.subCategories[i].count !== 0) {
          if (count < page1_count) {
            page = 1;
          } else if (count >= page1_count && count < page2_count) {
            page = 2;
          } else {
            page = 3;
          }
          count += 1;
          this.medarr[0].subCategories[idx++] = { 'entry': tempTreatArr.subCategories[i], 'page': page };
          this.medarr[0].count += tempTreatArr.subCategories[i].count;
        }
      }
    }
    idx = 0;
    tempArr = new MedicationEntry();
  	// A letiable to set up how many filters are going to be used.
    tempArr.label = 'Disease';
    this.medarr[1] = tempArr;
    page = 0;
    count = 0;
    for (let i = 0; i < tempDisArr.subCategories.length; i++) {
      let duplicate = false;
      for (let j = 0 ; j < this.medarr[1].subCategories.length; j++) {
        if (tempDisArr.subCategories[i].label === this.medarr[1].subCategories[j].entry.label) {
          duplicate = true;
          break;
        }
      }
  		// Use filters if there is no duplicate and the tf-idf value is larer than the threshold tf-idf
  		// Medication has already been sorted by tf-idf
      if (!duplicate) {
        if (tempDisArr.subCategories[i].count !== 0) {
          if (count < page1_count) {
            page = 1;
          } else if (count >= page1_count && count < page2_count) {
            page = 2;
          } else {
            page = 3;
          }
          count += 1;
          this.medarr[1].subCategories[idx++] = { 'entry': tempDisArr.subCategories[i], 'page': page };
          this.medarr[1].count += tempDisArr.subCategories[i].count;
        }
      }
    }
  }

  // Map given HTML element object to MedicationEntry object defined above
  // @param:element => HTML element
  // @param:sr => systematic review object
  // @param:ct => clinical trial object
  ConvertToMedicationEntry(element, sr, ct) {
    const medEntry = new MedicationEntry();
    medEntry.label = element.term;
    medEntry.term = element.cui;
  	// Calculates tf-idf score
    medEntry.tfidf = element.frequencyInResults * Math.log(globeVars.NUM_OF_DOCUMENT_IN_COLLECTION / element.frequencyInCollection);
    medEntry.count = medEntry.countNumOfTotalEntries(sr, ct);
    return medEntry;
  }

  // sorts the medications and diseases by tfidf score, highest to lowest
  // @param:subCategories => list of medications and diseases
  sortByTfidf(subCategories) {
    if (subCategories.length === 0) {
      return;
    }
    let tmp;
  	// i is the element to be inserted
    for (let i = 1; i < subCategories.length; i++) {
      tmp = subCategories[i];
      let j;
      for (j = i - 1; j >= 0; j--) {
        if (tmp.tfidf > subCategories[j].tfidf) {
          subCategories[j + 1] = subCategories[j];
        } else {
          subCategories[j + 1] = tmp;
          break;
        }
      }
      if (j < 0) {
        subCategories[0] = tmp;
      }
    }
  }
}

export class MedicationEntry  {
  count: number = 0;
  label: string = null;
  term: string = null;
  tfidf: number = 0;
  checked: Boolean = false;
  subCategories: Array<any> = new Array(); // subcategories is an array of MedicationEntry objects

  constructor() { }

  // Counts the total number of medications and diseases from both the systematic reviews
  // and clinical trials
  // @param:sr => systematic review object
  // @param:ct => clinical trial object
  countNumOfTotalEntries(sr, ct) {
    let count = 0;
    if (sr.entryArray.length !== 0) {
      count += sr.countNumOfMatchedEntries(this.term, sr);
    }
    if (ct.entryArray.length !== 0) {
      count += ct.countNumOfMatchedEntries(this.term);
    }
    return count;
   }
}
