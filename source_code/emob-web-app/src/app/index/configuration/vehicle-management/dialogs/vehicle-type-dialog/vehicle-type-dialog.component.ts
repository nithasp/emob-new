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

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<VehicleTypeDialogComponent>,
    @Inject(MAT_DIALOG_DATA)
    private data: { vehicleType: Partial<VehicleType> | null },
    private ngbModal: NgbModal,
    private vehicleService: VehicleService,
    private spinner: NgxSpinnerService
  ) {}

  ngOnInit() {
    this.isEdit = !!this.data?.vehicleType;
    this.initForm();
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
    const accessPoints = this.form.get('access') as FormControl<
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
    return this.form.get('access')?.value?.includes(accessPoint) ?? false;
  }

  openDialogConfirm() {
    const dialogRef = this.ngbModal.open(ConfirmationDialogComponent, {
      centered: true,
      animation: true,
    });
    dialogRef.componentInstance.title = 'Do you want to create a vehicle type?';
    dialogRef.componentInstance.message = `Do you want to create a vehicle type?`;

    dialogRef.result.then((confirmed: boolean) => {
      if (confirmed) {
        console.log('confirmed');
        this.handleSubmit();
      } else {
        console.log('not confirmed');
      }
    });
  }

  handleSubmit() {
    this.spinner.show();
    const formValue = this.form.getRawValue();

    const numberFields: (keyof VehicleTypeFormControls)[] = [
      'capacity',
      'width',
      'height',
      'length',
      'maxDistance',
      'maxDuration',
      'unitDistanceCost',
      'unitDurationCost',
      'fixedCost',
      'twEarly',
      'twLate',
    ];

    const sanitizedFormValue = Object.fromEntries(
      Object.entries(formValue).map(([key, value]) => {
        if (numberFields.includes(key as keyof VehicleTypeFormControls)) {
          return [key, value !== null ? Number(value) : undefined];
        }
        return [key, value === null ? undefined : value];
      })
    );

    const payload: Partial<VehicleType> = {
      ...sanitizedFormValue,
      access: formValue.access || [],
    };

    this.vehicleService
      .createVehicleType(payload as VehicleType)
      .pipe(finalize(() => this.spinner.hide()))
      .subscribe({
        next: (res) => {
          this.dialogRef.close({ vehicleType: res });
        },
        error: (err) => {
          console.error('Failed to create vehicle type:', err);
        },
      });
  }
}
