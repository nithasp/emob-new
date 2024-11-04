import { BrowserModule } from "@angular/platform-browser";
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from "@angular/core";
import { AppRoutingModule } from "./app-routing.module";
import { AppComponent } from "./app.component";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";

import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { MaterialModule } from "./material.module";
import { LoginComponent } from "./login/login.component";
import { NgxSpinnerModule } from "ngx-spinner";
import { CommonModule } from "@angular/common";
import { provideHttpClient } from "@angular/common/http";

@NgModule({
  declarations: [AppComponent,LoginComponent],
  imports: [
    AppRoutingModule,
    MaterialModule,
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    ReactiveFormsModule,
    CommonModule ,
    NgxSpinnerModule.forRoot({ type: 'ball-scale-multiple' })
  ],
  schemas :[CUSTOM_ELEMENTS_SCHEMA ],
  bootstrap: [AppComponent],
  providers: [provideHttpClient()]
})
export class AppModule { }
