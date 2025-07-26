import { Component, Inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { VehicleService } from 'src/app/services/vehicle.service';
import {
  VehicleType,
  Depot,
  MyVehicles,
  UpdateVehicleInput,
} from 'src/app/models/vehicle.model';
import { forkJoin } from 'rxjs';
import { NgxSpinnerService } from 'ngx-spinner';
import { finalize } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import { TranslocoService } from '@jsverse/transloco';
import { licensePlateDuplicateValidator } from 'src/app/shared/validators/license-plate.validator';
import { VehicleFormControls } from 'src/app/models/form-control.model';

@Component({
  selector: 'app-vehicle-dialog',
  templateUrl: './vehicle-dialog.component.html',
  styleUrls: ['./vehicle-dialog.component.scss'],
})
export class VehicleDialogComponent implements OnInit {
  form!: FormGroup<VehicleFormControls>;
  licensePlates: string[] = [];
  isLoading: boolean = true;
  isSaving: boolean = false;
  isEditMode: boolean = false;
  isViewMode: boolean = false;

  vehicleTypeOptions: VehicleType[] = [];
  startDepotOptions: Depot[] = [];
  endDepotOptions: Depot[] = [];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<VehicleDialogComponent>,
    private vehicleService: VehicleService,
    private spinner: NgxSpinnerService,
    private toastr: ToastrService,
    private transloco: TranslocoService,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      mode: 'create' | 'edit' | 'view';
      vehicle: MyVehicles | null;
    }
  ) {}

  ngOnInit(): void {
    this.isEditMode = this.data.mode === 'edit';
    this.isViewMode = this.data.mode === 'view';
    this.initializeForm();
    this.loadData();
  }

  initializeForm(): void {
    this.form = this.fb.group({
      vehicleType: ['', [Validators.required]],
      startDepot: ['', [Validators.required]],
      endDepot: ['', [Validators.required]],
      licensePlate: [''],
    });

    if (this.isEditMode || this.isViewMode) {
      this.form.controls.licensePlate.setValidators([Validators.required]);
    }

    // Initialize license plate duplicate validator
    this.updateLicensePlateValidators();

    if (this.isViewMode) {
      this.form.disable({ emitEvent: false });
    }
  }

  updateLicensePlateValidators(): void {
    const validators = [];

    // Add required validator if in edit or view mode
    if (this.isEditMode || this.isViewMode) {
      validators.push(Validators.required);
    }

    // Add duplicate validator
    validators.push(licensePlateDuplicateValidator(this.licensePlates));

    this.form.controls.licensePlate.setValidators(validators);
    this.form.controls.licensePlate.updateValueAndValidity();
  }

  loadData(): void {
    this.isLoading = true;

    // First, load vehicle types and depots
    const baseObservables = {
      vehicleTypes: this.vehicleService.getMyVehicleTypes(),
      depots: this.vehicleService.getMyDepots(),
    };

    forkJoin(baseObservables)
      .pipe(
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe({
        next: (data: { vehicleTypes: VehicleType[]; depots: Depot[] }) => {
          this.vehicleTypeOptions = data.vehicleTypes;
          this.startDepotOptions = data.depots;
          this.endDepotOptions = data.depots;

          // If in edit or view mode, fetch fresh vehicle data and patch form
          if (
            (this.isEditMode || this.isViewMode) &&
            this.data.vehicle?.vehicleIds
          ) {
            this.fetchAndPatchVehicleData();
          }
        },
        error: (error: unknown) => {
          console.error('Error loading vehicle types and depots:', error);
          this.vehicleTypeOptions = [];
          this.startDepotOptions = [];
          this.endDepotOptions = [];
        },
      });
  }

  fetchAndPatchVehicleData(): void {
    if (!this.data.vehicle?.vehicleIds) {
      return;
    }

    this.vehicleService.getMyVehicle(this.data.vehicle.vehicleIds).subscribe({
      next: (vehicleData: MyVehicles) => {
        // Always use fresh data from API to patch the form
        this.form.patchValue({
          vehicleType: vehicleData.vehicleTypeId,
          startDepot: vehicleData.startDepotId,
          endDepot: vehicleData.endDepotId,
          licensePlate: vehicleData.licensePlate,
        });

        console.log('Fresh vehicle data from API:', vehicleData);
      },
      error: (error: unknown) => {
        console.error('Error fetching vehicle data:', error);
      },
    });
  }

  addLicensePlate(): void {
    const licensePlateValue = this.form.controls.licensePlate.value?.trim();

    if (licensePlateValue && this.form.controls.licensePlate.valid) {
      if (!this.licensePlates.includes(licensePlateValue)) {
        this.licensePlates.push(licensePlateValue);
        this.form.controls.licensePlate.reset();
        this.updateLicensePlateValidators();
      }
    }
  }

  removeLicensePlate(index: number): void {
    this.licensePlates.splice(index, 1);
    this.updateLicensePlateValidators();
  }

  save(): void {
    if (!this.isEditMode && this.licensePlates.length === 0) {
      this.form.controls.licensePlate.setErrors({ licensePlatesEmpty: true });
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    const formValues = this.form.value;

    const startDepotId =
      typeof formValues.startDepot === 'object' &&
      formValues.startDepot !== null
        ? (formValues.startDepot as Depot).depotId
        : formValues.startDepot;

    const endDepotId =
      typeof formValues.endDepot === 'object' && formValues.endDepot !== null
        ? (formValues.endDepot as Depot).depotId
        : formValues.endDepot;

    if (this.isEditMode) {
      const payload: UpdateVehicleInput = {
        vehicleTypeId: formValues.vehicleType!,
        startDepotId: startDepotId!,
        endDepotId: endDepotId!,
        licensePlate: formValues.licensePlate!,
      };

      this.spinner.show();
      this.vehicleService
        .updateVehicle(this.data.vehicle!.vehicleIds, payload)
        .pipe(finalize(() => this.spinner.hide()))
        .subscribe({
          next: (updatedVehicle: MyVehicles) => {
            this.isSaving = false;
            this.toastr.success(
              this.transloco.translate(
                'vehicleManagement.vehicle_updated_successfully'
              ),
              this.transloco.translate('success')
            );
            this.dialogRef.close({
              success: true,
              operation: 'update',
              vehicle: updatedVehicle,
            });
          },
          error: (error: unknown) => {
            console.error('Error updating vehicle:', error);
            this.isSaving = false;
            this.toastr.error(
              this.transloco.translate(
                'vehicleManagement.failed_to_update_vehicle'
              ),
              this.transloco.translate('error')
            );
          },
        });
    } else {
      // Define a local type for create payload
      type CreateVehicleInput = {
        vehicleTypeId: string;
        startDepotId: string;
        endDepotId: string;
        licensePlates: string[];
      };
      const payload: CreateVehicleInput = {
        vehicleTypeId: formValues.vehicleType!,
        startDepotId: startDepotId!,
        endDepotId: endDepotId!,
        licensePlates: this.licensePlates || [],
      };

      this.spinner.show();
      this.vehicleService
        .createVehicle(payload)
        .pipe(finalize(() => this.spinner.hide()))
        .subscribe({
          next: (newVehicle: MyVehicles) => {
            this.isSaving = false;
            this.toastr.success(
              this.transloco.translate(
                'vehicleManagement.vehicle_created_successfully'
              ),
              this.transloco.translate('success')
            );
            this.dialogRef.close({
              success: true,
              operation: 'create',
              vehicle: newVehicle,
            });
          },
          error: (error: unknown) => {
            console.error('Error creating vehicle:', error);
            this.isSaving = false;
            this.toastr.error(
              this.transloco.translate(
                'vehicleManagement.failed_to_create_vehicle'
              ),
              this.transloco.translate('error')
            );
          },
        });
    }
  }

  delete(): void {
    if (this.data.vehicle && this.data.vehicle.vehicleIds) {
      this.isSaving = true;

      this.spinner.show();
      this.vehicleService
        .deleteVehicle(this.data.vehicle.vehicleIds)
        .pipe(finalize(() => this.spinner.hide()))
        .subscribe({
          next: (result: boolean) => {
            this.isSaving = false;
            if (result) {
              this.toastr.success(
                this.transloco.translate(
                  'vehicleManagement.vehicle_deleted_successfully'
                ),
                this.transloco.translate('success')
              );
              this.dialogRef.close({
                success: true,
                operation: 'delete',
                vehicleIds: this.data.vehicle!.vehicleIds,
              });
            }
          },
          error: (error: unknown) => {
            console.error('Error deleting vehicle:', error);
            this.isSaving = false;
            this.toastr.error(
              this.transloco.translate(
                'vehicleManagement.failed_to_delete_vehicle'
              ),
              this.transloco.translate('error')
            );
          },
        });
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
