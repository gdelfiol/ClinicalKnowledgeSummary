import { Component } from '@angular/core';
import { Auth } from './auth';
import { DataService } from './services/data.service';
import { ActivatedRoute } from '@angular/router';
import { v4 as uuid } from 'uuid';

@Component({
  selector: 'app-root',
  template: '<router-outlet></router-outlet>',
  styleUrls: []
})

export class AppComponent {
  patientID: string;
  constructor(private httpService: DataService, private activateRoute: ActivatedRoute) { }

  ngOnInit() {
    sessionStorage.setItem('uuid', uuid());
    this.activateRoute.queryParams
      .subscribe(params => {
        if (Object.keys(params).length > 0) {
          const auth = new Auth(this.httpService, this.activateRoute);
          auth.getAuthorization();
        }
    });
  }
}
