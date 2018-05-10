import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { DataService } from '../../../services/data.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-results-banner',
  templateUrl: './results-banner.component.html',
  styleUrls: []
})

export class SearchBarComponent implements OnInit {

  posts: Array<string>;

  @Input() searchText;
  @Input() status;
  @Input() displayTerm;
  @Input() inputFocus;
  @Input() recentHist;
  @Input() need_patient_banner;
  @Input() showMeds;

  @Output() changeToRecentEmit = new EventEmitter<any>();
  changeToRecent(event) {
    this.addToRecentList(this.displayTerm);
    this.displayTerm = event;
    this.changeToRecentEmit.emit(event);
  }

  @Output() changeSideViewEmit = new EventEmitter<any>();
  changeSideView() {
    this.changeSideViewEmit.emit();
  }

  @Output() addToRecentListEmit = new EventEmitter<any>();
  addToRecentList(event) {
    this.addToRecentListEmit.emit(event);
  }

  @Output() clearHistoryEmit = new EventEmitter<any>();
  clearHistory() {
    this.clearHistoryEmit.emit();
  }

  search = (text$: Observable<string>) =>
    text$
      .debounceTime(200)
      .distinctUntilChanged()
      .map(term => term.length < 2 ? []
        : this.posts.filter(v => v.toLowerCase().indexOf(term.toLowerCase()) > -1).slice(0, 10))

  constructor(private dataService: DataService, private router: Router) { }

  ngOnInit() {
    // This gets the disease list used in the typeahead window
    this.dataService.getMeshList().subscribe((posts) => {
      this.posts = posts;
    });
  }

  // Takes the user back to the problem list
  backToSearch() {
    this.router.navigate(['./']);
  }

}
