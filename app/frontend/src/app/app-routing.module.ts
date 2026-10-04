import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RoleGuard } from './guards/role.guard';
import { GuestGuard } from './guards/guest.guard';
import { UnauthorizedComponent } from './unauthorized/unauthorized.component';
import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import { environment } from 'src/environments/environment';

export const routes: Routes = [
    {
      path: 'users',
      loadChildren: () => import("./index/index.module").then(m => m.IndexModule),
      canActivate: [RoleGuard],
      data : {
        expectedRoles: [environment.roles.UserRole]
      }
    },
    { path: 'login', component: LoginComponent, canActivate: [GuestGuard] },
    { path: 'register', component: RegisterComponent, canActivate: [GuestGuard] },
    { path: 'unauthorized', component: UnauthorizedComponent },
    { path: '', redirectTo: '/users', pathMatch: 'full' },
    {
      path: "**",
      redirectTo: '/users'
    }
];
@NgModule({
  imports: [RouterModule.forRoot(routes, {
      initialNavigation: 'enabledNonBlocking'
  })],
  exports: [RouterModule]
})
  export class AppRoutingModule { }
