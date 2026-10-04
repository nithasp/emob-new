import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ConfigurationsComponent } from './configurations.component';
import { UploadComponent } from './upload/upload.component';

const routes: Routes = [
  {
    path: '',
    component: ConfigurationsComponent,
    children: [
      { path: 'upload', component: UploadComponent },
      { path: 'vehicle-management', loadChildren: () => import('./vehicle-management/vehicle-management.module').then(m => m.VehicleManagementModule) },
      { path: '', redirectTo: 'upload', pathMatch: 'full' },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ConfigurationsRoutingModule {}