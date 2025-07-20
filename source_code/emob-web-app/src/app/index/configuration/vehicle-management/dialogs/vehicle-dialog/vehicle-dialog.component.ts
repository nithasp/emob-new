import { Component, Inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { VehicleService } from 'src/app/services/vehicle.service';
import { VehicleType, Depot, MyVehicles } from 'src/app/models/vehicle.model';
import { forkJoin } from 'rxjs';
import { NgxSpinnerService } from 'ngx-spinner';
import { finalize } from 'rxjs/operators';

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
  isSaving = false;
  isEditMode = false;

  vehicleTypeOptions: any[] = [];
  startDepotOptions: any[] = [];
  endDepotOptions: any[] = [];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<VehicleDialogComponent>,
    private vehicleService: VehicleService,
    private spinner: NgxSpinnerService,
    @Inject(MAT_DIALOG_DATA) public data: { vehicle: MyVehicles | null }
  ) { }

  ngOnInit() {
    this.isEditMode = !!(this.data.vehicle && this.data.vehicle.vehicleIds);
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

    if (this.isEditMode) {
      this.form.controls.licensePlate.setValidators([Validators.required]);
    }
  }

  private loadData() {
    this.isLoading = true;

    // First, load vehicle types and depots
    const baseObservables = {
      vehicleTypes: this.vehicleService.getMyVehicleTypes(),
      depots: this.vehicleService.getMyDepots(),
    };

    forkJoin(baseObservables).pipe(
      finalize(() => {
        this.isLoading = false;
      })
    ).subscribe({
      next: (data: any) => {
        this.vehicleTypeOptions = data.vehicleTypes;
        this.startDepotOptions = data.depots;
        this.endDepotOptions = data.depots;

        // If in edit mode, fetch fresh vehicle data and patch form
        if (this.isEditMode && this.data.vehicle?.vehicleIds) {
          this.fetchAndPatchVehicleData();
        }
      },
      error: (error) => {
        console.error('Error loading vehicle types and depots:', error);
        this.vehicleTypeOptions = [];
        this.startDepotOptions = [];
        this.endDepotOptions = [];
      }
    });
  }

  private fetchAndPatchVehicleData() {
    if (!this.data.vehicle?.vehicleIds) {
      return;
    }

    this.vehicleService.getMyVehicle(this.data.vehicle.vehicleIds).subscribe({
      next: (vehicleData: any) => {
        // Always use fresh data from API to patch the form
        this.form.patchValue({
          vehicleType: vehicleData.vehicleTypeId,
          startDepot: vehicleData.startDepotId.depotId,
          endDepot: vehicleData.endDepotId.depotId,
          licensePlate: vehicleData.licensePlate,
        });

        console.log('Fresh vehicle data from API:', vehicleData);
      },
      error: (error) => {
        console.error('Error fetching vehicle data:', error);
      }
    });
  }

  addLicensePlate() {
    const licensePlateValue = this.form.controls.licensePlate.value?.trim();

    if (licensePlateValue && this.form.controls.licensePlate.valid) {
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
    if (!this.isEditMode && this.licensePlates.length === 0) {
      this.form.controls.licensePlate.setErrors({ licensePlatesEmpty: true });
    }
 
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    const formValues = this.form.value;
    
    const startDepotId = typeof formValues.startDepot === 'object' && formValues.startDepot !== null
      ? (formValues.startDepot as any).depotId
      : formValues.startDepot;

    const endDepotId = typeof formValues.endDepot === 'object' && formValues.endDepot !== null
      ? (formValues.endDepot as any).depotId
      : formValues.endDepot;

    if (this.isEditMode) {
      const payload = {
        vehicleTypeId: formValues.vehicleType,
        startDepotId: startDepotId,
        endDepotId: endDepotId,
        licensePlate: formValues.licensePlate,
      };

      this.spinner.show();
      this.vehicleService.updateVehicle(this.data.vehicle!.vehicleIds, payload).pipe(
        finalize(() => this.spinner.hide())
      ).subscribe({
        next: (updatedVehicle) => {
          this.isSaving = false;
          this.dialogRef.close({ 
            success: true, 
            operation: 'update', 
            vehicle: updatedVehicle 
          });
        },
        error: (error) => {
          console.error('Error updating vehicle:', error);
          this.isSaving = false;
          // You might want to show an error message to the user here
        }
      });
    } else {
      const payload = {
        vehicleTypeId: formValues.vehicleType,
        startDepotId: startDepotId,
        endDepotId: endDepotId,
        licensePlates: this.licensePlates || []
      };

      this.spinner.show();
      this.vehicleService.createVehicle(payload).pipe(
        finalize(() => this.spinner.hide())
      ).subscribe({
        next: (newVehicle) => {
          this.isSaving = false;
          this.dialogRef.close({ 
            success: true, 
            operation: 'create', 
            vehicle: newVehicle 
          });
        },
        error: (error) => {
          console.error('Error creating vehicle:', error);
          this.isSaving = false;
          // You might want to show an error message to the user here
        }
      });
    }
  }

  delete() {
    if (this.data.vehicle && this.data.vehicle.vehicleIds) {
      this.isSaving = true;
      
      this.spinner.show();
      this.vehicleService.deleteVehicle(this.data.vehicle.vehicleIds).pipe(
        finalize(() => this.spinner.hide())
      ).subscribe({
        next: (result) => {
          this.isSaving = false;
          if (result) {
            this.dialogRef.close({ 
              success: true, 
              operation: 'delete', 
              vehicleIds: this.data.vehicle!.vehicleIds 
            });
          }
        },
        error: (error) => {
          console.error('Error deleting vehicle:', error);
          this.isSaving = false;
          // You might want to show an error message to the user here
        }
      });
    }
  }

  cancel() {
    this.dialogRef.close();
  }

  log() {
    console.log(this.form);
    console.log('this.licensePlates', this.licensePlates);
  }
} 