import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
//import { VehicleDialogComponent } from '../components/vehicle-dialog/vehicle-dialog.component';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ConfirmationDialogComponent } from '../../components/confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-vehicle',
  templateUrl: './vehicle.component.html',
  styleUrl: './vehicle.component.scss',
})
export class VehicleComponent {
  constructor(private dialog: MatDialog, private modalSvc: NgbModal) {}

  displayedColumns: string[] = ['position', 'name', 'weight', 'symbol', 'menu'];
  dataSource = [
    { position: 1, name: 'Hydrogen', weight: 1.0079, symbol: 'H' },
    { position: 2, name: 'Helium', weight: 4.0026, symbol: 'He' },
    { position: 3, name: 'Lithium', weight: 6.941, symbol: 'Li' },
    { position: 4, name: 'Beryllium', weight: 9.0122, symbol: 'Be' },
    { position: 5, name: 'Boron', weight: 10.811, symbol: 'B' },
    { position: 6, name: 'Carbon', weight: 12.0107, symbol: 'C' },
    { position: 7, name: 'Nitrogen', weight: 14.0067, symbol: 'N' },
    { position: 8, name: 'Oxygen', weight: 15.9994, symbol: 'O' },
    { position: 9, name: 'Fluorine', weight: 18.9984, symbol: 'F' },
    { position: 10, name: 'Neon', weight: 20.1797, symbol: 'Ne' },
  ];

  openVehicleModal(vehicle?: any, index?: number) {
    // const dialogRef = this.dialog.open(VehicleDialogComponent, {
    //   width: '400px',
    //   data: { vehicle: vehicle ? { ...vehicle } : null },
    // });

    // dialogRef.afterClosed().subscribe((result) => {
    //   if (!result?.vehicle) {
    //     return;
    //   }

    //   if (vehicle && typeof index === 'number') {
    //     this.dataSource[index] = result.vehicle;
    //   } else {
    //     this.dataSource.push(result.vehicle);
    //   }

    //   this.dataSource = [...this.dataSource];
    // });
  }

  deleteVehicle(index: number) {
    const vehicle = this.dataSource[index];

    const modalRef = this.modalSvc.open(ConfirmationDialogComponent, {
      centered: true,
      backdrop: 'static',
    });

    modalRef.componentInstance.title = 'Delete Vehicle';
    modalRef.componentInstance.question = `Delete "${vehicle.name}"?`;
    modalRef.componentInstance.message = 'This action cannot be undone.';
    modalRef.componentInstance.acceptButton = 'Delete';
    modalRef.componentInstance.disableCancelButton = false;

    modalRef.result
      .then((confirmed: boolean) => {
        if (confirmed) {
          this.dataSource.splice(index, 1);
          this.dataSource = [...this.dataSource];
        }
      })
      .catch(() => {});
  }
}