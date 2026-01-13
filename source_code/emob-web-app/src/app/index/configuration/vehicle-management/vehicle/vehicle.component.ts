import { Component, OnInit, ViewChild } from '@angular/core';
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
import { ActionMode } from 'src/app/models/common.model';

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
    private ngbModal: NgbModal,
    private vehicleService: VehicleService,
    private spinner: NgxSpinnerService,
    private toastr: ToastrService,
    private transloco: TranslocoService
  ) {}

  ngOnInit(): void {
    this.getMyVehicles();
  }

  private getMyVehicles(): void {
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

  openVehicleModal(vehicle?: MyVehicles, mode: ActionMode = 'create'): void {
    const modalRef = this.ngbModal.open(VehicleDialogComponent, {
      centered: true,
      size: 'lg',
      animation: true,
      backdrop: 'static',
      keyboard: false,
      scrollable: true,
      windowClass: 'vehicle-modal-window',
    });
    modalRef.componentInstance.mode = mode;
    modalRef.componentInstance.vehicle = vehicle ? { ...vehicle } : null;

    modalRef.result.then(
      (result) => {
        if (result) {
          this.getMyVehicles();
        }
      },
      () => {}
    );
  }

  deleteVehicle(vehicle: MyVehicles): void {
    const modalRef = this.ngbModal.open(ConfirmationDialogComponent, {
      centered: true,
    });
    modalRef.componentInstance.title = this.transloco.translate(
      'vehicleManagement.delete_vehicle_title'
    );
    modalRef.componentInstance.question = this.transloco.translate(
      'vehicleManagement.are_you_sure_delete_vehicle'
    );
    modalRef.componentInstance.acceptButton =
      this.transloco.translate('delete');

    modalRef.result.then(
      (confirmed: boolean) => {
        if (confirmed) {
          this.spinner.show();
          this.vehicleService
            .deleteVehicle(vehicle.vehicleId)
            .pipe(finalize(() => this.spinner.hide()))
            .subscribe({
              next: () => {
                this.toastr.success(
                  this.transloco.translate(
                    'vehicleManagement.vehicle_deleted_successfully'
                  ),
                  this.transloco.translate('success')
                );
                this.getMyVehicles();
              },
              error: (err) => {
                console.error(err);
                this.toastr.error(
                  this.transloco.translate(
                    'vehicleManagement.failed_to_delete_vehicle'
                  ),
                  this.transloco.translate('error')
                );
              },
            });
        }
      },
      () => {}
    );
  }
}
