import { NgModule } from '@angular/core';
import {
  DefaultFallbackStrategy,
  DefaultInterceptor,
  DefaultMissingHandler,
  DefaultTranspiler,
  TRANSLOCO_CONFIG,
  TRANSLOCO_FALLBACK_STRATEGY,
  TRANSLOCO_INTERCEPTOR,
  TRANSLOCO_LOADER,
  TRANSLOCO_MISSING_HANDLER,
  TRANSLOCO_TRANSPILER,
  TranslocoModule,
  translocoConfig,
} from '@jsverse/transloco';
import { TranslocoHttpLoader } from './transloco-loader';
import { environment } from '@env/environment';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { TranslocoPaginatorIntl } from './transloco-paginator-intl';

@NgModule({
  exports: [TranslocoModule],
  providers: [
    {
      provide: TRANSLOCO_CONFIG,
      useValue: translocoConfig({
        availableLangs: ['en', 'th'],
        defaultLang: 'en',
        fallbackLang: 'en',
        reRenderOnLangChange: true,
        prodMode: environment.production
      })
    },
    { provide: TRANSLOCO_LOADER, useClass: TranslocoHttpLoader },
    // ← **this line fixes** the “No provider for TRANSLOCO_TRANSPILER” error:
    { provide: TRANSLOCO_TRANSPILER, useClass: DefaultTranspiler },
    { provide: TRANSLOCO_MISSING_HANDLER, useClass: DefaultMissingHandler },
    { provide: TRANSLOCO_INTERCEPTOR, useClass: DefaultInterceptor },
    { provide: TRANSLOCO_FALLBACK_STRATEGY, useClass: DefaultFallbackStrategy },
    { provide: MatPaginatorIntl, useClass: TranslocoPaginatorIntl },
  ],
})
export class TranslocoRootModule {}
