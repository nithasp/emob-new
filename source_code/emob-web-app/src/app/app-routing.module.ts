import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AppComponent } from './app.component';
import { LoginComponent } from './login/login.component';
import { roleGuardService as RoleGuard } from './guards/role-guard.guard';

export const routes: Routes = [
    {
      path: 'users',
      loadChildren: () => import("./index/index.module").then(m => m.IndexModule),
      canActivate: [RoleGuard],
      data : {
        expectedRole: ["User"]
      }
    },
    {
      path: 'login',
      component: LoginComponent
    },
    {
      path: "**",
      redirectTo: 'users'
    }
];
@NgModule({
    imports: [
      RouterModule.forRoot(routes)
    ],
    exports: [RouterModule]
  })
  export class AppRoutingModule { }