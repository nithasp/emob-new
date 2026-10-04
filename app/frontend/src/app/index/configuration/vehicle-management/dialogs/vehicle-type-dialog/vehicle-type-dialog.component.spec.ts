import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { NgxSpinnerService } from 'ngx-spinner';
import { TranslocoService } from '@jsverse/transloco';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { of } from 'rxjs';

import { VehicleTypeDialogComponent } from './vehicle-type-dialog.component';
import { VehicleService } from 'src/app/services/vehicle.service';
import {
  VehicleType,
  AccessTypeEnum,
  VehicleProfileTypeEnum,
  TimeObject,
} from 'src/app/models/vehicle.model';

describe('VehicleTypeDialogComponent', () => {
  let component: VehicleTypeDialogComponent;
  let fixture: ComponentFixture<VehicleTypeDialogComponent>;

  let mockActiveModal: jasmine.SpyObj<NgbActiveModal>;
  let mockNgbModal: jasmine.SpyObj<NgbModal>;
  let mockVehicleService: jasmine.SpyObj<VehicleService>;
  let mockSpinner: jasmine.SpyObj<NgxSpinnerService>;
  let mockTransloco: jasmine.SpyObj<TranslocoService>;

  function createMockVehicleType(overrides: Partial<VehicleType> = {}): VehicleType {
    return {
      vehicleTypeId: 'vt-1',
      name: 'Truck A',
      access: [AccessTypeEnum.FRONT],
      allowedBreaks: [
        { name: 'Break1', duration: '00:30', timeWindowEarly: '12:00', timeWindowLate: '13:00' },
      ],
      dimension: { width: 5, height: 5, depth: 5 },
      maximumWeightCapacity: 500,
      maximumVolumeCapacity: 0,
      timeWindowEarly: '08:00',
      timeWindowLate: '18:00',
      maximumDistance: 100,
      maximumDuration: '02:00',
      vehicleGroupId: 'group-1',
      fixedCost: 10,
      unitDistanceCost: 1,
      unitDurationCost: 1,
      vehicleProfileType: VehicleProfileTypeEnum.TRUCK,
      maxpallet: 2,
      zone: 'zoneA',
      createdAt: '',
      modifiedAt: '',
      ...overrides,
    };
  }

  function fillValidForm(): void {
    component.formVehicleType.patchValue({
      name: 'Test Vehicle',
      maximumWeightCapacity: 100,
      vehicleProfileType: 'CAR',
      vehicleGroupId: 'group1',
      dimension: { width: 10, height: 10, depth: 10 },
    });
    component.addBreak();
    component.allowedBreaks.at(0).patchValue({
      name: 'Lunch',
      duration: '00:30',
      timeWindowEarly: '12:00',
      timeWindowLate: '13:00',
    });
  }

  beforeEach(async () => {
    mockActiveModal = jasmine.createSpyObj('NgbActiveModal', ['close', 'dismiss']);
    mockNgbModal = jasmine.createSpyObj('NgbModal', ['open']);
    mockVehicleService = jasmine.createSpyObj('VehicleService', [
      'getEnumValues',
      'createVehicleType',
      'updateVehicleType',
    ]);
    mockSpinner = jasmine.createSpyObj('NgxSpinnerService', ['show', 'hide']);
    mockTransloco = jasmine.createSpyObj('TranslocoService', ['translate']);

    mockVehicleService.getEnumValues.and.callFake((enumName: string) => {
      if (enumName === 'VehicleProfileTypeEnum') {
        return of([{ key: 'CAR', value: 'Car' }]);
      }
      if (enumName === 'AccessTypeEnum') {
        return of([{ key: 'FRONT', value: 'Front' }]);
      }
      return of([]);
    });
    mockTransloco.translate.and.callFake(((key: string) => key) as never);

    await TestBed.configureTestingModule({
      imports: [VehicleTypeDialogComponent],
      providers: [
        { provide: NgbActiveModal, useValue: mockActiveModal },
        { provide: VehicleService, useValue: mockVehicleService },
        { provide: NgxSpinnerService, useValue: mockSpinner },
        { provide: TranslocoService, useValue: mockTransloco },
      ],
    })
      .overrideComponent(VehicleTypeDialogComponent, { set: { template: '' } })
      // NgbModalModule re-provides NgbModal in its own `providers` array, which
      // shadows a plain TestBed provider override for standalone components
      // that import NgbModule; overrideProvider bypasses that shadowing.
      .overrideProvider(NgbModal, { useValue: mockNgbModal })
      .compileComponents();

    fixture = TestBed.createComponent(VehicleTypeDialogComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('Initialization & Modes', () => {
    it('should load enum values on init and stop loading', () => {
      fixture.detectChanges();

      expect(mockVehicleService.getEnumValues).toHaveBeenCalledWith('VehicleProfileTypeEnum');
      expect(mockVehicleService.getEnumValues).toHaveBeenCalledWith('AccessTypeEnum');
      expect(component.vehicleProfileTypeOptions).toEqual([{ key: 'CAR', value: 'Car' }]);
      expect(component.accessPointOptions).toEqual([{ key: 'FRONT', value: 'Front' }]);
      expect(component.isLoading).toBeFalse();
    });

    it('should default to create mode with an enabled form', () => {
      component.mode = 'create';
      fixture.detectChanges();

      expect(component.isEdit).toBeFalse();
      expect(component.isViewMode).toBeFalse();
      expect(component.formVehicleType.enabled).toBeTrue();
    });

    it('should set edit mode flags', () => {
      component.mode = 'edit';
      component.vehicleType = createMockVehicleType();
      fixture.detectChanges();

      expect(component.isEdit).toBeTrue();
      expect(component.isViewMode).toBeFalse();
    });

    it('should disable the form in view mode', () => {
      component.mode = 'view';
      component.vehicleType = createMockVehicleType();
      fixture.detectChanges();

      expect(component.isViewMode).toBeTrue();
      expect(component.formVehicleType.disabled).toBeTrue();
    });
  });

  describe('Edit mode data patching', () => {
    it('should patch form values and breaks from the provided vehicleType', () => {
      component.mode = 'edit';
      component.vehicleType = createMockVehicleType();
      fixture.detectChanges();

      expect(component.formVehicleType.get('name')?.value).toBe('Truck A');
      expect(component.formVehicleType.get('vehicleGroupId')?.value).toBe('group-1');
      expect(component.formVehicleType.get('vehicleProfileType')?.value).toBe(
        VehicleProfileTypeEnum.TRUCK
      );
      expect(component.allowedBreaks.length).toBe(1);
      expect(component.breakTimeObjects.length).toBe(1);
      expect(component.allowedBreaks.at(0).get('name')?.value).toBe('Break1');
    });

    it('should use volume sizing when dimension is absent and volume capacity is set', () => {
      component.mode = 'edit';
      component.vehicleType = createMockVehicleType({
        dimension: null,
        maximumVolumeCapacity: 50,
      });
      fixture.detectChanges();

      expect(component.vehicleSizingType).toBe('volume');
      expect(component.formVehicleType.controls.maximumVolumeCapacity.disabled).toBeFalse();
      expect(component.formVehicleType.controls.dimension.disabled).toBeTrue();
    });
  });

  describe('onVehicleSizingTypeChange', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should enable volume control and disable dimension group when switching to volume', () => {
      component.vehicleSizingType = 'volume';
      component.onVehicleSizingTypeChange();

      expect(component.formVehicleType.controls.maximumVolumeCapacity.disabled).toBeFalse();
      expect(component.formVehicleType.controls.dimension.disabled).toBeTrue();
    });

    it('should enable dimension group and disable volume control when switching to dimension', () => {
      component.vehicleSizingType = 'volume';
      component.onVehicleSizingTypeChange();

      component.vehicleSizingType = 'dimension';
      component.onVehicleSizingTypeChange();

      expect(component.formVehicleType.controls.dimension.disabled).toBeFalse();
      expect(component.formVehicleType.controls.maximumVolumeCapacity.disabled).toBeTrue();
    });

    it('should do nothing in view mode', () => {
      component.isViewMode = true;
      component.formVehicleType.controls.maximumVolumeCapacity.disable();
      component.vehicleSizingType = 'volume';

      component.onVehicleSizingTypeChange();

      expect(component.formVehicleType.controls.maximumVolumeCapacity.disabled).toBeTrue();
      expect(component.formVehicleType.controls.dimension.disabled).toBeFalse();
    });
  });

  describe('Access point selection', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should add an access point when checked', () => {
      component.onAccessPointChangeString({ checked: true } as MatCheckboxChange, 'FRONT');

      expect(component.isAccessPointCheckedString('FRONT')).toBeTrue();
    });

    it('should remove an access point when unchecked', () => {
      component.onAccessPointChangeString({ checked: true } as MatCheckboxChange, 'FRONT');
      component.onAccessPointChangeString({ checked: false } as MatCheckboxChange, 'FRONT');

      expect(component.isAccessPointCheckedString('FRONT')).toBeFalse();
    });
  });

  describe('Time value changes', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should update the time window early value and mark controls touched', () => {
      const event: TimeObject = { hour: 9, minute: 5 };
      component.onTimeValueChange('timeWindowEarly', event);

      expect(component.timeWindowEarlyObject).toEqual(event);
      expect(component.formVehicleType.controls.timeWindowEarly.value).toBe('09:05');
      expect(component.formVehicleType.controls.timeWindowEarly.touched).toBeTrue();
    });

    it('should update the maximum duration value', () => {
      const event: TimeObject = { hour: 2, minute: 30 };
      component.onMaximumDurationChange(event);

      expect(component.maximumDurationObject).toEqual(event);
      expect(component.formVehicleType.controls.maximumDuration.value).toBe('02:30');
      expect(component.formVehicleType.controls.maximumDuration.touched).toBeTrue();
    });
  });

  describe('Break management', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should add a break with default time objects', () => {
      component.addBreak();

      expect(component.allowedBreaks.length).toBe(1);
      expect(component.breakTimeObjects.length).toBe(1);
    });

    it('should remove a break by index', () => {
      component.addBreak();
      component.addBreak();

      component.removeBreak(0);

      expect(component.allowedBreaks.length).toBe(1);
      expect(component.breakTimeObjects.length).toBe(1);
    });

    it('should update a break time field', () => {
      component.addBreak();
      const event: TimeObject = { hour: 1, minute: 15 };

      component.onBreakTimeValueChange(0, 'duration', event);

      expect(component.breakTimeObjects[0].duration).toEqual(event);
      expect(component.allowedBreaks.at(0).get('duration')?.value).toBe('01:15');
    });

    it('should flag a time range error on a touched break control', () => {
      component.addBreak();
      const breakGroup = component.allowedBreaks.at(0);
      breakGroup.patchValue({
        name: 'Bad break',
        duration: '00:30',
        timeWindowEarly: '13:00',
        timeWindowLate: '12:00',
      });
      breakGroup.controls.timeWindowEarly.markAsTouched();

      expect(component.hasBreakTimeRangeError(breakGroup)).toBeTrue();
    });

    it('should report no time range error for a valid break', () => {
      component.addBreak();
      const breakGroup = component.allowedBreaks.at(0);
      breakGroup.patchValue({
        name: 'Good break',
        duration: '00:30',
        timeWindowEarly: '12:00',
        timeWindowLate: '13:00',
      });
      breakGroup.controls.timeWindowEarly.markAsTouched();

      expect(component.hasBreakTimeRangeError(breakGroup)).toBeFalse();
    });
  });

  describe('Form submission', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should mark the form as touched and not open a dialog when invalid', () => {
      component.onSubmit();

      expect(component.formVehicleType.touched).toBeTrue();
      expect(mockNgbModal.open).not.toHaveBeenCalled();
    });

    it('should open a confirmation dialog and create a vehicle type when valid and confirmed', fakeAsync(() => {
      mockNgbModal.open.and.returnValue({
        componentInstance: {},
        result: Promise.resolve(true),
      } as any);
      mockVehicleService.createVehicleType.and.returnValue(
        of(createMockVehicleType({ vehicleTypeId: 'new-id' }))
      );
      fillValidForm();

      component.onSubmit();
      tick(100);

      expect(mockNgbModal.open).toHaveBeenCalled();
      expect(mockSpinner.show).toHaveBeenCalled();
      expect(mockVehicleService.createVehicleType).toHaveBeenCalled();
      expect(mockActiveModal.close).toHaveBeenCalledWith({
        refresh: true,
        vehicleType: jasmine.objectContaining({ vehicleTypeId: 'new-id' }),
      });
      expect(mockSpinner.hide).toHaveBeenCalled();
    }));

    it('should update the vehicle type when in edit mode', fakeAsync(() => {
      component.mode = 'edit';
      component.vehicleType = createMockVehicleType({ vehicleTypeId: 'vt-existing' });
      component.isEdit = true;
      mockNgbModal.open.and.returnValue({
        componentInstance: {},
        result: Promise.resolve(true),
      } as any);
      mockVehicleService.updateVehicleType.and.returnValue(of(createMockVehicleType()));
      fillValidForm();

      component.onSubmit();
      tick(100);

      expect(mockVehicleService.updateVehicleType).toHaveBeenCalledWith(
        'vt-existing',
        jasmine.any(Object)
      );
      expect(mockActiveModal.close).toHaveBeenCalled();
    }));

    it('should not submit when the confirmation dialog is dismissed', fakeAsync(() => {
      mockNgbModal.open.and.returnValue({
        componentInstance: {},
        result: Promise.reject(false),
      } as any);
      fillValidForm();

      component.onSubmit();
      tick(100);

      expect(mockVehicleService.createVehicleType).not.toHaveBeenCalled();
    }));
  });

  describe('Modal actions', () => {
    it('should dismiss the modal on cancel', () => {
      fixture.detectChanges();
      component.onCancel();

      expect(mockActiveModal.dismiss).toHaveBeenCalled();
    });
  });

  describe('Helpers', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should track breaks by index', () => {
      expect(component.trackByIndex(3)).toBe(3);
    });

    it('should return the allowed breaks controls', () => {
      component.addBreak();

      expect(component.getBreakControls()).toBe(component.allowedBreaks.controls);
    });
  });
});
