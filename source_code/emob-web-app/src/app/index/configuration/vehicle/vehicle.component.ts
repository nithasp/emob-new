import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ConfirmationDialogComponent } from '../../components/confirmation-dialog/confirmation-dialog.component';
import { VehicleDialogComponent } from '../../components/vehicle-dialog/vehicle-dialog.component';
import { VehicleService } from 'src/app/services/vehicle.service';
import { MyVehicles } from 'src/app/models/vehicle.model';

@Component({
  selector: 'app-vehicle',
  templateUrl: './vehicle.component.html',
  styleUrl: './vehicle.component.scss',
})
export class VehicleComponent implements OnInit {
  displayedColumns: string[] = [
    'licensePlate',
    'vehicleName',
    'vehicleType',
    'vehicleBrand',
    'vehicleModel',
    'vehicleWeight',
    'maxLoadWeight',
    'cargoWidth',
    'cargoLength',
    'cargoHeight',
    'maxPalletCount',
    'isActive',
    'actions',
  ];

  dataSource: MyVehicles[] = [];

  constructor(
    private dialog: MatDialog,
    private modalSvc: NgbModal,
    private vehicleService: VehicleService
  ) {}

  ngOnInit(): void {
    this.vehicleService.getMyVehicles().subscribe((vehicles) => {
      this.dataSource = vehicles;

      console.log('this.dataSource', this.dataSource);
    });
  }

  openVehicleModal(vehicle?: MyVehicles, index?: number) {
    const dialogRef = this.dialog.open(VehicleDialogComponent, {
      width: '600px',
      data: { vehicle: vehicle ? { ...vehicle } : null },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (!result?.vehicle) {
        return;
      }

      if (vehicle && typeof index === 'number') {
        this.dataSource[index] = result.vehicle;
      } else {
        this.dataSource.push(result.vehicle);
      }

      this.dataSource = [...this.dataSource];
    });
  }

  deleteVehicle(index: number) {
    const vehicle = this.dataSource[index];
    const modalRef = this.modalSvc.open(ConfirmationDialogComponent);
    modalRef.componentInstance.title = 'Delete Vehicle';
    modalRef.componentInstance.question = `Delete "${vehicle.vehicleType.name}"?`;
    modalRef.componentInstance.message = 'This action cannot be undone.';
    modalRef.componentInstance.acceptButton = 'Delete';

    modalRef.result.then((confirmed: boolean) => {
      if (confirmed) {
        this.dataSource.splice(index, 1);
        this.dataSource = [...this.dataSource];
      }
    });
  }
}
