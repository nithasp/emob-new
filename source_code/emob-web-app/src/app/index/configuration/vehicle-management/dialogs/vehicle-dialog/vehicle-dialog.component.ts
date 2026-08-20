import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { VehicleService } from 'src/app/services/vehicle.service';
import { ExperimentService } from 'src/app/services/experiment.service';
import {
  VehicleType,
  MyVehicles,
  VehicleUpdateInput,
  VehicleCreateInput,
  VehicleCreateResponse,
  VehicleUpdateResponse,
} from 'src/app/models/vehicle.model';
import { MyDepot } from 'src/app/models/experiment.model';
import { ActionMode } from 'src/app/models/common.model';
import { forkJoin, of, Observable } from 'rxjs';
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

  private initializeMode(): void {
    this.isEditMode = this.mode === 'edit';
    this.isViewMode = this.mode === 'view';
  }

  private initializeForm(): void {
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

  private updateLicensePlateValidators(): void {
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

  private loadData(): void {
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

  private fetchAndPatchVehicleData(): void {
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

  private extractDepotId(value: string | MyDepot | null | undefined): string {
    if (!value) return '';
    return typeof value === 'object' ? value.depotId : value;
  }

  private buildPayload(): VehicleCreateInput | VehicleUpdateInput {
    const formValues = this.form.value;
    const basePayload = {
      vehicleTypeId: formValues.vehicleType!,
      startDepotId: this.extractDepotId(formValues.startDepot)!,
      endDepotId: this.extractDepotId(formValues.endDepot)!,
    };

    if (this.isEditMode) {
      return {
        ...basePayload,
        licensePlate: formValues.licensePlate!,
      } as VehicleUpdateInput;
    } else {
      return {
        ...basePayload,
        licensePlates: this.licensePlates,
      } as VehicleCreateInput;
    }
  }

  private handleSubmit(): void {
    this.spinner.show();
    const payload = this.buildPayload();
    const request$ = (
      this.isEditMode
        ? this.vehicleService.updateVehicle(
            this.vehicle!.vehicleId,
            payload as VehicleUpdateInput
          )
        : this.vehicleService.createVehicle(payload as VehicleCreateInput)
    ) as Observable<VehicleCreateResponse | VehicleUpdateResponse>;

    request$.pipe(finalize(() => this.spinner.hide())).subscribe({
      next: (res: VehicleCreateResponse | VehicleUpdateResponse) => {
        this.toastr.success(
          this.transloco.translate(
            this.isEditMode
              ? 'vehicle_updated_successfully'
              : 'vehicle_created_successfully',
            {},
            'vehicleManagement'
          ),
          this.transloco.translate('success')
        );
        this.activeModal.close({
          success: true,
          res,
        });
      },
      error: (err: unknown) => {
        console.error(
          `Error ${this.isEditMode ? 'updating' : 'creating'} vehicle:`,
          err
        );
        this.toastr.error(
          this.transloco.translate(
            this.isEditMode
              ? 'failed_to_update_vehicle'
              : 'failed_to_create_vehicle',
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

    const action = this.isEditMode ? 'update' : 'create';
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
          this.handleSubmit();
        }
      })
      .catch(() => {});
  }

  onCancel(): void {
    this.activeModal.dismiss();
  }
}
