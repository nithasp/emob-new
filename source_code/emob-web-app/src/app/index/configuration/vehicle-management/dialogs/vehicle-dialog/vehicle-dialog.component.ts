import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { VehicleService } from 'src/app/services/vehicle.service';
import { ExperimentService } from 'src/app/services/experiment.service';
import {
  VehicleType,
  MyVehicles,
  VehicleUpdateInput,
  VehicleInput,
  VehicleCreationResult,
} from 'src/app/models/vehicle.model';
import { MyDepot } from 'src/app/models/experiment.model';
import { ActionMode } from 'src/app/models/common.model';
import { forkJoin, of } from 'rxjs';
import { NgxSpinnerService } from 'ngx-spinner';
import { finalize, catchError } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import { TranslocoService } from '@jsverse/transloco';
import { licensePlateDuplicateValidator } from 'src/app/shared/validators/license-plate.validator';
import { VehicleFormControls } from 'src/app/models/forms/vehicle-form-control.model';
import { ConfirmationDialogComponent } from 'src/app/index/components/confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-vehicle-dialog',
  templateUrl: './vehicle-dialog.component.html',
  styleUrls: ['./vehicle-dialog.component.scss'],
})
export class VehicleDialogComponent implements OnInit {
  @Input() mode: ActionMode = 'create';
  @Input() vehicle: MyVehicles | null = null;

  form!: FormGroup<VehicleFormControls>;
  licensePlates: string[] = [];
  isLoading: boolean = true;

  vehicleTypeOptions: VehicleType[] = [];
  depotOptions: MyDepot[] = [];

  isEditMode: boolean = false;
  isViewMode: boolean = false;

  constructor(
    private fb: FormBuilder,
    public activeModal: NgbActiveModal,
    private experimentService: ExperimentService,
    private vehicleService: VehicleService,
    private spinner: NgxSpinnerService,
    private toastr: ToastrService,
    private transloco: TranslocoService,
    private ngbModal: NgbModal
  ) {}

  ngOnInit(): void {
    this.initializeMode();
    this.initializeForm();
    this.loadData();
  }

  initializeMode(): void {
    this.isEditMode = this.mode === 'edit';
    this.isViewMode = this.mode === 'view';
  }

  initializeForm(): void {
    const licensePlateValidators =
      this.isEditMode || this.isViewMode ? [Validators.required] : [];

    this.form = this.fb.group<VehicleFormControls>({
      vehicleType: this.fb.control<string | null>('', [Validators.required]),
      startDepot: this.fb.control<string | null>('', [Validators.required]),
      endDepot: this.fb.control<string | null>('', [Validators.required]),
      licensePlate: this.fb.control<string | null>('', licensePlateValidators),
    });

    this.updateLicensePlateValidators();

    if (this.isViewMode) {
      this.form.disable({ emitEvent: false });
    }
  }

  updateLicensePlateValidators(): void {
    const validators = [
      ...(this.isEditMode || this.isViewMode ? [Validators.required] : []),
      licensePlateDuplicateValidator(this.licensePlates),
    ];

    const control = this.form.controls.licensePlate;
    control.setValidators(validators);
    control.updateValueAndValidity();

    if (!control.value?.trim()) {
      control.setErrors(null);
    }
  }

