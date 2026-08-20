import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { VehicleService } from 'src/app/services/vehicle.service';
import { LicensePlateItem, LicensePlateSelectionResult, MyVehicles, VehicleType } from 'src/app/models/vehicle.model';
import { TranslocoModule } from '@jsverse/transloco';
import { InputFieldComponent } from 'src/app/shared/components/form/input-field/input-field.component';

@Component({
  selector: 'app-license-plate-selection-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    FormsModule,
    ReactiveFormsModule,
    TranslocoModule,
    InputFieldComponent,
  ],
  templateUrl: './license-plate-selection-dialog.component.html',
  styleUrl: './license-plate-selection-dialog.component.scss',
})
export class LicensePlateSelectionDialogComponent implements OnInit {
  // Input properties set by parent component
  vehicleType!: VehicleType;
  vehicleId!: string;
  depotId?: string;
  preSelectedLicensePlates: string[] = [];

  licensePlates: LicensePlateItem[] = [];
  isLoading: boolean = true;
  selectAll: boolean = false;
  searchText: string = '';
  activeSearchText: string = '';
  searchControl: FormControl = new FormControl('');

  constructor(
    public activeModal: NgbActiveModal,
    private readonly vehicleService: VehicleService
  ) {}

  ngOnInit(): void {
    this.loadLicensePlates();
  }

  loadLicensePlates(): void {
    this.isLoading = true;
    const depotId = this.depotId;
    const vehicleTypeId = this.vehicleId;

    this.vehicleService.getMyVehicles(depotId, vehicleTypeId).subscribe({
      next: (vehicles: MyVehicles[]) => {
        this.licensePlates = vehicles
          .filter((v) => v.isActive)
          .map((vehicle) => ({
            vehicleId: vehicle.vehicleId,
            licensePlate: vehicle.licensePlate,
            isSelected:
              this.preSelectedLicensePlates?.includes(
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

  get filteredLicensePlates(): LicensePlateItem[] {
    if (!this.activeSearchText.trim()) {
      return this.licensePlates;
    }
    const searchLower = this.activeSearchText.toLowerCase();
    return this.licensePlates.filter((licensePlate) =>
      licensePlate.licensePlate.toLowerCase().includes(searchLower)
    );
  }

  get selectedCount(): number {
    return this.licensePlates.filter((licensePlate) => licensePlate.isSelected).length;
  }

  onSearch(): void {
    this.searchText = this.searchControl.value || '';
    this.activeSearchText = this.searchText;
  }

  onClearSearch(): void {
    this.searchControl.setValue('');
    this.searchText = '';
    this.activeSearchText = '';
  }

  onLicensePlateToggle(item: LicensePlateItem): void {
    item.isSelected = !item.isSelected;
    this.updateSelectAllState();
  }

  updateSelectAllState(): void {
    if (this.licensePlates.length === 0) {
      this.selectAll = false;
      return;
    }
    this.selectAll = this.licensePlates.every((licensePlate) => licensePlate.isSelected);
  }

  get selectedLicensePlates(): LicensePlateItem[] {
    return this.licensePlates.filter((licensePlate) => licensePlate.isSelected);
  }

  onRemoveChip(item: LicensePlateItem): void {
    item.isSelected = false;
    this.updateSelectAllState();
  }

  close(): void {
    this.activeModal.dismiss();
  }

  confirm(): void {
    const selectedItems = this.licensePlates.filter((licensePlate) => licensePlate.isSelected);
    const result: LicensePlateSelectionResult = {
      vehicleTypeId: this.vehicleId,
      selectedLicensePlates: selectedItems.map((licensePlate) => licensePlate.licensePlate),
      selectedVehicleIds: selectedItems.map((licensePlate) => licensePlate.vehicleId),
    };
    this.activeModal.close(result);
  }
}
