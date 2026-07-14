import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { VehicleDialogComponent } from './vehicle-dialog.component';
import { ReactiveFormsModule } from '@angular/forms';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { VehicleService } from 'src/app/services/vehicle.service';
import { ExperimentService } from 'src/app/services/experiment.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { TranslocoService } from '@jsverse/transloco';
import { of, throwError } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('VehicleDialogComponent', () => {
  let component: VehicleDialogComponent;
  let fixture: ComponentFixture<VehicleDialogComponent>;

  // Mock Services
  let mockActiveModal: jasmine.SpyObj<NgbActiveModal>;
  let mockNgbModal: jasmine.SpyObj<NgbModal>;
  let mockVehicleService: jasmine.SpyObj<VehicleService>;
  let mockExperimentService: jasmine.SpyObj<ExperimentService>;
  let mockSpinner: jasmine.SpyObj<NgxSpinnerService>;
  let mockToastr: jasmine.SpyObj<ToastrService>;
  let mockTransloco: jasmine.SpyObj<TranslocoService>;

  beforeEach(async () => {
    mockActiveModal = jasmine.createSpyObj('NgbActiveModal', ['close', 'dismiss']);
    mockNgbModal = jasmine.createSpyObj('NgbModal', ['open']);
    mockVehicleService = jasmine.createSpyObj('VehicleService', [
      'getMyVehicleTypes',
      'getMyVehicle',
      'createVehicle',
      'updateVehicle'
    ]);
    mockExperimentService = jasmine.createSpyObj('ExperimentService', ['getMyDepots']);
    mockSpinner = jasmine.createSpyObj('NgxSpinnerService', ['show', 'hide']);
    mockToastr = jasmine.createSpyObj('ToastrService', ['success', 'error']);
    mockTransloco = jasmine.createSpyObj('TranslocoService', ['translate']);

    // Default mock returns
    mockVehicleService.getMyVehicleTypes.and.returnValue(of([{ vehicleTypeId: 'type1', name: 'Truck' } as any]));
    mockExperimentService.getMyDepots.and.returnValue(of([{ depotId: 'depot1', depotName: 'Main Depot' } as any]));
    mockTransloco.translate.and.callFake((key: any) => key);

    await TestBed.configureTestingModule({
      declarations: [VehicleDialogComponent],
      imports: [ReactiveFormsModule],
      providers: [
        { provide: NgbActiveModal, useValue: mockActiveModal },
        { provide: NgbModal, useValue: mockNgbModal },
        { provide: VehicleService, useValue: mockVehicleService },
        { provide: ExperimentService, useValue: mockExperimentService },
        { provide: NgxSpinnerService, useValue: mockSpinner },
        { provide: ToastrService, useValue: mockToastr },
        { provide: TranslocoService, useValue: mockTransloco },
      ],
      schemas: [NO_ERRORS_SCHEMA] // Ignores custom elements like <app-input-select> in HTML
    }).compileComponents();

    fixture = TestBed.createComponent(VehicleDialogComponent);
    component = fixture.componentInstance;
  });

  describe('Initialization & Modes', () => {
    it('should create the component', () => {
      fixture.detectChanges();
      expect(component).toBeTruthy();
    });

    it('should initialize form normally in create mode', () => {
      component.mode = 'create';
      fixture.detectChanges();

      expect(component.isEditMode).toBeFalse();
      expect(component.isViewMode).toBeFalse();
      expect(component.form.enabled).toBeTrue();
      expect(component.form.get('vehicleType')?.hasValidator).toBeTruthy();
    });

    it('should disable form in view mode', () => {
      component.mode = 'view';
      fixture.detectChanges();

      expect(component.isViewMode).toBeTrue();
      expect(component.form.disabled).toBeTrue();
    });

    it('should load vehicle types and depots on init', () => {
      fixture.detectChanges();

      expect(mockVehicleService.getMyVehicleTypes).toHaveBeenCalled();
      expect(mockExperimentService.getMyDepots).toHaveBeenCalled();
      expect(component.vehicleTypeOptions.length).toBe(1);
      expect(component.depotOptions.length).toBe(1);
      expect(component.isLoading).toBeFalse();
    });
  });

  describe('Edit/View Mode Data Fetching', () => {
    it('should fetch and patch vehicle data if in edit mode and vehicleId exists', () => {
      const mockVehicleData = {
        vehicleType: { vehicleTypeId: 'type2' },
        startDepotId: { depotId: 'depotA' },
        endDepotId: { depotId: 'depotB' },
        licensePlate: 'XYZ-987'
      };
      
      mockVehicleService.getMyVehicle.and.returnValue(of(mockVehicleData as any));
      
      component.mode = 'edit';
      component.vehicle = { vehicleId: 'veh-1' } as any;
      fixture.detectChanges(); // Triggers ngOnInit

      expect(mockVehicleService.getMyVehicle).toHaveBeenCalledWith('veh-1');
      expect(component.form.get('vehicleType')?.value).toBe('type2');
      expect(component.form.get('licensePlate')?.value).toBe('XYZ-987');
    });
  });

  describe('License Plate Logic (Create Mode)', () => {
    beforeEach(() => {
      component.mode = 'create';
      fixture.detectChanges();
    });

    it('should add a license plate if valid and not duplicate', () => {
      component.form.patchValue({ licensePlate: 'ABC-123' });
      component.addLicensePlate();

      expect(component.licensePlates.length).toBe(1);
      expect(component.licensePlates[0]).toBe('ABC-123');
      expect(component.form.get('licensePlate')?.value).toBeNull();
    });

    it('should not add a license plate if empty or duplicate', () => {
      component.licensePlates = ['ABC-123'];
      component.form.patchValue({ licensePlate: 'ABC-123' });
      
      component.addLicensePlate();
      
      expect(component.licensePlates.length).toBe(1); // Still 1
    });

    it('should remove a license plate by index', () => {
      component.licensePlates = ['PLATE1', 'PLATE2'];
      component.removeLicensePlate(0);

      expect(component.licensePlates.length).toBe(1);
      expect(component.licensePlates[0]).toBe('PLATE2');
    });
  });

  describe('Form Submission', () => {
    beforeEach(() => {
      // Mock the confirmation dialog to resolve to 'true'
      mockNgbModal.open.and.returnValue({
        componentInstance: {},
        result: Promise.resolve(true)
      } as any);
    });

    it('should show error if form is invalid on submit', () => {
      component.mode = 'create';
      fixture.detectChanges();
      
      component.onSubmit();
      
      expect(component.form.touched).toBeTrue();
      expect(mockNgbModal.open).not.toHaveBeenCalled();
    });

    it('should open confirmation dialog and call createVehicle on success', fakeAsync(() => {
      component.mode = 'create';
      fixture.detectChanges();
      
      // Setup valid form
      component.form.patchValue({
        vehicleType: 'type1',
        startDepot: 'depot1',
        endDepot: 'depot2'
      });
      component.licensePlates = ['ABC-123'];
      
      mockVehicleService.createVehicle.and.returnValue(of({ id: 'new-id' } as any));
      
      component.onSubmit();
      tick(); // Flush promise for modal result

      expect(mockNgbModal.open).toHaveBeenCalled();
      expect(mockSpinner.show).toHaveBeenCalled();
      expect(mockVehicleService.createVehicle).toHaveBeenCalledWith({
        vehicleTypeId: 'type1',
        startDepotId: 'depot1',
        endDepotId: 'depot2',
        licensePlates: ['ABC-123']
      });
      expect(mockToastr.success).toHaveBeenCalled();
      expect(mockActiveModal.close).toHaveBeenCalledWith({ success: true, res: { id: 'new-id' } });
      expect(mockSpinner.hide).toHaveBeenCalled();
    }));

    it('should open confirmation dialog and call updateVehicle in edit mode', fakeAsync(() => {
      component.mode = 'edit';
      component.vehicle = { vehicleId: 'edit-id' } as any;
      
      mockVehicleService.getMyVehicle.and.returnValue(of({
        vehicleType: { vehicleTypeId: 'type1' },
        startDepotId: { depotId: 'depot1' },
        endDepotId: { depotId: 'depot2' },
        licensePlate: 'OLD-PLATE'
      } as any));

      fixture.detectChanges();
      
      // Setup valid form
      component.form.patchValue({
        vehicleType: 'type1',
        startDepot: 'depot1',
        endDepot: 'depot2',
        licensePlate: 'UPDATED-PLATE'
      });
      
      mockVehicleService.updateVehicle.and.returnValue(of({} as any));
      
      component.onSubmit();
      tick(); // Flush promise

      expect(mockNgbModal.open).toHaveBeenCalled();
      expect(mockVehicleService.updateVehicle).toHaveBeenCalledWith('edit-id', {
        vehicleTypeId: 'type1',
        startDepotId: 'depot1',
        endDepotId: 'depot2',
        licensePlate: 'UPDATED-PLATE'
      });
      expect(mockToastr.success).toHaveBeenCalled();
      expect(mockActiveModal.close).toHaveBeenCalled();
    }));
    
  });

  describe('Modal Actions', () => {
    it('should close the modal when onCancel is called', () => {
      component.onCancel();
      expect(mockActiveModal.dismiss).toHaveBeenCalled();
    });
  });
});