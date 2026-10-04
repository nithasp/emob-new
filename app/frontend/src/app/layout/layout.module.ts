import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { TRANSLOCO_SCOPE, TranslocoModule } from '@jsverse/transloco';

import { LayoutRoutingModule } from './layout-routing.module';
import { LayoutComponent } from './layout.component';
import { NavbarComponent } from './navbar/navbar.component';
import { TopbarComponent } from './topbar/topbar.component';

@NgModule({
  declarations: [LayoutComponent, NavbarComponent, TopbarComponent],
  imports: [
    CommonModule,
    LayoutRoutingModule,
    MatIconModule,
    NgbDropdownModule,
    TranslocoModule,
  ],
  // The top bar's translate pipes are what load the `index` scope on every page under the layout.
  // Dialogs that read `index.*` keys from a page with another scope (vehicle management) rely on it.
  providers: [{ provide: TRANSLOCO_SCOPE, useValue: 'index' }],
})
export class LayoutModule {}
