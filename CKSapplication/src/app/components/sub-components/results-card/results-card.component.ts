import { Component, OnInit, Input, EventEmitter, Output, Renderer2 } from '@angular/core';
import { DataService } from '../../../services/data.service';
import { Utiles } from '../../../tools/utiles';

@Component({
  selector: 'app-results-card',
  templateUrl: './results-card.component.html',
  styleUrls: []
})
export class ResultsCardComponent implements OnInit {

  utiles: any = new Utiles();
  pageSize = 5;
  pageSizeOptions: Array<number> = [5, 10, 15, 20, 25];
  pageNum = 1;

  @Input() name;
  @Input() myFullScreen;
  @Input() otherFullScreen;
  @Input() pubMedReturn;
  @Input() entries;
  @Input() selectedMeds;

  @Output() changeFullScreenEmit = new EventEmitter<any>();
  changeFullScreen(type, bool, event) {
    this.changeFullScreenEmit.emit({type, bool});
  }


  constructor(private dataService: DataService, private renderer2: Renderer2) { }

  ngOnInit() { }

  // Changes the results in the card by page number
  // @param: event => the information given by pagination
  changePage(event) {
    this.pageNum = event.pageIndex + 1;
    this.pageSize = event.pageSize;
  }

  // To do regex pattern matching
  // @param:term => the text to match the regex exprssion to
  // @param:text => the character to match against (in our case, ':')
  checkRegEx(term, text) {
    const re = new RegExp(text);
    const match = term.match(re);
    if (match === null) {
      return false;
    } else {
      return true;
    }
  }

  // Activated when a 'more' or 'less' button is clicked in the SR or CT sections. It calls the pubmed eutils
  // to get either the abstract or the results from the text.
  // @param:entry => sr or ct entry where the 'more' or 'less' button is found
  // @param:bool => a boolean defining whether the button is 'more' (true) or 'less' (false)
  toggleMore(entry, bool) {
    if (bool === false) {
      entry.abstract = '';
    } else {
      this.dataService.pubmedQuery(entry.id).subscribe((data) => {
        let firstIndex;
        let lastIndex;
        let absText = '';
        // There are multiple ways pubmed defines the 'results' section
        if (data.indexOf('<AbstractText>') !== -1) {
          firstIndex = data.indexOf('<AbstractText>') + '<AbstractText>'.length;
          lastIndex = data.indexOf('</AbstractText>');
          absText = 'ABSTRACT: ' + data.slice(firstIndex, lastIndex);
        } else if (data.indexOf('NlmCategory="RESULTS">') !== -1) {
          firstIndex = data.indexOf('NlmCategory="RESULTS">') + 'NlmCategory="RESULTS">'.length;
          lastIndex = data.indexOf('</AbstractText>', firstIndex);
          absText = 'RESULTS: ' + data.slice(firstIndex, lastIndex);
        } else if (data.indexOf('Label="RESULTS">') !== -1) {
          firstIndex = data.indexOf('Label="RESULTS">') + 'Label="RESULTS">'.length;
          lastIndex = data.indexOf('</AbstractText>', firstIndex);
          absText = 'RESULTS: ' + data.slice(firstIndex, lastIndex);
        } else if (data.indexOf('Label="FINDINGS">') !== -1) {
          firstIndex = data.indexOf('Label="FINDINGS">') + 'Label="FINDINGS">'.length;
          lastIndex = data.indexOf('</AbstractText>', firstIndex);
          absText = 'RESULTS: ' + data.slice(firstIndex, lastIndex);
        }
        entry.abstract = absText;
      });
    }
    // This is called so that if the 'more' button is pushed again, the url
    // call doesn't have to occur again
    entry.setShowBool(bool);
  }

  // Activated when a checkbox is checked in the med or dis list and updates the content with the selection
  // higlighted in the text
  // @param:text => text to be highlighted
  // @param:notTitle => boolean saying whether the text is the pubmed title or not
  highlightMedications(text, notTitle) {
    if (text === '') {
      return '';
    }
    if (this.selectedMeds.length === 0) {
      if (text !== undefined) {
        if (this.checkRegEx(text, ':') && notTitle) {
          return text.split(':')[1];
        }
      }
      return text;
    }
    if (this.checkRegEx(text, ':') && notTitle) {
      text = text.split(':')[1];
    }
    for (let i = 0; i < this.selectedMeds.length; i++) {
      text = text.replace(this.selectedMeds[i], '<span class="selectedMedsMatch">' + this.selectedMeds[i] + '</span>');
      text = text.replace(this.selectedMeds[i].toLowerCase(), '<span class="selectedMedsMatch">'
        + this.selectedMeds[i].toLowerCase() + '</span>');
      text = text.replace(this.selectedMeds[i].toUpperCase(), '<span class="selectedMedsMatch">'
        + this.selectedMeds[i].toUpperCase() + '</span>');
      text = text.replace(this.utiles.toTitleCase(this.selectedMeds[i]), '<span class="selectedMedsMatch">'
        + this.utiles.toTitleCase(this.selectedMeds[i]) + '</span>');
    }
    return text;
  }
}
