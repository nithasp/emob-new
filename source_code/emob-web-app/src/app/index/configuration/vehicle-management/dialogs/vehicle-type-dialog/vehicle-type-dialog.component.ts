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
import { VehicleType, AccessType } from 'src/app/models/vehicle.model';
import { VehicleService } from 'src/app/services/vehicle.service';
import { timeStringToMinutes, minutesToTimeString } from 'src/app/directives/time-string-to-minutes.pipe';

interface VehicleTypeFormControls {
  name: FormControl<string | null>;
  access: FormControl<AccessType[] | null>;
  capacity: FormControl<number | null>;
  twEarly: FormControl<string | null>;
  twLate: FormControl<string | null>;
  width: FormControl<number | null>;
  height: FormControl<number | null>;
  length: FormControl<number | null>;
  vehicleProfileType: FormControl<string | null>;
  maxDistance: FormControl<number | null>;
  maxDuration: FormControl<number | null>;
  unitDistanceCost: FormControl<number | null>;
  unitDurationCost: FormControl<number | null>;
  fixedCost: FormControl<number | null>;
}

@Component({
  selector: 'app-vehicle-type-dialog',
  templateUrl: './vehicle-type-dialog.component.html',
  styleUrls: ['./vehicle-type-dialog.component.scss'],
})
export class VehicleTypeDialogComponent implements OnInit {
  form!: FormGroup<VehicleTypeFormControls>;
  isEdit = false;
  isView = false;

  vehicleProfileTypeOptions = [
    { id: 'CAR', value: 'CAR' },
    { id: 'TRUCK', value: 'TRUCK' },
  ];

  accessPointOptions: any[] = [
    'FRONT',
    'REAR',
    'LEFT',
    'RIGHT',
    'TOP',
    'BOTTOM',
  ];

  timeString: string = '00:00';
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
      this.form.patchValue(vehicleType);
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
      this.form.disable({ emitEvent: false });
    }
  }

  private formatTimeForDisplay(timeValue: any): string {
    if (typeof timeValue === 'string' && timeValue.includes(':')) {
      return timeValue;
    }
    if (typeof timeValue === 'number') {
      return minutesToTimeString(timeValue);
    }
    return '';
  }

  initForm() {
    this.form = this.fb.group({
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
    }) as FormGroup<VehicleTypeFormControls>;
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.openDialogConfirm();
  }

  cancel() {
    this.dialogRef.close();
  }

  log() {
    console.log('Form Value:', this.form.getRawValue());
    console.log('Form Valid:', this.form.valid);
    console.log('Errors:', this.form.errors);
  }

  onAccessPointChange(event: MatCheckboxChange, accessPoint: AccessType): void {
    const accessPoints = this.form.get('access') as FormControl<AccessType[] | null>;
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
    return this.form.get('access')?.value?.includes(accessPoint) ?? false;
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
    const formValue = this.form.getRawValue();
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
    console.log('payload:', payload);
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
      this.form.controls[key].setValue(`${hour}:${minute}`);
    }
  }

  logtimeString() {
    console.log('this.form.controls.twEarly.value:', this.form.controls.twEarly.value);
    console.log('this.timeObject:', this.twEarlyObject);
  }
}
