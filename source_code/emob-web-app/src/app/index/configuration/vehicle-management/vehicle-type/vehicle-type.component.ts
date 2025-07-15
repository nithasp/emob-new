import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { NgxSpinnerService } from 'ngx-spinner';
import { VehicleType } from 'src/app/models/vehicle.model';
import { VehicleService } from 'src/app/services/vehicle.service';
import { VehicleTypeDialogComponent } from '../dialogs/vehicle-type-dialog/vehicle-type-dialog.component';
import { ToastrService } from 'ngx-toastr';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ConfirmationDialogComponent } from 'src/app/index/components/confirmation-dialog/confirmation-dialog.component';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-vehicle-type',
  templateUrl: './vehicle-type.component.html',
  styleUrls: ['./vehicle-type.component.scss'],
})
export class VehicleTypeComponent implements OnInit {
  page = 1;
  pageSize = 5;
  collectionSize = 0;

  allVehicleTypes: VehicleType[] = [];
  paginatedVehicleTypes: VehicleType[] = [];

  constructor(
    private spinner: NgxSpinnerService,
    private toastr: ToastrService,
    private dialog: MatDialog,
    private ngbModal: NgbModal,
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
        this.spinner.hide();
        this.toastr.error('Error fetching vehicle types', 'Error');
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

  openVehicleTypeModal(vehicleType?: VehicleType): void {
    const dialogRef = this.dialog.open(VehicleTypeDialogComponent, {
      width: '800px',
      data: { vehicleType },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.refresh) {
        const message = vehicleType
          ? 'Vehicle type updated successfully'
          : 'Vehicle type created successfully';
        this.toastr.success(message, 'Success');
        this.getMyVehicleTypes();
      }
    });
  }

  deleteVehicleType(vehicleType: VehicleType): void {
    const modalRef = this.ngbModal.open(ConfirmationDialogComponent, {
      centered: true,
    });
    modalRef.componentInstance.title = 'Delete Vehicle Type';
    modalRef.componentInstance.message = `Are you sure you want to delete "${vehicleType.name}"? This action cannot be undone.`;

    modalRef.result.then((confirmed) => {
      if (confirmed) {
        this.spinner.show();
        this.vehicleService
          .deleteVehicleType(vehicleType.vehicleTypeId)
          .pipe(
            finalize(() => {
              this.spinner.hide();
            })
          )
          .subscribe({
            next: () => {
              this.toastr.success('Vehicle type deleted successfully', 'Success');
              this.getMyVehicleTypes();
            },
            error: (err) => {
              this.toastr.error('Failed to delete vehicle type', 'Error');
              console.error(err);
            },
          });
      }
    });
  }
}