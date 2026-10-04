import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslocoService } from '@jsverse/transloco';

import { DialogParametersComponent } from './dialog-parameters.component';

describe('DialogParametersComponent', () => {
  let component: DialogParametersComponent;
  let fixture: ComponentFixture<DialogParametersComponent>;

  let activeModal: jasmine.SpyObj<NgbActiveModal>;
  let transloco: jasmine.SpyObj<TranslocoService>;

  beforeEach(async () => {
    activeModal = jasmine.createSpyObj<NgbActiveModal>('NgbActiveModal', [
      'close',
      'dismiss',
    ]);
    transloco = jasmine.createSpyObj<TranslocoService>('TranslocoService', [
      'translate',
      'getActiveLang',
    ]);
    transloco.translate.and.callFake(((key: string) => key) as never);
    transloco.getActiveLang.and.returnValue('en_US');

    await TestBed.configureTestingModule({
      declarations: [DialogParametersComponent],
      providers: [
        { provide: NgbActiveModal, useValue: activeModal },
        { provide: TranslocoService, useValue: transloco },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(DialogParametersComponent, { set: { template: '' } })
      .compileComponents();

    fixture = TestBed.createComponent(DialogParametersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
