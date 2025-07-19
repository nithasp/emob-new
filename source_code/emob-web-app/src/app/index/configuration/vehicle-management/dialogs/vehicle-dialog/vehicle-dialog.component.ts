import { Component, Inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MyVehicles } from 'src/app/models/vehicle.model';

interface VehicleFormControls {
  licensePlate: FormControl<string | null>;
  vehicleName: FormControl<string | null>;
  vehicleType: FormControl<string | null>;
  vehicleBrand: FormControl<string | null>;
  vehicleModel: FormControl<string | null>;
  vehicleWeight: FormControl<number | null>;
  maxLoadWeight: FormControl<number | null>;
  cargoWidth: FormControl<number | null>;
  cargoLength: FormControl<number | null>;
  cargoHeight: FormControl<number | null>;
  maxPalletCount: FormControl<number | null>;
  isActive: FormControl<boolean | null>;
}

@Component({
  selector: 'app-vehicle-dialog',
  templateUrl: './vehicle-dialog.component.html',
  styleUrls: ['./vehicle-dialog.component.scss'],
})
export class VehicleDialogComponent implements OnInit {
  form!: FormGroup<VehicleFormControls>;
  isEdit = false;

    countryOptions = [
    { id: 1,code: 'TH', value: 'Thailand' },
    { id: 2,code: 'US', value: 'United States' },
    { id: 3,code: 'UK', value: 'United Kingdom' }
  ];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<VehicleDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { vehicle: any | null }
  ) { }

  ngOnInit() {
    this.isEdit = !!this.data.vehicle;
    this.form = this.fb.group({
      licensePlate: [
        this.data.vehicle?.licensePlate || '',
        [Validators.required],
      ],
      vehicleName: [
        this.data.vehicle?.vehicleName || '',
        [Validators.required],
      ],
      vehicleType: [
        this.data.vehicle?.vehicleType || '',
        [Validators.required],
      ],
      vehicleBrand: [this.data.vehicle?.vehicleBrand || ''],
      vehicleModel: [
        this.data.vehicle?.vehicleModel || '',
        [Validators.required],
      ],
      vehicleWeight: [
        this.data.vehicle?.vehicleWeight || null,
        [Validators.required, Validators.min(0)],
      ],
      maxLoadWeight: [
        this.data.vehicle?.maxLoadWeight || null,
        [Validators.required, Validators.min(0)],
      ],
      cargoWidth: [
        this.data.vehicle?.cargoWidth || null,
        [Validators.required, Validators.min(0)],
      ],
      cargoLength: [
        this.data.vehicle?.cargoLength || null,
        [Validators.required, Validators.min(0)],
      ],
      cargoHeight: [
        this.data.vehicle?.cargoHeight || null,
        [Validators.required, Validators.min(0)],
      ],
      maxPalletCount: [
        this.data.vehicle?.maxPalletCount || null,
        [Validators.required, Validators.min(0)],
      ],
      isActive: [this.data.vehicle?.isActive || false],
    });
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const values = this.form.value;
    const payload: any = this.data.vehicle
      ? { ...this.data.vehicle, ...values }
      : ({ ...values } as any);

    this.dialogRef.close({ vehicle: payload });
  }

  cancel() {
    this.dialogRef.close();
  }
} 