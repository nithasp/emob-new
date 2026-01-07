import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LicensePlateSelectionDialogComponent } from './license-plate-selection-dialog.component';

describe('LicensePlateSelectionDialogComponent', () => {
  let component: LicensePlateSelectionDialogComponent;
  let fixture: ComponentFixture<LicensePlateSelectionDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LicensePlateSelectionDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LicensePlateSelectionDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
