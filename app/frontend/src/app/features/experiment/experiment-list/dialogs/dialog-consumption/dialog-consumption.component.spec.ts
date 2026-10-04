import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import { DialogConsumptionComponent } from './dialog-consumption.component';

describe('DialogConsumptionComponent', () => {
  let component: DialogConsumptionComponent;
  let fixture: ComponentFixture<DialogConsumptionComponent>;

  let activeModal: jasmine.SpyObj<NgbActiveModal>;

  beforeEach(async () => {
    activeModal = jasmine.createSpyObj<NgbActiveModal>('NgbActiveModal', [
      'close',
      'dismiss',
    ]);

    await TestBed.configureTestingModule({
      declarations: [DialogConsumptionComponent],
      providers: [{ provide: NgbActiveModal, useValue: activeModal }],
      schemas: [NO_ERRORS_SCHEMA],
    })
      // Replace the template so we don't pull in transloco pipes.
      .overrideComponent(DialogConsumptionComponent, { set: { template: '' } })
      .compileComponents();

    fixture = TestBed.createComponent(DialogConsumptionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
