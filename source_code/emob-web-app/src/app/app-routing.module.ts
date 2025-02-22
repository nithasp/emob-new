import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RoleGuard } from './guards/role.guard';
import { BrowserUtils } from '@azure/msal-browser';
import { roles } from './auth-config';
import { UnauthorizedComponent } from './unauthorized/unauthorized.component';

export const routes: Routes = [
    {
      path: 'users',
      loadChildren: () => import("./index/index.module").then(m => m.IndexModule),
      canActivate: [RoleGuard],
      data : {
        expectedRoles: [roles.UserRole]
      }
    },
    { path: 'unauthorized', component: UnauthorizedComponent },
    { path: '', redirectTo: '/users', pathMatch: 'full' },
    {
      path: "**",
      redirectTo: '/users'
    }
];
@NgModule({
  imports: [RouterModule.forRoot(routes, {
      // Don't perform initial navigation in iframes or popups
      initialNavigation: !BrowserUtils.isInIframe() && !BrowserUtils.isInPopup() ? 'enabledNonBlocking' : 'disabled' // Set to enabledBlocking to use Angular Universal
  })],
  exports: [RouterModule]
})
  export class AppRoutingModule { }