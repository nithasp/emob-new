import { NgModule } from '@angular/core';
import { TranslocoModule, TRANSLOCO_SCOPE } from '@jsverse/transloco';

@NgModule({
  imports:  [ TranslocoModule ],
  exports:  [ TranslocoModule ],
  providers: [
    { provide: TRANSLOCO_SCOPE, useValue: 'common' }
  ]
})
export class CommonI18nModule {}
