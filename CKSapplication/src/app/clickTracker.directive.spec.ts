import { ClickTrackerDirective } from './clickTracker.directive';
import { Directive, ElementRef, HostListener } from '@angular/core';
import {DataService} from './services/data.service';

describe('ClickTrackerDirective', () => {
  it('should create an instance', () => {
    let element = new ElementRef();

    const directive = new ClickTrackerDirective(element, DataService);
    expect(directive).toBeTruthy();
  });
});
