import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { OverviewComponent } from './overview/overview.component';
import { ConstraintComponent } from './constraint/constraint.component';
import { TaskComponent } from './task/task.component';
import { ResultComponent } from './result/result.component';
import { IndexComponent } from './index.component';

const routes: Routes = [
  {
    path: "",
    component: IndexComponent,
    children: [
      {
        path: "overview",
        component: OverviewComponent
      },
      {
        path: "constraint",
        component: ConstraintComponent
      },
      {
        path: "task",
        component: TaskComponent
      },
      {
        path: "result",
        component: ResultComponent
      },
      {
        path: "**",
        redirectTo: "overview"
      }
    ]
  }
]

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class IndexRoutingModule { }
