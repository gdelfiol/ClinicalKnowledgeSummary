import { Directive, ElementRef, HostListener } from '@angular/core';
import {DataService} from './services/data.service';

@Directive({
  selector: '[clickTracker]'
})
export class ClickTrackerDirective {

  constructor(public element: ElementRef, public dataService: DataService) { }

  @HostListener('click', ['$event'])
  elemClicked() {
     const pathID = sessionStorage.getItem('pathId');
     const sessId = sessionStorage.getItem('uuid');
     const name = this.element.nativeElement;
     let value;
     if (name.id) {
       value = name.id;
     } else {
       value = name.className;
     }
     const now = Date.now();
     this.dataService.postFreq({ 'clickedItem': value, 'path': pathID, 'app': 'CKS', 'sessId': sessId, 'time': now})
                              .subscribe(res => res);
  }
}
