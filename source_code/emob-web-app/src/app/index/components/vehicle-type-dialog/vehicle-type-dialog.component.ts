import { Component, Inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { forkJoin } from 'rxjs';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { NgxSpinnerService } from 'ngx-spinner';
import { ConfirmationDialogComponent } from 'src/app/index/components/confirmation-dialog/confirmation-dialog.component';
import {
  VehicleType,
  AccessTypeEnum,
  VehicleEnumOption,
  VehicleEnumConfigs,
  TimeObject,
} from 'src/app/models/vehicle.model';
import { VehicleService } from 'src/app/services/vehicle.service';
import {
  timeStringToMinutes,
  minutesToTimeString,
} from 'src/app/directives/time-string-to-minutes.pipe';
import { VehicleTypeFormControls } from 'src/app/models/forms/vehicle-type-form-control.model';
import { compareTimeValidator } from 'src/app/shared/validators/time-range.validator';
import { TranslocoService } from '@jsverse/transloco';

@Component({
  selector: 'app-vehicle-type-dialog',
  templateUrl: './vehicle-type-dialog.component.html',
  styleUrls: ['./vehicle-type-dialog.component.scss'],
})
export class VehicleTypeDialogComponent implements OnInit {
  formVehicleType!: FormGroup<VehicleTypeFormControls>;
  isEdit: boolean = false;
  isViewMode: boolean = false;
  isLoading: boolean = true;

  vehicleProfileTypeOptions: VehicleEnumOption[] = [];
  accessPointOptions: VehicleEnumOption[] = [];

  twEarlyObject: TimeObject = { hour: 0, minute: 0 };
  twLateObject: TimeObject = { hour: 0, minute: 0 };

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<VehicleTypeDialogComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      mode: 'create' | 'edit' | 'view';
      vehicleType: VehicleType | null;
    },
    private ngbModal: NgbModal,
    private vehicleService: VehicleService,
    private spinner: NgxSpinnerService,
    private transloco: TranslocoService
  ) {}

  ngOnInit(): void {
    this.isEdit = this.data.mode === 'edit';
    this.isViewMode = this.data.mode === 'view';
    this.initForm();

    this.getEnumValues().then(() => {
      if ((this.isEdit || this.isViewMode) && this.data.vehicleType) {
        const vehicleType = {
          ...this.data.vehicleType,
          twEarly: this.formatTimeForDisplay(this.data.vehicleType.twEarly),
          twLate: this.formatTimeForDisplay(this.data.vehicleType.twLate),
        };
        this.formVehicleType.patchValue(vehicleType);
        if (vehicleType.twEarly) {
          const [hour, minute] = vehicleType.twEarly.split(':').map(Number);
          this.twEarlyObject = { hour: hour || 0, minute: minute || 0 };
        }
        if (vehicleType.twLate) {
          const [hour, minute] = vehicleType.twLate.split(':').map(Number);
          this.twLateObject = { hour: hour || 0, minute: minute || 0 };
        }
      }
      if (this.isViewMode) {
        this.formVehicleType.disable({ emitEvent: false });
      }
    });
  }

  formatTimeForDisplay(timeValue: string | number | null | undefined): string {
    if (typeof timeValue === 'string' && timeValue.includes(':')) {
      return timeValue;
    }
    if (typeof timeValue === 'number') {
      return minutesToTimeString(timeValue);
    }
    return '';
  }

  initForm(): void {
    this.formVehicleType = this.fb.group(
      {
        name: ['', Validators.required],
        access: [[]],
        capacity: [null, [Validators.required, Validators.min(0)]],
        twEarly: [''],
        twLate: [''],
        width: [null, [Validators.required, Validators.min(0)]],
        height: [null, [Validators.required, Validators.min(0)]],
        length: [null, [Validators.required, Validators.min(0)]],
        vehicleProfileType: [null, Validators.required],
        maxDistance: [null, Validators.min(0)],
        maxDuration: [null, Validators.min(0)],
        unitDistanceCost: [null, Validators.min(0)],
        unitDurationCost: [null, Validators.min(0)],
        fixedCost: [null, Validators.min(0)],
      },
      {
        validators: compareTimeValidator(
          this.transloco.translate('form.error.start_time_invalid'),
          this.transloco.translate('form.error.end_time_invalid')
        ),
      }
    ) as FormGroup<VehicleTypeFormControls>;
  }

  save(): void {
    if (this.formVehicleType.invalid) {
      this.formVehicleType.markAllAsTouched();
      return;
    }
    this.openDialogConfirm();
  }

  cancel(): void {
    this.dialogRef.close();
  }

  onAccessPointChange(event: MatCheckboxChange, accessPoint: AccessTypeEnum): void {
    const accessPoints = this.formVehicleType.get('access') as FormControl<
      AccessTypeEnum[] | null
    >;
    let currentValues = accessPoints.value || [];
    if (event.checked) {
      currentValues.push(accessPoint);
    } else {
      const index = currentValues.indexOf(accessPoint);
      if (index > -1) {
        currentValues.splice(index, 1);
      }
    }
    accessPoints.setValue(currentValues);
  }

  isAccessPointChecked(accessPoint: AccessTypeEnum): boolean {
    return (
      this.formVehicleType.get('access')?.value?.includes(accessPoint) ?? false
    );
  }

  isAccessPointCheckedString(accessPointKey: string): boolean {
    return this.isAccessPointChecked(accessPointKey as AccessTypeEnum);
  }

  onAccessPointChangeString(
    event: MatCheckboxChange,
    accessPointKey: string
  ): void {
    this.onAccessPointChange(event, accessPointKey as AccessTypeEnum);
  }

  openDialogConfirm(): void {
    const dialogRef = this.ngbModal.open(ConfirmationDialogComponent, {
      centered: true,
      animation: true,
    });
    const action = this.isEdit ? 'update' : 'create';
    dialogRef.componentInstance.title = this.isEdit
      ? this.transloco.translate('vehicleManagement.confirm_update')
      : this.transloco.translate('vehicleManagement.confirm_create');
    dialogRef.componentInstance.message = this.isEdit
      ? this.transloco.translate(
          'vehicleManagement.are_you_sure_update_vehicle_type'
        )
      : this.transloco.translate(
          'vehicleManagement.are_you_sure_create_vehicle_type'
        );
    dialogRef.result.then((confirmed: boolean) => {
      if (confirmed) {
        this.handleSubmit();
      }
    });
  }

  handleSubmit(): void {
    this.spinner.show();
    const formValue = this.formVehicleType.getRawValue();
    const twEarlyMinutes = timeStringToMinutes(formValue.twEarly);
    const twLateMinutes = timeStringToMinutes(formValue.twLate);
    const payload: Partial<VehicleType> = Object.entries({
      ...formValue,
      twEarly: twEarlyMinutes,
      twLate: twLateMinutes,
    }).reduce((acc: Record<string, unknown>, [key, value]) => {
      if (value !== null && value !== '') {
        acc[key] =
          typeof value === 'string' &&
          !isNaN(Number(value)) &&
          key !== 'name' &&
          key !== 'vehicleProfileType'
            ? Number(value)
            : value;
      }
      return acc;
    }, {});

    const request$ = this.isEdit
      ? this.vehicleService.updateVehicleType(
          this.data.vehicleType!.vehicleTypeId,
          payload as VehicleType
        )
      : this.vehicleService.createVehicleType(payload as VehicleType);
    request$.pipe(finalize(() => this.spinner.hide())).subscribe({
      next: (res) => {
        this.dialogRef.close({ refresh: true, vehicleType: res });
      },
      error: (err) => {
        console.error(
          `Failed to ${this.isEdit ? 'update' : 'create'} vehicle type:`,
          err
        );
      },
    });
  }

  onTimeValueChange(key: 'twEarly' | 'twLate', event: TimeObject): void {
    if (key === 'twEarly') {
      this.twEarlyObject = event;
    } else {
      this.twLateObject = event;
    }
    if (event && event.hour !== undefined && event.minute !== undefined) {
      const hour = String(event.hour).padStart(2, '0');
      const minute = String(event.minute).padStart(2, '0');
      this.formVehicleType.controls[key].setValue(`${hour}:${minute}`);
    } else {
      this.formVehicleType.controls[key].setValue('');
    }

    this.formVehicleType.updateValueAndValidity();
    this.formVehicleType.controls.twEarly.markAsTouched();
    this.formVehicleType.controls.twLate.markAsTouched();
  }

  getEnumValues(): Promise<void> {
    this.isLoading = true;

    const enumRequests = VehicleEnumConfigs.map((config) =>
      this.vehicleService.getEnumValues(config.type)
    );

    return new Promise((resolve) => {
      forkJoin(enumRequests)
        .pipe(
          finalize(() => {
            this.isLoading = false;
            resolve();
          })
        )
        .subscribe({
          next: (responses) => {
            VehicleEnumConfigs.forEach((config, index) => {
              (this as Record<string, unknown>)[config.property] =
                responses[index];
            });
          },
          error: (err) => {
            console.error('Error loading enum values:', err);

            VehicleEnumConfigs.forEach((config) => {
              (this as Record<string, unknown>)[config.property] = [];
            });
          },
        });
    });
  }
}
