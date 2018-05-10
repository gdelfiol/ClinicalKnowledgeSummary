import { environment } from '../environments/environment';
import { DataService } from './services/data.service';
import { ActivatedRoute } from '@angular/router';
import { Utiles } from './tools/utiles';

export class Auth {

  constructor(private dataService: DataService,
              private activateRoute: ActivatedRoute
  ) { }

  // Process of gaining access to the FHIR data needed
  public getAuthorization() {
    this.activateRoute.queryParams
      .subscribe(params => {
        if (params['iss'] != null && params['launch'] != null) {
          sessionStorage.setItem('launch', params['launch']);
          sessionStorage.setItem('iss', params['iss']);
          this.dataService.getConformance(sessionStorage.getItem('iss')).subscribe(
            data => {
              const exts: any[] = data.rest[0].security.extension[0].extension;
              for (const entry of exts) {
                if (entry.url === 'authorize') {
                  sessionStorage.setItem('authorizeUri', entry.valueUri);
                } else if (entry.url === 'token') {
                  sessionStorage.setItem('tokenUri', entry.valueUri);
                }
              }
              let redirectUrl;
              if (params['meshList']) {
                redirectUrl = environment.redirectUrl[1];
              } else {
                redirectUrl = environment.redirectUrl[0];
              }
              sessionStorage.setItem('redirectUrl', redirectUrl);
              const url = sessionStorage.getItem('authorizeUri') + '?' +
                'client_id=' + encodeURIComponent(environment.client_id) +
                '&response_type=' + 'code' +
                '&scope=' + encodeURIComponent(environment.scope) +
                '&redirect_uri=' + encodeURIComponent(redirectUrl) +
                '&state=' + Utiles.generate() +
                '&aud=' + encodeURIComponent(sessionStorage.getItem('iss')) +
                '&launch=' + sessionStorage.getItem('launch');
              window.location.replace(url);
            }
          );
        }
      });

    this.activateRoute.queryParams.subscribe(params => {
      const redirectUrl = sessionStorage.getItem('redirectUrl');
      if (params['code'] !== undefined) {
        const code = params['code'];
        this.dataService.getAuthorization(sessionStorage.getItem('tokenUri'), environment.client_id,
          redirectUrl, code).subscribe( data => {
            let need_patient_banner;
            if (data['need_patient_banner'] !== undefined) {
              if (data['need_patient_banner'] === true) {
                sessionStorage.setItem('need_patient_banner', 'true');
                need_patient_banner = true;
              } else {
                sessionStorage.setItem('need_patient_banner', 'false');
                need_patient_banner = false;
              }
            } else {
              sessionStorage.setItem('need_patient_banner', 'true');
              need_patient_banner = true;
            }
            sessionStorage.setItem('accessToken', data['access_token']);
            sessionStorage.setItem('patientId', data['patient']);
            sessionStorage.setItem('appContext', data['appContext']);
            this.dataService.changePatientIDandAccess(data['patient'], data['access_token'], need_patient_banner, data['scope']);
          });
      }
    });
  }
}
