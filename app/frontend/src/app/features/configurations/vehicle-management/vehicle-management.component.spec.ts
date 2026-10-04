import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VehicleManagementComponent } from './vehicle-management.component';

describe('VehicleManagementComponent', () => {
  let component: VehicleManagementComponent;
  let fixture: ComponentFixture<VehicleManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [VehicleManagementComponent],
    })
      .overrideComponent(VehicleManagementComponent, { set: { template: '' } })
      .compileComponents();

    fixture = TestBed.createComponent(VehicleManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default the active nav tab to the first tab', () => {
    expect(component.activeNavId).toBe(1);
  });
});
