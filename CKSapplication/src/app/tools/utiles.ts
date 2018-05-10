import * as globevars from './variables';

export class Utiles {
  constructor() {}

  public static generate() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Returns todays date and 10, 5, or 1 year ago's date in the proper formatDate
  // @param:yearsBack => the numbers of years back desired
  constructDates (yearsBack) {
    const now = new Date();
    const starting_date = new Date(now);
    starting_date.setDate(starting_date.getDate() - 365 * yearsBack - 3);
    const start_date = this.formatDate(starting_date);
    const today = this.formatDate(now);
    return [start_date, today];
  }

  // Formats the date in YYYY/MM/DD formatDate
  // @param:date => date object
  formatDate(date) {
    let month = '' + (date.getMonth() + 1),
      day = '' + date.getDate();
    const year = date.getFullYear();
    if (month.length < 2) {
      month = '0' + month;
    }
    if (day.length < 2) {
      day = '0' + day;
    }
    return [year, month, day].join('/');
  }

  // Formats the query sent to the KS api
  // @param:pubmedIDs => list of relevant pubmed ids
  formatKSquery(pubmedIDs) {
    let input = '[';
    for (let m = 0 ; m < pubmedIDs.length ; m++ ) {
      if (m === pubmedIDs.length - 1 ) {
        input  += '"' + pubmedIDs[m] + '"]';
      } else {
        input  += '"' + pubmedIDs[m] + '",';
      }
    }
    return input;
  }

  // Sorts the condition list shown at the starting screen
  // @param:list => list of conditions or medications pulled from the EHR
  // @param:kind => either 'medications' or 'conditions'
  sortList(list, kind) {
    list.sort(function(a, b) {
      if (kind === 'medications') {
        a = a.resource.medicationCodeableConcept.text.toUpperCase();
        b = b.resource.medicationCodeableConcept.text.toUpperCase();
      } else {
        a = a.resource.code.text.toUpperCase();
        b = b.resource.code.text.toUpperCase();
      }
      if (a === b) {
        return 0;
      }
      if (a > b) {
        return 1;
      }
      if (a < b) {
        return -1;
      }
    });
    return list;
  }

  // This functions checks whether clinically actionable sentence is included or not.
  // Collects and returns PMIDs that don't have one.
  // @param:element => ct or sr object
  checkNullSummary (element) {
    if (element == null) {
      return null;
    }
    const entries = new Array();
    let id;
    for (let i = 0; i < element[0].feed.length; i++) {
      if (element[0].feed[i].entry != null) {
        entries.push(element[0].feed[i].entry);
      }
    }
    const noSummary = new Array();
    for (let i = 0; i < entries.length; i++) {
  		// first check whether this entry satisfies the user selection criteria, do nothing if false
      const tempSummary = entries[i].summary.section;
      id = entries[i].id.$; // the $ is the key name to the id
  		// If there is no summary and id is not defined, the PMID is recorded
      if (tempSummary.length === 0 && typeof id !== 'undefined') {
        noSummary.push(id);
      }
    }
    id = '';
    for (let i = 0 ; i < noSummary.length ; i++) {
      if ( i === (noSummary.length - 1) ) {
        id += noSummary[i];
      } else {
        id += noSummary[i] + ',';
      }
    }
    return id;
  }

