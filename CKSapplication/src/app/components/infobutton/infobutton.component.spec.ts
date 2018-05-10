import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { InfobuttonComponent } from './infobutton.component';

describe('InfobuttonComponent', () => {
  let component: InfobuttonComponent;
  let fixture: ComponentFixture<InfobuttonComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ InfobuttonComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(InfobuttonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
