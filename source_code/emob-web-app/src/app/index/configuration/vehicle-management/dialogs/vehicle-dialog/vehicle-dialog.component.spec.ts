import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NgbActiveModal, NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';

import { VehicleDialogComponent } from './vehicle-dialog.component';
import { VehicleService } from 'src/app/services/vehicle.service';
import { ExperimentService } from 'src/app/services/experiment.service';
import {
  AccessTypeEnum,
  MyVehicles,
  VehicleProfileTypeEnum,
  VehicleType,
} from 'src/app/models/vehicle.model';
import { MyDepot } from 'src/app/models/experiment.model';

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

function createMockDepot(overrides: Partial<MyDepot> = {}): MyDepot {
  return {
    depotId: 'depot-1',
    depotName: 'Main Depot',
    latitude: 0,
    longitude: 0,
    timeWindowEarly: '08:00',
    timeWindowLate: '18:00',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    inputdata: [],
    ...overrides,
  };
}

function createMockVehicle(overrides: Partial<MyVehicles> = {}): MyVehicles {
  return {
    companyName: 'ACME',
    vehicleId: 'vehicle-1',
    licensePlate: 'ABC-123',
    startDepotId: {} as MyVehicles['startDepotId'],
    endDepotId: {} as MyVehicles['endDepotId'],
    vehicleTypeId: 'type-1',
    vehicleType: {} as MyVehicles['vehicleType'],
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    modifiedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

/** Builds an NgbModalRef-like stub with a controllable result promise. */
function createModalRef(result: Promise<unknown>): NgbModalRef {
  return {
    componentInstance: {},
    result,
  } as unknown as NgbModalRef;
}

describe('VehicleDialogComponent', () => {
  let component: VehicleDialogComponent;
  let fixture: ComponentFixture<VehicleDialogComponent>;

  let activeModal: jasmine.SpyObj<NgbActiveModal>;
  let ngbModal: jasmine.SpyObj<NgbModal>;
  let vehicleService: jasmine.SpyObj<VehicleService>;
  let experimentService: jasmine.SpyObj<ExperimentService>;
  let spinner: jasmine.SpyObj<NgxSpinnerService>;
  let toastr: jasmine.SpyObj<ToastrService>;
  let transloco: jasmine.SpyObj<TranslocoService>;

  beforeEach(async () => {
    activeModal = jasmine.createSpyObj<NgbActiveModal>('NgbActiveModal', [
      'close',
      'dismiss',
    ]);
    ngbModal = jasmine.createSpyObj<NgbModal>('NgbModal', ['open']);
    vehicleService = jasmine.createSpyObj<VehicleService>('VehicleService', [
      'getMyVehicleTypes',
      'getMyVehicle',
      'createVehicle',
      'updateVehicle',
    ]);
    experimentService = jasmine.createSpyObj<ExperimentService>(
      'ExperimentService',
      ['getMyDepots']
    );
    spinner = jasmine.createSpyObj<NgxSpinnerService>('NgxSpinnerService', [
      'show',
      'hide',
    ]);
    toastr = jasmine.createSpyObj<ToastrService>('ToastrService', [
      'success',
      'error',
    ]);
    transloco = jasmine.createSpyObj<TranslocoService>('TranslocoService', [
      'translate',
    ]);

    // Default return values to keep ngOnInit happy.
    vehicleService.getMyVehicleTypes.and.returnValue(
      of([createMockVehicleType()])
    );
    experimentService.getMyDepots.and.returnValue(of([createMockDepot()]));
    transloco.translate.and.callFake(((key: string) => key) as never);

    await TestBed.configureTestingModule({
      declarations: [VehicleDialogComponent],
      imports: [ReactiveFormsModule],
      providers: [
        { provide: NgbActiveModal, useValue: activeModal },
        { provide: NgbModal, useValue: ngbModal },
        { provide: VehicleService, useValue: vehicleService },
        { provide: ExperimentService, useValue: experimentService },
        { provide: NgxSpinnerService, useValue: spinner },
        { provide: ToastrService, useValue: toastr },
        { provide: TranslocoService, useValue: transloco },
      ],
    })
      // Replace the template so we don't pull in transloco pipes/directives
      // or the app-input-select/app-input-field custom elements.
      .overrideComponent(VehicleDialogComponent, { set: { template: '' } })
      .compileComponents();

    fixture = TestBed.createComponent(VehicleDialogComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('initialization', () => {
    it('should initialize the form and load vehicle types and depots in create mode', () => {
      component.mode = 'create';
      fixture.detectChanges();

      expect(component.isEditMode).toBeFalse();
      expect(component.isViewMode).toBeFalse();
      expect(component.form.enabled).toBeTrue();
      expect(vehicleService.getMyVehicleTypes).toHaveBeenCalled();
      expect(experimentService.getMyDepots).toHaveBeenCalled();
      expect(component.vehicleTypeOptions.length).toBe(1);
      expect(component.depotOptions.length).toBe(1);
      expect(component.isLoading).toBeFalse();
    });

    it('should disable the form in view mode', () => {
      component.mode = 'view';
      fixture.detectChanges();

      expect(component.isViewMode).toBeTrue();
      expect(component.form.disabled).toBeTrue();
    });

    it('should fetch and patch vehicle data when editing an existing vehicle', () => {
      vehicleService.getMyVehicle.and.returnValue(
        of({
          vehicleType: { vehicleTypeId: 'type-2' } as MyVehicles['vehicleType'],
          startDepotId: { depotId: 'depot-a' } as MyVehicles['startDepotId'],
          endDepotId: { depotId: 'depot-b' } as MyVehicles['endDepotId'],
          licensePlate: 'XYZ-987',
        } as MyVehicles)
      );

      component.mode = 'edit';
      component.vehicle = createMockVehicle({ vehicleId: 'veh-1' });
      fixture.detectChanges();

      expect(vehicleService.getMyVehicle).toHaveBeenCalledWith('veh-1');
      expect(component.form.controls.vehicleType.value).toBe('type-2');
      expect(component.form.controls.licensePlate.value).toBe('XYZ-987');
    });
  });

  describe('license plate list (create mode)', () => {
    beforeEach(() => {
      component.mode = 'create';
      fixture.detectChanges();
    });

    it('should add a license plate when valid and not a duplicate', () => {
      component.form.controls.licensePlate.setValue('ABC-123');

      component.addLicensePlate();

      expect(component.licensePlates).toEqual(['ABC-123']);
      expect(component.form.controls.licensePlate.value).toBeNull();
    });

    it('should not add a duplicate license plate', () => {
      component.licensePlates = ['ABC-123'];
      component.form.controls.licensePlate.setValue('ABC-123');

      component.addLicensePlate();

      expect(component.licensePlates).toEqual(['ABC-123']);
    });

    it('should remove a license plate by index', () => {
      component.licensePlates = ['PLATE1', 'PLATE2'];

      component.removeLicensePlate(0);

      expect(component.licensePlates).toEqual(['PLATE2']);
    });
  });

  describe('onSubmit', () => {
    beforeEach(() => {
      ngbModal.open.and.returnValue(createModalRef(Promise.resolve(true)));
    });

    it('should mark the form touched and not open a dialog when invalid', () => {
      component.mode = 'create';
      fixture.detectChanges();

      component.onSubmit();

      expect(component.form.touched).toBeTrue();
      expect(ngbModal.open).not.toHaveBeenCalled();
    });

    it('should create the vehicle on confirmation in create mode', fakeAsync(() => {
      component.mode = 'create';
      fixture.detectChanges();
      component.form.patchValue({
        vehicleType: 'type-1',
      });
      component.licensePlates = ['ABC-123'];
      vehicleService.createVehicle.and.returnValue(
        of({ vehicles: [], duplicates: [], message: 'ok' })
      );

      component.onSubmit();
      tick();

      expect(ngbModal.open).toHaveBeenCalled();
      expect(spinner.show).toHaveBeenCalled();
      // Vehicle Pool: the dialog no longer asks for depots. The backend still
      // requires both ids, so a new vehicle takes the first available depot.
      expect(vehicleService.createVehicle).toHaveBeenCalledWith({
        vehicleTypeId: 'type-1',
        startDepotId: 'depot-1',
        endDepotId: 'depot-1',
        licensePlates: ['ABC-123'],
      });
      expect(toastr.success).toHaveBeenCalled();
      expect(activeModal.close).toHaveBeenCalledWith({
        success: true,
        res: { vehicles: [], duplicates: [], message: 'ok' },
      });
      expect(spinner.hide).toHaveBeenCalled();
    }));

    it('should update the vehicle on confirmation in edit mode', fakeAsync(() => {
      vehicleService.getMyVehicle.and.returnValue(
        of({
          vehicleType: { vehicleTypeId: 'type-1' } as MyVehicles['vehicleType'],
          startDepotId: { depotId: 'depot-1' } as MyVehicles['startDepotId'],
          endDepotId: { depotId: 'depot-2' } as MyVehicles['endDepotId'],
          licensePlate: 'OLD-PLATE',
        } as MyVehicles)
      );
      component.mode = 'edit';
      component.vehicle = createMockVehicle({ vehicleId: 'edit-id' });
      fixture.detectChanges();
      component.form.patchValue({ licensePlate: 'UPDATED-PLATE' });
      vehicleService.updateVehicle.and.returnValue(
        of(createMockVehicle({ vehicleId: 'edit-id' }))
      );

      component.onSubmit();
      tick();

      expect(vehicleService.updateVehicle).toHaveBeenCalledWith('edit-id', {
        vehicleTypeId: 'type-1',
        startDepotId: 'depot-1',
        endDepotId: 'depot-2',
        licensePlate: 'UPDATED-PLATE',
      });
      expect(toastr.success).toHaveBeenCalled();
      expect(activeModal.close).toHaveBeenCalled();
    }));
  });

  describe('onCancel', () => {
    it('should dismiss the modal', () => {
      component.onCancel();

      expect(activeModal.dismiss).toHaveBeenCalled();
    });
  });
});
