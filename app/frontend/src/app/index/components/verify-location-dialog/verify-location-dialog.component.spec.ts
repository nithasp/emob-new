import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { VerifyLocationDialogComponent } from './verify-location-dialog.component';

describe('VerifyLocationDialogComponent', () => {
  let component: VerifyLocationDialogComponent;
  let fixture: ComponentFixture<VerifyLocationDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [VerifyLocationDialogComponent],
      schemas: [NO_ERRORS_SCHEMA],
    })
      // Replace the template so we don't pull in transloco pipes/child
      // elements used by the real verify-location template.
      .overrideComponent(VerifyLocationDialogComponent, {
        set: { template: '' },
      })
      .compileComponents();

    fixture = TestBed.createComponent(VerifyLocationDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
