import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ExperimentComponent } from './experiment/experiment.component';
import { ConstraintComponent } from './constraint/constraint.component';
import { RunComponent } from './run/run.component';
import { ResultComponent } from './result/result.component';
import { IndexComponent } from './index.component';

const routes: Routes = [
  {
    path: "",
    component: IndexComponent,
    children: [
      {
        path: "experiments",
        component: ExperimentComponent
      },
      {
        path: "constraint",
        component: ConstraintComponent
      },
      {
        path: "run/:RunId",
        component: RunComponent
      },
      {
        path: "result",
        component: ResultComponent
      },
      {
        path: "**",
        redirectTo: "experiments"
      }
    ]
  }
]

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class IndexRoutingModule { }
