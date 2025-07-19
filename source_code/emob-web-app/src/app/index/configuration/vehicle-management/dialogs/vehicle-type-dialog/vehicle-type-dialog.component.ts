import { Component, Inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { NgxSpinnerService } from 'ngx-spinner';
import { ConfirmationDialogComponent } from 'src/app/index/components/confirmation-dialog/confirmation-dialog.component';
import {
  VehicleType,
  AccessType,
  VehicleEnumOption,
  VehicleEnumConfigs,
} from 'src/app/models/vehicle.model';
import { VehicleService } from 'src/app/services/vehicle.service';
import {
  timeStringToMinutes,
  minutesToTimeString,
} from 'src/app/directives/time-string-to-minutes.pipe';
import { VehicleTypeFormControls } from 'src/app/models/form-control.model';
import { createTimeWindowValidator } from 'src/app/shared/validators/time-range.validator';

@Component({
  selector: 'app-vehicle-type-dialog',
  templateUrl: './vehicle-type-dialog.component.html',
  styleUrls: ['./vehicle-type-dialog.component.scss'],
})
export class VehicleTypeDialogComponent implements OnInit {
  formVehicleType!: FormGroup<VehicleTypeFormControls>;
  isEdit: boolean = false;
  isView: boolean = false;

  vehicleProfileTypeOptions: VehicleEnumOption[] = [];
  accessPointOptions: VehicleEnumOption[] = [];

  twEarlyObject: any = { hour: 0, minute: 0 };
  twLateObject: any = { hour: 0, minute: 0 };

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
    private spinner: NgxSpinnerService
  ) {}

  ngOnInit() {
    this.isEdit = this.data.mode === 'edit';
    this.isView = this.data.mode === 'view';
    this.initForm();
    if ((this.isEdit || this.isView) && this.data.vehicleType) {
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
    if (this.isView) {
      this.formVehicleType.disable({ emitEvent: false });
    }

    this.getEnumValues();
  }

  formatTimeForDisplay(timeValue: any): string {
    if (typeof timeValue === 'string' && timeValue.includes(':')) {
      return timeValue;
    }
    if (typeof timeValue === 'number') {
      return minutesToTimeString(timeValue);
    }
    return '';
  }

  initForm() {
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
      { validators: createTimeWindowValidator() }
    ) as FormGroup<VehicleTypeFormControls>;
  }

  save() {
    if (this.formVehicleType.invalid) {
      this.formVehicleType.markAllAsTouched();
      return;
    }
    this.openDialogConfirm();
  }

  cancel() {
    this.dialogRef.close();
  }

  onAccessPointChange(event: MatCheckboxChange, accessPoint: AccessType): void {
    const accessPoints = this.formVehicleType.get('access') as FormControl<
      AccessType[] | null
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

  isAccessPointChecked(accessPoint: AccessType): boolean {
    return (
      this.formVehicleType.get('access')?.value?.includes(accessPoint) ?? false
    );
  }

  isAccessPointCheckedString(accessPointKey: string): boolean {
    return this.isAccessPointChecked(accessPointKey as AccessType);
  }

  onAccessPointChangeString(
    event: MatCheckboxChange,
    accessPointKey: string
  ): void {
    this.onAccessPointChange(event, accessPointKey as AccessType);
  }

  openDialogConfirm() {
    const dialogRef = this.ngbModal.open(ConfirmationDialogComponent, {
      centered: true,
      animation: true,
    });
    const action = this.isEdit ? 'update' : 'create';
    dialogRef.componentInstance.title = `Confirm ${action}`;
    dialogRef.componentInstance.message = `Are you sure you want to ${action} this vehicle type?`;
    dialogRef.result.then((confirmed: boolean) => {
      if (confirmed) {
        this.handleSubmit();
      }
    });
  }

  handleSubmit() {
    this.spinner.show();
    const formValue = this.formVehicleType.getRawValue();
    const twEarlyMinutes = timeStringToMinutes(formValue.twEarly);
    const twLateMinutes = timeStringToMinutes(formValue.twLate);
    const payload: Partial<VehicleType> = Object.entries({
      ...formValue,
      twEarly: twEarlyMinutes,
      twLate: twLateMinutes,
    }).reduce((acc, [key, value]) => {
      if (value !== null && value !== '') {
        (acc as any)[key] =
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

  onTimeValueChange(key: 'twEarly' | 'twLate', event: any) {
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

  getEnumValues() {
    VehicleEnumConfigs.forEach((config) => {
      this.vehicleService.getEnumValues(config.type).subscribe({
        next: (res) => {
          console.log(`${config.type} response:`, res);
          (this as any)[config.property] = res;
        },
        error: (err) => {
          console.error(config.errorMessage, err);
        },
      });
    });
  }
}
