import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RoleGuard } from '@core/guards/role.guard';
import { GuestGuard } from '@core/guards/guest.guard';
import { UnauthorizedComponent } from './features/auth/unauthorized/unauthorized.component';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { environment } from '@env/environment';

export const routes: Routes = [
    {
      path: 'users',
      loadChildren: () => import("./layout/layout.module").then(m => m.LayoutModule),
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
