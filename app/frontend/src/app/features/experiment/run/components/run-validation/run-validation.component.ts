import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { TranslocoService } from '@jsverse/transloco';
import { DialogConfirmationComponent } from '@shared/components/dialogs/dialog-confirmation/dialog-confirmation.component';
import { ExportFileService } from '@shared/services/export-file.service';
import { LoggerService } from '@core/services/logger.service';
import { ExperimentService } from '../../../services/experiment.service';
import { RunStateService } from '../../services/run-state.service';
import { RunUiService } from '../../services/run-ui.service';
import { RunVehicleService } from '../../services/run-vehicle.service';
import { RunNavigationService } from '../../services/run-navigation.service';
import { RunValidationService } from '../../services/run-validation.service';

@Component({
  selector: 'app-run-validation',
  templateUrl: './run-validation.component.html',
  styleUrl: './run-validation.component.scss',
})
export class RunValidationComponent {
  private readonly logger = inject(LoggerService);

  constructor(
    private readonly experimentService: ExperimentService,
    private readonly ngbModal: NgbModal,
    private readonly toastr: ToastrService,
    private readonly router: Router,
    private readonly exportService: ExportFileService,
    private readonly transloco: TranslocoService,
    protected readonly state: RunStateService,
    private readonly ui: RunUiService,
    protected readonly fleet: RunVehicleService,
    protected readonly navigation: RunNavigationService,
    protected readonly validation: RunValidationService,
  ) {}

  routePlanning() {
    const focusedElement = document.activeElement as HTMLElement;
    if (focusedElement) {
      focusedElement.blur();
    }
    const dialogRef = this.ngbModal.open(DialogConfirmationComponent, {
      centered: true,
      animation: true,
    });
    dialogRef.componentInstance.title = this.transloco.translate(
      'experiment_confirmation',
      {},
      'index',
    );
    dialogRef.componentInstance.question = `${this.transloco.translate(
      'confirm_to_submit_experiment',
      {},
      'index',
    )} ?`;
    dialogRef.componentInstance.message = `${this.transloco.translate(
      'submitting_an_experiment_to_the_ai_service_will_start_the_planning_process',
      {},
      'index',
    )}.`;

    dialogRef.result
      .then((confirmed: boolean) => {
        if (confirmed) {
          this.ui.showSpinner();
          this.experimentService
            .submitExperiment(this.state.experiment.runId)
            .subscribe({
              next: (result) => {
                this.logger.log(result);
                this.toastr.success(
                  this.transloco.translate('submit_experiment', {}, 'index'),
                  this.transloco.translate('succeed', {}, 'index'),
                );
                this.router.navigate(['/users/experiments']);
              },
              error: () => {
                this.toastr.error(
                  this.transloco.translate('submit_experiment', {}, 'index'),
                  this.transloco.translate('failed', {}, 'index'),
                );
              },
              complete: () => {
                this.ui.hiddenSpinner();
              },
            });
        }
      })
      .catch((error) => {
        this.logger.error('Dialog was dismissed:', error);
      });
  }

  exportValidationData() {
    const files: Array<{
      data: Array<Record<string, string | number>>;
      name: string;
    }> = [];
    if (
      this.state.validateExperiment?.filters?.order_data &&
      this.state.validateExperiment?.filters?.order_data?.invalid_coordinate?.length >
        0
    ) {
      files.push({
        data:
          this.state.validateExperiment?.warning.zero_weight.map((customer, i) => ({
            index: i + 1,
            ORDER_ID: customer.name,
            ADDRESS: customer.originalAddress?.address ?? '',
            SUBDISTRICT: customer.originalAddress?.subdistrict ?? '',
            DISTRICT: customer.originalAddress?.district ?? '',
            PROVINCE: customer.originalAddress?.province ?? '',
          })) || [],
        name:
          'Remove_Order_' + this.state.experiment.name + '_' + this.state.experiment.runId,
      });
    }
    if (
      this.state.validateExperiment?.warning &&
      this.state.validateExperiment?.warning.zero_weight.length > 0
    ) {
      files.push({
        data:
          this.state.validateExperiment?.warning.zero_weight.map((customer, i) => ({
            index: i + 1,
            ORDER_ID: customer.name,
            PRODUCT_ID_ZERO_WEIGHT:
              (customer.metrics?.productIds || []).join(',') ?? '',
            PRODUCT_ID_MISSING:
              (customer.metrics?.missingProductIds || []).join(',') ?? '',
          })) || [],
        name:
          'Zero_Weight_' + this.state.experiment.name + '_' + this.state.experiment.runId,
      });
    }
    this.exportService.exportMultipleCsv(
      files.map((file) => file.data),
      files.map((file) => file.name),
    );
  }
}
