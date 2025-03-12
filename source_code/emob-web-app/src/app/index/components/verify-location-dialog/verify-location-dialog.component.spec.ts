import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VerifyLocationDialogComponent } from './verify-location-dialog.component';

describe('VerifyLocationDialogComponent', () => {
  let component: VerifyLocationDialogComponent;
  let fixture: ComponentFixture<VerifyLocationDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VerifyLocationDialogComponent]
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
