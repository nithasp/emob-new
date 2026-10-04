import { Component, Input, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { VehicleService } from '../../../services/vehicle.service';
import { ExperimentService } from '@features/experiment/services/experiment.service';
import {
  VehicleType,
  MyVehicles,
  VehicleUpdateInput,
  VehicleCreateInput,
  VehicleCreateResponse,
  VehicleUpdateResponse,
} from '../../../models/vehicle.model';
import { MyDepot } from '@features/experiment/models/experiment.model';
import { ActionMode } from '@shared/models/common.model';
import { forkJoin, of, Observable } from 'rxjs';
import { NgxSpinnerService } from 'ngx-spinner';
import { finalize, catchError } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import { TranslocoService } from '@jsverse/transloco';
import { licensePlateDuplicateValidator } from '@shared/validators/license-plate.validator';
import { VehicleFormControls } from '../../../models/forms/vehicle-form-control.model';
import { DialogConfirmationComponent } from '@shared/components/dialogs/dialog-confirmation/dialog-confirmation.component';
import { LoggerService } from '@core/services/logger.service';

@Component({
  selector: 'app-dialog-vehicle',
  templateUrl: './dialog-vehicle.component.html',
  styleUrls: ['./dialog-vehicle.component.scss'],
})
export class DialogVehicleComponent implements OnInit {
  private readonly logger = inject(LoggerService);

  @Input() mode: ActionMode = 'create';
  @Input() vehicle: MyVehicles | null = null;

  isLoading: boolean = true;
  isEditMode: boolean = false;
  isViewMode: boolean = false;

  form!: FormGroup<VehicleFormControls>;
  licensePlates: string[] = [];
  vehicleTypeOptions: VehicleType[] = [];
  depotOptions: MyDepot[] = [];

  /**
   * Vehicle Pool: the depot binding was removed from this dialog (vehicles are
   * master data in a central pool; depots are assigned per run in the Open VRP
   * flow). The backend contract still requires start/end depot ids, so they
   * are filled silently: existing values are preserved on edit and the first
   * available depot is used as a technical default on create.
   */
  private existingStartDepotId: string = '';
  private existingEndDepotId: string = '';

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
    this.form = this.fb.group<VehicleFormControls>({
      vehicleType: this.fb.control<string | null>('', [Validators.required]),
      licensePlate: this.fb.control<string | null>(''),
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
          this.logger.error('Error loading vehicle types:', error);
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
          this.logger.error('Error loading depots:', error);
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
      .subscribe(({ vehicleTypes, depots }) => {
        this.vehicleTypeOptions = vehicleTypes;
        this.depotOptions = depots;

        if ((this.isEditMode || this.isViewMode) && this.vehicle?.vehicleId) {
          this.fetchAndPatchVehicleData();
        }
      });
  }

  private fetchAndPatchVehicleData(): void {
    this.vehicleService.getMyVehicle(this.vehicle!.vehicleId).subscribe({
      next: (vehicleData) => {
        this.existingStartDepotId = vehicleData.startDepotId?.depotId || '';
        this.existingEndDepotId = vehicleData.endDepotId?.depotId || '';
        this.form.patchValue({
          vehicleType: vehicleData.vehicleType?.vehicleTypeId,
          licensePlate: vehicleData.licensePlate,
        });
      },
      error: (error) => this.logger.error('Error fetching vehicle data:', error),
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

  /** Technical default while the backend still requires depot ids on vehicles. */
  private resolveDefaultDepotId(existingDepotId: string): string {
    return existingDepotId || this.depotOptions[0]?.depotId || '';
  }

  private buildPayload(): VehicleCreateInput | VehicleUpdateInput {
    const formValues = this.form.value;
    const basePayload = {
      vehicleTypeId: formValues.vehicleType ?? '',
      startDepotId: this.resolveDefaultDepotId(this.existingStartDepotId),
      endDepotId: this.resolveDefaultDepotId(this.existingEndDepotId),
    };

    if (this.isEditMode) {
      return {
        ...basePayload,
        licensePlate: formValues.licensePlate ?? '',
      };
    }

    return {
      ...basePayload,
      licensePlates: this.licensePlates,
    };
  }

  private handleSubmit(): void {
    this.spinner.show();
    const payload = this.buildPayload();
    const request$: Observable<VehicleCreateResponse | VehicleUpdateResponse> =
      this.isEditMode
        ? this.vehicleService.updateVehicle(
            this.vehicle!.vehicleId,
            payload as VehicleUpdateInput
          )
        : this.vehicleService.createVehicle(payload as VehicleCreateInput);

    request$.pipe(finalize(() => this.spinner.hide())).subscribe({
      next: (res) => {
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
        this.logger.error(
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
    const dialogRef = this.ngbModal.open(DialogConfirmationComponent, {
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
