import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslocoService } from '@jsverse/transloco';
import { ToastrService } from 'ngx-toastr';

import { UploadFileComponent } from './upload-file.component';

describe('UploadFileComponent', () => {
  let component: UploadFileComponent;
  let fixture: ComponentFixture<UploadFileComponent>;

  let toastr: jasmine.SpyObj<ToastrService>;
  let activeModal: jasmine.SpyObj<NgbActiveModal>;
  let ngbModal: jasmine.SpyObj<NgbModal>;
  let transloco: jasmine.SpyObj<TranslocoService>;

  beforeEach(async () => {
    toastr = jasmine.createSpyObj<ToastrService>('ToastrService', [
      'success',
      'error',
      'warning',
      'info',
    ]);
    activeModal = jasmine.createSpyObj<NgbActiveModal>('NgbActiveModal', [
      'close',
      'dismiss',
    ]);
    ngbModal = jasmine.createSpyObj<NgbModal>('NgbModal', ['open']);
    transloco = jasmine.createSpyObj<TranslocoService>('TranslocoService', [
      'translate',
      'getActiveLang',
    ]);
    transloco.translate.and.callFake(((key: string) => key) as never);

    await TestBed.configureTestingModule({
      declarations: [UploadFileComponent],
      providers: [
        { provide: ToastrService, useValue: toastr },
        { provide: NgbActiveModal, useValue: activeModal },
        { provide: NgbModal, useValue: ngbModal },
        { provide: TranslocoService, useValue: transloco },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      // Replace the template so we don't pull in transloco pipes.
      .overrideComponent(UploadFileComponent, { set: { template: '' } })
      .compileComponents();

    fixture = TestBed.createComponent(UploadFileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
