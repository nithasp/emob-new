import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LayoutComponent } from './layout.component';

const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      {
        path: 'configurations',
        loadChildren: () =>
          import('../features/configurations/configurations.module').then(
            (m) => m.ConfigurationsModule
          ),
      },
      {
        path: '',
        loadChildren: () =>
          import('../features/experiment/experiment.module').then(
            (m) => m.ExperimentModule
          ),
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class LayoutRoutingModule {}
