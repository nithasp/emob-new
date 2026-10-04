import { BrowserModule } from '@angular/platform-browser';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import {
  BrowserAnimationsModule,
  provideAnimations,
} from '@angular/platform-browser/animations';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MaterialModule } from '@shared/material.module';
import { NgxSpinnerModule } from 'ngx-spinner';
import { CommonModule } from '@angular/common';
import { HTTP_INTERCEPTORS, provideHttpClient } from '@angular/common/http';
import { GraphQLModule } from '@core/graphql.module';
import { provideToastr, ToastrModule } from 'ngx-toastr';

import { RoleGuard } from '@core/guards/role.guard';
import { GuestGuard } from '@core/guards/guest.guard';
import { AuthInterceptor } from '@core/interceptors/auth.interceptor';
import { AuthModule } from './features/auth/auth.module';
import { RouterModule } from '@angular/router';
import { TranslocoRootModule } from 'src/transloco/transloco-root.module';

@NgModule({
  declarations: [AppComponent],
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
    AuthModule,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  bootstrap: [AppComponent],
  providers: [
    provideHttpClient(),
    provideAnimations(),
    provideToastr(),
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
