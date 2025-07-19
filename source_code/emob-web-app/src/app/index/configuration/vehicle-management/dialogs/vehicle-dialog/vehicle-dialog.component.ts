import { Component, Inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { VehicleService } from 'src/app/services/vehicle.service';
import { VehicleType, Depot } from 'src/app/models/vehicle.model';
import { forkJoin } from 'rxjs';

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
  isLoading = true;

  vehicleTypeOptions: any[] = [];
  startDepotOptions: any[] = [];
  endDepotOptions: any[] = [];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<VehicleDialogComponent>,
    private vehicleService: VehicleService,
    @Inject(MAT_DIALOG_DATA) public data: { vehicle: any | null }
  ) { }

  ngOnInit() {
    this.initializeForm();
    this.loadData();
  }

  private initializeForm() {
    this.form = this.fb.group({
      vehicleType: ['', [Validators.required]],
      startDepot: ['', [Validators.required]],
      endDepot: ['', [Validators.required]],
      licensePlate: ['']
    });
  }

  private loadData() {
    this.isLoading = true;

    forkJoin({
      vehicleTypes: this.vehicleService.getMyVehicleTypes(),
      depots: this.vehicleService.getMyDepots()
    }).subscribe({
      next: (data) => {
        this.vehicleTypeOptions = data.vehicleTypes;
        this.startDepotOptions = data.depots;
        this.endDepotOptions = data.depots;

        // Initialize with existing data if editing
        if (this.data.vehicle) {
          this.form.patchValue(this.data.vehicle);
          if (this.data.vehicle.licensePlates) {
            this.licensePlates = [...this.data.vehicle.licensePlates];
          }
        }

        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading vehicle types and depots:', error);
        this.isLoading = false;
        // Fallback to empty arrays or show error message
        this.vehicleTypeOptions = [];
        this.startDepotOptions = [];
        this.endDepotOptions = [];
      }
    });
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
    if (this.licensePlates.length === 0) {
      this.form.controls.licensePlate.setErrors({ licensePlatesEmpty: true });
    }

    if (this.form.invalid) {
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

  log() {
    console.log(this.form);
    console.log('this.licensePlates', this.licensePlates);
  }
} 