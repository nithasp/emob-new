import { BrowserModule } from '@angular/platform-browser';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import {
  BrowserAnimationsModule,
  provideAnimations,
} from '@angular/platform-browser/animations';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MaterialModule } from './material.module';
import { NgxSpinnerModule } from 'ngx-spinner';
import { CommonModule } from '@angular/common';
import { HTTP_INTERCEPTORS, provideHttpClient } from '@angular/common/http';
import { GraphQLModule } from './graphql.module';
import { provideToastr, ToastrModule } from 'ngx-toastr';

import { RoleGuard } from './guards/role.guard';
import { GuestGuard } from './guards/guest.guard';
import { AuthInterceptor } from './interceptors/auth.interceptor';
import { UnauthorizedComponent } from './unauthorized/unauthorized.component';
import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import { RouterModule } from '@angular/router';
import { TranslocoRootModule } from 'src/transloco/transloco-root.module';

@NgModule({
  declarations: [AppComponent, UnauthorizedComponent, LoginComponent, RegisterComponent],
  imports: [
    AppRoutingModule,
    RouterModule.forRoot([]),
    MaterialModule,
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    NgxSpinnerModule.forRoot({ type: 'line-scale-party' }),
    GraphQLModule,
    ToastrModule.forRoot({
      closeButton: true,
      progressBar: true,
      positionClass: 'toast-bottom-right',
      preventDuplicates: true,
      timeOut: 2000,
      newestOnTop: false,
      progressAnimation: 'increasing',
      extendedTimeOut: 2000,
      autoDismiss: true,
      maxOpened: 5,
    }),
    TranslocoRootModule,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  bootstrap: [AppComponent],
  providers: [
    provideHttpClient(),
    provideAnimations(),
    provideToastr(),
    // Attaches the access token to every API and GraphQL request, and renews it when it expires
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    },
    RoleGuard,
    GuestGuard,
  ],
})
export class AppModule {}
