import { BrowserModule } from "@angular/platform-browser";
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from "@angular/core";
import { AppRoutingModule } from "./app-routing.module";
import { AppComponent } from "./app.component";
import { BrowserAnimationsModule, provideAnimations } from "@angular/platform-browser/animations";

import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { MaterialModule } from "./material.module";
import { NgxSpinnerModule } from "ngx-spinner";
import { CommonModule } from "@angular/common";
import { HTTP_INTERCEPTORS, provideHttpClient } from "@angular/common/http";
import { GraphQLModule } from "./graphql.module";
import {provideToastr, ToastrModule} from "ngx-toastr";


import { msalConfig, loginRequest } from './auth-config';
import { InteractionType, IPublicClientApplication, PublicClientApplication } from "@azure/msal-browser";
import { MSAL_GUARD_CONFIG, MsalBroadcastService, MsalGuardConfiguration, MsalInterceptor, MsalModule, MsalRedirectComponent, MsalService } from "@azure/msal-angular";
import { RoleGuard } from "./guards/role.guard";
import { TopbarComponent } from "./index/default/topbar/topbar.component";

/**
 * Here we pass the configuration parameters to create an MSAL instance.
 * For more info, visit: https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-angular/docs/v2-docs/configuration.md
 */
export function MSALInstanceFactory(): IPublicClientApplication {
  return new PublicClientApplication(msalConfig);
}

/**
 * Set your default interaction type for MSALGuard here. If you have any
 * additional scopes you want the user to consent upon login, add them here as well.
 */
export function MsalGuardConfigurationFactory(): MsalGuardConfiguration {
  return {
    interactionType: InteractionType.Redirect,
    authRequest: loginRequest
  };
}

@NgModule({
  declarations: [
    AppComponent,
    TopbarComponent,
  ],
  imports: [
    AppRoutingModule,
    MaterialModule,
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    ReactiveFormsModule,
    CommonModule ,
    NgxSpinnerModule.forRoot({type: "line-scale-party"}),
    GraphQLModule,
    ToastrModule.forRoot({
      closeButton: true,
      progressBar: true,
      positionClass: "toast-top-right",
      timeOut: 2000,
    }),
    MsalModule.forRoot(MSALInstanceFactory(),{
      interactionType : InteractionType.Popup,
      authRequest: {
        scopes:["user.read"]
      },
    },
    {
      interactionType: InteractionType.Popup,
      protectedResourceMap: new Map([
        ["https://graph.microsoft.com/v1.0/me", ["user.read"]]
      ])
    }),
  ],
  schemas :[CUSTOM_ELEMENTS_SCHEMA ],
  bootstrap: [AppComponent,
    MsalRedirectComponent],
  providers: [
    provideHttpClient(),
    provideAnimations(),
    provideToastr(),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: MsalInterceptor,
      multi: true,
    },
    {
      provide: MSAL_GUARD_CONFIG,
      useFactory: MsalGuardConfigurationFactory,
    },
    MsalService,
    MsalBroadcastService,
    RoleGuard
  ]
})
export class AppModule { }
