import * as globeVars from '../tools/variables';

export class CT {
  json: any = null;
  entryArray: Array<any> = new Array();
  relevance: Object = {};


  constructor() { }

  // Set the json content.
  // @param:ctContent => the json format response from the KS api about the SRs
  // @param:ctRelevance => list of pmids
  setJson(ctContent, ctRelevance) {
    this.json = ctContent;
  	// insert PMID as key and relevance order as value in reverse order
    for (let i = 0; i < ctRelevance.length; i++) {
      this.relevance[ctRelevance[i]] = parseInt(ctRelevance.length) - i;
    }
  }

  // Set the systematic review content based on selected concepts
	// @param:ctContent => the json format response from the KS api about the CTs
	// @param:noSummaryCT => A list of pubmeds which articles did not have a clinically actionable conclusion
	// @param:ctRelevance => an array of pubmeds about the relevant CT studies
	// @param:meds => an array of selected medication concepts
  setCTContent(ctContent, noSummaryCT, ctRelevance, meds) {
    this.setJson(ctContent, ctRelevance);
    if (this.json === null && noSummaryCT === null) {
      return;
    }
    const entries = new Array();
    let entry;
    for (let i = 0; i < this.json[0].feed.length; i++) {
      if (this.json[0].feed[i].entry !== null && this.json[0].feed[i].entry !== undefined) {
        entries.push(this.json[0].feed[i].entry);
      }
    }
    let idx = 0;
    let page = 0;
    const itemMax = globeVars.ITEM_PER_PAGE;
    let count = 0;
    for (let i = 0; i < entries.length; i++) {
      entry = this.ConvertEntryElementToCTEntry(entries[i], meds);
      if (entry.show) {
        if (count % itemMax === 0) {
          page += 1;
        }
        count += 1;
        this.entryArray[idx++] = { 'entry': entry, 'page': page };
      }
    }
    this.sortByScore();
    // Puts a limit as to the number that can be shown
    if (this.entryArray.length > 500) {
      this.entryArray = this.entryArray.slice(0, 500);
    }
  }

	// Sorts the SR studies by score returned by KS API
  sortByScore() {
    const entryArray = this.entryArray;
    if (entryArray.length === 0) {
      return;
    }
    // i is the element to be inserted
    let tmp;
    let j;
    for (let i = 1; i < entryArray.length; i++) {
      tmp = entryArray[i];
      for (j = i - 1; j >= 0; j--) {
        if (tmp.score > entryArray[j].score) {
          entryArray[j + 1] = entryArray[j];
        } else {
          entryArray[j + 1] = tmp;
          break;
        }
      }
      if (j < 0) {
        entryArray[0] = tmp;
      }
    }
  }

  //  Whether we should show the article based on concept matching.
	//  If the article has medical terms in the selected concepts,
	//  isshow will be changed to true
	//  @param:element => article to check against
	//  @param:concepts => array of selected concepts
  IsShow(element, concepts) {
    if (element === null) {
      return false;
    }
    if (concepts.length === 0) {
      return true;
    }
    const metadata = element.category;
    if (metadata.length === 0) {
      return false;
    }
    let isshow = false;
    for (let i = 0; i < metadata.length; i++) {
      const scheme = metadata[i]['@scheme'];
  		// If the article has medical terms in the selected concepts,
  		// the article is going to be shown.
      if (scheme.toLowerCase().match(/org.openinfobutton/) == null) {
        const label = metadata[i]['@term'];
        if (label.length !== 0 && concepts.indexOf(label) !== -1) {
          isshow = true;
        }
      }
    }
    return isshow;
  }

  // Convert an Json entry to CTEntry object
	// @param:element => entry element
	// @param:concepts => array of selected concept
  ConvertEntryElementToCTEntry(element, concepts) {
    if (element === undefined) {
      return { 'show': false }; // Prevents errors later in the code
    }
    const ctEntry = new CTEntry();
  	// first check whether this entry satisfies the user selection criteria, return if false
    if (!this.IsShow(element, concepts)) {
      ctEntry.show = false;
      return ctEntry;
    }
    const title = element.title;
    const link = element.link;
    const id = element.id.$;
    const pubdate = element.updated.$;
    const tempSummary = element.summary.section;
  	// No content is available from JSON for now. It is retrieved from eUtils
    const categories = element.category;
    const source = element.source.$;
    if (typeof title !== 'undefined') {
      ctEntry.title = title.$;
    } else {
      ctEntry.title = '';
    }
    if (typeof link !== 'undefined') {
      ctEntry.link = link['@href'];
    } else {
      ctEntry.link = '';
    }
    if (typeof id !== 'undefined') {
      ctEntry.id = id;
    } else {
      ctEntry.id = '';
    }
    if (typeof pubdate !== 'undefined') {
      ctEntry.pubdate = pubdate;
    } else {
      ctEntry.pubdate = '';
    }
  	// If there is no summary from KS web service, the summary is retrieved by eUtils.
  	// If there is summary available, the summary is process with data from KS web service.
    let summary = '';
    if (tempSummary.length === 0) {
      // do nothing
    } else {
      for (let i = 0; i < tempSummary.length; i++) {
        summary = summary + tempSummary[i].fragment[0].$.replace(/"/g, '&quot;');
      }
    }
  	// find quality probability data element, funding source, sample size and term codes
    let tcindex = 0; // index for term codes array
    let scheme;
    for (let i = 0; i < categories.length; i++) {
      scheme = categories[i]['@scheme'];
      if (scheme === 'org.openinfobutton.qualityProbability') {
  			// do nothing
      } else if (scheme === 'org.openinfobutton.fundingSourceType') {
        if (categories[i]['@label'] !== '') {
          ctEntry.fundingSource = categories[i]['@label'];
        }
      } else if (scheme === 'org.openinfobutton.actualSample') {
        ctEntry.sampleSize = categories[i]['@label'];
      } else if (scheme.match(/org.openinfobutton/) !== null) {
  			// do nothing
      } else {
        ctEntry.termCodes[tcindex++] = categories[i]['@term'];
      }
    }
    ctEntry.score = this.relevance[ctEntry.id];
    ctEntry.source = source;
    ctEntry.summary = summary;
    return ctEntry;
  }

  // Count the number of entries that have the given medication term code
 	// @param:medicationTermCode => the medication cuis
  countNumOfMatchedEntries(medicationTermCode) {
    const entryArray = this.entryArray;
    if (entryArray.length === 0) {
      return 0;
    }
    let count = 0;
    for (let i = 0; i < entryArray.length; i++) {
      if (entryArray[i]['entry'].hasTermCode(medicationTermCode)) {
        count++;
      }
    }
    return count;
  }
}

export class CTEntry  {
  title: string = null;
  link: string = null;
  id: string = null;
  pubdate: any = null;
  summary: string = null;
  score: number = 0.0;
  fundingSource: string = null;
  sampleSize: any = null;
  source: string = null;
  show: Boolean = true;
  termCodes: Array<any> = new Array();
  abstract: string = '';	// Additional abstract info when called
  showBool: Boolean = false; // To determine whether to show more abstract info

  constructor() { }

  // Attaches true or false to this particular entry when a 'more' or 'less' button is pressed
	// @param:showBool => boolean
  setShowBool(showBool) {
    this.showBool = showBool;
  }

  // Whether entry has the given medication term code
  // @param:medicationTermCode =>
  hasTermCode(medicationTermCode) {
    if (this.termCodes.length === 0) {
      return false;
    }
    for (let i = 0; i < this.termCodes.length; i++) {
      if (this.termCodes[i] === medicationTermCode) {
        return true;
      }
    }
    return false;
  }
}