  loadData(): void {
    forkJoin({
      vehicleTypes: this.vehicleService.getMyVehicleTypes().pipe(
        catchError((error) => {
          console.error('Error loading vehicle types:', error);
          this.toastr.error(
            this.transloco.translate(
              'failed_to_load_vehicle_types',
              {},
              'vehicleManagement'
            ),
            this.transloco.translate('error')
          );
          return of([] as VehicleType[]);
        })
      ),
      depots: this.experimentService.getMyDepots().pipe(
        catchError((error) => {
          console.error('Error loading depots:', error);
          this.toastr.error(
            this.transloco.translate(
              'failed_to_load_depots',
              {},
              'vehicleManagement'
            ),
            this.transloco.translate('error')
          );
          return of([] as MyDepot[]);
        })
      ),
    })
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: ({ vehicleTypes, depots }) => {
          this.vehicleTypeOptions = vehicleTypes;
          this.depotOptions = depots;

          if ((this.isEditMode || this.isViewMode) && this.vehicle?.vehicleId) {
            this.fetchAndPatchVehicleData();
          }
        },
        error: (error) => {
          console.error(error);
        },
      });
  }

  fetchAndPatchVehicleData(): void {
    this.vehicleService.getMyVehicle(this.vehicle!.vehicleId).subscribe({
      next: (vehicleData) => {
        this.form.patchValue({
          vehicleType: vehicleData.vehicleType?.vehicleTypeId,
          startDepot: vehicleData.startDepotId?.depotId,
          endDepot: vehicleData.endDepotId?.depotId,
          licensePlate: vehicleData.licensePlate,
        });
      },
      error: (error) => console.error('Error fetching vehicle data:', error),
    });
  }

  addLicensePlate(): void {
    const value = this.form.controls.licensePlate.value?.trim();

    if (value && !this.licensePlates.includes(value)) {
      this.licensePlates.push(value);
      this.form.controls.licensePlate.reset();
      this.updateLicensePlateValidators();
    }
  }

  removeLicensePlate(index: number): void {
    this.licensePlates.splice(index, 1);
    this.updateLicensePlateValidators();
  }

  openDialogConfirm(action: 'create' | 'update'): void {
    const dialogRef = this.ngbModal.open(ConfirmationDialogComponent, {
      centered: true,
      animation: true,
    });

    const config = {
      create: {
        title: 'vehicleManagement.confirm_create',
        message: 'vehicleManagement.are_you_sure_create_vehicle',
      },
      update: {
        title: 'vehicleManagement.confirm_update',
        message: 'vehicleManagement.are_you_sure_update_vehicle',
      },
    };

    dialogRef.componentInstance.title = this.transloco.translate(
      config[action].title
    );
    dialogRef.componentInstance.message = this.transloco.translate(
      config[action].message
    );

    dialogRef.result
      .then((confirmed: boolean) => {
        if (confirmed) {
          if (action === 'create') {
            this.handleCreateVehicle();
          } else if (action === 'update') {
            this.handleUpdateVehicle();
          }
        }
      })
      .catch(() => {});
  }

  extractDepotId(value: string | MyDepot | null | undefined): string {
    if (!value) return '';
    return typeof value === 'object' ? value.depotId : value;
  }

  handleCreateVehicle(): void {
    const formValues = this.form.value;
    const payload: VehicleInput = {
      vehicleTypeId: formValues.vehicleType!,
      startDepotId: this.extractDepotId(formValues.startDepot)!,
      endDepotId: this.extractDepotId(formValues.endDepot)!,
      licensePlates: this.licensePlates,
    };

    this.spinner.show();

    this.vehicleService
      .createVehicle(payload)
      .pipe(finalize(() => this.spinner.hide()))
      .subscribe({
        next: (result: VehicleCreationResult) => {
          this.toastr.success(
            this.transloco.translate(
              'vehicle_created_successfully',
              {},
              'vehicleManagement'
            ),
            this.transloco.translate('success')
          );
          this.activeModal.close({
            success: true,
            operation: 'create',
            result: result,
          });
        },
        error: (error) => {
          console.error('Error creating vehicle:', error);
          this.toastr.error(
            this.transloco.translate(
              'failed_to_create_vehicle',
              {},
              'vehicleManagement'
            ),
            this.transloco.translate('error')
          );
        },
      });
  }

  handleUpdateVehicle(): void {
    const formValues = this.form.value;
    const payload: VehicleUpdateInput = {
      vehicleTypeId: formValues.vehicleType!,
      startDepotId: this.extractDepotId(formValues.startDepot)!,
      endDepotId: this.extractDepotId(formValues.endDepot)!,
      licensePlate: formValues.licensePlate!,
    };

    this.spinner.show();

    this.vehicleService
      .updateVehicle(this.vehicle!.vehicleId, payload)
      .pipe(finalize(() => this.spinner.hide()))
      .subscribe({
        next: (result: MyVehicles) => {
          this.toastr.success(
            this.transloco.translate(
              'vehicle_updated_successfully',
              {},
              'vehicleManagement'
            ),
            this.transloco.translate('success')
          );
          this.activeModal.close({
            success: true,
            operation: 'update',
            result: result,
          });
        },
        error: (error) => {
          console.error('Error updating vehicle:', error);
          this.toastr.error(
            this.transloco.translate(
              'failed_to_update_vehicle',
              {},
              'vehicleManagement'
            ),
            this.transloco.translate('error')
          );
        },
      });
  }

  handleDeleteVehicle(): void {
    if (!this.vehicle?.vehicleId) return;

    this.spinner.show();

    this.vehicleService
      .deleteVehicle(this.vehicle.vehicleId)
      .pipe(finalize(() => this.spinner.hide()))
      .subscribe({
        next: (result: boolean) => {
          this.toastr.success(
            this.transloco.translate(
              'vehicle_deleted_successfully',
              {},
              'vehicleManagement'
            ),
            this.transloco.translate('success')
          );
          this.activeModal.close({
            success: true,
            operation: 'delete',
            result: result,
          });
        },
        error: (error) => {
          console.error('Error deleting vehicle:', error);
          this.toastr.error(
            this.transloco.translate(
              'failed_to_delete_vehicle',
              {},
              'vehicleManagement'
            ),
            this.transloco.translate('error')
          );
        },
      });
  }

  onLicensePlateEnter(event: Event): void {
    event.preventDefault();
    const value = this.form.controls.licensePlate.value?.trim();

    if (!value) {
      return;
    }

    if (this.licensePlates.includes(value)) {
      const control = this.form.controls.licensePlate;
      control.setErrors({ licensePlateDuplicate: true });
      control.markAsTouched();
      return;
    }

    this.addLicensePlate();
  }

  onSubmit(): void {
    if (!this.isEditMode) {
      const controlLicensePlate = this.form.controls.licensePlate;
      if (this.licensePlates.length === 0) {
        controlLicensePlate.setErrors({ licensePlatesEmpty: true });
        controlLicensePlate.markAsTouched();
      } else {
        controlLicensePlate.updateValueAndValidity();
      }
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.openDialogConfirm(this.isEditMode ? 'update' : 'create');
  }

  onCancel(): void {
    this.activeModal.dismiss();
  }
}
