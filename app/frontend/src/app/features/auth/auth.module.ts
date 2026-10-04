import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TranslocoModule } from '@jsverse/transloco';

import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { UnauthorizedComponent } from './unauthorized/unauthorized.component';

@NgModule({
  declarations: [LoginComponent, RegisterComponent, UnauthorizedComponent],
  imports: [
    RouterModule,
    MatIconModule,
    CommonModule,
    ReactiveFormsModule,
    TranslocoModule,
  ],
})
export class AuthModule {}
