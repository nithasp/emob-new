import { Component, Inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
// Assuming AccessType and VehicleType are defined in your models
// e.g. export type AccessType = 'right' | 'left' | 'top' | 'rear';
import { VehicleType, AccessType } from 'src/app/models/vehicle.model';

// Define an interface for the form controls for strong typing
interface VehicleTypeFormControls {
  name: FormControl<string | null>;
  access: FormControl<string | null>;
  capacity: FormControl<number | null>;
  startTime: FormControl<string | null>;
  endTime: FormControl<string | null>;
  width: FormControl<number | null>;
  height: FormControl<number | null>;
  length: FormControl<number | null>;
  vehicleProfileType: FormControl<string | null>;
  maxDistance: FormControl<number | null>;
  maxDuration: FormControl<number | null>;
  costPerDistance: FormControl<number | null>;
  costPerTimeUnit: FormControl<number | null>;
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
    { id: 'standard', value: 'Standard' },
    { id: 'refrigerated', value: 'Refrigerated' },
    { id: 'flatbed', value: 'Flatbed' },
  ];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<VehicleTypeDialogComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: { vehicleType: Partial<VehicleType> | null }
  ) {}

  ngOnInit() {
    this.isEdit = !!this.data?.vehicleType;
    this.initForm();
    // if (this.isEdit && this.data.vehicleType) {
    //     // If editing, patch the form with existing data
    //     this.form.patchValue(this.data.vehicleType);
    // }
  }

  initForm() {
    this.form = this.fb.group({
      name: ['', Validators.required],
      access: ['', Validators.required],
      capacity: [null, [Validators.required, Validators.min(0)]],
      startTime: [''],
      endTime: [''],
      width: [null, [Validators.required, Validators.min(0)]],
      height: [null, [Validators.required, Validators.min(0)]],
      length: [null, [Validators.required, Validators.min(0)]],
      vehicleProfileType: [null, Validators.required],
      maxDistance: [null, Validators.min(0)],
      maxDuration: [null, Validators.min(0)],
      costPerDistance: [null, Validators.min(0)],
      costPerTimeUnit: [null, Validators.min(0)],
      fixedCost: [null, Validators.min(0)],
    }) as FormGroup<VehicleTypeFormControls>;
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const formValue = this.form.getRawValue();

    // Convert all null values to undefined to match Partial<VehicleType> typing
    const sanitizedFormValue = Object.fromEntries(
      Object.entries(formValue).map(([key, value]) => [key, value === null ? undefined : value])
    );

    // The radio buttons provide a single string value for 'access'.
    // This ensures the payload matches that, instead of wrapping it in an array.
    const payload: Partial<VehicleType> = {
      ...this.data.vehicleType,
      ...sanitizedFormValue,
      access: [formValue.access as AccessType], // Wrap in array to match AccessType[]
    };

    this.dialogRef.close({ vehicleType: payload });
  }

  cancel() {
    this.dialogRef.close();
  }

  log() {
    console.log('Form Value:', this.form.getRawValue());
    console.log('Form Valid:', this.form.valid);
    console.log('Errors:', this.form.errors);
  }
}