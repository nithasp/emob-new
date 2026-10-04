import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { TranslocoService } from '@jsverse/transloco';
import { of, throwError } from 'rxjs';

import { VehicleComponent } from './vehicle.component';
import { VehicleService } from '../../services/vehicle.service';
import { MyVehicles } from '../../models/vehicle.model';
import { DialogVehicleComponent } from '../dialogs/dialog-vehicle/dialog-vehicle.component';
import { DialogConfirmationComponent } from '@shared/components/dialogs/dialog-confirmation/dialog-confirmation.component';

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

function createModalRef(result: Promise<unknown>): NgbModalRef {
  return {
    componentInstance: {},
    result,
  } as unknown as NgbModalRef;
}

describe('VehicleComponent', () => {
  let component: VehicleComponent;
  let fixture: ComponentFixture<VehicleComponent>;

  let vehicleService: jasmine.SpyObj<VehicleService>;
  let spinner: jasmine.SpyObj<NgxSpinnerService>;
  let ngbModal: jasmine.SpyObj<NgbModal>;
  let toastr: jasmine.SpyObj<ToastrService>;
  let transloco: jasmine.SpyObj<TranslocoService>;

  beforeEach(async () => {
    vehicleService = jasmine.createSpyObj<VehicleService>('VehicleService', [
      'getMyVehicles',
      'deleteVehicle',
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

    vehicleService.getMyVehicles.and.returnValue(of([]));
    vehicleService.deleteVehicle.and.returnValue(of(true));
    transloco.translate.and.callFake(((key: string) => key) as never);

    await TestBed.configureTestingModule({
      declarations: [VehicleComponent],
      providers: [
        { provide: VehicleService, useValue: vehicleService },
        { provide: NgxSpinnerService, useValue: spinner },
        { provide: NgbModal, useValue: ngbModal },
        { provide: ToastrService, useValue: toastr },
        { provide: TranslocoService, useValue: transloco },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(VehicleComponent, { set: { template: '' } })
      .compileComponents();

    fixture = TestBed.createComponent(VehicleComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose the expected displayed columns', () => {
    expect(component.displayedColumns).toEqual([
      'licensePlate',
      'vehicleType',
      'maxLoadWeight',
      'cargoWidth',
      'cargoLength',
      'cargoHeight',
      'isActive',
      'actions',
    ]);
  });

  describe('ngOnInit / getMyVehicles', () => {
    it('should load vehicles into the data source on init', () => {
      const vehicles = [createMockVehicle()];
      vehicleService.getMyVehicles.and.returnValue(of(vehicles));

      component.ngOnInit();

      expect(vehicleService.getMyVehicles).toHaveBeenCalled();
      expect(component.dataSource.data).toEqual(vehicles);
      expect(spinner.show).toHaveBeenCalled();
      expect(spinner.hide).toHaveBeenCalled();
    });

    it('should assign the paginator to the data source', () => {
      const paginator = {} as MatPaginator;
      component.paginator = paginator;
      const dataSourceStub = {
        data: [] as MyVehicles[],
        paginator: null as MatPaginator | null,
      };
      component.dataSource = dataSourceStub as unknown as typeof component.dataSource;
      vehicleService.getMyVehicles.and.returnValue(of([createMockVehicle()]));

      component.ngOnInit();

      expect(dataSourceStub.paginator).toBe(paginator);
    });

    it('should hide the spinner and log an error when loading fails', () => {
      const consoleSpy = spyOn(console, 'error');
      vehicleService.getMyVehicles.and.returnValue(
        throwError(() => new Error('network error'))
      );

      component.ngOnInit();

      expect(spinner.hide).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();
      expect(component.dataSource.data).toEqual([]);
    });
  });

  describe('openVehicleModal', () => {
    it('should open the vehicle dialog in create mode by default', () => {
      ngbModal.open.and.returnValue(createModalRef(Promise.reject()));

      component.openVehicleModal();

      expect(ngbModal.open).toHaveBeenCalledWith(
        DialogVehicleComponent,
        jasmine.objectContaining({ size: 'lg', backdrop: 'static' })
      );
      const instance = ngbModal.open.calls.mostRecent().returnValue
        .componentInstance as Record<string, unknown>;
      expect(instance['mode']).toBe('create');
      expect(instance['vehicle']).toBeNull();
    });

    it('should pass a copy of the vehicle and the given mode when editing', () => {
      const vehicle = createMockVehicle({ vehicleId: 'edit-me' });
      ngbModal.open.and.returnValue(createModalRef(Promise.reject()));

      component.openVehicleModal(vehicle, 'edit');

      const instance = ngbModal.open.calls.mostRecent().returnValue
        .componentInstance as { mode: string; vehicle: MyVehicles };
      expect(instance.mode).toBe('edit');
      expect(instance.vehicle).toEqual(vehicle);
      expect(instance.vehicle).not.toBe(vehicle);
    });

    it('should reload vehicles when the dialog resolves truthy', fakeAsync(() => {
      ngbModal.open.and.returnValue(createModalRef(Promise.resolve(true)));
      const reloadSpy = spyOn(
        component as unknown as { getMyVehicles: () => void },
        'getMyVehicles'
      );

      component.openVehicleModal();
      tick();

      expect(reloadSpy).toHaveBeenCalled();
    }));

    it('should not reload vehicles when the dialog resolves falsy', fakeAsync(() => {
      ngbModal.open.and.returnValue(createModalRef(Promise.resolve(false)));
      const reloadSpy = spyOn(
        component as unknown as { getMyVehicles: () => void },
        'getMyVehicles'
      );

      component.openVehicleModal();
      tick();

      expect(reloadSpy).not.toHaveBeenCalled();
    }));

    it('should swallow a dialog dismissal without reloading', fakeAsync(() => {
      ngbModal.open.and.returnValue(createModalRef(Promise.reject()));
      const reloadSpy = spyOn(
        component as unknown as { getMyVehicles: () => void },
        'getMyVehicles'
      );

      component.openVehicleModal();
      tick();

      expect(reloadSpy).not.toHaveBeenCalled();
    }));
  });

  describe('deleteVehicle', () => {
    it('should configure the confirmation dialog with translated text', () => {
      ngbModal.open.and.returnValue(createModalRef(Promise.reject()));

      component.deleteVehicle(createMockVehicle());

      expect(ngbModal.open).toHaveBeenCalledWith(
        DialogConfirmationComponent,
        jasmine.objectContaining({ centered: true })
      );
      const instance = ngbModal.open.calls.mostRecent().returnValue
        .componentInstance as Record<string, unknown>;
      expect(instance['title']).toBe('vehicleManagement.delete_vehicle_title');
      expect(instance['question']).toBe(
        'vehicleManagement.are_you_sure_delete_vehicle'
      );
    });

    it('should delete the vehicle and reload on confirmation', fakeAsync(() => {
      ngbModal.open.and.returnValue(createModalRef(Promise.resolve(true)));
      vehicleService.deleteVehicle.and.returnValue(of(true));
      const reloadSpy = spyOn(
        component as unknown as { getMyVehicles: () => void },
        'getMyVehicles'
      );

      component.deleteVehicle(createMockVehicle({ vehicleId: 'del-1' }));
      tick();

      expect(spinner.show).toHaveBeenCalled();
      expect(vehicleService.deleteVehicle).toHaveBeenCalledWith('del-1');
      expect(toastr.success).toHaveBeenCalled();
      expect(spinner.hide).toHaveBeenCalled();
      expect(reloadSpy).toHaveBeenCalled();
    }));

    it('should show an error toast when deletion fails', fakeAsync(() => {
      const consoleSpy = spyOn(console, 'error');
      ngbModal.open.and.returnValue(createModalRef(Promise.resolve(true)));
      vehicleService.deleteVehicle.and.returnValue(
        throwError(() => new Error('boom'))
      );

      component.deleteVehicle(createMockVehicle({ vehicleId: 'del-1' }));
      tick();

      expect(vehicleService.deleteVehicle).toHaveBeenCalledWith('del-1');
      expect(toastr.error).toHaveBeenCalled();
      expect(spinner.hide).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();
    }));

    it('should not delete the vehicle when the dialog is declined', fakeAsync(() => {
      ngbModal.open.and.returnValue(createModalRef(Promise.resolve(false)));

      component.deleteVehicle(createMockVehicle());
      tick();

      expect(vehicleService.deleteVehicle).not.toHaveBeenCalled();
      expect(toastr.success).not.toHaveBeenCalled();
    }));

    it('should not delete the vehicle when the dialog is dismissed', fakeAsync(() => {
      ngbModal.open.and.returnValue(createModalRef(Promise.reject()));

      component.deleteVehicle(createMockVehicle());
      tick();

      expect(vehicleService.deleteVehicle).not.toHaveBeenCalled();
    }));
  });
});
