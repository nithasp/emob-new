import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { MyVehicles, VehicleProfileTypeEnum } from 'src/app/models/vehicle.model';
import { VehicleService } from 'src/app/services/vehicle.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-vehicle-profile-type-item-dialog',
  templateUrl: './vehicle-profile-type-item-dialog.component.html',
  styleUrl: './vehicle-profile-type-item-dialog.component.scss',
})
export class VehicleProfileTypeItemDialogComponent implements OnInit {
  @Input() type!: VehicleProfileTypeEnum | string;
  @Input() depotId!: string;
  @Input() vehicleTypeIds!: string;

  public vehicles: MyVehicles[] = [];
  public isLoading: boolean = true;

  constructor(
    public activeModal: NgbActiveModal,
    private readonly vehicleService: VehicleService,
    private readonly spinner: NgxSpinnerService,
    private readonly toastr: ToastrService
  ) {}

  ngOnInit(): void {
    console.log('this.depotId', this.depotId);
    console.log('this.vehicleTypeIds', this.vehicleTypeIds);
    this.loadVehicles();
  }

  loadVehicles(): void {
    this.isLoading = true;
    this.spinner.show('vehicleModal');
    
    this.vehicleService.getMyVehicles(this.depotId, this.vehicleTypeIds).subscribe({
      next: (vehicles: MyVehicles[]) => {
        this.vehicles = vehicles || [];
        console.log('Loaded vehicles:', this.vehicles);
        this.isLoading = false;
        this.spinner.hide('vehicleModal');
      },
      error: (error) => {
        console.error('Error loading vehicles:', error);
        this.toastr.error('Failed to load vehicles', 'Error');
        this.isLoading = false;
        this.spinner.hide('vehicleModal');
      },
      complete: () => {
        this.spinner.hide('vehicleModal');
      }
    });
  }
}
