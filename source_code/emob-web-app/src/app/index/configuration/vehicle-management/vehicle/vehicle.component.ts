import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ConfirmationDialogComponent } from '../../../components/confirmation-dialog/confirmation-dialog.component';
import { VehicleDialogComponent } from '../dialogs/vehicle-dialog/vehicle-dialog.component';
import { VehicleService } from 'src/app/services/vehicle.service';
import { MyVehicles } from 'src/app/models/vehicle.model';
import { NgxSpinnerService } from 'ngx-spinner';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { TranslocoService } from '@jsverse/transloco';

@Component({
  selector: 'app-vehicle',
  templateUrl: './vehicle.component.html',
  styleUrl: './vehicle.component.scss',
})
export class VehicleComponent implements OnInit {
  displayedColumns: string[] = [
    'licensePlate',
    'vehicleType',
    'maxLoadWeight',
    'cargoWidth',
    'cargoLength',
    'cargoHeight',
    'isActive',
    'actions',
  ];

  dataSource = new MatTableDataSource<MyVehicles>([]);
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private dialog: MatDialog,
    private modalSvc: NgbModal,
    private vehicleService: VehicleService,
    private spinner: NgxSpinnerService,
    private toastr: ToastrService,
    private transloco: TranslocoService
  ) {}

  ngOnInit(): void {
    this.getMyVehicles();
  }

  getMyVehicles() {
    this.spinner.show();
    this.vehicleService
      .getMyVehicles()
      .pipe(finalize(() => this.spinner.hide()))
      .subscribe({
        next: (res) => {
          this.dataSource.data = res;
          this.dataSource.paginator = this.paginator;
        },
        error: (err) => {
          console.error(err);
        },
      });
  }

  openVehicleModal(vehicle?: MyVehicles, mode: 'create' | 'edit' | 'view' = 'create') {
    const dialogRef = this.dialog.open(VehicleDialogComponent, {
      width: '600px',
      data: { 
        mode: mode,
        vehicle: vehicle ? { ...vehicle } : null 
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.getMyVehicles();
      }
    });
  }

  deleteVehicle(vehicle: MyVehicles) {
    const modalRef = this.modalSvc.open(ConfirmationDialogComponent);
    modalRef.componentInstance.title = this.transloco.translate('vehicleManagement.delete_vehicle_title');
    modalRef.componentInstance.question = this.transloco.translate('vehicleManagement.delete_vehicle_question');
    modalRef.componentInstance.message = this.transloco.translate('vehicleManagement.this_action_cannot_be_undone');
    modalRef.componentInstance.acceptButton = this.transloco.translate('delete');

    modalRef.result.then((confirmed: boolean) => {
      if (confirmed) {
        this.spinner.show();
        this.vehicleService
          .deleteVehicle(vehicle.vehicleIds)
          .pipe(finalize(() => this.spinner.hide()))
          .subscribe({
            next: () => {
                      this.toastr.success(
          this.transloco.translate('vehicleManagement.vehicle_deleted_successfully'),
          this.transloco.translate('success')
        );
              this.getMyVehicles();
            },
            error: (err) => {
              console.error(err);
                      this.toastr.error(
          this.transloco.translate('vehicleManagement.failed_to_delete_vehicle'),
          this.transloco.translate('error')
        );
            },
          });
      }
    });
  }
}
