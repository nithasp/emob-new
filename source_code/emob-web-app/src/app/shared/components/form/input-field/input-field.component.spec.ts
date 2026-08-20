import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { TranslocoService } from '@jsverse/transloco';
import { InputFieldComponent } from './input-field.component';

describe('InputFieldComponent', () => {
  let component: InputFieldComponent;
  let fixture: ComponentFixture<InputFieldComponent>;

  let mockTransloco: jasmine.SpyObj<TranslocoService>;

  beforeEach(async () => {
    mockTransloco = jasmine.createSpyObj('TranslocoService', ['translate']);
    mockTransloco.translate.and.callFake(((key: string) => key) as never);

    await TestBed.configureTestingModule({
      imports: [InputFieldComponent],
      providers: [provideNoopAnimations(), { provide: TranslocoService, useValue: mockTransloco }],
    })
    .compileComponents();

    fixture = TestBed.createComponent(InputFieldComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
}); 