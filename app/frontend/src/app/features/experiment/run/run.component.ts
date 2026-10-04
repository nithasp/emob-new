import {
  AfterViewInit,
  Component,
  OnInit,
  inject,
  ChangeDetectorRef,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgxSpinnerService } from 'ngx-spinner';
import { NgbTimeAdapter } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { take } from 'rxjs';
import { TranslocoService } from '@jsverse/transloco';
import { UserService } from '@core/services/auth/user.service';
import { VehicleService } from '@features/configurations/services/vehicle.service';
import { VehicleType, VehicleBlobData } from '@features/configurations/models/vehicle.model';
import { LoggerService } from '@core/services/logger.service';
import { applyMultiTripFallback } from '@features/configurations/utils/multi-trip-fallback.utils';
import { NgbTimeStringAdapter } from '@shared/adapters/ngb-time-string.adapter';
import { Constraint } from '../models/constraint.model';
import {
  Experiment,
  Result,
  ExperimentStatus,
  TransformLocationsData,
} from '../models/experiment.model';
import { ExperimentService } from '../services/experiment.service';
import { RunStateService } from './services/run-state.service';
import { RunUiService } from './services/run-ui.service';
import { RunMapService } from './services/run-map.service';
import { RunParameterService } from './services/run-parameter.service';
import { RunVehicleService } from './services/run-vehicle.service';
import { RunVehiclePoolService } from './services/run-vehicle-pool.service';
import { RunVehicleSelectionService } from './services/run-vehicle-selection.service';
import { RunUploadFileService } from './services/run-upload-file.service';
import { RunOrderDataService } from './services/run-order-data.service';
import { RunNavigationService } from './services/run-navigation.service';
import { RunValidationService } from './services/run-validation.service';
import { ExperimentFileService } from '../services/experiment-file.service';
import { RUN_PAGE_PROVIDERS } from './services/run-page.providers';

@Component({
  selector: 'app-run',
  templateUrl: './run.component.html',
  styleUrl: './run.component.scss',
  providers: [
    { provide: NgbTimeAdapter, useClass: NgbTimeStringAdapter },
    ...RUN_PAGE_PROVIDERS,
  ],
})
export class RunComponent implements OnInit, AfterViewInit {
  private readonly logger = inject(LoggerService);

  constructor(
    private readonly spinner: NgxSpinnerService,
    private readonly route: ActivatedRoute,
    private readonly experimentService: ExperimentService,
    private readonly toastr: ToastrService,
    private readonly router: Router,
    private readonly userService: UserService,
    private readonly transloco: TranslocoService,
    private readonly vehicleService: VehicleService,
    protected readonly state: RunStateService,
    private readonly ui: RunUiService,
    private readonly runMap: RunMapService,
    protected readonly params: RunParameterService,
    protected readonly fleet: RunVehicleService,
    private readonly pool: RunVehiclePoolService,
    private readonly vehicleSelection: RunVehicleSelectionService,
    protected readonly files: RunUploadFileService,
    private readonly orders: RunOrderDataService,
    protected readonly navigation: RunNavigationService,
    private readonly validation: RunValidationService,
    private readonly experimentFiles: ExperimentFileService,
    cdr: ChangeDetectorRef,
  ) {
    this.ui.attachView(cdr);
  }

