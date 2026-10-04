import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ExperimentListComponent } from './experiment-list/experiment-list.component';
import { RunComponent } from './run/run.component';
import { ResultComponent } from './result/result.component';

const routes: Routes = [
  {
    path: 'experiments',
    component: ExperimentListComponent,
  },
  {
    path: 'run/:runId',
    component: RunComponent,
  },
  {
    path: 'result/:experimentId',
    component: ResultComponent,
  },
  {
    path: '**',
    redirectTo: 'experiments',
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ExperimentRoutingModule {}
