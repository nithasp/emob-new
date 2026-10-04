import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { TranslocoService } from '@jsverse/transloco';

import { InputSelectComponent } from './input-select.component';

describe('InputSelectComponent', () => {
  let component: InputSelectComponent;
  let fixture: ComponentFixture<InputSelectComponent>;

  let mockTransloco: jasmine.SpyObj<TranslocoService>;

  beforeEach(async () => {
    mockTransloco = jasmine.createSpyObj('TranslocoService', ['translate']);
    mockTransloco.translate.and.callFake(((key: string) => key) as never);

    await TestBed.configureTestingModule({
      imports: [InputSelectComponent],
      providers: [provideNoopAnimations(), { provide: TranslocoService, useValue: mockTransloco }],
    })
    .compileComponents();

    fixture = TestBed.createComponent(InputSelectComponent);
    component = fixture.componentInstance;
    component.control = new FormControl();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
