import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { TranslocoService } from '@jsverse/transloco';
import { of, throwError } from 'rxjs';

import { VehicleTypeComponent } from './vehicle-type.component';
import { VehicleService } from 'src/app/services/vehicle.service';
import {
  AccessTypeEnum,
  VehicleProfileTypeEnum,
  VehicleType,
} from 'src/app/models/vehicle.model';
import { VehicleTypeDialogComponent } from '../dialogs/vehicle-type-dialog/vehicle-type-dialog.component';
import { ConfirmationDialogComponent } from 'src/app/index/components/confirmation-dialog/confirmation-dialog.component';

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

/** Builds an NgbModalRef-like stub with a controllable result promise. */
function createModalRef(result: Promise<unknown>): NgbModalRef {
  return {
    componentInstance: {},
    result,
  } as unknown as NgbModalRef;
}

describe('VehicleTypeComponent', () => {
  let component: VehicleTypeComponent;
  let fixture: ComponentFixture<VehicleTypeComponent>;

  let vehicleService: jasmine.SpyObj<VehicleService>;
  let spinner: jasmine.SpyObj<NgxSpinnerService>;
  let ngbModal: jasmine.SpyObj<NgbModal>;
  let toastr: jasmine.SpyObj<ToastrService>;
  let transloco: jasmine.SpyObj<TranslocoService>;

  beforeEach(async () => {
    vehicleService = jasmine.createSpyObj<VehicleService>('VehicleService', [
      'getMyVehicleTypes',
      'deleteVehicleType',
    ]);
    spinner = jasmine.createSpyObj<NgxSpinnerService>('NgxSpinnerService', [
      'show',
      'hide',
    ]);
    ngbModal = jasmine.createSpyObj<NgbModal>('NgbModal', ['open']);
    toastr = jasmine.createSpyObj<ToastrService>('ToastrService', [
      'success',
      'error',
    ]);
    transloco = jasmine.createSpyObj<TranslocoService>('TranslocoService', [
      'translate',
    ]);

    // Default return values to keep ngOnInit happy.
    vehicleService.getMyVehicleTypes.and.returnValue(of([]));
    vehicleService.deleteVehicleType.and.returnValue(of(true));
    transloco.translate.and.callFake(((key: string) => key) as never);

    await TestBed.configureTestingModule({
      declarations: [VehicleTypeComponent],
      providers: [
        { provide: VehicleService, useValue: vehicleService },
        { provide: NgxSpinnerService, useValue: spinner },
        { provide: NgbModal, useValue: ngbModal },
        { provide: ToastrService, useValue: toastr },
        { provide: TranslocoService, useValue: transloco },
      ],
    })
      // Replace the template so we don't pull in transloco pipes/material deps.
      .overrideComponent(VehicleTypeComponent, { set: { template: '' } })
      .compileComponents();

    fixture = TestBed.createComponent(VehicleTypeComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit / getMyVehicleTypes', () => {
    it('should load vehicle types and refresh the paginated list on init', () => {
      const vehicleTypes = [
        createMockVehicleType({ vehicleTypeId: 'type-1' }),
        createMockVehicleType({ vehicleTypeId: 'type-2' }),
      ];
      vehicleService.getMyVehicleTypes.and.returnValue(of(vehicleTypes));

      component.ngOnInit();

      expect(vehicleService.getMyVehicleTypes).toHaveBeenCalled();
      expect(component.allVehicleTypes).toEqual(vehicleTypes);
      expect(component.collectionSize).toBe(2);
      expect(component.paginatedVehicleTypes).toEqual(vehicleTypes);
      expect(spinner.show).toHaveBeenCalled();
      expect(spinner.hide).toHaveBeenCalled();
    });

    it('should show an error toast and log the error when loading fails', () => {
      const consoleSpy = spyOn(console, 'error');
      vehicleService.getMyVehicleTypes.and.returnValue(
        throwError(() => new Error('network error'))
      );

      component.ngOnInit();

      expect(toastr.error).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();
      expect(spinner.hide).toHaveBeenCalled();
      expect(component.allVehicleTypes).toEqual([]);
    });
  });

  describe('refreshVehicleTypes', () => {
    it('should paginate the vehicle types according to the current page and page size', () => {
      component.allVehicleTypes = Array.from({ length: 7 }, (_, i) =>
        createMockVehicleType({ vehicleTypeId: `type-${i + 1}` })
      );
      component.pageSize = 5;
      component.page = 2;

      component.refreshVehicleTypes();

      expect(component.paginatedVehicleTypes).toEqual(
        component.allVehicleTypes.slice(5, 7)
      );
    });
  });

  describe('openVehicleTypeModal', () => {
    it('should open the vehicle type dialog with the given mode and a null vehicle type by default', () => {
      ngbModal.open.and.returnValue(createModalRef(Promise.reject()));

      component.openVehicleTypeModal('create');

      expect(ngbModal.open).toHaveBeenCalledWith(
        VehicleTypeDialogComponent,
        jasmine.objectContaining({ size: 'lg', backdrop: 'static' })
      );
      const instance = ngbModal.open.calls.mostRecent().returnValue
        .componentInstance as Record<string, unknown>;
      expect(instance['mode']).toBe('create');
      expect(instance['vehicleType']).toBeNull();
    });

    it('should pass the given vehicle type through to the dialog', () => {
      const vehicleType = createMockVehicleType({ vehicleTypeId: 'edit-me' });
      ngbModal.open.and.returnValue(createModalRef(Promise.reject()));

      component.openVehicleTypeModal('edit', vehicleType);

      const instance = ngbModal.open.calls.mostRecent().returnValue
        .componentInstance as { mode: string; vehicleType: VehicleType };
      expect(instance.mode).toBe('edit');
      expect(instance.vehicleType).toBe(vehicleType);
    });

    it('should show a success toast and reload when the dialog resolves with refresh in edit mode', fakeAsync(() => {
      ngbModal.open.and.returnValue(
        createModalRef(Promise.resolve({ refresh: true }))
      );
      vehicleService.getMyVehicleTypes.and.returnValue(of([]));

      component.openVehicleTypeModal('edit', createMockVehicleType());
      tick();

      expect(toastr.success).toHaveBeenCalledWith(
        'vehicleManagement.vehicle_type_updated_successfully',
        'success'
      );
      expect(vehicleService.getMyVehicleTypes).toHaveBeenCalled();
    }));

    it('should show a success toast and reload when the dialog resolves with refresh in create mode', fakeAsync(() => {
      ngbModal.open.and.returnValue(
        createModalRef(Promise.resolve({ refresh: true }))
      );
      vehicleService.getMyVehicleTypes.and.returnValue(of([]));

      component.openVehicleTypeModal('create');
      tick();

      expect(toastr.success).toHaveBeenCalledWith(
        'vehicleManagement.vehicle_type_created_successfully',
        'success'
      );
      expect(vehicleService.getMyVehicleTypes).toHaveBeenCalled();
    }));

    it('should reload without a toast when the dialog resolves with refresh in view mode', fakeAsync(() => {
      ngbModal.open.and.returnValue(
        createModalRef(Promise.resolve({ refresh: true }))
      );
      vehicleService.getMyVehicleTypes.and.returnValue(of([]));

      component.openVehicleTypeModal('view', createMockVehicleType());
      tick();

      expect(toastr.success).not.toHaveBeenCalled();
      expect(vehicleService.getMyVehicleTypes).toHaveBeenCalled();
    }));

    it('should not reload when the dialog resolves without refresh', fakeAsync(() => {
      ngbModal.open.and.returnValue(createModalRef(Promise.resolve({})));

      component.openVehicleTypeModal('create');
      tick();

      expect(vehicleService.getMyVehicleTypes).not.toHaveBeenCalled();
      expect(toastr.success).not.toHaveBeenCalled();
    }));

    it('should swallow a dialog dismissal without reloading', fakeAsync(() => {
      ngbModal.open.and.returnValue(createModalRef(Promise.reject()));

      component.openVehicleTypeModal('create');
      tick();

      expect(vehicleService.getMyVehicleTypes).not.toHaveBeenCalled();
    }));
  });

  describe('formatNumberTemporary', () => {
    it('should return an empty string for null or undefined', () => {
      expect(component.formatNumberTemporary(null)).toBe('');
      expect(component.formatNumberTemporary(undefined)).toBe('');
    });

    it('should return strings unchanged', () => {
      expect(component.formatNumberTemporary('N/A')).toBe('N/A');
    });

    it('should format numbers using the en-US locale', () => {
      expect(component.formatNumberTemporary(1234.5)).toBe('1,234.5');
    });
  });

  describe('deleteVehicleType', () => {
    it('should configure the confirmation dialog with translated text', () => {
      ngbModal.open.and.returnValue(createModalRef(Promise.reject()));

      component.deleteVehicleType(createMockVehicleType());

      expect(ngbModal.open).toHaveBeenCalledWith(
        ConfirmationDialogComponent,
        jasmine.objectContaining({ centered: true })
      );
      const instance = ngbModal.open.calls.mostRecent().returnValue
        .componentInstance as Record<string, unknown>;
      expect(instance['title']).toBe(
        'vehicleManagement.delete_vehicle_type_title'
      );
      expect(instance['question']).toBe(
        'vehicleManagement.delete_vehicle_type_question'
      );
    });

    it('should delete the vehicle type and reload on confirmation', fakeAsync(() => {
      ngbModal.open.and.returnValue(createModalRef(Promise.resolve(true)));
      vehicleService.deleteVehicleType.and.returnValue(of(true));
      vehicleService.getMyVehicleTypes.and.returnValue(of([]));

      component.deleteVehicleType(
        createMockVehicleType({ vehicleTypeId: 'del-1' })
      );
      tick();

      expect(spinner.show).toHaveBeenCalled();
      expect(vehicleService.deleteVehicleType).toHaveBeenCalledWith('del-1');
      expect(toastr.success).toHaveBeenCalled();
      expect(spinner.hide).toHaveBeenCalled();
      expect(vehicleService.getMyVehicleTypes).toHaveBeenCalled();
    }));

    it('should show an error toast and log the error when deletion fails', fakeAsync(() => {
      const consoleSpy = spyOn(console, 'error');
      ngbModal.open.and.returnValue(createModalRef(Promise.resolve(true)));
      vehicleService.deleteVehicleType.and.returnValue(
        throwError(() => new Error('boom'))
      );

      component.deleteVehicleType(
        createMockVehicleType({ vehicleTypeId: 'del-1' })
      );
      tick();

      expect(vehicleService.deleteVehicleType).toHaveBeenCalledWith('del-1');
      expect(toastr.error).toHaveBeenCalled();
      expect(spinner.hide).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();
    }));

    it('should not delete the vehicle type when the dialog is declined', fakeAsync(() => {
      ngbModal.open.and.returnValue(createModalRef(Promise.resolve(false)));

      component.deleteVehicleType(createMockVehicleType());
      tick();

      expect(vehicleService.deleteVehicleType).not.toHaveBeenCalled();
      expect(toastr.success).not.toHaveBeenCalled();
    }));
  });
});
