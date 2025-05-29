import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class LanguageChangeService {
  private langToggledSource = new Subject<void>();
  langToggled$ = this.langToggledSource.asObservable();

  notifyLangToggle() {
    this.langToggledSource.next();
  }
}