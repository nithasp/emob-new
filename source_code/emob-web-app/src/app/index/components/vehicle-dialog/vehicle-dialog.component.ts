import { Component, Inject, OnInit }       from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA }   from '@angular/material/dialog';
import { myVehicles }                      from 'src/app/models/vehicle.model';

@Component({
  selector: 'app-vehicle-dialog',
  templateUrl: './vehicle-dialog.component.html',
  styleUrls: ['./vehicle-dialog.component.scss']
})
export class VehicleDialogComponent implements OnInit {
  form!: FormGroup;
  isEdit = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<VehicleDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { vehicle: myVehicles | null }
  ) {}

  ngOnInit() {
    this.isEdit = !!this.data.vehicle;
    this.form = this.fb.group({
      companyName:   [ this.data.vehicle?.companyName   || '', [Validators.required] ],
      licensePlate:  [ this.data.vehicle?.licensePlate  || '', [Validators.required] ],
      vehicleName:   [ this.data.vehicle?.vehicleName   || '', [Validators.required] ],
      vehicleType:   [ this.data.vehicle?.vehicleType   || '', [Validators.required] ],
      vehicleBrand:  [ this.data.vehicle?.vehicleBrand  || ''                       ],
      vehicleModel:  [ this.data.vehicle?.vehicleModel  || '', [Validators.required] ],
      vehicleWeight: [ this.data.vehicle?.vehicleWeight || null,
                         [Validators.required, Validators.min(0)] ],
      maxLoadWeight: [ this.data.vehicle?.maxLoadWeight || null,
                         [Validators.required, Validators.min(0)] ],
      cargoWidth:    [ this.data.vehicle?.cargoWidth    || null,
                         [Validators.required, Validators.min(0)] ],
      cargoLength:   [ this.data.vehicle?.cargoLength   || null,
                         [Validators.required, Validators.min(0)] ],
      cargoHeight:   [ this.data.vehicle?.cargoHeight   || null,
                         [Validators.required, Validators.min(0)] ],
      maxPalletCount:[ this.data.vehicle?.maxPalletCount|| null,
                         [Validators.required, Validators.min(0)] ],
      isActive:      [ this.data.vehicle?.isActive      || false ]
    });
  }

  save() {
    if (this.form.invalid) {
      return;
    }
    const values = this.form.value;
    const payload: myVehicles = this.data.vehicle
      ? { ...this.data.vehicle, ...values }
      : { ...values } as myVehicles;

    this.dialogRef.close({ vehicle: payload });
  }

  cancel() {
    this.dialogRef.close();
  }
}
