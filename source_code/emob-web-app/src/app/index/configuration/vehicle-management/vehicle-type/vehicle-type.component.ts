import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { NgxSpinnerService } from 'ngx-spinner';
import { VehicleType } from 'src/app/models/vehicle.model';
import { VehicleService } from 'src/app/services/vehicle.service';
import { VehicleTypeDialogComponent } from '../dialogs/vehicle-type-dialog/vehicle-type-dialog.component';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-vehicle-type',
  templateUrl: './vehicle-type.component.html',
  styleUrls: ['./vehicle-type.component.scss'],
})
export class VehicleTypeComponent implements OnInit {
  page = 1;
  pageSize = 5;
  collectionSize = 0;

  allVehicleTypes: any[] = [];
  paginatedVehicleTypes: any[] = [];

  constructor(
    private spinner: NgxSpinnerService,
    private toastr: ToastrService,
    private dialog: MatDialog,
    private vehicleService: VehicleService
  ) {}

  ngOnInit(): void {
    this.getMyVehicleTypes();
  }

  getMyVehicleTypes(): void {
    this.spinner.show();
    this.vehicleService.getMyVehicleTypes().subscribe({
      next: (data) => {
        this.allVehicleTypes = data;
        this.collectionSize = this.allVehicleTypes.length;
        this.refreshVehicleTypes();
        this.spinner.hide();
      },
      error: (error) => {
        console.error('Error fetching vehicle types:', error);
      },
    });
  }

  refreshVehicleTypes(): void {
    this.paginatedVehicleTypes = this.allVehicleTypes.slice(
      (this.page - 1) * this.pageSize,
      (this.page - 1) * this.pageSize + this.pageSize
    );
  }

  openVehicleTypeModal(): void {
    const dialogRef = this.dialog.open(VehicleTypeDialogComponent, {
      width: '800px',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result && result.vehicleType) {
        console.log('New vehicle type created, refreshing list...');
        this.toastr.success( 'Vehicle type created successfully', 'Success');
        this.getMyVehicleTypes();
      }
    });
  }
}