  ngOnInit(): void {
    this.spinner.show();
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.state.isCreateMode = history.state.isCreateMode;
      this.route.params
        .pipe(take(1))
        .subscribe((params: { [x: string]: string }) => {
          this.vehicleService
            .getMyVehicleTypes()
            .pipe(take(1))
            .subscribe({
              next: (vehicleTypes: VehicleType[]) => {
                this.fleet.myVehicleTypes = applyMultiTripFallback(vehicleTypes);
                this.ui.detectChanges();

                this.experimentService
                  .getExperiment(params['runId'])
                  .subscribe({
                    next: (response: Experiment) => {
                      this.state.experiment = { ...response };
                      this.logger.log('experiment', this.state.experiment);

                      if (response.fileUrls?.transform?.locations) {
                        this.experimentFiles.dataFromFileUrlToJson(
                          response.fileUrls.transform.locations,
                        )
                          .then((data: TransformLocationsData) => {
                            this.logger.log('transform locations data', data);
                            if (data?.customers && data?.depots) {
                              this.orders.groupingCustomer(
                                data.customers,
                                data.depots,
                              );
                            }
                          })
                          .catch((err) => {
                            this.logger.error(
                              'error fetching transform locations data',
                              err,
                            );
                          });
                      }

                      if (
                        response.fileUrls?.validate?.parameterFormats &&
                        response.fileUrls?.validate?.vehicleTypes &&
                        response.fileUrls?.validate?.preVRPSolution
                      ) {
                        this.state.isUpload = true;
                        this.state.haveValidated = true;
                        if (!response.fileUrls?.validate?.errorWarning) {
                          this.validation.isValidationWarning = false;
                          this.validation.setValidationWarnings([]);
                          this.validation.isValidationError = false;
                          this.validation.setValidationErrors([]);
                        } else {
                          this.experimentFiles.dataFromFileUrlToJson(
                            response.fileUrls?.validate.errorWarning,
                          )
                            .then((data) => {
                              this.logger.log(data);
                              const warnings = data?.warnings || [];
                              const errors = data?.errors || [];
                              this.validation.isValidationWarning = warnings.length > 0;
                              this.validation.setValidationWarnings(warnings);
                              this.validation.isValidationError = errors.length > 0;
                              this.validation.setValidationErrors(errors);
                            })
                            .catch((err) => {
                              this.logger.error(
                                'error fetching validate warning data',
                                err,
                              );
                            });
                        }
                      } else {
                        this.validation.isValidationWarning = false;
                        this.validation.setValidationWarnings([]);
                        this.validation.isValidationError = false;
                        this.validation.setValidationErrors([]);
                      }

                      if (response.fileUrls?.transform?.warning) {
                        this.experimentFiles.dataFromFileUrlToJson(
                          response.fileUrls.transform.warning,
                        )
                          .then((data) => {
                            this.logger.log('transform warning data', data);
                            this.files.setTransformWarnings(data);
                          })
                          .catch((err) => {
                            this.logger.error(
                              'error fetching transform warning data',
                              err,
                            );
                          });
                      }

                      if (
                        this.state.experiment.status !== ExperimentStatus.Initializing
                      ) {
                        this.spinner.hide();
                        this.ui.openConfirmDialog(
                          this.transloco.translate('warning'),
                          `${this.transloco.translate(
                            'this_experiment_have_been',
                            {},
                            'index',
                          )} ${this.state.experiment.status}`,
                          `${this.transloco.translate(
                            'we_will_to_go_back_to_the_experiments_page',
                            {},
                            'index',
                          )}?`,
                          this.transloco.translate('acknowledge', {}, 'index'),
                          true,
                        ).result.then(() => {
                          this.spinner.hide();
                          this.router.navigate(['/users/experiments']);
                        });
                      } else
                        this.userService
                          .getUserId()
                          .pipe(take(1))
                          .subscribe({
                            next: (userId: string | null) => {
                              if (userId !== this.state.experiment.triggeredBy) {
                                this.spinner.hide();
                                this.ui.openConfirmDialog(
                                  this.transloco.translate('warning'),
                                  this.transloco.translate(
                                    'you_are_not_the_creator_of_this_experiment',
                                    {},
                                    'index',
                                  ),
                                  `${this.transloco.translate(
                                    'we_will_to_go_back_to_the_experiments_page',
                                    {},
                                    'index',
                                  )}?`,
                                  this.transloco.translate(
                                    'acknowledge',
                                    {},
                                    'index',
                                  ),
                                  true,
                                ).result.then(() => {
                                  this.router.navigate(['/users/experiments']);
                                });
                              } else if (
                                !this.state.experiment.inputdata?.some(
                                  (data) => data.fileUrl,
                                )
                              ) {
                                this.params.getDynamicParameters();
                                this.state.isFilePreview = true;
                                this.spinner.hide();
                              } else {
                                this.initializeDataFromExperiment(
                                  this.state.experiment,
                                ).finally(() => {
                                  this.state.isFileSelectionStep = false;
                                  const v = response.fileUrls?.validate;
                                  const allFilesReady = !!(
                                    v?.parameterFormats &&
                                    v?.vehicleTypes &&
                                    v?.preVRPSolution
                                  );
                                  if (allFilesReady && !v?.errorWarning) {
                                    this.state.isUpload = true;
                                    this.state.haveValidated = true;
                                  }
                                  setTimeout(() => {
                                    this.toastr.success(
                                      this.transloco.translate(
                                        'success_load_experiment',
                                        {},
                                        'index',
                                      ),
                                      this.state.experiment.name,
                                    );
                                    this.spinner.hide();
                                  }, 500);
                                });
                              }
                            },
                            error: (err) => {
                              this.logger.error('Error getting user ID:', err);
                              this.spinner.hide();
                            },
                          });
                    },
                    error: () => {
                      this.spinner.hide();
                    },
                  });
              },
              error: () => {
                this.spinner.hide();
              },
            });
        });

      this.runMap.initIconStyle();
      this.runMap.initMap();
      this.files.getMyDepots();
      this.params.getValidateMessage();
      this.pool.loadVehiclePool();
    }, 100);
    this.validation.resetMessageCache();
    this.transloco.langChanges$.subscribe(() => {
      this.validation.resetMessageCache();
      this.ui.detectChanges();
    });
  }

  async initializeDataFromExperiment(experiment: Experiment) {
    this.logger.log("initialize Data From Experiment's historical", experiment);
    if (experiment.fileUrls?.validate?.parameterFormats) {
      this.experimentFiles.dataFromFileUrlToJson(
        experiment.fileUrls.validate.parameterFormats,
      ).then((response: Constraint) => {
        this.logger.log('Constraint', response);
        this.params.constraintsData = { ...response };
        this.params.constraintsFromFileLoaded = true;
        if (this.params.allDynamicParameters?.length) {
          this.params.refreshDynamicParametersForSelectedDepot();
        }
        this.logger.log(this.params.constraintsData);
      });
    } else {
      this.params.getDynamicParameters();
    }
    this.params.getDynamicParameters();

    if (experiment.fileUrls?.validate?.vehicleTypes) {
      this.toastr.info(
        this.transloco.translate('loading_vehicle_data', {}, 'index'),
        `${this.transloco.translate('please_wait', {}, 'index')} ...`,
      );
      await this.experimentFiles.dataFromFileUrlToJson(
        experiment.fileUrls.validate.vehicleTypes,
      ).then((response: VehicleBlobData[]) => {
        this.logger.log('Vehicles Data from vehiclesBlobPathUrl:', response);
        this.vehicleSelection.loadVehicleDataFromBlob(response);
      });
    }

    this.toastr.info(
      this.transloco.translate('loading_preorder_data', {}, 'index'),
      `${this.transloco.translate('please_wait', {}, 'index')} ...`,
    );

    this.files.showExperimentFiles(experiment.inputdata);

    this.files.updateCanUploadState();

    this.toastr.info(
      this.transloco.translate('loading_geo_location_data', {}, 'index'),
      `${this.transloco.translate('please_wait', {}, 'index')} ...`,
    );

    if (experiment.fileUrls?.transform?.locations) {
      this.logger.log(
        'experiment.fileUrls?.transform?.locations',
        experiment.fileUrls?.transform?.locations,
      );
      await this.experimentFiles.dataFromFileUrlToJson(
        experiment.fileUrls.transform.locations,
      ).then((response: TransformLocationsData) => {
        this.logger.log('transform locations response', response);
        if (response?.customers && response?.depots) {
          this.orders.groupingCustomer(response.customers, response.depots);
        }
      });
    }

    if (experiment.fileUrls?.validate?.preVRPSolution) {
      this.logger.log(
        'experiment.fileUrls?.validate?.preVRPSolution',
        experiment.fileUrls?.validate?.preVRPSolution,
      );
      this.toastr.info(
        this.transloco.translate('loading_validation_data', {}, 'index'),
        `${this.transloco.translate('please_wait', {}, 'index')} ...`,
      );
      await this.experimentFiles.dataFromFileUrlToJson(
        experiment.fileUrls.validate.preVRPSolution,
      ).then((response: Result) => {
        this.logger.log('Result', response);
        this.state.validateExperiment = response.validate;
        this.state.haveValidated = true;
        if (this.params.allDynamicParameters?.length) {
          this.params.refreshDynamicParametersForSelectedDepot();
        }
        this.params.showAllValidateMessages();
      });
    }
  }
}
