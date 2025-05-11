import { inject, Injectable } from '@angular/core';
import { TranslocoLoader, Translation } from '@jsverse/transloco';
import { HttpClient } from '@angular/common/http';
import { TranslocoLoaderData } from 'node_modules/@jsverse/transloco/lib/transloco.loader';

@Injectable({ providedIn: 'root' })

export class TranslocoHttpLoader implements TranslocoLoader {
  private http = inject(HttpClient);

  getTranslation(lang: string, data?: TranslocoLoaderData) {
    const folder = data?.scope ?? 'common';
    return this.http.get<Translation>(`assets/i18n/${folder}/${lang}.json`);
  }
}
