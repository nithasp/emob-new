import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { VehicleService } from 'src/app/services/vehicle.service';
import { MyVehicles, VehicleType } from 'src/app/models/vehicle.model';
import { TranslocoModule } from '@jsverse/transloco';

export interface LicensePlateSelectionDialogData {
  vehicleType: VehicleType;
  vehicleId: string;
  depotId?: string;
  preSelectedLicensePlates?: string[];
}

export interface LicensePlateItem {
  vehicleId: string;
  licensePlate: string;
  isSelected: boolean;
  startDepotName: string;
  endDepotName: string;
}

export interface LicensePlateSelectionResult {
  vehicleTypeId: string;
  selectedLicensePlates: string[];
  selectedVehicleIds: string[];
}

@Component({
  selector: 'app-license-plate-selection-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    FormsModule,
    TranslocoModule,
  ],
  templateUrl: './license-plate-selection-dialog.component.html',
  styleUrl: './license-plate-selection-dialog.component.scss',
})
export class LicensePlateSelectionDialogComponent implements OnInit {
  licensePlates: LicensePlateItem[] = [];
  isLoading: boolean = true;
  selectAll: boolean = false;

  constructor(
    public dialogRef: MatDialogRef<LicensePlateSelectionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: LicensePlateSelectionDialogData,
    private readonly vehicleService: VehicleService
  ) {}

  ngOnInit(): void {
    this.loadLicensePlates();
  }

  loadLicensePlates(): void {
    this.isLoading = true;
    const depotId = this.data.depotId;
    const vehicleTypeId = this.data.vehicleId;

    this.vehicleService.getMyVehicles(depotId, vehicleTypeId).subscribe({
      next: (vehicles: MyVehicles[]) => {
        this.licensePlates = vehicles
          .filter((v) => v.isActive)
          .map((vehicle) => ({
            vehicleId: vehicle.vehicleId,
            licensePlate: vehicle.licensePlate,
            isSelected:
              this.data.preSelectedLicensePlates?.includes(
                vehicle.licensePlate
              ) ?? false,
            startDepotName: vehicle.startDepotId?.depotName ?? '-',
            endDepotName: vehicle.endDepotId?.depotName ?? '-',
          }));
        this.updateSelectAllState();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading vehicles:', error);
        this.isLoading = false;
      },
    });
  }

  get selectedCount(): number {
    return this.licensePlates.filter((lp) => lp.isSelected).length;
  }

  get totalCount(): number {
    return this.licensePlates.length;
  }

  get vehicleTypeName(): string {
    return this.data.vehicleType?.name ?? '';
  }

  onLicensePlateToggle(item: LicensePlateItem): void {
    item.isSelected = !item.isSelected;
    this.updateSelectAllState();
  }

  onSelectAllChange(): void {
    this.selectAll = !this.selectAll;
    this.licensePlates.forEach((lp) => (lp.isSelected = this.selectAll));
  }

  updateSelectAllState(): void {
    if (this.licensePlates.length === 0) {
      this.selectAll = false;
      return;
    }
    this.selectAll = this.licensePlates.every((lp) => lp.isSelected);
  }

  close(): void {
    this.dialogRef.close();
  }

  confirm(): void {
    const selectedItems = this.licensePlates.filter((lp) => lp.isSelected);
    const result: LicensePlateSelectionResult = {
      vehicleTypeId: this.data.vehicleId,
      selectedLicensePlates: selectedItems.map((lp) => lp.licensePlate),
      selectedVehicleIds: selectedItems.map((lp) => lp.vehicleId),
    };
    this.dialogRef.close(result);
  }
}
