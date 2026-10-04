import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslocoTestingModule } from '@jsverse/transloco';

import { ConfirmationDialogComponent } from './confirmation-dialog.component';

describe('ConfirmationDialogComponent', () => {
  let component: ConfirmationDialogComponent;
  let fixture: ComponentFixture<ConfirmationDialogComponent>;
  let activeModalSpy: jasmine.SpyObj<NgbActiveModal>;

  beforeEach(async () => {
    activeModalSpy = jasmine.createSpyObj('NgbActiveModal', ['close', 'dismiss']);

    await TestBed.configureTestingModule({
      declarations: [ConfirmationDialogComponent],
      imports: [
        CommonModule,
        TranslocoTestingModule.forRoot({
          langs: { en: {} },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
        }),
      ],
      providers: [{ provide: NgbActiveModal, useValue: activeModalSpy }],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmationDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default title, acceptButton, and disableCancelButton', () => {
    expect(component.title).toBe('Confirm Action');
    expect(component.acceptButton).toBe('Confirm');
    expect(component.disableCancelButton).toBeFalse();
    expect(component.message).toBeUndefined();
    expect(component.question).toBeUndefined();
  });

  it('should honor overridden inputs', () => {
    component.title = 'Delete item';
    component.message = 'This cannot be undone';
    component.question = 'Are you sure?';
    component.acceptButton = 'Delete';
    component.disableCancelButton = true;
    fixture.detectChanges();

    expect(component.title).toBe('Delete item');
    expect(component.message).toBe('This cannot be undone');
    expect(component.question).toBe('Are you sure?');
    expect(component.acceptButton).toBe('Delete');
    expect(component.disableCancelButton).toBeTrue();
  });

  it('should close the modal with false when cancel is clicked', () => {
    component.onCancleClick();
    expect(activeModalSpy.close).toHaveBeenCalledWith(false);
    expect(activeModalSpy.close).toHaveBeenCalledTimes(1);
  });

  it('should close the modal with true when confirm is clicked', () => {
    component.onConfirmClick();
    expect(activeModalSpy.close).toHaveBeenCalledWith(true);
    expect(activeModalSpy.close).toHaveBeenCalledTimes(1);
  });

  it('should not dismiss the modal on cancel or confirm', () => {
    component.onCancleClick();
    component.onConfirmClick();
    expect(activeModalSpy.dismiss).not.toHaveBeenCalled();
  });
});
