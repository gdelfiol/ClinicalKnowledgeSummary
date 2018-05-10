import * as globeVars from '../tools/variables';

export class SR {
  json: any = null;
  entryArray: Array<any> = new Array();
  relevance: Object = {};

  constructor() { }

 // Set the json content.
 // @param:srContent => the json format response from the KS api about the SRs
 // @param:srRelevance => list of pmids
  setJson(srContent, srRelevance) {
    this.json = srContent;
		// insert PMID as key and relevance order as value in reverse order
    for (let i = 0; i < srRelevance.length; i++) {
      this.relevance[srRelevance[i]] = Math.floor(srRelevance.length) - i;
    }
  }

	// Set the systematic review content based on selected concepts
	// @param:srContent => the json format response from the KS api about the SRs
	// @param:noSummarySR => A list of pubmeds which articles did not have a clinically actionable conclusion
	// @param:srRelevance => an array of pubmeds about the relevant SR studies
	// @param:meds => an array of selected medication concepts
  setSRContent(srContent, noSummarySR, srRelevance, meds) {
    this.setJson(srContent, srRelevance);
    if (this.json === null) {
      return;
    }
    const entries = new Array();
    for (let i = 0; i < this.json[0].feed.length; i++) {
      if (this.json[0].feed[i].entry !== null && this.json[0].feed[i].entry !== undefined) {
        entries.push(this.json[0].feed[i].entry);
      }
    }
    let idx = 0;
    for (let i = 0; i < entries.length; i++) {
      const entry = this.ConvertEntryElementToSREntry(entries[i], meds);
      if (entry.show) {
        this.entryArray[idx++] = entry;
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
    let idx = 0;
    let page = 0;
    const itemMax = globeVars.ITEM_PER_PAGE;
    let count = 0;
    for (let k = 0; k < entryArray.length; k++) {
      if (count % itemMax === 0) {
        page += 1;
      }
      count += 1;
      this.entryArray[idx++] = {'entry': entryArray[k], 'page': page };
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
    let scheme;
    let label;
    if (metadata.length === 0) {
      return false;
    }
    let isshow = false;
    for (let i = 0; i < metadata.length; i++) {
      scheme = metadata[i]['@scheme'];
			// If the article has medical terms in the selected concepts,
			// the article is going to be shown.
      if (scheme.toLowerCase().match(/org.openinfobutton/) === null) {
        label = metadata[i]['@term'];
        if (label.length !== 0 && concepts.indexOf(label) !== -1) {
          isshow = true;
        }
      }
    }
    return isshow;
  }

	// Convert an Json entry to SREntry object
	// @param:element => entry element
	// @param:concepts => array of selected concept
  ConvertEntryElementToSREntry(element, concepts) {
    const srEntry = new SREntry();
		// first check whether this entry satisfies the user selection criteria, return if false
    if (!this.IsShow(element, concepts)) {
      srEntry.show = false;
      return srEntry;
    }
    const title = element.title;
    const link = element.link;
    const id = element.id.$;
    const pubdate = element.updated.$;
    const tempSummary = element.summary.section;
		// No content is available from KS webservice for now. It is retrieved from eUtils
		// let content = element.content;
    const categories = element.category;
    const source = element.source.$;
    if (typeof title !== 'undefined') {
      srEntry.title = title.$;
    } else {
      srEntry.title = '';
    }
    if (typeof link !== 'undefined') {
      srEntry.link = link['@href'];
    } else {
      srEntry.link = '';
    }
    if (typeof id !== 'undefined') {
      srEntry.id = id;
    } else {
      srEntry.id = '';
    }
    if (typeof pubdate !== 'undefined') {
      srEntry.pubdate = pubdate;
    } else {
      srEntry.pubdate = '';
    }
		// If there is no summary from KS web service, the summary is retrieved by eUtils.
		// If there is summary available, the summary is process with data from KS web service.

		// 1) If there is a summary sentence with label = 1 -> display this/those sentence(s) only (don��t display those where label = 0)
		// 2) If there is not a summary sentence with label = 1 -> display sentence(s) with label = 0
		// 3) No summary sentences -> don��t display any sentences

    let summary = '';
    let summaryNoHit = '';
    let hitLabel = false ;
    if (tempSummary.length === 0) {
			// do nothing
    } else {
      for (let i = 0; i < tempSummary.length; i++) {
        if (tempSummary[i]['@label'] === '1') {
          summary = summary + tempSummary[i].fragment[0].$.replace(/"/g, '&quot;');
          hitLabel = true ;
        } else if (tempSummary[i]['@label'] === '0') {
          summaryNoHit = summaryNoHit + tempSummary[i].fragment[0].$.replace(/"/g, '&quot;');
        }
      }
    }
    if (!hitLabel) {
      summary = summaryNoHit;
    }
		// find quality probability data element and term codes
    let tcindex = 0; // index for term codes array
    for (let i = 0; i < categories.length; i++) {
      const scheme = categories[i]['@scheme'];
      if (scheme === 'org.openinfobutton.qualityProbability') {
				// do nothing
      } else if (scheme.match(/org.openinfobutton/) !== null) {
				// do nothing
      } else {
        srEntry.termCodes[tcindex++] = categories[i]['@term'];
      }
    }
    srEntry.score = this.relevance[srEntry.id];
    srEntry.source = source;
    srEntry.summary = summary;
    return srEntry;
  }


	// Count the number of entries that have the given medication term code
 	// @param:medicationTermCode => the medications cuis
  countNumOfMatchedEntries(medicationTermCode) {
    const entryArray = this.entryArray;
    if (entryArray.length === 0) {
      return 0;
    }
    let count = 0;
    for (let i = 0; i < entryArray.length; i++) {
      if (entryArray[i]['entry'].hasTermCode(medicationTermCode)) {
        count += 1;
      }
    }
    return count;
  }
}

export class SREntry {
  title: string = null;
  link: string = null;
  id: string = null;
  pubdate: string = null;
  summary: string = null;
  score: number = 0.0;
  source: string = null;
  show: Boolean = true; // whether this entry needs to be shown based on some filtering criteria
  termCodes: Array<string> = new Array(); // store the concept codes of each article
  abstract: string = '';	// Additional abstract info when called
  showBool: Boolean = false; // To determine whether to show more abstract info

  constructor() { }

	// Attaches true or false to this particular entry when a 'more' or 'less' button is pressed
	// @param:showBool => boolean
  setShowBool(showBool) {
    this.showBool = showBool;
  }

	// Whether entry has the given medication term code
	// @param:medicationTermCode => cui code for medication
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
