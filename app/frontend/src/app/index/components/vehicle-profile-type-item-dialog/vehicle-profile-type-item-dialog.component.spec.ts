import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import { VehicleProfileTypeItemDialogComponent } from './vehicle-profile-type-item-dialog.component';
import {
  AccessTypeEnum,
  VehicleProfileTypeEnum,
  VehicleType,
} from 'src/app/models/vehicle.model';

function createMockVehicleType(
  overrides: Partial<VehicleType> = {}
): VehicleType {
  return {
    vehicleTypeId: 'type-1',
    name: 'Small Truck',
    access: [AccessTypeEnum.REAR],
    dimension: { width: 1, height: 1, depth: 1 },
    maximumWeightCapacity: 1000,
    maximumVolumeCapacity: 10,
    timeWindowEarly: '08:00',
    timeWindowLate: '18:00',
    maximumDistance: 100,
    maximumDuration: '08:00:00',
    fixedCost: 100,
    unitDistanceCost: 1,
    unitDurationCost: 1,
    vehicleProfileType: VehicleProfileTypeEnum.TRUCK,
    createdAt: '2024-01-01T00:00:00Z',
    modifiedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('VehicleProfileTypeItemDialogComponent', () => {
  let component: VehicleProfileTypeItemDialogComponent;
  let fixture: ComponentFixture<VehicleProfileTypeItemDialogComponent>;
  let activeModal: jasmine.SpyObj<NgbActiveModal>;

  beforeEach(async () => {
    activeModal = jasmine.createSpyObj<NgbActiveModal>('NgbActiveModal', [
      'close',
      'dismiss',
    ]);

    await TestBed.configureTestingModule({
      declarations: [VehicleProfileTypeItemDialogComponent],
      providers: [{ provide: NgbActiveModal, useValue: activeModal }],
    })
      // Replace the template so we don't pull in the transloco pipe/directive
      // or Angular Material dependencies used purely for display.
      .overrideComponent(VehicleProfileTypeItemDialogComponent, {
        set: { template: '' },
      })
      .compileComponents();

    fixture = TestBed.createComponent(VehicleProfileTypeItemDialogComponent);
    component = fixture.componentInstance;
    component.vehicleTypeData = createMockVehicleType();
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should log the vehicle type data on init', () => {
    const consoleSpy = spyOn(console, 'log');

    component.ngOnInit();

    expect(consoleSpy).toHaveBeenCalledWith(
      'vehicleTypeData',
      component.vehicleTypeData
    );
  });

  it('should expose the injected active modal', () => {
    expect(component.activeModal).toBe(activeModal);
  });
});
