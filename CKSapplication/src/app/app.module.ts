import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { HttpModule, JsonpModule } from '@angular/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { RouterModule, Routes } from '@angular/router';
import { DataService } from './services/data.service';
import { HttpClientModule } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { enableProdMode } from '@angular/core';
import {
  MatCardModule, MatMenuModule, MatIconModule, MatButtonModule, MatTooltipModule, MatCheckboxModule, MatListModule,
  MatSidenavModule, MatTabsModule, MatProgressSpinnerModule, MatPaginatorModule, MatTableModule, MatSelectModule
} from '@angular/material';

import { SearchComponent } from './components/search/search.component';
import { ResultsComponent } from './components/results/results.component';
import { ClickTrackerDirective } from './clickTracker.directive';
import { InfobuttonComponent } from './components/infobutton/infobutton.component';
import { AboutComponent } from './components/about/about.component';
import { FilterBarComponent } from './components/sub-components/filter-bar/filter-bar.component';
import { SearchBarComponent } from './components/sub-components/results-banner/results-banner.component';
import { ResultsCardComponent } from './components/sub-components/results-card/results-card.component';

const appRoutes: Routes = [
  {path: 'results', component: ResultsComponent},
  {path: 'infobutton', component: InfobuttonComponent},
  {path: 'about', component: AboutComponent},
  {path: '', component: SearchComponent},
  {path: '**', component: SearchComponent, redirectTo: ''}
];

@NgModule({
  declarations: [
    AppComponent,
    SearchComponent,
    ResultsComponent,
    ClickTrackerDirective,
    InfobuttonComponent,
    AboutComponent,
    FilterBarComponent,
    SearchBarComponent,
    ResultsCardComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    ReactiveFormsModule,
    BrowserAnimationsModule,
    NgbModule.forRoot(),
    HttpModule,
    JsonpModule,
    HttpClientModule,
    RouterModule.forRoot(appRoutes),
    MatCardModule,
    MatPaginatorModule,
    MatTableModule,
    MatMenuModule,
    MatSelectModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatCheckboxModule,
    MatListModule,
    MatSidenavModule,
    MatTabsModule,
    MatProgressSpinnerModule
  ],
  exports: [
    MatCardModule,
    MatPaginatorModule,
    MatTableModule,
    MatMenuModule,
    MatSelectModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatCheckboxModule,
    MatListModule,
    MatSidenavModule,
    MatTabsModule,
    MatProgressSpinnerModule
  ],
  providers: [DataService],
  bootstrap: [AppComponent]
})
export class AppModule { }
enableProdMode();
