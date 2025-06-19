import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ConfigurationComponent } from './configuration.component';
import { UploadComponent } from './upload/upload.component';
import { SpyComponent } from './spy/spy.component';

const routes: Routes = [
  {
    path: '',
    component: ConfigurationComponent,
    children: [
      { path: 'upload', component: UploadComponent },
      { path: 'spy', component: SpyComponent },
      { path: '', redirectTo: 'upload', pathMatch: 'full' }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ConfigurationRoutingModule { }
