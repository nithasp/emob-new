import { Component, inject } from '@angular/core';
import { NgxSpinnerService } from 'ngx-spinner';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { take } from 'rxjs';
import { TranslocoService } from '@jsverse/transloco';
import { DialogConfirmationComponent } from '@shared/components/dialogs/dialog-confirmation/dialog-confirmation.component';
import { LoggerService } from '@core/services/logger.service';
import { FileWithCategory } from '../../../models/pre-order.model';
import {
  Experiment,
  ExperimentStatus,
  Run,
  TransformLocationsData,
  TransformResult,
  UploadPreOrderResponse,
} from '../../../models/experiment.model';
import { ExperimentService } from '../../../services/experiment.service';
import { PreOrderService } from '../../../services/pre-order.service';
import { DialogTransformValidationComponent } from '../../dialogs/dialog-transform-validation/dialog-transform-validation.component';
import { RunStateService } from '../../services/run-state.service';
import { RunUiService } from '../../services/run-ui.service';
import { RunMapService } from '../../services/run-map.service';
import { RunParameterService } from '../../services/run-parameter.service';
import { RunUploadFileService } from '../../services/run-upload-file.service';
import { RunFileColumnService } from '../../services/run-file-column.service';
import { RunFileIntakeService } from '../../services/run-file-intake.service';
import { RunOrderDataService } from '../../services/run-order-data.service';
import { RunNavigationService } from '../../services/run-navigation.service';
import { ExperimentFileService } from '../../../services/experiment-file.service';

@Component({
  selector: 'app-run-upload-file',
  templateUrl: './run-upload-file.component.html',
  styleUrl: './run-upload-file.component.scss',
})
export class RunUploadFileComponent {
  private readonly logger = inject(LoggerService);

  constructor(
    private readonly spinner: NgxSpinnerService,
    private readonly experimentService: ExperimentService,
    private readonly ngbModal: NgbModal,
    private readonly toastr: ToastrService,
    private readonly preOrderService: PreOrderService,
    private readonly transloco: TranslocoService,
    protected readonly state: RunStateService,
    private readonly ui: RunUiService,
    private readonly runMap: RunMapService,
    private readonly params: RunParameterService,
    protected readonly files: RunUploadFileService,
    private readonly fileColumns: RunFileColumnService,
    protected readonly fileIntake: RunFileIntakeService,
    private readonly orders: RunOrderDataService,
    private readonly navigation: RunNavigationService,
    private readonly experimentFiles: ExperimentFileService,
  ) {}

  onFileSelected(eventOrFiles: Event | FileList) {
    let file: File | undefined;
    if (eventOrFiles instanceof FileList) {
      if (eventOrFiles.length === 0) return;
      file = eventOrFiles[0];
      if (eventOrFiles.length > 1) {
        this.toastr.warning(
          this.transloco.translate('cannot_use_multiple_files', {}, 'index'),
        );
      }
    } else {
      const input = eventOrFiles.target as HTMLInputElement | null;
      const files = input?.files || null;
      if (!files || files.length === 0) return;
      file = files[0];
      if (files.length > 1) {
        this.toastr.warning(
          this.transloco.translate('cannot_use_multiple_files', {}, 'index'),
        );
      }
    }
    if (!file) return;
    if (!this.files.isFileMatchingRequiredType(file)) {
      this.ui.showInvalidModal(
        this.transloco.translate('file_invalid', {}, 'index'),
        this.transloco.translate(
          'select_file_with_extension',
          { extension: this.files.requiredFileType },
          'index',
        ),
      );
      this.toastr.error(
        this.transloco.translate(
          'select_file_with_extension',
          { extension: this.files.requiredFileType },
          'index',
        ),
        this.transloco.translate('file_invalid', {}, 'index'),
      );
      return;
    }
    this.fileIntake.uploadFile(file);
  }

  resetFileInput(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (input) input.value = '';
  }

  handleUploadSubmit() {
    const focusedElement = document.activeElement as HTMLElement;
    if (focusedElement) {
      focusedElement.blur();
    }
    const dialogRef = this.ngbModal.open(DialogConfirmationComponent, {
      centered: true,
      animation: true,
    });
    dialogRef.componentInstance.title = this.transloco.translate(
      'upload_file_confirmation',
      {},
      'index',
    );
    dialogRef.componentInstance.question = `${this.transloco.translate(
      'do_you_want_to_upload_file',
      {},
      'index',
    )} ?`;

    dialogRef.result
      .then(async (confirmed: boolean) => {
        if (confirmed) {
          this.spinner.show();

          // Send the file exactly as the user picked it. The backend parses each
          // upload according to its inputdata fileFormatType, so a .csv must stay
          // real CSV bytes — the AI service reads it back with pandas.read_csv.
          const newPayload = this.files.preOrderFiles
            .filter((item): item is { id: string; file: FileWithCategory } =>
              this.files.isFileWithCategory(item.file),
            )
            .map(({ file }) => ({ file, keyName: file.keyName || '' }));

          // Prepare depotIds (single or multiple selection)
          let depotIds: string[] = [];
          if (this.state.selectedDepotIdName) {
            const found = this.state.depots.find(
              (d) => d.depotName === this.state.selectedDepotIdName,
            );
            if (found && found.depotId) {
              depotIds = [found.depotId];
            }
          }

          this.preOrderService
            .uploadPreOrder(this.state.experiment.runId, depotIds, newPayload)
            .subscribe({
              next: (response: UploadPreOrderResponse) => {
                this.logger.log('uploadPreOrder success response', response);

                if (response.result?.isSuccesses === false) {
                  this.spinner.hide();
                  this.openTransformValidationDialog(response.result);
                  return;
                }

                if (response.result?.isWarning && response.result?.warning) {
                  this.files.setTransformWarnings(response.result.warning);
                } else {
                  this.files.setTransformWarnings([]);
                }

                // getExperiment step
                // Refresh experiment data first, then proceed with grouping to ensure latest depots exist
                this.experimentService
                  .getExperiment(this.state.experiment.runId)
                  .pipe(take(1))
                  .subscribe({
                    next: async (exp: Experiment) => {
                      this.state.experiment = { ...exp };

                      if (exp.fileUrls?.transform?.locations) {
                        try {
                          const locationData: TransformLocationsData =
                            await this.experimentFiles.dataFromFileUrlToJson(
                              exp.fileUrls.transform.locations,
                            );
                          this.logger.log(
                            'post-upload transform locations data',
                            locationData,
                          );
                          if (locationData?.customers && locationData?.depots) {
                            this.orders.groupingCustomer(
                              locationData.customers,
                              locationData.depots,
                            );
                          }
                        } catch (err) {
                          this.logger.error(
                            'error fetching transform locations after upload',
                            err,
                          );
                        }
                      }

                      this.state.experiment.name = response.name;
                      this.files.showExperimentFiles(this.state.experiment.inputdata);

                      this.state.isFilePreview = false;
                      this.state.isFileSelectionStep = false;
                      this.toastr.success(
                        `${this.transloco.translate(
                          'upload_preorder_success',
                          {},
                          'index',
                        )}.`,
                      );
                      // Fetch latest dynamic parameters for the selected depot and rebuild UI
                      this.params.getDynamicParameters();

                      // Update upload button state after successful upload
                      this.files.updateCanUploadState();
                      this.spinner.hide();
                    },
                    error: (err) => {
                      this.logger.error(
                        'Error fetching experiment after upload:',
                        err,
                      );
                      this.spinner.hide();
                    },
                  });
              },
              error: (err) => {
                this.logger.error('Error uploading pre-order:', err);
                this.spinner.hide();
              },
            });
        }
      })
      .catch((error) => {
        this.logger.error('Dialog was dismissed:', error);
        this.spinner.hide();
      });
  }

  openTransformValidationDialog(validationResponse?: TransformResult) {
    const modalRef = this.ngbModal.open(DialogTransformValidationComponent, {
      centered: true,
      animation: true,
      windowClass: 'transform-validation-modal',
    });
    modalRef.componentInstance.validationResponse = validationResponse;
  }

  deleteFileInList(index: number) {
    if (
      this.state.experiment.run !== Run.Original &&
      this.state.experiment.status !== ExperimentStatus.Initializing
    ) {
      this.toastr.warning(
        this.transloco.translate('cannot_delete_file', {}, 'index'),
        this.transloco.translate('original_experiment_warning', {}, 'index'),
      );
      this.ui.openConfirmDialog(
        this.transloco.translate('cannot_delete_file', {}, 'index'),
        this.transloco.translate('original_experiment_warning', {}, 'index'),
        `${this.transloco.translate('rewrite_file_instruction', {}, 'index')}.`,
        this.transloco.translate('acknowledge', {}, 'index'),
      );
      return;
    }
    this.spinner.show();
    this.files.preOrderFiles.splice(index, 1);
    this.runMap.vectorSource.clear();
    this.state.isUpload = false;
    setTimeout(() => {
      /** spinner ends after 5 seconds */
      this.spinner.hide();
    }, 1000);
    this.resetOrderData();

    // Update upload button state after file deletion
    this.files.updateCanUploadState();
  }

  backToStep1() {
    const focusedElement = document.activeElement as HTMLElement;
    if (focusedElement) {
      focusedElement.blur();
    }

    const dialogRef = this.ngbModal.open(DialogConfirmationComponent, {
      centered: true,
      animation: true,
    });
    dialogRef.componentInstance.title = this.transloco.translate(
      'back_to_upload_step_confirmation',
      {},
      'index',
    );
    dialogRef.componentInstance.question = this.transloco.translate(
      'do_you_want_to_back_to_upload_step',
      {},
      'index',
    );

    dialogRef.result
      .then((confirmed: boolean) => {
        if (!confirmed) return;

        // Navigate back to first tab (Orders Data)
        this.navigation.activeNavId = 1;

        // Reset step state to upload mode (allow depot selection and file upload)
        this.state.isUpload = false;
        this.state.isFileSelectionStep = true;
        this.state.isFilePreview = true;

        // Clear uploaded files and preview data
        this.files.preOrderFiles = [];

        // Clear map orders markers and data-related states
        this.runMap.vectorSource.clear();
        this.resetOrderData();

        // Hide transform warnings
        this.files.transformWarnings = [];
        this.files.transformWarningCollapseStates = [];

        // Refresh depot list and input requirements from server with spinner
        this.files.getMyDepots(true);

        // Reset upload button state
        this.files.updateCanUploadState();
      })
      .catch(() => {
        // dismissed: do nothing
      });
  }

  private resetOrderData() {
    this.runMap.popupContent = null;
    this.orders.groupedDataPreOrder = {};
    this.orders.preOrderCount = 0;
    this.orders.uploadDataGroupCustomers = null;
    this.orders.customersLocationUpdated = [];
    this.orders.countUploadedCustomers = 0;
    this.state.validateExperiment = null;
  }

  async onDepotSelectionChange() {
    const depot = this.state.depots.find(
      (d) => d.depotName === this.state.selectedDepotIdName,
    );
    if (depot) {
      this.files.preOrderFiles = [];
      this.runMap.plotDepots([depot]);
      this.files.updateInputDataKeysFromDepot(depot);
      this.files.updateRequiredFileTypeByDepot(depot);
    } else {
      this.files.inputDataKeys = [];
      this.files.depotInputDataItems = [];
      this.files.updateRequiredFileTypeByDepot(undefined);
    }
    await this.fileColumns.validateUploadedFilesAgainstDepot();
    // refresh dynamic parameters render when depot changes
    this.params.refreshDynamicParametersForSelectedDepot();

    // Update upload button state after depot change
    this.files.updateCanUploadState();
  }
}
