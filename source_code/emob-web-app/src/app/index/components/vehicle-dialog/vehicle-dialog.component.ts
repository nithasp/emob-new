import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-vehicle-dialog',
  templateUrl: './vehicle-dialog.component.html',
  styleUrl: './vehicle-dialog.component.scss'
})
export class VehicleDialogComponent {
  form!: FormGroup;
  isEdit = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<VehicleDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  ngOnInit() {
    this.isEdit = !!this.data.vehicle;
    this.form = this.fb.group({
      name:     [ this.data.vehicle?.name     || '', [Validators.required] ],
      weight:   [ this.data.vehicle?.weight   || null, [Validators.required, Validators.min(0)] ],
      symbol:   [ this.data.vehicle?.symbol   || '', [Validators.required] ],
    });
  }

  save() {
    if (this.form.invalid) { return; }
    const vals = this.form.value;
    // preserve original position on edit, placeholder (0) on create
    const vehicle: any = {
      position: this.data.vehicle ? this.data.vehicle.position : 0,
      ...vals
    };
    this.dialogRef.close({ vehicle });
  }
 
  cancel() {
    this.dialogRef.close();
  }
}
