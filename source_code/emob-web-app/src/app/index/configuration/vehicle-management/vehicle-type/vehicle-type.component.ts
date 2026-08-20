import { Component, OnInit, inject } from '@angular/core';
import { formatNumber } from '@angular/common';
import { NgxSpinnerService } from 'ngx-spinner';
import { VehicleType } from 'src/app/models/vehicle.model';
import { VehicleService } from 'src/app/services/vehicle.service';
import { VehicleTypeDialogComponent } from '../dialogs/vehicle-type-dialog/vehicle-type-dialog.component';
import { ToastrService } from 'ngx-toastr';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ConfirmationDialogComponent } from 'src/app/index/components/confirmation-dialog/confirmation-dialog.component';
import { finalize } from 'rxjs';
import { TranslocoService } from '@jsverse/transloco';
import { ActionMode } from 'src/app/models/common.model';
import { LoggerService } from 'src/app/services/logger.service';

@Component({
  selector: 'app-vehicle-type',
  templateUrl: './vehicle-type.component.html',
  styleUrls: ['./vehicle-type.component.scss'],
})
export class VehicleTypeComponent implements OnInit {
  private readonly logger = inject(LoggerService);

  page: number = 1;
  pageSize: number = 5;
  collectionSize: number = 0;

  allVehicleTypes: VehicleType[] = [];
  paginatedVehicleTypes: VehicleType[] = [];

  constructor(
    private spinner: NgxSpinnerService,
    private toastr: ToastrService,
    private ngbModal: NgbModal,
    private vehicleService: VehicleService,
    private transloco: TranslocoService
  ) {}

  ngOnInit(): void {
    this.getMyVehicleTypes();
  }

  private getMyVehicleTypes(): void {
    this.spinner.show();
    this.vehicleService
      .getMyVehicleTypes()
      .pipe(finalize(() => this.spinner.hide()))
      .subscribe({
        next: (data) => {
          this.allVehicleTypes = data;
          this.collectionSize = this.allVehicleTypes.length;
          this.refreshVehicleTypes();
        },
        error: (error) => {
          this.toastr.error(
            this.transloco.translate(
              'vehicleManagement.error_fetching_vehicle_types'
            ),
            this.transloco.translate('error')
          );
          this.logger.error('Error fetching vehicle types:', error);
        },
      });
  }

  refreshVehicleTypes(): void {
    this.paginatedVehicleTypes = this.allVehicleTypes.slice(
      (this.page - 1) * this.pageSize,
      (this.page - 1) * this.pageSize + this.pageSize
    );
  }

  openVehicleTypeModal(mode: ActionMode, vehicleType?: VehicleType): void {
    const modalRef = this.ngbModal.open(VehicleTypeDialogComponent, {
      centered: true,
      size: 'lg',
      animation: true,
      backdrop: 'static',
      keyboard: false,
      scrollable: true,
      windowClass: 'vehicle-type-modal-window',
    });
    modalRef.componentInstance.mode = mode;
    modalRef.componentInstance.vehicleType = vehicleType ?? null;

    modalRef.result.then(
      (result) => {
        if (result?.refresh) {
          const message =
            mode === 'edit'
              ? this.transloco.translate(
                  'vehicleManagement.vehicle_type_updated_successfully'
                )
              : mode === 'create'
              ? this.transloco.translate(
                  'vehicleManagement.vehicle_type_created_successfully'
                )
              : '';
          if (message) {
            this.toastr.success(message, this.transloco.translate('success'));
          }
          this.getMyVehicleTypes();
        }
      },
      () => {}
    );
  }

  formatNumberTemporary(value: string | number | null | undefined): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    return formatNumber(value, 'en-US');
  }

  deleteVehicleType(vehicleType: VehicleType): void {
    const modalRef = this.ngbModal.open(ConfirmationDialogComponent, {
      centered: true,
    });
    modalRef.componentInstance.title = this.transloco.translate(
      'vehicleManagement.delete_vehicle_type_title'
    );
    modalRef.componentInstance.question = this.transloco.translate(
      'vehicleManagement.delete_vehicle_type_question'
    );

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
              this.toastr.success(
                this.transloco.translate(
                  'vehicleManagement.vehicle_type_deleted_successfully'
                ),
                this.transloco.translate('success')
              );
              this.getMyVehicleTypes();
            },
            error: (err) => {
              this.toastr.error(
                this.transloco.translate(
                  'vehicleManagement.failed_to_delete_vehicle_type'
                ),
                this.transloco.translate('error')
              );
              this.logger.error(err);
            },
          });
      }
    });
  }
}
