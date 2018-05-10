import {Component, OnInit, ViewEncapsulation} from '@angular/core';
import { NgbDropdownConfig } from '@ng-bootstrap/ng-bootstrap';


@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styles: ['html { background-color: #fafafa;}'],
  encapsulation: ViewEncapsulation.None
})
export class AboutComponent implements OnInit {

  constructor(config: NgbDropdownConfig) {
    config.placement = 'bottom-right';
  }

  ngOnInit() {
    sessionStorage.setItem('pathId', 'about');
  }

}


