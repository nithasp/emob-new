import { Component, Inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

interface VehicleFormControls {
  vehicleType: FormControl<string | null>;
  startDepot: FormControl<string | null>;
  endDepot: FormControl<string | null>;
  licensePlate: FormControl<string | null>;
}

@Component({
  selector: 'app-vehicle-dialog',
  templateUrl: './vehicle-dialog.component.html',
  styleUrls: ['./vehicle-dialog.component.scss'],
})
export class VehicleDialogComponent implements OnInit {
  form!: FormGroup<VehicleFormControls>;
  licensePlates: string[] = [];

  vehicleTypeOptions = [
    { id: 1, value: 'Truck', label: 'Truck' },
    { id: 2, value: 'Van', label: 'Van' },
    { id: 3, value: 'Pickup', label: 'Pickup' },
    { id: 4, value: 'Motorcycle', label: 'Motorcycle' }
  ];

  startDepotOptions = [
    { id: 1, value: 'depot-1', label: 'Depot 1' },
    { id: 2, value: 'depot-2', label: 'Depot 2' },
    { id: 3, value: 'depot-3', label: 'Depot 3' },
    { id: 4, value: 'warehouse-a', label: 'Warehouse A' },
    { id: 5, value: 'warehouse-b', label: 'Warehouse B' }
  ];

  endDepotOptions = [
    { id: 1, value: 'depot-1', label: 'Depot 1' },
    { id: 2, value: 'depot-2', label: 'Depot 2' },
    { id: 3, value: 'depot-3', label: 'Depot 3' },
    { id: 4, value: 'warehouse-a', label: 'Warehouse A' },
    { id: 5, value: 'warehouse-b', label: 'Warehouse B' }
  ];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<VehicleDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { vehicle: any | null }
  ) { }

  ngOnInit() {
    this.form = this.fb.group({
      vehicleType: ['', [Validators.required]],
      startDepot: ['', [Validators.required]],
      endDepot: ['', [Validators.required]],
      licensePlate: ['', [Validators.required]]
    });

    // Initialize with existing data if editing
    if (this.data.vehicle) {
      this.form.patchValue(this.data.vehicle);
      if (this.data.vehicle.licensePlates) {
        this.licensePlates = [...this.data.vehicle.licensePlates];
      }
    }
  }

  addLicensePlate() {
    const licensePlateValue = this.form.controls.licensePlate.value?.trim();
    
    if (licensePlateValue && this.form.controls.licensePlate.valid) {
      // Check if license plate already exists
      if (!this.licensePlates.includes(licensePlateValue)) {
        this.licensePlates.push(licensePlateValue);
        this.form.controls.licensePlate.reset();
      }
    }
  }

  removeLicensePlate(index: number) {
    this.licensePlates.splice(index, 1);
  }

  save() {
    if (this.form.invalid || this.licensePlates.length === 0) {
      this.form.markAllAsTouched();
      return;
    }

    const formValues = this.form.value;
    const payload = {
      vehicleType: formValues.vehicleType,
      startDepot: formValues.startDepot,
      endDepot: formValues.endDepot,
      licensePlates: [...this.licensePlates]
    };

    this.dialogRef.close({ vehicle: payload });
  }

  cancel() {
    this.dialogRef.close();
  }
} 