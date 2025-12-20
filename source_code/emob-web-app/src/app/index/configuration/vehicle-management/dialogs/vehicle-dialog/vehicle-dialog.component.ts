import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { VehicleService } from 'src/app/services/vehicle.service';
import { ExperimentService } from 'src/app/services/experiment.service';
import {
  VehicleType,
  Depot,
  MyVehicles,
  VehicleUpdateInput,
  VehicleCreationResult,
  VehicleInput,
} from 'src/app/models/vehicle.model';
import { MyDepot } from 'src/app/models/experiment.model';
import { forkJoin } from 'rxjs';
import { NgxSpinnerService } from 'ngx-spinner';
import { finalize } from 'rxjs/operators';
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
  @Input() mode: 'create' | 'edit' | 'view' = 'create';
  @Input() vehicle: MyVehicles | null = null;

  form!: FormGroup<VehicleFormControls>;
  licensePlates: string[] = [];
  isLoading: boolean = true;
  isSaving: boolean = false;
  isEditMode: boolean = false;
  isViewMode: boolean = false;

  vehicleTypeOptions: VehicleType[] = [];
  startDepotOptions: MyDepot[] = [];
  endDepotOptions: MyDepot[] = [];

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
    this.isEditMode = this.mode === 'edit';
    this.isViewMode = this.mode === 'view';
    this.initializeForm();
    this.loadData();
  }

  initializeForm(): void {
    this.form = this.fb.group<VehicleFormControls>({
      vehicleType: this.fb.control<string | null>('', [Validators.required]),
      startDepot: this.fb.control<string | null>('', [Validators.required]),
      endDepot: this.fb.control<string | null>('', [Validators.required]),
      licensePlate: this.fb.control<string | null>(''),
    });

    if (this.isEditMode || this.isViewMode) {
      this.form.controls.licensePlate.setValidators([Validators.required]);
    }

    this.updateLicensePlateValidators();

    if (this.isViewMode) {
      this.form.disable({ emitEvent: false });
    }
  }

  updateLicensePlateValidators(): void {
    const validators = [];

    if (this.isEditMode || this.isViewMode) {
      validators.push(Validators.required);
    }

    validators.push(licensePlateDuplicateValidator(this.licensePlates));

    this.form.controls.licensePlate.setValidators(validators);
    this.form.controls.licensePlate.updateValueAndValidity();

    if (
      this.form.controls.licensePlate.value === null ||
      this.form.controls.licensePlate.value === ''
    ) {
      this.form.controls.licensePlate.setErrors(null);
    }
  }

  loadData(): void {
    this.isLoading = true;

    const baseObservables = {
      vehicleTypes: this.vehicleService.getMyVehicleTypes(),
      depots: this.experimentService.getMyDepots(),
    };

    forkJoin(baseObservables)
      .pipe(
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe({
        next: (data: { vehicleTypes: VehicleType[]; depots: MyDepot[] }) => {
          this.vehicleTypeOptions = data.vehicleTypes;
          this.startDepotOptions = data.depots;
          this.endDepotOptions = data.depots;
          if ((this.isEditMode || this.isViewMode) && this.vehicle?.vehicleId) {
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
    if (!this.vehicle?.vehicleId) {
      return;
    }

    this.vehicleService.getMyVehicle(this.vehicle.vehicleId).subscribe({
      next: (vehicleData: MyVehicles) => {
        this.form.patchValue({
          vehicleType: vehicleData.vehicleType?.vehicleTypeId,
          startDepot: vehicleData.startDepotId?.depotId,
          endDepot: vehicleData.endDepotId?.depotId,
          licensePlate: vehicleData.licensePlate,
        });
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
    } else if (licensePlateValue && !this.form.controls.licensePlate.valid) {
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
      this.form.markAllAsTouched();
      return;
    }

    if (!this.isEditMode && this.licensePlates.length > 0) {
      this.form.controls.licensePlate.setErrors(null);
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const action = this.isEditMode ? 'update' : 'create';
    this.openDialogConfirm(action);
  }

  delete(): void {
    this.openDialogConfirm('delete');
  }

  openDialogConfirm(action: 'create' | 'update' | 'delete'): void {
    const dialogRef = this.ngbModal.open(ConfirmationDialogComponent, {
      centered: true,
      animation: true,
    });
    if (action === 'create') {
      dialogRef.componentInstance.title = this.transloco.translate(
        'vehicleManagement.confirm_create'
      );
      dialogRef.componentInstance.message = this.transloco.translate(
        'vehicleManagement.are_you_sure_create_vehicle'
      );
    } else if (action === 'update') {
      dialogRef.componentInstance.title = this.transloco.translate(
        'vehicleManagement.confirm_update'
      );
      dialogRef.componentInstance.message = this.transloco.translate(
        'vehicleManagement.are_you_sure_update_vehicle'
      );
    } else if (action === 'delete') {
      dialogRef.componentInstance.title = this.transloco.translate(
        'vehicleManagement.confirm_delete'
      );
      dialogRef.componentInstance.message = this.transloco.translate(
        'vehicleManagement.are_you_sure_delete_vehicle'
      );
    }
    dialogRef.result
      .then((confirmed: boolean) => {
        if (confirmed) {
          if (action === 'create') {
            this.handleCreateVehicle();
          } else if (action === 'update') {
            this.handleUpdateVehicle();
          } else if (action === 'delete') {
            this.handleDeleteVehicle();
          }
        }
      })
      .catch(() => {});
  }

  handleCreateVehicle(): void {
    this.isSaving = true;
    const formValues = this.form.value;
    const startDepotId =
      typeof formValues.startDepot === 'object' &&
      formValues.startDepot !== null
        ? (formValues.startDepot as MyDepot).depotId
        : formValues.startDepot;
    const endDepotId =
      typeof formValues.endDepot === 'object' && formValues.endDepot !== null
        ? (formValues.endDepot as MyDepot).depotId
        : formValues.endDepot;
    const payload: VehicleInput = {
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
        next: (result: VehicleCreationResult) => {
          this.isSaving = false;
          const newVehicle = result.vehicles[0];
          if (newVehicle) {
            this.toastr.success(
              this.transloco.translate(
                'vehicleManagement.vehicle_created_successfully'
              ),
              this.transloco.translate('success')
            );
            this.activeModal.close({
              success: true,
              operation: 'create',
              vehicle: newVehicle,
            });
          } else {
            this.toastr.error(
              this.transloco.translate(
                'vehicleManagement.failed_to_create_vehicle'
              ),
              this.transloco.translate('error')
            );
          }
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

  handleUpdateVehicle(): void {
    this.isSaving = true;
    const formValues = this.form.value;
    const startDepotId =
      typeof formValues.startDepot === 'object' &&
      formValues.startDepot !== null
        ? (formValues.startDepot as MyDepot).depotId
        : formValues.startDepot;
    const endDepotId =
      typeof formValues.endDepot === 'object' && formValues.endDepot !== null
        ? (formValues.endDepot as MyDepot).depotId
        : formValues.endDepot;
    const payload: VehicleUpdateInput = {
      vehicleTypeId: formValues.vehicleType!,
      startDepotId: startDepotId!,
      endDepotId: endDepotId!,
      licensePlate: formValues.licensePlate!,
    };
    this.spinner.show();
    this.vehicleService
      .updateVehicle(this.vehicle!.vehicleId, payload)
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
          this.activeModal.close({
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
  }

  handleDeleteVehicle(): void {
    if (this.vehicle && this.vehicle.vehicleId) {
      this.isSaving = true;
      this.spinner.show();
      this.vehicleService
        .deleteVehicle(this.vehicle.vehicleId)
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
              this.activeModal.close({
                success: true,
                operation: 'delete',
                vehicleId: this.vehicle!.vehicleId,
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
    this.activeModal.dismiss();
  }
}
