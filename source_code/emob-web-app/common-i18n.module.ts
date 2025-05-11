import { NgModule } from '@angular/core';
import {
  TranslocoModule,
  provideTranslocoScope
} from '@jsverse/transloco';

@NgModule({
  imports:  [TranslocoModule],
  exports:  [TranslocoModule],
  providers: [
    // default everything to assets/i18n/common/{lang}.json
    provideTranslocoScope('common')
  ]
})
export class CommonI18nModule {}