  // After having been sorted by tfidf score, this function separates medications into the top 10 and
  // the next 20. It then alpabatizes the top 10 and the next 20 seperately
  sortMedications(medications) {
    const toSort10Treat = medications.medarr[0].subCategories.slice(0, globevars.MED_LIST_MIN);
    const toSort20Treat = medications.medarr[0].subCategories.slice(globevars.MED_LIST_MIN, globevars.MED_LIST_MORE + globevars.MED_LIST_MIN);
    const toSort10Dis = medications.medarr[1].subCategories.slice(0, globevars.MED_LIST_MIN);
    const toSort20Dis = medications.medarr[1].subCategories.slice(globevars.MED_LIST_MIN, globevars.MED_LIST_MORE + globevars.MED_LIST_MIN);
    toSort10Treat.sort(function(a, b) {
      a = a.entry.label.toUpperCase();
      b = b.entry.label.toUpperCase();
      if (a === b) {
        return 0;
      }
      if (a > b) {
        return 1;
      }
      if (a < b) {
        return -1;
      }
    });
    toSort20Treat.sort(function(a, b) {
      a = a.entry.label.toUpperCase();
      b = b.entry.label.toUpperCase();
      if (a === b) {
        return 0;
      }
      if (a > b) {
        return 1;
      }
      if (a < b) {
        return -1;
      }
    });
    toSort10Dis.sort(function(a, b) {
      a = a.entry.label.toUpperCase();
      b = b.entry.label.toUpperCase();
      if (a === b) {
        return 0;
      }
      if (a > b) {
        return 1;
      }
      if (a < b) {
        return -1;
      }
    });
    toSort20Dis.sort(function(a, b) {
      a = a.entry.label.toUpperCase();
      b = b.entry.label.toUpperCase();
      if (a === b) {
        return 0;
      }
      if (a > b) {
        return 1;
      }
      if (a < b) {
        return -1;
      }
    });
    // Takes the original medications array and inserts the now sorted elements
    Array.prototype.splice.apply(medications.medarr[0].subCategories, [0, toSort10Treat.length].concat(toSort10Treat));
    Array.prototype.splice.apply(medications.medarr[0].subCategories, [globevars.MED_LIST_MIN, toSort20Treat.length].concat(toSort20Treat));
    Array.prototype.splice.apply(medications.medarr[1].subCategories, [0, toSort10Dis.length].concat(toSort10Dis));
    Array.prototype.splice.apply(medications.medarr[1].subCategories, [globevars.MED_LIST_MIN, toSort20Dis.length].concat(toSort20Dis));
    return medications;
  }

  // Converts FHIR standard gender to infobutton standard gender
  // @param:gender => 'male' or 'female'
  convertGender(gender) {
    if (gender === 'M') {
      return 'male';
    } else if (gender === 'F') {
      return 'female';
    }
    return '';
  }

  convertAge(age, type) {
    if (type === 'a') {
      if (age <= 1) {
        return 'Infant';
      }
      if (age > 1 && age <= 5) {
        return 'Child, preschool';
      }
      if (age > 5 && age <= 12) {
        return 'Child';
      }
      if (age > 12 && age <= 18) {
        return 'Adolescent';
      }
      if (age > 18 && age <= 44) {
        return 'Adult';
      }
      if (age > 44 && age <= 64) {
        return 'Middle aged';
      }
      if (age > 64 && age <= 79) {
        return 'Aged';
      }
      if (age > 79) {
        return 'Aged, 80 and over';
      }
    } else if (type === 'm') {
      if (age <= 1 * 12) {
        return 'Infant';
      }
      if (age > 1 * 12 && age <= 5 * 12) {
        return 'Child, preschool';
      }
      if (age > 5 * 12 && age <= 12 * 12) {
        return 'Child';
      }
      if (age > 12 * 12 && age <= 18 * 12) {
        return 'Adolescent';
      }
      if (age > 18 * 12 && age <= 44 * 12) {
        return 'Adult';
      }
      if (age > 44 * 12 && age <= 64 * 12) {
        return 'Middle aged';
      }
      if (age > 64 * 12 && age <= 79 * 12) {
        return 'Aged';
      }
      if (age > 79 * 12) {
        return 'Aged, 80 and over';
      }
    } else {
      if (age <= 1 * 365) {
        return 'Infant';
      }
      if (age > 1 * 365 && age <= 5 * 365) {
        return 'Child, preschool';
      }
      if (age > 5 * 365 && age <= 12 * 365) {
        return 'Child';
      }
      if (age > 12 * 365 && age <= 18 * 365) {
        return 'Adolescent';
      }
      if (age > 18 * 365 && age <= 44 * 365) {
        return 'Adult';
      }
      if (age > 44 * 365 && age <= 64 * 365) {
        return 'Middle aged';
      }
      if (age > 64 * 365 && age <= 79 * 365) {
        return 'Aged';
      }
      if (age > 79 * 365) {
        return 'Aged, 80 and over';
      }
    }
    return '';
  }

  // upper cases all of the words in a string
  // @param:str => the string to capatalize
  toTitleCase(str) {
    return str.replace(/\w\S*/g, function(txt){ return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(); });
  }
}

