import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VehicleProfileTypeItemDialogComponent } from './vehicle-profile-type-item-dialog.component';

describe('VehicleProfileTypeItemDialogComponent', () => {
  let component: VehicleProfileTypeItemDialogComponent;
  let fixture: ComponentFixture<VehicleProfileTypeItemDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VehicleProfileTypeItemDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VehicleProfileTypeItemDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
