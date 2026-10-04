import {
  AfterViewInit,
  Component,
  ElementRef,
  Injectable,
  OnInit,
  TemplateRef,
  ViewChild, inject,
} from '@angular/core';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import {
  defaults as defaultControls,
  ZoomSlider,
  FullScreen,
  Attribution,
} from 'ol/control';
import * as OlProj from 'ol/proj';
import Feature from 'ol/Feature';
import type { FeatureLike } from 'ol/Feature';
import Point from 'ol/geom/Point';
import Icon from 'ol/style/Icon';
import SimpleGeometry from 'ol/geom/SimpleGeometry';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Overlay from 'ol/Overlay';
import { Coordinate } from 'ol/coordinate';
import MapBrowserEvent from 'ol/MapBrowserEvent';
import OSM from 'ol/source/OSM';
import { NgxSpinnerService } from 'ngx-spinner';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';

import * as ExcelJS from 'exceljs';
import {
  Customer,
  CustomerProduct,
  CustomerUpdated,
  DataPreOrder,
  Depot,
  DepotInputDataItem,
  FileWithCategory,
  GroupedDataPreOrder,
  PreOrder,
  PreOrderFileDescriptor,
  PreOrderFileItem,
  ReplaceType,
  ValidationType,
} from 'src/app/models/pre-order.model';

import Style from 'ol/style/Style';
import { ConstraintService } from 'src/app/services/constraint.service';
import {
  Constraint,
  DynamicParameter,
  LocalizedText,
} from 'src/app/models/constraint.model';
import type { TimingAndCapacity } from 'src/app/models/constraint.model';
import { ActivatedRoute, Router } from '@angular/router';
import {
  Experiment,
  ExperimentInputdata,
  Result,
  ExperimentStatus,
  Run,
  Validate,
  Company,
  MyDepot,
  DepotInputRequirement,
  TransformLocationsData,
  TransformWarning,
  TransformResult,
  ValidationWarningItem,
  WarningDetail,
  UploadPreOrderResponse,
  ValidateExperimentResponse,
} from 'src/app/models/experiment.model';
import { ExperimentService } from 'src/app/services/experiment.service';
import {
  NgbTimeStruct,
  NgbTimeAdapter,
  NgbModal,
  NgbTooltip,
} from '@ng-bootstrap/ng-bootstrap';
import { ConfirmationDialogComponent } from '../components/confirmation-dialog/confirmation-dialog.component';
import { ConfirmationDepotUploadFileDialogComponent } from '../components/confirmation-depot-upload-file-dialog/confirmation-depot-upload-file-dialog.component';
import { ToastrService } from 'ngx-toastr';
import { PreOrderService } from 'src/app/services/pre-order.service';
import { ChangeDetectorRef } from '@angular/core';
import { MatSort } from '@angular/material/sort';
import {
  DataGroup,
  DisplayLocationType,
  IconStyle,
  LocationType,
  Location,
} from 'src/app/models/location.model';
import { CustomerDetailsComponent } from '../components/customer-details/customer-details.component';
import { DetailsDialogComponent } from '../components/details-dialog/details-dialog.component';
import { VehicleTypeDialogComponent } from '../configuration/vehicle-management/dialogs/vehicle-type-dialog/vehicle-type-dialog.component';
import { CustomerListComponent } from '../components/customer-list/customer-list.component';
import { LicensePlateSelectionDialogComponent } from '../components/license-plate-selection-dialog/license-plate-selection-dialog.component';
import { TransformValidationDialogComponent } from '../components/transform-validation-dialog/transform-validation-dialog.component';
import { ValidateMessage } from 'src/app/models/validation-message';
import { UserService } from 'src/app/services/user.service';
import { firstValueFrom, take } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { ConfigurationService } from 'src/app/services/configuration.service';
import { DataService } from 'src/app/services/data.service';
import { ExportFileService } from 'src/app/services/export-file.service';
import Text from 'ol/style/Text';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import { TranslocoService } from '@jsverse/transloco';
import { VehicleService } from 'src/app/services/vehicle.service';
import {
  VehicleType,
  VehicleValidationInput,
  VehicleBlobData,
  MyVehicles,
  OpenVrpDepotRunList,
  OpenVrpDepotSummary,
  OpenVrpEndOfRoute,
  OpenVrpPoolBuilder,
  OpenVrpRunSummaryTotals,
  OpenVrpRunVehicleEntry,
  OpenVrpRunVehicleGroup,
  OpenVrpSelectionMode,
  OpenVrpVehiclePreset,
  DEFAULT_MAX_TRIP,
} from 'src/app/models/vehicle.model';

import { ValidationTableRow } from 'src/app/models/validation-table.model';
import {
  buildTableRows,
  createCachedValidationMessageFn,
} from 'src/app/shared/utils/validation-table.utils';
import { LoggerService, logMessage } from 'src/app/services/logger.service';
import {
  applyMultiTripFallback,
  getMultiTripSystemDefaults,
} from 'src/app/shared/utils/multi-trip-fallback.utils';
import {
  buildMockDepotRunLists,
  sumDepotSummaries,
  sumRunEntries,
} from 'src/app/shared/utils/multi-depot-summary.utils';
import {
  addOrMergeRunEntry,
  groupRunEntriesByVehicleType,
} from 'src/app/shared/utils/vehicle-run-list.utils';

const pad = (i: number): string => (i < 10 ? `0${i}` : `${i}`);

/**
 * How long a duplicate add stays announced. The toast and the highlighted row
 * are one notice in two places, so they read off the same number — a highlight
 * that faded first left the toast pointing at a row nothing marked any more.
 */
const RUN_ENTRY_MERGE_NOTICE_MS = 8000;

const OPEN_VRP_MULTI_TRIP_DEMO = [
  { loadingDuration: '00:30' },
  { loadingDuration: '00:20' },
  { loadingDuration: '00:45' },
];

@Injectable()
export class NgbTimeStringAdapter extends NgbTimeAdapter<string> {
  fromModel(value: string | null): NgbTimeStruct | null {
    if (value == null) {
      return null;
    }
    const trimmed = `${value}`.trim();
    if (!trimmed || trimmed.toLowerCase() === 'null') {
      return null;
    }
    const split = trimmed.split(':');
    const hour = parseInt(split[0] || '0', 10);
    const minute = parseInt(split[1] || '0', 10);
    const second: number | undefined =
      split.length > 2 ? parseInt(split[2] || '0', 10) : undefined;
    return {
      hour: isNaN(hour) ? 0 : hour,
      minute: isNaN(minute) ? 0 : minute,
      ...(typeof second === 'number' && !isNaN(second) ? { second } : {}),
    } as NgbTimeStruct;
  }

  toModel(time: NgbTimeStruct | null): string | null {
    return time != null ? `${pad(time.hour)}:${pad(time.minute)}` : null;
  }
}

@Component({
  selector: 'app-run',
  templateUrl: './run.component.html',
  styleUrl: './run.component.scss',
  providers: [{ provide: NgbTimeAdapter, useClass: NgbTimeStringAdapter }],
})
export class RunComponent implements OnInit, AfterViewInit {
  private readonly logger = inject(LoggerService);

  // Condition
  public activeNavId = 1;
  public isUpload: boolean = false;
  public isFileSelectionStep: boolean = true;
  public requiredFileType: string = '.xlsx, .xls';
  readonly validTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ];
  private readonly extensionMimeMap: Record<string, string[]> = {
    '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    '.xls': ['application/vnd.ms-excel', 'application/octet-stream'],
    '.csv': ['text/csv', 'application/csv', 'application/vnd.ms-excel'],
  };

  private depotInputDataItems: DepotInputDataItem[] = [];

  public haveUpdateAfterValidated: boolean = false;
  haveValidated = false;
  public isValidateShowMessage = {
    OrderData: {
      invalidCoordinate: true,
    },
    parameter: {
      overDistance: true,
      overWeight: true,
    },
    validate: {
      invalidCoordinate: true,
      overDistance: true,
      overWeight: true,
    },
  };
  public validateMessage!: ValidateMessage;

  // map rendering
  private map!: Map;
  private readonly iconStyle: Partial<IconStyle> = {};
  private vectorSource!: VectorSource;
  private vectorSourceDepot!: VectorSource;
  private vectorLayer!: VectorLayer;
  private vectorLayerDepot!: VectorLayer;

  private popUp?: Overlay;

  // store data
  public experiment = <Experiment>{};
  public preOrderFiles: PreOrderFileItem[] = [];
  private fileDisplayNameBeforeChange: { [fileId: string]: string } = {};
  // Store file columns when first uploaded for later validation
  private fileColumnsCache: { [fileId: string]: string[] } = {};
  public popupContent?: { data: Customer; isDepot: boolean } | null;
  private dataPreOrder: Array<PreOrder> = [];
  public groupedDataPreOrder: Partial<GroupedDataPreOrder> = {};
  public preOrderCount: number = 0;
  public uploadDataGroupCustomers?: DataGroup | null;
  public customersLocationUpdated: Array<CustomerUpdated> = [];
  public countUploadedCustomers: number = 0;
  public constraintsData: Constraint = {
    earlyDeliveryTime: '',
    backToDepotTime: '',
    maximumWorkDuration: '',
    numberOfVehicleAvailable: 0,
    vehicleOrderSizeCapacity: 0,
    maximumTravelDistance: 0,
    serviceDurationTime: '',
    minimumVehicle: 0,
  };
  public validateExperiment: Validate | null = null;
  public companyDepotType: string = '';
  private constraintsFromFileLoaded: boolean = false;

  //display table and virtualization

  displayLocationType: DisplayLocationType = {
    verify: false,
    uncertain: true,
    unverify: true,
    edit: true,
  };
  locationTypeEnum = LocationType;
  displayedColumns: string[] = [
    'No',
    'ORDERID_ORG',
    'ADDRESS',
    'AUMPHER',
    'PROVINCE',
    'TotalOrder',
  ];
  dataSource = new MatTableDataSource<Customer>();

  transformWarnings: TransformWarning[] = [];
  transformWarningCollapseStates: boolean[] = [];
  validationWarnings: ValidationWarningItem[] = [];
  validationWarningCollapseStates: boolean[] = [];
  isValidationWarning: boolean = false;
  validationErrors: ValidationWarningItem[] = [];
  validationErrorCollapseStates: boolean[] = [];
  isValidationError: boolean = false;
  private cachedGetValidationMessage!: ReturnType<
    typeof createCachedValidationMessageFn
  >;

  // Mat table
  @ViewChild(MatPaginator, { static: false })
  set paginator(value: MatPaginator) {
    if (this.dataSource) {
      this.dataSource.paginator = value;
    }
  }
  @ViewChild(MatSort, { static: false })
  set sort(value: MatSort) {
    if (this.dataSource) {
      this.dataSource.sort = value;
    }
  }

  isCreateMode: boolean = false;
  isFilePreview: boolean = false;

  public depots: MyDepot[] = [];
  public selectedDepotIdName: string | null = null;
  public inputDataKeys: string[] = [];
  // dynamic parameters rendering
  public allDynamicParameters: DynamicParameter[] = [];
  public dynamicParametersByCategory: Array<{
    key: string;
    items: DynamicParameter[];
  }> = [];

  public canUpload: boolean = false;

  // vehicles
  public myVehicleTypes: VehicleType[] = [];
  public selectedVehicleIds: string[] = [];
  public selectedVehicleCounts: Record<string, number> = {};
  public vehicleSelectionMode: Record<string, 'count' | 'license-plate'> = {};
  public selectedLicensePlates: Record<string, string[]> = {};
  public selectedVehicleIdsByLicensePlate: Record<string, string[]> = {};
  public vehicleSelectionError: boolean = false;
  private readonly defaultVehicleMaxCount = 1000;

  // ---------- Open VRP: central vehicle pool / run list ----------
  /** Central pool (master data): all company vehicles grouped by vehicleTypeId. */
  public poolVehiclesByType: Record<string, MyVehicles[]> = {};
  public poolLoading: boolean = false;
  /** Currently expanded pool card (vehicle type) in the configuration panel. */
  public openPoolCardTypeId: string | null = null;
  /** Builder (configuration panel) state per `${depotId}:${vehicleTypeId}`. */
  private poolBuilders: Record<string, OpenVrpPoolBuilder> = {};
  /** Run list (selected vehicles) kept per depot scope, mirroring the mockup. */
  public runVehicleListByDepot: Record<string, OpenVrpRunVehicleEntry[]> = {};
  private runEntryIdCounter = 1;
  /** Run list row that just absorbed a duplicate, highlighted for a moment. */
  public highlightedRunEntryId: number | null = null;
  private highlightTimer?: ReturnType<typeof setTimeout>;
  /** Open VRP: collapse the map column while working on the Vehicle tab. */
  public isMapCollapsed: boolean = false;
  /**
   * Preview switch: feeds mock multi-trip master data into the vehicle tab so
   * the finished UI can be reviewed before the API ships the real fields.
   * Nothing else is stubbed — every panel below still runs the real logic.
   */
  public multiTripDemo: boolean = false;
  /**
   * Preview switch: a run still reports one depot, so the summary pane is fed
   * extra sample depots to show the multi-depot roll-up. Only those extra
   * depots are mock — every figure is counted by the real aggregation.
   */
  public multiDepotDemo: boolean = false;
  /** Sample run lists behind `multiDepotDemo`, built once per preview. */
  private mockDepotRunLists: OpenVrpDepotRunList[] | null = null;
  /**
   * System defaults a pool card opens on. Same source the vehicle type dialog
   * seeds its form with, so "the default" means one number across the app.
   * Mock today — swap `getMultiTripSystemDefaults()` for the API payload.
   */
  public readonly multiTripDefaults = getMultiTripSystemDefaults();

  // Open VRP: preset configuration (save/load vehicle run list per depot)
  public presetName: string = '';
  private readonly openVrpPresetStorageKey = 'openVrpVehiclePresets';
  private presetsVersion = 0;
  private presetsCacheKey: string | null = null;
  private presetsCache: OpenVrpVehiclePreset[] = [];
  @ViewChild('savePresetModal') savePresetModalTemplate?: TemplateRef<unknown>;

  constructor(
    private readonly spinner: NgxSpinnerService,
    private readonly constraintService: ConstraintService,
    private readonly route: ActivatedRoute,
    private readonly experimentService: ExperimentService,
    private readonly ngbModal: NgbModal,
    private readonly toastr: ToastrService,
    private readonly preOrderService: PreOrderService,
    private readonly cdr: ChangeDetectorRef,
    private readonly router: Router,
    private readonly userService: UserService,
    private readonly configurationService: ConfigurationService,
    private readonly dataService: DataService,
    private readonly exportService: ExportFileService,
    private readonly transloco: TranslocoService,
    private readonly vehicleService: VehicleService,
    private readonly hostRef: ElementRef<HTMLElement>,
  ) {}

  public generateUniqueId(): string {
    return 'f-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now();
  }

  get requiredFileTypes(): string[] {
    return this.depotInputDataItems.map((item) => item.displayName);
  }

  private normalizeFileExtension(fileFormatType?: string | null): string {
    const raw = (fileFormatType || '').trim().toLowerCase();
    if (!raw) return '';
    return raw.startsWith('.') ? raw : `.${raw}`;
  }

  private getAllowedFileExtensionsFromDepot(depot?: MyDepot): string[] {
    if (!depot?.inputdata?.length) {
      return ['.xlsx', '.xls'];
    }

    const prioritized: string[] = [];
    for (const inputItem of depot.inputdata) {
      const extension = this.normalizeFileExtension(inputItem.fileFormatType);
      if (!extension) continue;

      const candidates =
        extension === '.xlsx'
          ? ['.xlsx', '.xls']
          : extension === '.xls'
            ? ['.xls', '.xlsx']
            : [extension];

      for (const candidate of candidates) {
        if (!prioritized.includes(candidate)) {
          prioritized.push(candidate);
        }
      }
    }

    return prioritized.length ? prioritized : ['.xlsx', '.xls'];
  }

  private getRequiredFileTypeDisplay(extensions: string[]): string {
    return extensions.join(', ');
  }

  private updateRequiredFileTypeByDepot(depot?: MyDepot): void {
    const allowedExtensions = this.getAllowedFileExtensionsFromDepot(depot);
    this.requiredFileType = this.getRequiredFileTypeDisplay(allowedExtensions);
  }

  private isFileMatchingRequiredType(file: File): boolean {
    const selectedDepot = this.getSelectedDepotObject();
    const allowedExtensions = this.getAllowedFileExtensionsFromDepot(selectedDepot);
    const normalizedFileName = (file.name || '').toLowerCase();
    const fileExtension =
      normalizedFileName.lastIndexOf('.') >= 0
        ? normalizedFileName.slice(normalizedFileName.lastIndexOf('.'))
        : '';
    const normalizedMimeType = (file.type || '').toLowerCase();

    return allowedExtensions.some((extension) => {
      if (fileExtension === extension) {
        return true;
      }
      const allowedMimeTypes = this.extensionMimeMap[extension] || [];
      return !!normalizedMimeType && allowedMimeTypes.includes(normalizedMimeType);
    });
  }

  private parseCsvHeaderColumnNames(csvText: string): string[] {
    const text = (csvText || '').replace(/^\uFEFF/, '');
    const firstLine = text.split(/\r\n|\n|\r/)[0] || '';
    if (!firstLine.trim()) return [];

    const delimiters = [',', ';', '\t', '|'];
    const count = (line: string, ch: string) =>
      Array.from(line).filter((c) => c === ch).length;
    const delimiter =
      delimiters
        .map((d) => ({ d, n: count(firstLine, d) }))
        .sort((a, b) => b.n - a.n)[0]?.d || ',';

    const cols: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < firstLine.length; i++) {
      const ch = firstLine[i];
      if (ch === '"') {
        const next = firstLine[i + 1];
        if (inQuotes && next === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }
      if (!inQuotes && ch === delimiter) {
        cols.push(cur.trim().replace(/^"+|"+$/g, ''));
        cur = '';
        continue;
      }
      cur += ch;
    }
    cols.push(cur.trim().replace(/^"+|"+$/g, ''));

    return cols.filter(Boolean);
  }

  isFileTypeRequired(displayName: string): boolean {
    return (
      this.depotInputDataItems.find((item) => item.displayName === displayName)
        ?.required ?? false
    );
  }

  isFileTypeAlreadyAdded(displayName: string): boolean {
    return this.preOrderFiles.some(
      (fileItem) => fileItem.file.displayName === displayName,
    );
  }

  // trackBy helpers to keep accordion stable across change detection/language swaps
  trackByGroup(
    index: number,
    group: { key: string; items: DynamicParameter[] },
  ): string {
    return group.key;
  }
  trackByParam(index: number, p: DynamicParameter): string {
    return p.id || `${p.depotId}-${p.keyName}-${index}`;
  }

  ngOnInit(): void {
    this.spinner.show();
  }
  ngAfterViewInit() {
    setTimeout(() => {
      this.isCreateMode = history.state.isCreateMode;
      this.route.params
        .pipe(take(1))
        .subscribe((params: { [x: string]: string }) => {
          // First, ensure vehicle types are loaded
          this.vehicleService
            .getMyVehicleTypes()
            .pipe(take(1))
            .subscribe({
              next: (vehicleTypes: VehicleType[]) => {
                this.myVehicleTypes = applyMultiTripFallback(vehicleTypes);
                this.cdr.detectChanges();

                // Now proceed with loading experiment data
                this.experimentService
                  .getExperiment(params['runId'])
                  .subscribe({
                    next: (response: Experiment) => {
                      this.experiment = { ...response };
                      this.logger.log('experiment', this.experiment);

                      if (response.fileUrls?.transform?.locations) {
                        this.dataFromFileUrlToJson(
                          response.fileUrls.transform.locations,
                        )
                          .then((data: TransformLocationsData) => {
                            this.logger.log('transform locations data', data);
                            if (data?.customers && data?.depots) {
                              this.groupingCustomer(
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
                        this.isUpload = true;
                        this.haveValidated = true;
                        if (!response.fileUrls?.validate?.errorWarning) {
                          this.isValidationWarning = false;
                          this.setValidationWarnings([]);
                          this.isValidationError = false;
                          this.setValidationErrors([]);
                        } else {
                          this.dataFromFileUrlToJson(
                            response.fileUrls?.validate.errorWarning,
                          )
                            .then((data) => {
                              this.logger.log(data);
                              const warnings = data?.warnings || [];
                              const errors = data?.errors || [];
                              this.isValidationWarning = warnings.length > 0;
                              this.setValidationWarnings(warnings);
                              this.isValidationError = errors.length > 0;
                              this.setValidationErrors(errors);
                            })
                            .catch((err) => {
                              this.logger.error(
                                'error fetching validate warning data',
                                err,
                              );
                            });
                        }
                      } else {
                        this.isValidationWarning = false;
                        this.setValidationWarnings([]);
                        this.isValidationError = false;
                        this.setValidationErrors([]);
                      }

                      if (response.fileUrls?.transform?.warning) {
                        this.dataFromFileUrlToJson(
                          response.fileUrls.transform.warning,
                        )
                          .then((data) => {
                            this.logger.log('transform warning data', data);
                            this.setTransformWarnings(data);
                          })
                          .catch((err) => {
                            this.logger.error(
                              'error fetching transform warning data',
                              err,
                            );
                          });
                      }

                      if (
                        this.experiment.status !== ExperimentStatus.Initializing
                      ) {
                        this.spinner.hide();
                        this.openConfirmDialog(
                          this.transloco.translate('warning'),
                          `${this.transloco.translate(
                            'this_experiment_have_been',
                            {},
                            'index',
                          )} ${this.experiment.status}`,
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
                              if (userId !== this.experiment.triggeredBy) {
                                this.spinner.hide();
                                this.openConfirmDialog(
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
                                !this.experiment.inputdata?.some(
                                  (data) => data.fileUrl,
                                )
                              ) {
                                this.getDynamicParameters();
                                this.isFilePreview = true;
                                this.spinner.hide();
                              } else {
                                this.initializeDataFromExperiment(
                                  this.experiment,
                                ).finally(() => {
                                  this.isFileSelectionStep = false;
                                  const v = response.fileUrls?.validate;
                                  const allFilesReady = !!(
                                    v?.parameterFormats &&
                                    v?.vehicleTypes &&
                                    v?.preVRPSolution
                                  );
                                  if (allFilesReady && !v?.errorWarning) {
                                    this.isUpload = true;
                                    this.haveValidated = true;
                                  }
                                  setTimeout(() => {
                                    this.toastr.success(
                                      this.transloco.translate(
                                        'success_load_experiment',
                                        {},
                                        'index',
                                      ),
                                      this.experiment.name,
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

      this.initIconStyle();
      this.initMap();
      this.getMyDepots();
      this.getValidateMessage();
      this.loadVehiclePool();
    }, 100);
    this.dataSource.paginator = this.paginator; // For pagination
    this.dataSource.sort = this.sort; // For sort
    this.cachedGetValidationMessage = createCachedValidationMessageFn(
      this.transloco,
    );
    // react to language changes: only trigger change detection (no regroup)
    this.transloco.langChanges$.subscribe(() => {
      this.cachedGetValidationMessage = createCachedValidationMessageFn(
        this.transloco,
      );
      this.cdr.detectChanges();
    });
  }

  async initializeDataFromExperiment(experiment: Experiment) {
    this.logger.log("initialize Data From Experiment's historical", experiment);
    // Load Parameter
    if (experiment.fileUrls?.validate?.parameterFormats) {
      this.dataFromFileUrlToJson(
        experiment.fileUrls.validate.parameterFormats,
      ).then((response: Constraint) => {
        this.logger.log('Constraint', response);
        this.constraintsData = { ...response };
        this.constraintsFromFileLoaded = true;
        // Ensure UI reflects constraint values on init
        if (this.allDynamicParameters?.length) {
          this.refreshDynamicParametersForSelectedDepot();
        }
        this.logger.log(this.constraintsData);
      });
    } else {
      this.getDynamicParameters();
    }
    // ensure dynamic parameter metadata for rendering is loaded too
    this.getDynamicParameters();

    // Load Vehicles data
    if (experiment.fileUrls?.validate?.vehicleTypes) {
      this.toastr.info(
        this.transloco.translate('loading_vehicle_data', {}, 'index'),
        `${this.transloco.translate('please_wait', {}, 'index')} ...`,
      );
      await this.dataFromFileUrlToJson(
        experiment.fileUrls.validate.vehicleTypes,
      ).then((response: VehicleBlobData[]) => {
        this.logger.log('Vehicles Data from vehiclesBlobPathUrl:', response);
        this.loadVehicleDataFromBlob(response);
      });
    }

    this.toastr.info(
      this.transloco.translate('loading_preorder_data', {}, 'index'),
      `${this.transloco.translate('please_wait', {}, 'index')} ...`,
    );

    this.preOrderFiles = (experiment.inputdata || []).map(
      (inputItem: ExperimentInputdata) => {
        const mockFile = {
          keyName: inputItem.keyName,
          name: inputItem.filename,
          blobPath: inputItem.blobPath,
          displayName: inputItem.displayName,
          type: inputItem.fileFormatType,
          size: inputItem.fileSize,
        };

        return {
          id: this.generateUniqueId(),
          file: mockFile,
        };
      },
    );

    // Update upload button state after loading files
    this.updateCanUploadState();

    this.toastr.info(
      this.transloco.translate('loading_geo_location_data', {}, 'index'),
      `${this.transloco.translate('please_wait', {}, 'index')} ...`,
    );

    // load geocoding location
    if (experiment.fileUrls?.transform?.locations) {
      this.logger.log(
        'experiment.fileUrls?.transform?.locations',
        experiment.fileUrls?.transform?.locations,
      );
      await this.dataFromFileUrlToJson(
        experiment.fileUrls.transform.locations,
      ).then((response: TransformLocationsData) => {
        this.logger.log('transform locations response', response);
        if (response?.customers && response?.depots) {
          this.groupingCustomer(response.customers, response.depots);
        }
      });
    }

    if (experiment.fileUrls?.validate?.preVRPSolution) {
      this.logger.log(
        'experiment.fileUrls?.validate?.preVRPSolution',
        experiment.fileUrls?.validate?.preVRPSolution,
      );
      // load validation data
      this.toastr.info(
        this.transloco.translate('loading_validation_data', {}, 'index'),
        `${this.transloco.translate('please_wait', {}, 'index')} ...`,
      );
      await this.dataFromFileUrlToJson(
        experiment.fileUrls.validate.preVRPSolution,
      ).then((response: Result) => {
        this.logger.log('Result', response);
        this.validateExperiment = response.validate;
        this.haveValidated = true;
        // Rebuild dynamic parameters so values reflect constraintsData when page initializes with historical validation
        if (this.allDynamicParameters?.length) {
          this.refreshDynamicParametersForSelectedDepot();
        }
        this.isValidateShowMessage = {
          OrderData: {
            invalidCoordinate: true,
          },
          parameter: {
            overDistance: true,
            overWeight: true,
          },
          validate: {
            invalidCoordinate: true,
            overDistance: true,
            overWeight: true,
          },
        };
      });
    }
  }

  async loadVehicleDataFromBlob(
    vehiclesData: VehicleBlobData[],
  ): Promise<void> {
    if (!Array.isArray(vehiclesData)) {
      this.logger.warn('Invalid vehicles data format:', vehiclesData);
      return;
    }

    for (const vehicle of vehiclesData) {
      const vehicleTypeId = vehicle.vehicleTypeId;
      if (!vehicleTypeId) continue;

      // Check if this vehicle type exists in myVehicleTypes
      const vehicleTypeExists = this.myVehicleTypes.some(
        (v) => v.vehicleTypeId === vehicleTypeId,
      );
      if (!vehicleTypeExists) {
        this.logger.warn(
          `Vehicle type ${vehicleTypeId} not found in myVehicleTypes`,
        );
        continue;
      }

      // Determine selection mode based on data
      const hasCount =
        vehicle.numberOfVehiclesAvailable &&
        vehicle.numberOfVehiclesAvailable > 0;
      const hasSpecificVehicles =
        vehicle.specificVehicleIds &&
        Array.isArray(vehicle.specificVehicleIds) &&
        vehicle.specificVehicleIds.length > 0;

      if (hasCount || hasSpecificVehicles) {
        // Mark vehicle as selected
        if (!this.selectedVehicleIds.includes(vehicleTypeId)) {
          this.selectedVehicleIds.push(vehicleTypeId);
        }

        if (hasSpecificVehicles) {
          // Set to license-plate mode
          this.vehicleSelectionMode[vehicleTypeId] = 'license-plate';

          // Load license plates for these vehicle IDs
          // Pass the numberOfVehiclesAvailable to use for count display
          await this.loadLicensePlatesForVehicleIds(
            vehicleTypeId,
            vehicle.specificVehicleIds!,
            vehicle.numberOfVehiclesAvailable,
          );
        } else if (hasCount) {
          // Set to count mode
          this.vehicleSelectionMode[vehicleTypeId] = 'count';
          this.selectedVehicleCounts[vehicleTypeId] =
            vehicle.numberOfVehiclesAvailable!;
        }
      }
    }

    // Open VRP: mirror historical selections into the run list UI
    this.rebuildRunListFromSelections();

    this.cdr.detectChanges();
  }

  async loadLicensePlatesForVehicleIds(
    vehicleTypeId: string,
    vehicleIds: string[],
    numberOfVehiclesAvailable?: number,
  ): Promise<void> {
    try {
      // Fetch all vehicles for this vehicle type
      const vehicles = await firstValueFrom(
        this.vehicleService.getMyVehicles(
          this.experiment.depots[0].depotId,
          vehicleTypeId,
        ),
      );

      // Filter to only the specific vehicle IDs
      const selectedVehicles = vehicles.filter((v) =>
        vehicleIds.includes(v.vehicleId),
      );

      // Extract license plates
      const licensePlates = selectedVehicles
        .filter((v) => v.licensePlate)
        .map((v) => v.licensePlate);

      // Update the component state
      this.selectedLicensePlates[vehicleTypeId] = licensePlates;
      this.selectedVehicleIdsByLicensePlate[vehicleTypeId] = vehicleIds;

      // Use numberOfVehiclesAvailable from blob if provided
      // If it's 0 or not provided, default to 1
      if (
        numberOfVehiclesAvailable !== undefined &&
        numberOfVehiclesAvailable !== null
      ) {
        this.selectedVehicleCounts[vehicleTypeId] =
          numberOfVehiclesAvailable || 1;
      } else {
        this.selectedVehicleCounts[vehicleTypeId] = licensePlates.length || 1;
      }
    } catch (error) {
      this.logger.error(
        `Error loading license plates for vehicle type ${vehicleTypeId}:`,
        error,
      );
      // Fallback: just store the vehicle IDs
      this.selectedVehicleIdsByLicensePlate[vehicleTypeId] = vehicleIds;

      // Use numberOfVehiclesAvailable if provided, otherwise default to 1
      if (
        numberOfVehiclesAvailable !== undefined &&
        numberOfVehiclesAvailable !== null
      ) {
        this.selectedVehicleCounts[vehicleTypeId] =
          numberOfVehiclesAvailable || 1;
      } else {
        this.selectedVehicleCounts[vehicleTypeId] = vehicleIds.length || 1;
      }
    }
  }

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
    if (!this.isFileMatchingRequiredType(file)) {
      this.showInvalidModal(
        this.transloco.translate('file_invalid', {}, 'index'),
        this.transloco.translate(
          'select_file_with_extension',
          { extension: this.requiredFileType },
          'index',
        ),
      );
      this.toastr.error(
        this.transloco.translate(
          'select_file_with_extension',
          { extension: this.requiredFileType },
          'index',
        ),
        this.transloco.translate('file_invalid', {}, 'index'),
      );
      return;
    }
    this.uploadFile(file);
  }

  async uploadFile(file: FileWithCategory) {
    const id = this.generateUniqueId();

    // Check for duplicate file size and name before proceeding
    const warningMessages: string[] = [];

    const hasDuplicateFileName = this.preOrderFiles.some(
      (existingFile) => existingFile.file.name === file.name,
    );
    if (hasDuplicateFileName) {
      warningMessages.push(
        this.transloco.translate('duplicate_file_name', {}, 'index'),
      );

      const hasDuplicateFileSize = this.preOrderFiles.some(
        (existingFile) =>
          existingFile.file.name === file.name &&
          existingFile.file.size === file.size,
      );
      if (hasDuplicateFileSize) {
        warningMessages.push(
          this.transloco.translate('duplicate_file_size', {}, 'index'),
        );
      }
    }

    const { isValid, keyName, displayName, columnNames } =
      await this.validateSingleFileAgainstDepot(file, id);

    if (!isValid || !keyName || !displayName) return;

    if (columnNames) {
      this.fileColumnsCache[id] = columnNames;
      this.logger.log('Columns cached for file:', id, columnNames);
    }

    // Find the matched item for the new file
    const matchedItem = this.depotInputDataItems.find(
      (item) => item.keyName === keyName,
    );

    // Find if a file of this type already exists (by keyName)
    const index = this.preOrderFiles.findIndex(
      (f) => f.file.keyName === keyName,
    );

    // Also check if any existing file has the same columnRequired
    const existingFileWithSameColumns = matchedItem
      ? this.preOrderFiles.find((fileItem) => {
          const existingKeyName = this.isFileWithCategory(fileItem.file)
            ? fileItem.file.keyName
            : (fileItem.file as PreOrderFileDescriptor).keyName;
          const existingItem = this.depotInputDataItems.find(
            (item) => item.keyName === existingKeyName,
          );
          if (!existingItem) return false;
          return (
            existingItem.columnRequired.length ===
              matchedItem.columnRequired.length &&
            existingItem.columnRequired.every((col) =>
              matchedItem.columnRequired.includes(col),
            )
          );
        })
      : undefined;

    if (index !== -1 || existingFileWithSameColumns) {
      // duplicate file logic here (either same keyName OR same columnRequired)

      // Determine which file is being duplicated
      const duplicatedFileIndex =
        index !== -1
          ? index
          : this.preOrderFiles.findIndex(
              (f) => f.id === existingFileWithSameColumns?.id,
            );
      const currentDisplayName =
        duplicatedFileIndex !== -1
          ? this.preOrderFiles[duplicatedFileIndex].file.displayName
          : displayName;

      // Show confirmation dialog before replacing
      const focusedElement = document.activeElement as HTMLElement;
      if (focusedElement) {
        focusedElement.blur();
      }
      const dialogRef = this.ngbModal.open(
        ConfirmationDepotUploadFileDialogComponent,
        {
          centered: true,
          animation: true,
        },
      );
      dialogRef.componentInstance.title = this.transloco.translate(
        'replace_data_confirmation',
        {},
        'index',
      );
      dialogRef.componentInstance.question = `${this.transloco.translate(
        'want_to_replace_data_type',
        {},
        'index',
      )} ${currentDisplayName} ${this.transloco.translate(
        'with_the_new_data',
        {},
        'index',
      )}?`;
      dialogRef.componentInstance.message = '';
      dialogRef.componentInstance.acceptButton = this.transloco.translate(
        'confirm',
        {},
        'index',
      );
      dialogRef.componentInstance.disableCancelButton = false;
      dialogRef.componentInstance.showRadioOptions = true;
      dialogRef.componentInstance.inputDataKeys = this.inputDataKeys;
      dialogRef.componentInstance.preOrderFiles = this.preOrderFiles;
      // Pass data for column validation
      dialogRef.componentInstance.depotInputDataItems =
        this.depotInputDataItems;
      dialogRef.componentInstance.fileColumns = columnNames || [];

      dialogRef.result
        .then(
          (
            result:
              | {
                  replace: boolean;
                  category?: string;
                  validationFailed?: boolean;
                  missingColumns?: string[];
                  targetDisplayName?: string;
                }
              | boolean,
          ) => {
            // Handle both old boolean format and new object format for backwards compatibility
            if (typeof result === 'boolean') {
              if (result && duplicatedFileIndex !== -1) {
                file.keyName = keyName;
                file.displayName = displayName;
                file.isFirstOfType = true;
                this.preOrderFiles[duplicatedFileIndex] = { id, file };
                this.isFilePreview = true;
                this.updateCanUploadState();
              }
            } else if (result && typeof result === 'object') {
              // Check if validation failed - show invalid modal and don't add file
              if (
                result.validationFailed &&
                result.missingColumns &&
                result.missingColumns.length > 0
              ) {
                const validationError = `<strong>${this.transloco.translate(
                  'file_for',
                  {},
                  'index',
                )} "${
                  result.targetDisplayName || result.category
                }" ${this.transloco.translate(
                  'missing_columns_as_follows',
                  {},
                  'index',
                )}</strong><span>:</span> <br/><ul>${result.missingColumns
                  .map((col) => `<li>${col}</li>`)
                  .join('')}</ul>`;

                this.showInvalidModal(
                  `${this.transloco.translate(
                    'column_name_mismatch_template',
                    {},
                    'index',
                  )}`,
                  [validationError],
                );
                this.logger.log('Validation FAILED from dialog - missing columns');
                return; // Don't add the file
              }

              if (result.replace && duplicatedFileIndex !== -1) {
                // Replace existing file
                file.keyName = keyName;
                file.displayName = displayName;
                file.isFirstOfType = true;
                this.preOrderFiles[duplicatedFileIndex] = { id, file };
                this.isFilePreview = true;
                this.updateCanUploadState();
              } else if (result.category) {
                // Add as new file with selected category
                const selectedItem = this.depotInputDataItems.find(
                  (item) => item.displayName === result.category,
                );
                if (selectedItem) {
                  file.keyName = selectedItem.keyName;
                  file.displayName = selectedItem.displayName;
                  file.isFirstOfType = true;
                  this.preOrderFiles.push({ id, file });
                  this.isFilePreview = true;
                  this.updateCanUploadState();
                }
              }
            }
          },
        )
        .catch(() => {
          // Dialog dismissed
        });
    } else {
      // no duplicate file logic here
      // Check if columnRequired is duplicated AND none of the duplicate files are in preOrderFiles yet
      // Find the matched item for the current file
      const matchedItemForNew = this.depotInputDataItems.find(
        (item) => item.keyName === keyName,
      );

      if (matchedItemForNew) {
        // Check if there are other items with the same columnRequired
        const itemsWithSameColumns = this.depotInputDataItems.filter((item) => {
          return (
            item.columnRequired.length ===
              matchedItemForNew.columnRequired.length &&
            item.columnRequired.every((col) =>
              matchedItemForNew.columnRequired.includes(col),
            )
          );
        });

        if (itemsWithSameColumns.length > 1) {
          // Duplicate columnRequired found - now check if ANY of them are already in preOrderFiles
          const anyDuplicateInPreOrderFiles = itemsWithSameColumns.some(
            (item) => {
              return this.preOrderFiles.some((fileItem) => {
                const existingKeyName = this.isFileWithCategory(fileItem.file)
                  ? fileItem.file.keyName
                  : (fileItem.file as PreOrderFileDescriptor).keyName;
                return existingKeyName === item.keyName;
              });
            },
          );

          if (!anyDuplicateInPreOrderFiles) {
            // None of the duplicate columnRequired files are in preOrderFiles yet - show dialog
            const focusedElement = document.activeElement as HTMLElement;
            if (focusedElement) {
              focusedElement.blur();
            }
            const dialogRef = this.ngbModal.open(
              ConfirmationDepotUploadFileDialogComponent,
              {
                centered: true,
                animation: true,
              },
            );
            dialogRef.componentInstance.title = this.transloco.translate(
              'select_category',
              {},
              'index',
            );
            dialogRef.componentInstance.showRadioOptions = false;
            dialogRef.componentInstance.showCategorySelectOnly = true;
            dialogRef.componentInstance.inputDataKeys =
              itemsWithSameColumns.map((item) => item.displayName);
            dialogRef.componentInstance.preOrderFiles = this.preOrderFiles;
            // Pass data for column validation
            dialogRef.componentInstance.depotInputDataItems =
              this.depotInputDataItems;
            dialogRef.componentInstance.fileColumns = columnNames || [];

            dialogRef.result
              .then(
                (
                  result:
                    | {
                        category?: string;
                        validationFailed?: boolean;
                        missingColumns?: string[];
                        targetDisplayName?: string;
                      }
                    | boolean,
                ) => {
                  if (result && typeof result === 'object') {
                    // Check if validation failed - show invalid modal and don't add file
                    if (
                      result.validationFailed &&
                      result.missingColumns &&
                      result.missingColumns.length > 0
                    ) {
                      const validationError = `<strong>${this.transloco.translate(
                        'file_for',
                        {},
                        'index',
                      )} "${
                        result.targetDisplayName || result.category
                      }" ${this.transloco.translate(
                        'missing_columns_as_follows',
                        {},
                        'index',
                      )}</strong><span>:</span> <br/><ul>${result.missingColumns
                        .map((col) => `<li>${col}</li>`)
                        .join('')}</ul>`;

                      this.showInvalidModal(
                        `${this.transloco.translate(
                          'column_name_mismatch_template',
                          {},
                          'index',
                        )}`,
                        [validationError],
                      );
                      this.logger.log(
                        'Validation FAILED from dialog - missing columns',
                      );
                      return; // Don't add the file
                    }

                    if (result.category) {
                      const selectedItem = this.depotInputDataItems.find(
                        (item) => item.displayName === result.category,
                      );
                      if (selectedItem) {
                        file.keyName = selectedItem.keyName;
                        file.displayName = selectedItem.displayName;
                        file.isFirstOfType = true;
                        this.preOrderFiles.push({ id, file });
                        this.isFilePreview = true;
                        this.updateCanUploadState();
                      }
                    }
                  }
                },
              )
              .catch(() => {
                // Dialog dismissed
              });
            return; // Exit early to prevent default behavior
          }
        }
      }

      // Default behavior: no duplicate columnRequired OR at least one duplicate is already in preOrderFiles
      // Just add the file normally
      file.keyName = keyName;
      file.displayName = displayName;
      file.isFirstOfType = true;
      this.preOrderFiles.push({ id, file });
      this.isFilePreview = true;
    }

    // Update upload button state after file changes
    this.updateCanUploadState();
  }

  async validateSingleFileAgainstDepot(
    file: FileWithCategory,
    fileId?: string,
  ): Promise<{
    isValid: boolean;
    keyName?: string;
    displayName?: string;
    isFirstOfType?: boolean;
    columnNames?: string[];
  }> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e: ProgressEvent<FileReader>) => {
        try {
          const result = e.target?.result;
          const fileName = (file?.name || '').toLowerCase();
          const isCsv = fileName.endsWith('.csv');

          let columnNames: string[] = [];
          if (isCsv) {
            if (typeof result !== 'string') {
              resolve({ isValid: false });
              return;
            }
            columnNames = this.parseCsvHeaderColumnNames(result);
          } else {
            if (!(result instanceof ArrayBuffer)) {
              resolve({ isValid: false });
              return;
            }
            const arrayBuffer = result;
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(arrayBuffer);

            let worksheet: ExcelJS.Worksheet | undefined =
              workbook.getWorksheet(1);
            if (!worksheet) {
              const normalize = (name: string) =>
                name
                  .trim()
                  .toLowerCase()
                  .replace(/[\s_-]/g, '');

              const allSheets = workbook.worksheets.map(
                (ws: ExcelJS.Worksheet) => ({
                  name: ws.name,
                  normalized: normalize(ws.name),
                }),
              );

              this.logger.log(
                'Detected sheets:',
                allSheets.map((sheet) => sheet.name),
              );

              worksheet =
                workbook.worksheets.find(
                  (ws: ExcelJS.Worksheet) => ws.getRow(1)?.cellCount > 0,
                ) || workbook.worksheets[0];
            }

            columnNames = (
              worksheet!.getRow(1).values as (string | undefined)[]
            ).filter((value) => typeof value === 'string') as string[];
          }

          // Cache column names for later validation if fileId is provided
          if (fileId) {
            this.fileColumnsCache[fileId] = columnNames;
            this.logger.log('Cached columns for file:', fileId, columnNames);
          }

          const matchingInputDataItem =
            this.findMatchingInputDataItem(columnNames);
          if (matchingInputDataItem) {
            resolve({
              isValid: true,
              keyName: matchingInputDataItem.keyName,
              displayName: matchingInputDataItem.displayName,
              isFirstOfType: true,
              columnNames: columnNames,
            });
          } else {
            // Show missing columns for each required input data type
            const validationErrors = [];
            for (const item of this.depotInputDataItems) {
              const missingColumns = item.columnRequired.filter(
                (col) => !columnNames.includes(col),
              );
              if (missingColumns.length === item.columnRequired.length) {
                // All required columns are missing
                validationErrors.push(
                  `<strong>${this.transloco.translate(
                    'file_for',
                    {},
                    'index',
                  )} "${item.displayName}" ${this.transloco.translate(
                    'missing_columns_as_follows',
                    {},
                    'index',
                  )}</strong><span>:</span> <br/><ul>${item.columnRequired
                    .map((col) => `<li>${col}</li>`)
                    .join('')}</ul>`,
                );
              } else if (missingColumns.length > 0) {
                // Some columns are missing
                validationErrors.push(
                  `<strong>${this.transloco.translate(
                    'file_for',
                    {},
                    'index',
                  )}" ${item.displayName}" ${this.transloco.translate(
                    'missing_columns_as_follows',
                    {},
                    'index',
                  )}</strong><span>:</span> <ul>${missingColumns
                    .map((col) => `<li>${col}</li>`)
                    .join('')}</ul>`,
                );
              }
            }
            this.logger.log('column_name_mismatch_template 1');
            this.showInvalidModal(
              `${this.transloco.translate(
                'column_name_mismatch_template',
                {},
                'index',
              )}`,
              validationErrors,
            );
            resolve({ isValid: false, columnNames: columnNames });
            this.logger.log('column_name_mismatch_template 2');
          }
        } catch (error) {
          this.logger.error('Error validating file:', error);
          resolve({ isValid: false });
        }
      };
      const fileName = (file?.name || '').toLowerCase();
      if (fileName.endsWith('.csv')) {
        reader.readAsText(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    });
  }

  handleUploadSubmit() {
    const focusedElement = document.activeElement as HTMLElement;
    if (focusedElement) {
      focusedElement.blur();
    }
    const dialogRef = this.ngbModal.open(ConfirmationDialogComponent, {
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
          const newPayload = this.preOrderFiles
            .filter((item): item is { id: string; file: FileWithCategory } =>
              this.isFileWithCategory(item.file),
            )
            .map(({ file }) => ({ file, keyName: file.keyName || '' }));

          // Prepare depotIds (single or multiple selection)
          let depotIds: string[] = [];
          if (this.selectedDepotIdName) {
            const found = this.depots.find(
              (d) => d.depotName === this.selectedDepotIdName,
            );
            if (found && found.depotId) {
              depotIds = [found.depotId];
            }
          }

          this.preOrderService
            .uploadPreOrder(this.experiment.runId, depotIds, newPayload)
            .subscribe({
              next: (response: UploadPreOrderResponse) => {
                this.logger.log('uploadPreOrder success response', response);

                if (response.result?.isSuccesses === false) {
                  this.spinner.hide();
                  this.openTransformValidationDialog(response.result);
                  return;
                }

                if (response.result?.isWarning && response.result?.warning) {
                  this.setTransformWarnings(response.result.warning);
                } else {
                  this.setTransformWarnings([]);
                }

                // getExperiment step
                // Refresh experiment data first, then proceed with grouping to ensure latest depots exist
                this.experimentService
                  .getExperiment(this.experiment.runId)
                  .pipe(take(1))
                  .subscribe({
                    next: async (exp: Experiment) => {
                      this.experiment = { ...exp };

                      if (exp.fileUrls?.transform?.locations) {
                        try {
                          const locationData: TransformLocationsData =
                            await this.dataFromFileUrlToJson(
                              exp.fileUrls.transform.locations,
                            );
                          this.logger.log(
                            'post-upload transform locations data',
                            locationData,
                          );
                          if (locationData?.customers && locationData?.depots) {
                            this.groupingCustomer(
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

                      this.experiment.name = response.name;
                      // Map inputdata to UI structure expected by template
                      this.preOrderFiles = (
                        this.experiment.inputdata || []
                      ).map((inputItem: ExperimentInputdata) => {
                        const mockFile = {
                          keyName: inputItem.keyName,
                          name: inputItem.filename,
                          blobPath: inputItem.blobPath,
                          displayName: inputItem.displayName,
                          type: inputItem.fileFormatType,
                          size: inputItem.fileSize,
                        };
                        return {
                          id: this.generateUniqueId(),
                          file: mockFile,
                        };
                      });

                      this.isFilePreview = false;
                      this.isFileSelectionStep = false;
                      this.toastr.success(
                        `${this.transloco.translate(
                          'upload_preorder_success',
                          {},
                          'index',
                        )}.`,
                      );
                      // Fetch latest dynamic parameters for the selected depot and rebuild UI
                      this.getDynamicParameters();

                      // Update upload button state after successful upload
                      this.updateCanUploadState();
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

  private showInvalidModal(title: string, message: string | string[]): void {
    const focusedElement = document.activeElement as HTMLElement;
    if (focusedElement) {
      focusedElement.blur();
    }
    const dialogRef = this.ngbModal.open(DetailsDialogComponent, {
      centered: true,
      animation: true,
      windowClass: 'custom-model',
    });
    dialogRef.componentInstance.message = message;
    dialogRef.componentInstance.title = title;
  }

  resetFileInput(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (input) input.value = '';
  }
  deleteFileInList(index: number) {
    if (
      this.experiment.run !== Run.Original &&
      this.experiment.status !== ExperimentStatus.Initializing
    ) {
      this.toastr.warning(
        this.transloco.translate('cannot_delete_file', {}, 'index'),
        this.transloco.translate('original_experiment_warning', {}, 'index'),
      );
      this.openConfirmDialog(
        this.transloco.translate('cannot_delete_file', {}, 'index'),
        this.transloco.translate('original_experiment_warning', {}, 'index'),
        `${this.transloco.translate('rewrite_file_instruction', {}, 'index')}.`,
        this.transloco.translate('acknowledge', {}, 'index'),
      );
      return;
    }
    this.spinner.show();
    this.preOrderFiles.splice(index, 1);
    this.vectorSource.clear();
    this.dataPreOrder = [];
    this.isUpload = false;
    setTimeout(() => {
      /** spinner ends after 5 seconds */
      this.spinner.hide();
    }, 1000);
    this.resetComponentValue();

    // Update upload button state after file deletion
    this.updateCanUploadState();
  }
  private resetComponentValue() {
    this.popupContent = null;
    this.groupedDataPreOrder = {};
    this.preOrderCount = 0;
    this.uploadDataGroupCustomers = null;
    this.customersLocationUpdated = [];
    this.countUploadedCustomers = 0;
    this.validateExperiment = null;
  }

  setParameterDefault() {
    const focusedElement = document.activeElement as HTMLElement;
    if (focusedElement) {
      focusedElement.blur();
    }
    const dialogRef = this.ngbModal.open(ConfirmationDialogComponent, {
      centered: true,
      animation: true,
    });
    dialogRef.componentInstance.title = this.transloco.translate(
      'update_parameter_confirmation',
      {},
      'index',
    );
    dialogRef.componentInstance.question = `${this.transloco.translate(
      'confirm_to_set_default_parameter',
      {},
      'index',
    )} ?`;
    dialogRef.componentInstance.message = `${this.transloco.translate(
      'to_set_a_default_parameter_you_can_use_it_to_submit_an_experiment_in_the_future',
      {},
      'index',
    )}.`;

    dialogRef.result
      .then((confirmed: boolean) => {
        if (confirmed) {
          this.updateDynamicParameters();
        }
      })
      .catch((error) => {
        this.logger.error('Dialog was dismissed:', error);
      });
  }

  private initIconStyle() {
    Object.values(LocationType).forEach((type) => {
      const iconLocation = new Style({
        image: new Icon({
          anchor: [0.5, 0.5],
          anchorOrigin: 'bottom-left',
          anchorXUnits: 'fraction',
          anchorYUnits: 'pixels',
          crossOrigin: 'anonymous',
          opacity: 1,
          src: `assets/image/${type}.png`,
        }),
      });

      if (type === LocationType.Verify) {
        iconLocation.getImage()?.setOpacity(0.1);
        this.iconStyle.verify = iconLocation;
      } else if (type === LocationType.Uncertain) {
        this.iconStyle.uncertain = iconLocation;
      } else if (type === LocationType.Unverify) {
        this.iconStyle.unverify = iconLocation;
      } else if (type === LocationType.Edit) {
        this.iconStyle.edit = iconLocation;
      }
    });
  }

  private loadLocationDepot(
    incoming: Array<{
      depotId?: string;
      id?: string;
      depotName?: string;
      name?: string;
      latitude?: number | string;
      longitude?: number | string;
      columns?: string[];
      inputdata?: DepotInputRequirement[];
      timeWindowEarly?: string | number;
      timeWindowLate?: string | number;
      createdAt?: string;
      updatedAt?: string;
    }>,
  ) {
    this.logger.log('loadLocationDepot incoming', incoming);

    // Always use the incoming depots array for default selection and display
    const normalizedIncoming: MyDepot[] = incoming.map((item) => {
      const nameKey =
        typeof item.depotName === 'string'
          ? item.depotName
          : typeof item.name === 'string'
            ? item.name
            : '';
      const mapped: MyDepot = {
        depotId: (item.depotId || item.id || '') as string,
        depotName: nameKey,
        latitude: Number(item.latitude),
        longitude: Number(item.longitude),
        columns: item.columns || [],
        inputdata: item.inputdata || [],
        timeWindowEarly: String(item.timeWindowEarly ?? ''),
        timeWindowLate: String(item.timeWindowLate ?? ''),
        createdAt: item.createdAt || '',
        updatedAt: item.updatedAt || '',
      };
      return mapped;
    });

    this.depots = normalizedIncoming;

    this.logger.log('this.depots', this.depots);

    if (!this.experiment.depots || this.experiment.depots.length === 0) {
      this.experiment.depots = normalizedIncoming.map((depot: MyDepot) => ({
        companyName: this.experiment.companyName,
        depotId: depot.depotId || '',
        depotName: depot.depotName,
        latitude: Number(depot.latitude),
        longitude: Number(depot.longitude),
        timeWindowEarly: depot.timeWindowEarly || '',
        timeWindowLate: depot.timeWindowLate || '',
        createdAt: depot.createdAt || '',
        updatedAt: depot.updatedAt || '',
        columns: depot.columns || [],
      }));
    }

    // Set default selection to the first depot in the incoming list
    if (this.depots && this.depots.length > 0) {
      const defaultDepotName =
        (this.experiment && this.experiment.depots && this.experiment.depots[0]
          ? this.experiment.depots[0].depotName
          : this.depots[0].depotName) || this.depots[0].depotName;
      this.selectedDepotIdName = defaultDepotName;
      const selectedDepot =
        this.depots.find((d) => d.depotName === this.selectedDepotIdName) ||
        this.depots[0];
      this.updateInputDataKeysFromDepot(selectedDepot);
      this.updateRequiredFileTypeByDepot(selectedDepot);
    } else {
      this.selectedDepotIdName = null;
      this.inputDataKeys = [];
      this.depotInputDataItems = [];
      this.updateRequiredFileTypeByDepot(undefined);
    }

    // Plot all depots on the map
    this.vectorSourceDepot.clear();
    const iconWithLabel = (label: string) =>
      new Style({
        image: new Icon({
          anchor: [0.5, 1],
          anchorOrigin: 'bottom-left',
          anchorXUnits: 'fraction',
          anchorYUnits: 'pixels',
          crossOrigin: 'anonymous',
          opacity: 1,
          scale: 1,
          src: `assets/image/depot.png`,
        }),
        text: new Text({
          text: label,
          offsetY: 25,
          font: '12px Arial',
          fill: new Fill({ color: '#000000' }),
          stroke: new Stroke({ color: '#ffffff', width: 2 }),
        }),
      });
    this.depots.forEach((depot) => {
      const lon = Number(depot.longitude);
      const lat = Number(depot.latitude);
      const coord = OlProj.fromLonLat([lon, lat]);
      const feature = new Feature({
        geometry: new Point(coord),
        data: { data: depot, isDepot: true },
      });
      feature.setStyle(iconWithLabel(depot.depotName));
      this.vectorSourceDepot.addFeature(feature);
    });
  }

  private loadLocation(uploadDataGroupCustomers: DataGroup) {
    this.vectorSource.clear();
    Object.keys(uploadDataGroupCustomers).forEach((key: string) => {
      if (this.displayLocationType[key as keyof DisplayLocationType]) {
        uploadDataGroupCustomers[key as keyof DataGroup].customers.forEach(
          (customer) => {
            if (customer.latitude && customer.longitude) {
              const location: Feature = new Feature({
                geometry: new Point(
                  OlProj.fromLonLat([
                    Number(customer.longitude),
                    Number(customer.latitude),
                  ]),
                ),

                data: { data: customer, isDepot: false },
              });
              location.setStyle(
                this.iconStyle[
                  uploadDataGroupCustomers[key as keyof DataGroup].type
                ],
              );
              this.vectorSource.addFeature(location);
            }
          },
        );
      }
    });
  }

  closePopupMapShow() {
    this.popUp?.setPosition(undefined);
    const closer = document.getElementById('popup-closer');
    closer?.blur();
  }
  private initMap() {
    this.vectorSource = new VectorSource({});
    this.vectorSourceDepot = new VectorSource({});
    this.vectorLayer = new VectorLayer({
      source: this.vectorSource,

      updateWhileInteracting: true,
      updateWhileAnimating: true,
    });
    this.vectorLayerDepot = new VectorLayer({
      source: this.vectorSourceDepot,

      updateWhileInteracting: true,
      updateWhileAnimating: true,
    });

    const attribution = new Attribution({
      collapsible: true,
    });
    this.logger.log(this.preOrderFiles);
    this.map = new Map({
      layers: [
        new TileLayer({
          source: new OSM({
            attributions:
              '&copy;<a href="https://www.openstreetmap.org/copyright"> OpenStreetMap contributors</a>',
            crossOrigin: 'anonymous',
            cacheSize: 10000,
            maxZoom: 20,
          }),
        }),
        this.vectorLayer,
        this.vectorLayerDepot,
      ],
      target: 'map',
      view: new View({
        center: OlProj.transform(
          [100.53139488523458, 13.786463255129673],
          'EPSG:4326',
          'EPSG:3857',
        ),
        zoom: 10,
        maxZoom: 20,
        minZoom: 0,
      }),
      controls: defaultControls({ attribution: false }).extend([
        new ZoomSlider(),
        new FullScreen(),
        attribution,
      ]),
    });

    const element = document.getElementById('popup')!;
    this.popUp = new Overlay({
      element: element,
      positioning: 'top-right',
      offset: [0, -50],
    });
    this.map.addOverlay(this.popUp);
    this.map.getViewport().addEventListener('contextmenu', function (evt) {
      evt.preventDefault();
      logMessage(evt);
    });
    // display popup on click
    this.map.on('singleclick', (event) => this.popupShow(event));
    this.map.on('pointermove', (event) => this.pointMove(event));

    this.logger.log(this.haveUpdateAfterValidated, this.haveValidated);
  }

  private pointMove(
    evt: MapBrowserEvent<PointerEvent | KeyboardEvent | WheelEvent>,
  ): void {
    const target = this.map.getTargetElement();
    const pixel = this.map.getEventPixel(evt.originalEvent);
    const hit = this.map.hasFeatureAtPixel(pixel);

    if (hit) {
      target.style.cursor = 'pointer';
    } else {
      target.style.cursor = '';
    }
  }

  private popupShow(
    evt: MapBrowserEvent<PointerEvent | KeyboardEvent | WheelEvent>,
  ) {
    let coordinates: Coordinate = [];
    const feature = this.map.forEachFeatureAtPixel(
      evt.pixel,
      (f: FeatureLike) => f,
    );
    if (feature) {
      const geometry = feature.getGeometry();
      if (geometry instanceof SimpleGeometry) {
        // getFlatCoordinates returns number[]; interpret as [x,y] in view proj
        const flat = geometry.getFlatCoordinates();
        coordinates = [flat[0], flat[1]] as Coordinate;
      } else {
        coordinates = [];
      }
      this.popUp?.setPosition(coordinates);
      if (feature instanceof Feature) {
        const raw = feature.get('data');
        this.popupContent = this.isPopupPayload(raw) ? raw : null;
      } else {
        this.popupContent = null;
      }
    } else {
      this.popUp?.setPosition(undefined);
    }
  }

  private isPopupPayload(
    value:
      | {
          data?:
            | Customer
            | Depot
            | MyDepot
            | Pick<MyDepot, 'depotName' | 'latitude' | 'longitude'>;
          isDepot?: boolean;
        }
      | null
      | undefined,
  ): value is { data: Customer; isDepot: boolean } {
    if (!value || typeof value !== 'object') return false;
    return 'data' in value && 'isDepot' in value;
  }
  private groupCustomers(customers: Array<Customer>) {
    const verify: Customer[] = [];
    const uncertain: Customer[] = [];
    const unverify: Customer[] = [];

    customers.forEach((customer) => {
      if (
        ((customer.replaceType === ReplaceType.NO_REPLACE ||
          customer.replaceType === ReplaceType.INPUT) &&
          (customer.validationType === ValidationType.SUBDISTRICT_LEVEL ||
            customer.validationType === ValidationType.DISTRICT_LEVEL)) ||
        customer.replaceType === ReplaceType.GEOCODE
      ) {
        verify.push(customer);
      } else if (
        customer.replaceType === ReplaceType.SUBDISTRICT_LEVEL ||
        customer.replaceType === ReplaceType.DISTRICT_LEVEL
      ) {
        uncertain.push(customer);
      } else if (
        customer.replaceType === ReplaceType.PROVINCE_LEVEL ||
        customer.validationType === ValidationType.NO_VALID ||
        customer.validationType === ValidationType.NAN_INPUT ||
        customer.validationType === ValidationType.NON_VALIDATED
      ) {
        unverify.push(customer);
      }
    });

    return { verify, uncertain, unverify };
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }
  navigateToTab(page: number) {
    // Your logic to navigate to the next tab
    this.activeNavId = page; // Assuming 'tab2' is the id of the next tab

    // Trigger change detection to refresh the table
    this.cdr.detectChanges();
    if (page === 2) {
      this.refreshDynamicParametersForSelectedDepot();
    }
    // The map column can be collapsed on the vehicle tab, so its geometry
    // may change whenever the active tab changes
    this.refreshMapSize();
  }

  /** The map column is hidden while collapsed on the Vehicle tab. */
  get isMapPaneHidden(): boolean {
    return this.isMapCollapsed && this.activeNavId === 2 && this.isUpload;
  }

  toggleMapCollapsed(): void {
    this.isMapCollapsed = !this.isMapCollapsed;
    this.refreshMapSize();
  }

  /** Direct tab clicks; programmatic navigation goes through navigateToTab. */
  onNavTabChange(): void {
    this.refreshMapSize();
  }

  /**
   * OpenLayers must recompute its viewport after layout/visibility changes.
   * The delay waits for the 0.3s slide transition of the map column to end.
   */
  private refreshMapSize(): void {
    this.cdr.detectChanges();
    setTimeout(() => this.map?.updateSize(), 350);
  }

  getNextTab(currentTab: number): number {
    switch (currentTab) {
      case 1: // Orders Data
        if (this.hasMyVehicleTypes()) return 2;
        if (this.hasDynamicParameters()) return 3;
        return 4;
      case 2: // Vehicle
        if (this.hasDynamicParameters()) return 3;
        return 4;
      case 3: // Parameters
        return 4;
      case 4: // Validation
        return 4; // Already at the last tab
      default:
        return currentTab;
    }
  }

  getPreviousTab(currentTab: number): number {
    switch (currentTab) {
      case 4: // Validation
        if (this.hasDynamicParameters()) return 3;
        if (this.hasMyVehicleTypes()) return 2;
        return 1;
      case 3: // Parameters
        if (this.hasMyVehicleTypes()) return 2;
        return 1;
      case 2: // Vehicle
        return 1;
      case 1: // Orders Data
        return 1; // Already at the first tab
      default:
        return currentTab;
    }
  }

  navigateToNextTab(): void {
    const nextTab = this.getNextTab(this.activeNavId);
    this.navigateToTab(nextTab);
  }

  navigateToPreviousTab(): void {
    const prevTab = this.getPreviousTab(this.activeNavId);
    this.navigateToTab(prevTab);
  }

  private reInitializeDataTable(): void {
    if (!this.uploadDataGroupCustomers) {
      this.dataSource.data = [];
      return;
    }

    const keys = Object.keys(this.uploadDataGroupCustomers).sort();

    const newData: Customer[] = [];

    for (const key of keys) {
      if (this.displayLocationType[key as keyof DisplayLocationType]) {
        newData.push(
          ...this.uploadDataGroupCustomers[key as keyof DataGroup].customers,
        );
      }
    }

    this.dataSource.data = newData;
    // this.dataSource.data = newData;
  }

  displayDataInTable(locationType: LocationType) {
    this.displayLocationType[locationType] =
      !this.displayLocationType[locationType];

    this.reInitializeDataTable();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }

    this.loadLocation(this.uploadDataGroupCustomers!);
  }

  openCustomerOrderDetails(customer: Customer) {
    this.logger.log('openCustomerOrderDetails customer', customer);

    const modalRef = this.ngbModal.open(CustomerDetailsComponent, {
      centered: true,
      size: 'xl',
      animation: true,
      backdrop: 'static',
      keyboard: false,
      beforeDismiss: () => {
        return false;
      },
    });

    const existingIndex = this.customersLocationUpdated.findIndex(
      (item) => item.index === customer.index && item.name === customer.name,
    );

    if (existingIndex !== -1) {
      modalRef.componentInstance.locationType = LocationType.Edit;
    }

    const products =
      (customer.productQuantity?.length ? customer.productQuantity : null) ||
      customer.extra?.productsInfo ||
      [];

    const dataPreOrder: DataPreOrder = {
      ORDERID_ORG: customer.nodeId,
      CHANNEL: customer.additionalProperties?.channel || null,
      CUSTOMER_NAME: customer.name || '',
      TEL: customer.additionalProperties?.telephone || null,
      ADDRESS: customer.originalAddress?.address || '',
      AUMPHER: customer.originalAddress?.district || null,
      PROVINCE: customer.originalAddress?.province || null,
      ZIPCODE: customer.originalAddress?.postalCode || null,
      details: (products as CustomerProduct[]).map((product) => ({
        PRODUCTID: product.productId ?? '',
        ORDER_ID: product.skuCode ?? product.orderId ?? null,
        PRODUCTNAME: product.name ?? product.productName ?? '',
        QUANTITYMAIN: product.productQuantity ?? product.quantityMajor ?? 0,
        QUANTITYMINOR: product.quantityMinor ?? 0,
        UserConfirm: product.userConfirm ?? null,
        DateConfirm: product.dateConfirm ?? null,
      })),
    };

    // Pass customer directly as dataCustomer (the component expects Customer type)
    modalRef.componentInstance.dataPreOrder = dataPreOrder;
    modalRef.componentInstance.dataCustomer = customer;

    modalRef.result.then((locationUpdated: Location) => {
      if (
        Number(customer.longitude) !== Number(locationUpdated.longitude) ||
        Number(customer.latitude) !== Number(locationUpdated.latitude)
      ) {
        const updatedCustomer = {
          nodeId: customer.nodeId,
          index: customer.index,
          name: customer.name,
          latitude: locationUpdated.latitude,
          longitude: locationUpdated.longitude,
        };

        if (existingIndex !== -1) {
          this.customersLocationUpdated[existingIndex] = updatedCustomer;
        } else {
          this.customersLocationUpdated.push(updatedCustomer);
        }

        this.moveCustomerToEdit(customer, locationUpdated);
        this.haveUpdateAfterValidated = true;
        this.dataService.saveData(
          this.experiment.runId,
          this.customersLocationUpdated,
        );
      }
    });
  }

  openCustomersListToVerify() {
    const modalRef = this.ngbModal.open(CustomerListComponent, {
      centered: true,
      size: 'xl',
      animation: true,
      backdrop: 'static',
      keyboard: false,
      windowClass: 'custom-modal-width',
      modalDialogClass: 'custom-modal-content',
      beforeDismiss: () => {
        return false;
      },
    });
    modalRef.componentInstance.groupedDataPreOrder = this.groupedDataPreOrder;
    modalRef.componentInstance.uploadDataGroupCustomers =
      this.uploadDataGroupCustomers;

    modalRef.result.then((locationUpdated: Array<CustomerUpdated>) => {
      this.updateCustomerGroup(locationUpdated);
      if (locationUpdated.length > 0) this.haveUpdateAfterValidated = true;

      this.dataService.saveData(
        this.experiment.runId,
        this.customersLocationUpdated,
      );
    });
  }

  moveCustomerToEdit(customer: Customer, locationUpdated: Location) {
    // Find and remove the customer from uncertain
    const uncertainIndex =
      this.uploadDataGroupCustomers!.uncertain.customers.findIndex(
        (c) => c.name === customer.name,
      );
    // Find and remove the customer from unverify
    const unverifyIndex =
      this.uploadDataGroupCustomers!.unverify.customers.findIndex(
        (c) => c.name === customer.name,
      );
    if (uncertainIndex !== -1) {
      const _customer =
        this.uploadDataGroupCustomers!.uncertain.customers.splice(
          uncertainIndex,
          1,
        )[0];
      _customer.latitude = locationUpdated.latitude;
      _customer.longitude = locationUpdated.longitude;
      this.uploadDataGroupCustomers!.edit.customers.push(_customer);
    } else if (unverifyIndex !== -1) {
      const _customer =
        this.uploadDataGroupCustomers!.unverify.customers.splice(
          unverifyIndex,
          1,
        )[0];
      _customer.latitude = locationUpdated.latitude;
      _customer.longitude = locationUpdated.longitude;
      this.uploadDataGroupCustomers!.edit.customers.push(_customer);
    }
    this.loadLocation(this.uploadDataGroupCustomers!);
  }
  isVerified(orderId: string): boolean {
    return (
      this.uploadDataGroupCustomers?.verify.customers.some(
        (customer) => customer.name === orderId,
      ) ?? false
    );
  }

  isUncertain(orderId: string): boolean {
    return (
      this.uploadDataGroupCustomers?.uncertain.customers.some(
        (customer) => customer.name === orderId,
      ) ?? false
    );
  }

  isUnverified(orderId: string): boolean {
    return (
      this.uploadDataGroupCustomers?.unverify.customers.some(
        (customer) => customer.name === orderId,
      ) ?? false
    );
  }
  isEdited(orderId: string): boolean {
    return (
      this.uploadDataGroupCustomers?.edit.customers.some(
        (customer) => customer.name === orderId,
      ) ?? false
    );
  }
  validateExperimentPreOrder() {
    // Open VRP: at least one vehicle group must be added to the run list
    if (this.runVehicleList.length === 0) {
      this.vehicleSelectionError = true;
      this.navigateToTab(2);
      return;
    }
    this.vehicleSelectionError = false;

    const parameterPayload = this.buildValidateParameterFromDynamic();
    const vehiclesPayload = this.buildVehiclesPayload();

    // proceed with validation using constructed parameterPayload
    if (
      (parameterPayload.earlyDeliveryTime || '') >
      (parameterPayload.backToDepotTime || '')
    ) {
      this.showInvalidModal(
        'INVALID : Early Delivery Time',
        'Early Delivery Time must be less than Back to Depot Time',
      );
      return;
    }

    this.showSpinner();
    this.experimentService
      .validateExperiment(
        this.experiment.runId,
        parameterPayload as Constraint,
        this.customersLocationUpdated,
        vehiclesPayload,
      )
      .pipe(
        finalize(() => {
          this.hiddenSpinner();
        }),
      )
      .subscribe({
        next: (result: ValidateExperimentResponse) => {
          this.logger.log('validateExperiment result', result);
          const validateResult = result.result;
          const errors = validateResult?.error || [];
          const warnings = validateResult?.warning || [];
          // Error case: backend explicitly returns isSuccesses=false, or sends an error[] payload
          const hasError =
            validateResult?.isSuccesses === false || errors.length > 0;
          // Warning case: backend flags isWarning=true and there is no blocking error
          const hasWarning =
            !hasError && (validateResult?.isWarning === true || warnings.length > 0);

          if (validateResult?.message) {
            if (hasError) {
              this.toastr.error(validateResult.message);
            } else {
              this.toastr.success(validateResult.message);
            }
          }
          this.haveUpdateAfterValidated = false;
          // Sync constraints with the payload used for validation so UI reflects latest
          const mergedConstraint: Constraint = {
            ...this.constraintsData,
            ...(parameterPayload as Partial<Constraint>),
          };
          this.constraintsData = mergedConstraint;
          this.validateExperiment = validateResult?.validate || null;
          this.dataService.clearData(this.experiment.runId);
          // Rebuild dynamic parameters so values reflect constraintsData when validated
          this.refreshDynamicParametersForSelectedDepot();
          this.navigateToTab(4); // Always navigate to validation tab after validation
          // Mark validation as completed and show corresponding messages (success path)
          this.haveValidated = true;

          this.isValidationWarning = hasWarning;
          if (hasWarning) {
            this.setValidationWarnings(warnings);
          } else {
            this.setValidationWarnings([]);
          }

          this.isValidationError = hasError;
          if (hasError) {
            this.setValidationErrors(errors);
          } else {
            this.setValidationErrors([]);
          }

          this.isValidateShowMessage = {
            OrderData: {
              invalidCoordinate: true,
            },
            parameter: {
              overDistance: true,
              overWeight: true,
            },
            validate: {
              invalidCoordinate: true,
              overDistance: true,
              overWeight: true,
            },
          };
        },
        error: (err) => {
          this.logger.error(err);
        },
      });
  }

  // Build validateExperiment parameter payload from dynamicParametersByCategory
  buildValidateParameterFromDynamic(): TimingAndCapacity {
    const payload: Record<string, string | number> = {};

    for (const group of this.dynamicParametersByCategory) {
      for (const param of group.items) {
        const mappedKey =
          this.getConstraintKeyForParam(param) ||
          this.normalizeKeyName(param.keyName);
        if (!mappedKey) continue;

        // normalize based on value type
        if (this.isNumberType(param)) {
          const numericValue = Number(param.value);
          payload[mappedKey] = isNaN(numericValue) ? 0 : numericValue;
        } else if (this.isTimeType(param)) {
          const s = String(param.value ?? '').trim();
          payload[mappedKey] = !s || s.toLowerCase() === 'null' ? '00:00' : s;
        } else {
          payload[mappedKey] = String(param.value ?? '');
        }
      }
    }

    return payload as TimingAndCapacity;
  }

  // Build vehicles payload for validation from the Open VRP run list.
  // The current GraphQL input (ExperimentInputValidation.vehicles) accepts one
  // entry per vehicle type with either a count or specific vehicle ids, so run
  // list entries are aggregated per vehicleTypeId here. The per-entry routing
  // conditions (end-of-route / start / end depot) stay in the run list and the
  // saved presets, ready to be attached once the backend contract supports them.
  buildVehiclesPayload(): VehicleValidationInput[] {
    const aggregatedByType: Record<
      string,
      { vehicleIds: string[]; countTotal: number }
    > = {};

    for (const entry of this.runVehicleList) {
      if (!aggregatedByType[entry.vehicleTypeId]) {
        aggregatedByType[entry.vehicleTypeId] = {
          vehicleIds: [],
          countTotal: 0,
        };
      }
      const aggregated = aggregatedByType[entry.vehicleTypeId];
      if (entry.mode === 'license-plate') {
        for (const vehicleId of entry.vehicleIds) {
          if (!aggregated.vehicleIds.includes(vehicleId)) {
            aggregated.vehicleIds.push(vehicleId);
          }
        }
      } else {
        aggregated.countTotal += entry.count;
      }
    }

    const vehiclesPayload: VehicleValidationInput[] = [];
    for (const vehicleTypeId of Object.keys(aggregatedByType)) {
      const aggregated = aggregatedByType[vehicleTypeId];
      const vehicleItem: VehicleValidationInput = { vehicleTypeId };
      if (aggregated.vehicleIds.length > 0) {
        vehicleItem.vehicleId = aggregated.vehicleIds;
      }
      if (aggregated.countTotal > 0) {
        vehicleItem.numberOfVehiclesAvailable = aggregated.countTotal;
      }
      vehiclesPayload.push(vehicleItem);
    }

    return vehiclesPayload;
  }

  private normalizeKeyName(rawKey: string | null | undefined): string {
    const trimmedKey = String(rawKey ?? '').trim();
    if (!trimmedKey) return '';
    return trimmedKey.charAt(0).toLowerCase() + trimmedKey.slice(1);
  }
  showSpinner() {
    this.spinner.show('run', {
      type: 'ball-beat',
      size: 'medium',
      bdColor: 'rgba(255,255,255, .8)',
      color: 'black',
      fullScreen: true,
    });
  }
  hiddenSpinner() {
    this.spinner.hide('run');
  }

  routePlanning() {
    const focusedElement = document.activeElement as HTMLElement;
    if (focusedElement) {
      focusedElement.blur();
    }
    const dialogRef = this.ngbModal.open(ConfirmationDialogComponent, {
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
          this.showSpinner();
          this.experimentService
            .submitExperiment(this.experiment.runId)
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
                this.hiddenSpinner();
              },
            });
        }
      })
      .catch((error) => {
        this.logger.error('Dialog was dismissed:', error);
      });
  }

  openConfirmDialog(
    title: string,
    message: string,
    question: string,
    acceptButton: string = 'Confirm',
    disableCancelButton: boolean = true,
  ) {
    const focusedElement = document.activeElement as HTMLElement;
    if (focusedElement) {
      focusedElement.blur();
    }
    const dialogRef = this.ngbModal.open(ConfirmationDialogComponent, {
      centered: true,
      animation: true,
    });
    dialogRef.componentInstance.title = title;
    dialogRef.componentInstance.question = question;
    dialogRef.componentInstance.message = message;
    dialogRef.componentInstance.acceptButton = acceptButton;
    dialogRef.componentInstance.disableCancelButton = disableCancelButton;

    return dialogRef;
  }

  async fetchDataFromFileUrl(url: string) {
    const blob = await firstValueFrom(
      this.configurationService.getDatafromUrl(url),
    );
    const arrayBuffer = await blob.arrayBuffer();
    return arrayBuffer;
  }

  async dataFromFileUrlToJson(url: string) {
    this.logger.log(`Fetching data from url: ${url}`);
    const arrayBuffer = await this.fetchDataFromFileUrl(url);
    this.logger.log(`Fetched array buffer with length: ${arrayBuffer.byteLength}`);
    const text = new TextDecoder().decode(arrayBuffer);
    const jsonData = JSON.parse(text);

    return jsonData;
  }

  updateCustomerGroup(customers: Array<CustomerUpdated>) {
    this.logger.log('new value customer details', customers);
    if (!customers?.length) return;
    customers.forEach((item) => {
      const existingIndex = this.customersLocationUpdated.findIndex(
        (i) => i.index === item.index && i.name === item.name,
      );
      if (existingIndex !== -1) {
        // Replace the existing entry
        this.customersLocationUpdated[existingIndex] = item;
      } else {
        // Add a new entry
        this.customersLocationUpdated.push(item);
      }

      // Find and remove the customer from uncertain
      const uncertainIndex =
        this.uploadDataGroupCustomers!.uncertain.customers.findIndex(
          (c) => c.name === item.name,
        );
      // Find and remove the customer from unverify
      const unverifyIndex =
        this.uploadDataGroupCustomers!.unverify.customers.findIndex(
          (c) => c.name === item.name,
        );
      if (uncertainIndex !== -1) {
        this.moveCustomerToEdit(
          this.uploadDataGroupCustomers!.uncertain.customers[uncertainIndex],
          {
            longitude: Number(item.longitude),
            latitude: Number(item.latitude),
          },
        );
      } else if (unverifyIndex !== -1) {
        this.moveCustomerToEdit(
          this.uploadDataGroupCustomers!.unverify.customers[unverifyIndex],
          {
            longitude: Number(item.longitude),
            latitude: Number(item.latitude),
          },
        );
      }
    });
  }

  groupingCustomer(customers: Customer[], depots: Depot[]) {
    this.countUploadedCustomers = customers.length;
    this.preOrderCount = customers.reduce((sum, customer) => {
      const products =
        (customer.productQuantity?.length ? customer.productQuantity : null) ||
        customer.extra?.productsInfo ||
        [];
      return sum + products.length;
    }, 0);

    const groupedCustomer = this.groupCustomers(customers);

    this.logger.log('groupingCustomer customers', customers);
    this.logger.log('groupingCustomer depots', depots);

    this.uploadDataGroupCustomers = {
      verify: {
        customers: groupedCustomer.verify,
        type: LocationType.Verify,
      },
      uncertain: {
        customers: groupedCustomer.uncertain,
        type: LocationType.Uncertain,
      },
      unverify: {
        customers: groupedCustomer.unverify,
        type: LocationType.Unverify,
      },
      edit: {
        customers: [],
        type: LocationType.Edit,
      },
    };

    this.logger.log('this.uploadDataGroupCustomers', this.uploadDataGroupCustomers);
    this.logger.log('depots', depots);

    this.reInitializeDataTable();
    this.loadLocation(this.uploadDataGroupCustomers);
    this.loadLocationDepot(depots);
    this.isUpload = true;
    this.isFileSelectionStep = false;
  }
  isOriginalExperiment(): boolean {
    return this.experiment.run === Run.Original;
  }

  onValueChange<K extends keyof Constraint>(
    newValue: Constraint[K],
    property: K,
  ): void {
    this.updateConstraint(this.constraintsData, property, newValue);
    this.haveUpdateAfterValidated = true;
  }

  updateConstraint<K extends keyof Constraint>(
    obj: Constraint,
    key: K,
    value: Constraint[K],
  ): void {
    obj[key] = value;
  }

  exportValidationData() {
    const files: Array<{
      data: Array<Record<string, string | number>>;
      name: string;
    }> = [];
    if (
      this.validateExperiment?.filters?.order_data &&
      this.validateExperiment?.filters?.order_data?.invalid_coordinate?.length >
        0
    ) {
      files.push({
        data:
          this.validateExperiment?.warning.zero_weight.map((customer, i) => ({
            index: i + 1,
            ORDER_ID: customer.name,
            ADDRESS: customer.originalAddress?.address ?? '',
            SUBDISTRICT: customer.originalAddress?.subdistrict ?? '',
            DISTRICT: customer.originalAddress?.district ?? '',
            PROVINCE: customer.originalAddress?.province ?? '',
          })) || [],
        name:
          'Remove_Order_' + this.experiment.name + '_' + this.experiment.runId,
      });
    }
    if (
      this.validateExperiment?.warning &&
      this.validateExperiment?.warning.zero_weight.length > 0
    ) {
      files.push({
        data:
          this.validateExperiment?.warning.zero_weight.map((customer, i) => ({
            index: i + 1,
            ORDER_ID: customer.name,
            PRODUCT_ID_ZERO_WEIGHT:
              (customer.metrics?.productIds || []).join(',') ?? '',
            PRODUCT_ID_MISSING:
              (customer.metrics?.missingProductIds || []).join(',') ?? '',
          })) || [],
        name:
          'Zero_Weight_' + this.experiment.name + '_' + this.experiment.runId,
      });
    }
    this.exportService.exportMultipleCsv(
      files.map((file) => file.data),
      files.map((file) => file.name),
    );
  }

  getValidateMessage(): void {
    this.transloco
      .selectTranslate('over_distance_warning', {}, 'index')
      .subscribe((translation) => {
        this.validateMessage = {
          filtersMessage: {
            constraints: {
              overDistance: {
                title: `${translation}!`,
                message: `${this.transloco.translate(
                  'over_distance_description',
                  {},
                  'index',
                )}.`,
              },
              overWeight: {
                title: `${this.transloco.translate(
                  'over_weight_warning',
                  {},
                  'index',
                )}!`,
                message: `${this.transloco.translate(
                  'over_weight_description',
                  {},
                  'index',
                )}.`,
              },
            },
            orderData: {
              invalidCoordinate: {
                title: `${this.transloco.translate(
                  'unverify_coordinate_danger',
                  {},
                  'index',
                )}!`,
                message: `${this.transloco.translate(
                  'unverify_coordinate_description',
                  {},
                  'index',
                )}.`,
              },
            },
          },
          warningMessage: {
            zeroWeight: {
              title: `${this.transloco.translate(
                'zero_weight_warning',
                {},
                'index',
              )}!`,
              message: `${this.transloco.translate(
                'zero_weight_description',
                {},
                'index',
              )}.`,
            },
          },
        };
      });
  }

  async onDepotSelectionChange() {
    const depot = this.depots.find(
      (d) => d.depotName === this.selectedDepotIdName,
    );
    if (depot) {
      this.updateDepot([depot]);
      this.updateInputDataKeysFromDepot(depot);
      this.updateRequiredFileTypeByDepot(depot);
    } else {
      this.inputDataKeys = [];
      this.depotInputDataItems = [];
      this.updateRequiredFileTypeByDepot(undefined);
    }
    await this.validateUploadedFilesAgainstDepot();
    // refresh dynamic parameters render when depot changes
    this.refreshDynamicParametersForSelectedDepot();

    // Update upload button state after depot change
    this.updateCanUploadState();
  }

  updateDepot(
    depots: Array<Pick<MyDepot, 'depotName' | 'latitude' | 'longitude'>>,
  ) {
    this.preOrderFiles = [];
    this.vectorSourceDepot.clear();

    const iconWithLabel = (label: string) =>
      new Style({
        image: new Icon({
          anchor: [0.5, 1],
          anchorOrigin: 'bottom-left',
          anchorXUnits: 'fraction',
          anchorYUnits: 'pixels',
          crossOrigin: 'anonymous',
          opacity: 1,
          scale: 1,
          src: `assets/image/depot.png`,
        }),
        text: new Text({
          text: label,
          offsetY: 25,
          font: '12px Arial',
          fill: new Fill({ color: '#000000' }),
          stroke: new Stroke({ color: '#ffffff', width: 2 }),
        }),
      });

    depots.forEach((depot) => {
      const lon = Number(depot.longitude);
      const lat = Number(depot.latitude);
      const coord = OlProj.fromLonLat([lon, lat]);
      const feature = new Feature({
        geometry: new Point(coord),
        data: { data: depot, isDepot: true },
      });
      feature.setStyle(iconWithLabel(depot.depotName));
      this.vectorSourceDepot.addFeature(feature);
    });
  }

  getMyDepots(showSpinner: boolean = false) {
    if (showSpinner) {
      this.spinner.show();
    }

    this.experimentService.getMyCompany().subscribe({
      next: (company: Company) => {
        this.companyDepotType = company.depotType;
      },
      error: (error) => {
        this.logger.error('Error fetching myCompany data:', error);
        this.toastr.error(error);
      },
    });

    this.experimentService.getMyDepots().subscribe({
      next: (depots: MyDepot[]) => {
        // Normalize depot structure for compatibility (moved from service)
        this.depots = (depots || []).map((depot: MyDepot) => ({
          ...depot,
          depotName: depot.depotName,
          latitude: Number(depot.latitude),
          longitude: Number(depot.longitude),
          columns: depot.columns || [],
          inputdata: depot.inputdata || [],
        }));
        if (this.depots && this.depots.length > 0) {
          this.selectedDepotIdName = this.depots[0].depotName;

          // Update input data keys from the first depot
          this.updateInputDataKeysFromDepot(this.depots[0]);
          this.updateRequiredFileTypeByDepot(this.depots[0]);
          // refresh dynamic parameters view for selected depot
          this.refreshDynamicParametersForSelectedDepot();

          if (this.selectedDepotIdName) {
            localStorage.setItem(
              'selectedDepotIdName',
              this.selectedDepotIdName,
            );
          }

          // Initialize upload button state
          this.updateCanUploadState();
        }
      },
      error: (error) => {
        this.logger.error('Error fetching myDepots data:', error);
        this.toastr.error(error);
        if (showSpinner) {
          this.spinner.hide();
        }
      },
      complete: () => {
        if (showSpinner) {
          this.spinner.hide();
        }
      },
    });
  }

  onCategoryDropdownOpened(fileObj: PreOrderFileItem, isOpened: boolean): void {
    this.logger.log('=== onCategoryDropdownOpened ===', {
      isOpened,
      fileId: fileObj.id,
      fileName: fileObj.file.name,
    });

    if (isOpened) {
      // Capture current displayName before user makes a selection
      const currentDisplayName = this.isFileWithCategory(fileObj.file)
        ? fileObj.file.displayName || ''
        : (fileObj.file as PreOrderFileDescriptor).displayName || '';
      this.fileDisplayNameBeforeChange[fileObj.id] = currentDisplayName;

      this.logger.log('Captured current displayName:', currentDisplayName);
      this.logger.log('All tracked values:', this.fileDisplayNameBeforeChange);
    }
  }

  async handleInputDataKeyChange(
    fileObj: PreOrderFileItem,
    event: { value: string },
  ) {
    this.logger.log('=== handleInputDataKeyChange START ===');
    this.logger.log('Event value:', event.value);
    this.logger.log('File object:', {
      id: fileObj.id,
      currentDisplayName: fileObj.file.displayName,
      fileName: fileObj.file.name,
      isFile: this.isFileWithCategory(fileObj.file),
    });

    const selectedDisplayName = event.value;

    // Get the previous displayName from our tracked object
    const previousDisplayName =
      this.fileDisplayNameBeforeChange[fileObj.id] || '';

    this.logger.log('Previous displayName from tracking:', previousDisplayName);

    if (selectedDisplayName) {
      // First: Validate if file columns match the new category requirements
      this.logger.log('Starting column validation...');
      const isValid = await this.validateFileColumnsForCategory(
        fileObj,
        selectedDisplayName,
      );
      this.logger.log('Validation result:', isValid);

      if (!isValid) {
        // Validation failed, modal already shown, revert to previous value
        this.logger.log('Validation failed, reverting...');
        this.revertFileDisplayName(fileObj, previousDisplayName);
        this.logger.log('=== handleInputDataKeyChange END (validation failed) ===');
        return;
      }

      // Second: Check if this category already exists in other files (for warning only)
      const isDuplicate = this.preOrderFiles.some(
        (item) =>
          item.id !== fileObj.id &&
          item.file.displayName === selectedDisplayName,
      );

      if (isDuplicate) {
        this.logger.log(
          'Category already exists in another file, showing warning...',
        );
        // Show warning toast but allow the change
        // hasDuplicateCategory will show red border (2px solid #dc3545)
        this.toastr.warning(
          this.transloco.translate(
            'a_file_with_this_category_is_already_added',
            {},
            'index',
          ),
        );
      }
    }

    this.logger.log('Validation passed, updating file properties...');
    const found = this.depotInputDataItems.find(
      (item) => item.displayName === selectedDisplayName,
    );

    if (found) {
      this.logger.log('Found matching depot item:', found.keyName);
      if (this.isFileWithCategory(fileObj.file)) {
        fileObj.file.keyName = found.keyName;
        fileObj.file.displayName = found.displayName;
      } else {
        (fileObj.file as PreOrderFileDescriptor).keyName = found.keyName;
        (fileObj.file as PreOrderFileDescriptor).displayName =
          found.displayName;
      }
    } else {
      this.logger.log('No matching depot item found, clearing values');
      if (this.isFileWithCategory(fileObj.file)) {
        fileObj.file.keyName = '';
        fileObj.file.displayName = '';
      } else {
        (fileObj.file as PreOrderFileDescriptor).keyName = '';
        (fileObj.file as PreOrderFileDescriptor).displayName = '';
      }
    }

    // Update our tracked object with the new confirmed value
    this.fileDisplayNameBeforeChange[fileObj.id] = selectedDisplayName;
    this.logger.log('Updated tracking with new value:', selectedDisplayName);

    // Update upload button state after category change
    this.updateCanUploadState();
    this.logger.log('=== handleInputDataKeyChange END (success) ===');
  }

  hasDuplicateCategory(fileObj: PreOrderFileItem): boolean {
    if (!fileObj.file.displayName) return false;

    // Count how many files have the same displayName
    const count = this.preOrderFiles.filter(
      (item) => item.file.displayName === fileObj.file.displayName,
    ).length;

    // If count > 1, this category is duplicated
    return count > 1;
  }

  hasDuplicateFileName(fileObj: PreOrderFileItem): boolean {
    if (!fileObj.file.name) return false;

    // Count how many files have the same file name
    const count = this.preOrderFiles.filter(
      (item) => item.file.name === fileObj.file.name,
    ).length;

    // If count > 1, this file name is duplicated
    return count > 1;
  }

  hasDuplicateFileSize(fileObj: PreOrderFileItem): boolean {
    if (!fileObj.file.size) return false;

    // Only check for duplicate file size if file name is also duplicated
    if (!this.hasDuplicateFileName(fileObj)) return false;

    // Count how many files have the same file size AND same file name
    const count = this.preOrderFiles.filter(
      (item) =>
        item.file.size === fileObj.file.size &&
        item.file.name === fileObj.file.name,
    ).length;

    // If count > 1, this file size is duplicated (with matching name)
    return count > 1;
  }

  getFileWarningMessages(fileObj: PreOrderFileItem): string[] {
    const messages: string[] = [];

    // Check duplicate file name first
    if (this.hasDuplicateFileName(fileObj)) {
      messages.push(
        this.transloco.translate('duplicate_file_name', {}, 'index'),
      );

      // Only check duplicate file size if file name is also duplicated
      if (this.hasDuplicateFileSize(fileObj)) {
        messages.push(
          this.transloco.translate('duplicate_file_size', {}, 'index'),
        );
      }
    }

    return messages;
  }

  hasFileWarning(fileObj: PreOrderFileItem): boolean {
    return (
      this.hasDuplicateFileName(fileObj) || this.hasDuplicateFileSize(fileObj)
    );
  }

  getFileTypeDisplay(fileObj: PreOrderFileItem): string {
    // Derive from the extension: a .csv on Windows may report the Excel MIME
    // type ('application/vnd.ms-excel'), so the MIME type alone is unreliable.
    const fileName = (fileObj.file?.name || '').toLowerCase();
    const dotIndex = fileName.lastIndexOf('.');
    if (dotIndex > -1) {
      return fileName.slice(dotIndex + 1);
    }
    return this.validTypes.includes(fileObj.file?.type)
      ? 'xlsx'
      : fileObj.file?.type || '';
  }

  getAllErrorMessages(fileObj: PreOrderFileItem): string {
    const messages: string[] = [];

    // Add file warning messages if any (WARNING - displayed first)
    if (this.hasFileWarning(fileObj)) {
      const warningMessages = this.getFileWarningMessages(fileObj);
      messages.push(...warningMessages);
    }

    // Add duplicate category message if applicable (ERROR - displayed after warnings)
    if (this.hasDuplicateCategory(fileObj)) {
      messages.push(
        this.transloco.translate(
          'a_file_with_this_category_is_already_added',
          {},
          'index',
        ),
      );
    }

    return messages.join(', ');
  }

  async validateFileColumnsForCategory(
    fileObj: PreOrderFileItem,
    selectedDisplayName: string,
  ): Promise<boolean> {
    this.logger.log('validateFileColumnsForCategory called', {
      fileId: fileObj.id,
      selectedDisplayName,
      isFileWithCategory: this.isFileWithCategory(fileObj.file),
      fileName: fileObj.file.name,
      hasCachedColumns: !!this.fileColumnsCache[fileObj.id],
    });

    // Find the required columns for the selected category
    const targetItem = this.depotInputDataItems.find(
      (item) => item.displayName === selectedDisplayName,
    );

    if (!targetItem) {
      this.logger.error(
        'Target item not found for displayName:',
        selectedDisplayName,
      );
      return false;
    }

    this.logger.log('Target item found:', {
      keyName: targetItem.keyName,
      displayName: targetItem.displayName,
      columnRequired: targetItem.columnRequired,
    });

    // First, try to use cached columns (from when file was first uploaded)
    const cachedColumns = this.fileColumnsCache[fileObj.id];
    if (cachedColumns && cachedColumns.length > 0) {
      this.logger.log('Using cached columns for validation:', cachedColumns);
      return this.validateColumnsAgainstCategory(
        cachedColumns,
        targetItem,
        fileObj.file.name,
      );
    }

    // If this is a PreOrderFileDescriptor (loaded from server), we cannot validate actual file columns
    // In this case, we'll assume it's valid
    if (!this.isFileWithCategory(fileObj.file)) {
      this.logger.log(
        'File is PreOrderFileDescriptor and no cached columns, skipping validation',
      );
      return true;
    }

    // Check if the file is a valid File object
    const file = fileObj.file as FileWithCategory;
    if (!file || !(file instanceof File)) {
      this.logger.error('File is not a valid File object:', file);
      this.toastr.error(
        this.transloco.translate('error_reading_file', {}, 'index'),
      );
      return false;
    }

    this.logger.log('Starting file read for validation:', file.name);

    // Read the file and get its columns
    return new Promise<boolean>((resolve) => {
      const reader = new FileReader();

      reader.onerror = () => {
        this.logger.error('FileReader error:', reader.error);
        this.toastr.error(
          this.transloco.translate('error_reading_file', {}, 'index'),
        );
        resolve(false);
      };

      reader.onload = async (e: ProgressEvent<FileReader>) => {
        try {
          const result = e.target?.result;
          const fileName = (fileObj.file?.name || '').toLowerCase();
          const isCsv = fileName.endsWith('.csv');

          let columnNames: string[] = [];
          if (isCsv) {
            if (typeof result !== 'string') {
              this.logger.error('CSV result is not string');
              resolve(false);
              return;
            }
            columnNames = this.parseCsvHeaderColumnNames(result);
          } else {
            if (!(result instanceof ArrayBuffer)) {
              this.logger.error('Result is not ArrayBuffer');
              resolve(false);
              return;
            }

            this.logger.log('File loaded, parsing Excel...');
            const arrayBuffer = result;
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(arrayBuffer);

            let worksheet: ExcelJS.Worksheet | undefined =
              workbook.getWorksheet(1);
            if (!worksheet) {
              worksheet =
                workbook.worksheets.find(
                  (ws: ExcelJS.Worksheet) => ws.getRow(1)?.cellCount > 0,
                ) || workbook.worksheets[0];
            }

            columnNames = (
              worksheet!.getRow(1).values as (string | undefined)[]
            ).filter((value) => typeof value === 'string') as string[];
          }

          // Cache these columns for future validations
          this.fileColumnsCache[fileObj.id] = columnNames;
          this.logger.log('Cached columns for future use:', columnNames);

          const isValid = this.validateColumnsAgainstCategory(
            columnNames,
            targetItem,
            fileObj.file.name,
          );
          resolve(isValid);
        } catch (error) {
          this.logger.error('Error validating file columns:', error);
          this.toastr.error(
            this.transloco.translate('error_reading_file', {}, 'index'),
          );
          resolve(false);
        }
      };

      const fileName = (file?.name || '').toLowerCase();
      if (fileName.endsWith('.csv')) {
        reader.readAsText(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    });
  }

  private validateColumnsAgainstCategory(
    columnNames: string[],
    targetItem: {
      keyName: string;
      displayName: string;
      columnRequired: string[];
    },
    fileName: string,
  ): boolean {
    this.logger.log('validateColumnsAgainstCategory:', {
      fileName,
      targetDisplayName: targetItem.displayName,
      fileColumns: columnNames,
      requiredColumns: targetItem.columnRequired,
    });

    // Check if all required columns are present
    const missingColumns = targetItem.columnRequired.filter(
      (col) => !columnNames.includes(col),
    );

    this.logger.log('Missing columns:', missingColumns);

    if (missingColumns.length > 0) {
      // Show error modal with missing columns
      const validationError = `<strong>${this.transloco.translate(
        'file_for',
        {},
        'index',
      )} "${targetItem.displayName}" ${this.transloco.translate(
        'missing_columns_as_follows',
        {},
        'index',
      )}</strong><span>:</span> <br/><ul>${missingColumns
        .map((col) => `<li>${col}</li>`)
        .join('')}</ul>`;

      this.showInvalidModal(
        `${this.transloco.translate(
          'column_name_mismatch_template',
          {},
          'index',
        )}`,
        [validationError],
      );
      this.logger.log('Validation FAILED - missing columns');
      return false; // Validation failed - missing columns
    } else {
      // All required columns are present
      this.logger.log('Validation PASSED - all columns present');
      return true; // Validation passed
    }
  }

  revertFileDisplayName(
    fileObj: PreOrderFileItem,
    previousDisplayName: string,
  ): void {
    this.logger.log('Reverting file displayName', {
      fileId: fileObj.id,
      currentDisplayName: fileObj.file.displayName,
      previousDisplayName,
    });

    const previousItem = this.depotInputDataItems.find(
      (item) => item.displayName === previousDisplayName,
    );

    if (this.isFileWithCategory(fileObj.file)) {
      fileObj.file.displayName = previousDisplayName;
      if (previousItem) {
        fileObj.file.keyName = previousItem.keyName;
      } else {
        fileObj.file.keyName = '';
      }
    } else {
      (fileObj.file as PreOrderFileDescriptor).displayName =
        previousDisplayName;
      if (previousItem) {
        (fileObj.file as PreOrderFileDescriptor).keyName = previousItem.keyName;
      } else {
        (fileObj.file as PreOrderFileDescriptor).keyName = '';
      }
    }

    // Force update the specific file in the array to trigger change detection
    const index = this.preOrderFiles.findIndex((f) => f.id === fileObj.id);
    if (index !== -1) {
      this.preOrderFiles[index] = { ...fileObj };
    }

    // Trigger change detection to update the UI
    this.cdr.detectChanges();

    this.logger.log('File reverted successfully', {
      newDisplayName: fileObj.file.displayName,
      newKeyName: this.isFileWithCategory(fileObj.file)
        ? fileObj.file.keyName
        : (fileObj.file as PreOrderFileDescriptor).keyName,
    });
  }

  hasAnyDuplicateCategories(): boolean {
    // Check if any file in preOrderFiles has a duplicate category
    return this.preOrderFiles.some((fileObj) =>
      this.hasDuplicateCategory(fileObj),
    );
  }

  updateInputDataKeysFromDepot(depot: MyDepot) {
    this.depotInputDataItems =
      depot.inputdata?.map((item) => ({
        keyName: item.keyName,
        displayName: item.displayName,
        columnRequired: item.columnRequired || [],
        required: item.required,
        fileFormatType: item.fileFormatType,
      })) || [];

    const uniqueItems = this.depotInputDataItems.filter(
      (item, index, self) =>
        index ===
        self.findIndex((existingItem) => existingItem.keyName === item.keyName),
    );
    this.inputDataKeys = uniqueItems.map((item) => item.displayName);

    // Update upload button state when depot requirements change
    this.updateCanUploadState();
  }

  async validateUploadedFilesAgainstDepot() {
    const validFiles = [];
    for (const file of this.preOrderFiles) {
      const isValid = await this.validateFileAgainstDepotRequirements(file);
      if (isValid) {
        validFiles.push(file);
      } else {
        this.toastr.warning(
          `File ${file.file.name} does not match current depot requirements and has been removed.`,
        );
      }
    }
    this.preOrderFiles = validFiles;

    // Update upload button state after validation
    this.updateCanUploadState();
  }

  validateFileAgainstDepotRequirements(
    file: PreOrderFileItem,
  ): Promise<boolean> {
    // Read the file to get column names
    return new Promise<boolean>((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e: ProgressEvent<FileReader>) => {
        try {
          const result = e.target?.result;
          const fileName = (file.file?.name || '').toLowerCase();
          const isCsv = fileName.endsWith('.csv');

          let columnNames: string[] = [];
          if (isCsv) {
            if (typeof result !== 'string') {
              resolve(false);
              return;
            }
            columnNames = this.parseCsvHeaderColumnNames(result);
          } else {
            if (!(result instanceof ArrayBuffer)) {
              resolve(false);
              return;
            }
            const arrayBuffer = result;
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(arrayBuffer);

            let worksheet: ExcelJS.Worksheet | undefined =
              workbook.getWorksheet(1);
            if (!worksheet) {
              const normalize = (name: string) =>
                name
                  .trim()
                  .toLowerCase()
                  .replace(/[\s_-]/g, '');

              const allSheets = workbook.worksheets.map(
                (ws: ExcelJS.Worksheet) => ({
                  name: ws.name,
                  normalized: normalize(ws.name),
                }),
              );

              this.logger.log(
                'Detected sheets:',
                allSheets.map((sheet) => sheet.name),
              );

              worksheet =
                workbook.worksheets.find(
                  (ws: ExcelJS.Worksheet) => ws.getRow(1)?.cellCount > 0,
                ) || workbook.worksheets[0];
            }

            columnNames = (
              worksheet!.getRow(1).values as (string | undefined)[]
            ).filter((value) => typeof value === 'string') as string[];
          }

          // Check if file matches any of the depot's input data requirements
          const matchingInputDataItem =
            this.findMatchingInputDataItem(columnNames);
          if (matchingInputDataItem) {
            if (this.isFileWithCategory(file.file)) {
              file.file.keyName = matchingInputDataItem.keyName;
              file.file.displayName = matchingInputDataItem.displayName;
              file.file.isFirstOfType = false;
            }
            // Keep existing files editable when re-validating against depot
            resolve(true);
          } else {
            resolve(false);
          }
        } catch (error) {
          this.logger.error('Error validating file:', error);
          resolve(false);
        }
      };
      if (this.isFileWithCategory(file.file)) {
        const fileName = (file.file?.name || '').toLowerCase();
        if (fileName.endsWith('.csv')) {
          reader.readAsText(file.file);
        } else {
          reader.readAsArrayBuffer(file.file);
        }
      } else {
        // For descriptor items (loaded from server), consider them valid
        resolve(true);
      }
    });
  }

  isFileWithCategory(
    value: File | (Partial<FileWithCategory> & object) | null | undefined,
  ): value is FileWithCategory {
    return (
      !!value &&
      typeof value === 'object' &&
      ('arrayBuffer' in (value as File) || value instanceof File)
    );
  }

  findMatchingInputDataItem(
    columnNames: string[],
  ): { keyName: string; displayName: string; columnRequired: string[] } | null {
    return (
      this.depotInputDataItems.find((item) => {
        return item.columnRequired.every((requiredCol) =>
          columnNames.includes(requiredCol),
        );
      }) || null
    );
  }

  updateCanUploadState(): void {
    if (this.preOrderFiles.length === 0) {
      this.canUpload = false;
      return;
    }

    // Check for duplicate categories
    if (this.hasAnyDuplicateCategories()) {
      this.canUpload = false;
      return;
    }

    // Note: Duplicate file names and file sizes only show warnings but don't disable submit

    // Get only required file types (where required === true)
    const requiredDisplayNames = this.depotInputDataItems
      .filter((item) => item.required === true)
      .map((item) => item.displayName);

    const uploadedDisplayNames = this.preOrderFiles
      .map(
        (preOrderFileItem) =>
          (preOrderFileItem.file as FileWithCategory).displayName,
      )
      .filter((displayName) => !!displayName);

    // Check if all required files are uploaded
    // If no files are required, every() returns true (allowing optional-only uploads)
    const allRequiredUploaded = requiredDisplayNames.every((required) =>
      uploadedDisplayNames.includes(required),
    );

    this.canUpload = allRequiredUploaded;
  }

  backToStep1() {
    const focusedElement = document.activeElement as HTMLElement;
    if (focusedElement) {
      focusedElement.blur();
    }

    const dialogRef = this.ngbModal.open(ConfirmationDialogComponent, {
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
        this.activeNavId = 1;

        // Reset step state to upload mode (allow depot selection and file upload)
        this.isUpload = false;
        this.isFileSelectionStep = true;
        this.isFilePreview = true;

        // Clear uploaded files and preview data
        this.preOrderFiles = [];

        // Clear map orders markers and data-related states
        if (this.vectorSource) {
          this.vectorSource.clear();
        }
        this.dataPreOrder = [];
        this.resetComponentValue();

        // Hide transform warnings
        this.transformWarnings = [];
        this.transformWarningCollapseStates = [];

        // Refresh depot list and input requirements from server with spinner
        this.getMyDepots(true);

        // Reset upload button state
        this.updateCanUploadState();
      })
      .catch(() => {
        // dismissed: do nothing
      });
  }

  getDynamicParameters() {
    const selectedDepotIdName =
      this.getSelectedDepotObject()?.depotId ||
      this.experiment.depots?.[0]?.depotId;
    this.constraintService
      .getDynamicParameters(selectedDepotIdName)
      .subscribe((response: DynamicParameter[]) => {
        this.allDynamicParameters = response || [];
        if (!this.constraintsFromFileLoaded) {
          this.constraintsData =
            this.transformDynamicParametersToConstraint(response);
        }

        if (this.isCreateMode) {
          this.spinner.hide();
        }
        this.refreshDynamicParametersForSelectedDepot();
      });
  }

  transformDynamicParametersToConstraint(
    dynamicParameters: DynamicParameter[],
  ): Constraint {
    const constraint: Constraint = {
      earlyDeliveryTime: '',
      backToDepotTime: '',
      maximumWorkDuration: '',
      numberOfVehicleAvailable: 0,
      vehicleOrderSizeCapacity: 0,
      maximumTravelDistance: 0,
      serviceDurationTime: '',
      minimumVehicle: 0,
    };

    const chooseTime = (
      value: string | number | null | undefined,
      defaultValue: string | number | null | undefined,
    ): string => {
      const inputValueTrimmed = String(value ?? '').trim();
      const defaultValueTrimmed = String(defaultValue ?? '').trim();
      const isBlank =
        !inputValueTrimmed ||
        inputValueTrimmed.toLowerCase() === 'null' ||
        inputValueTrimmed === '00:00';
      if (isBlank) {
        if (
          !!defaultValueTrimmed &&
          defaultValueTrimmed.toLowerCase() !== 'null'
        )
          return defaultValueTrimmed;
        return '00:00';
      }
      return inputValueTrimmed;
    };
    const chooseNumber = (
      value: string | number | null | undefined,
      defaultValue: string | number | null | undefined,
    ): number => {
      const numericValue = Number(value);
      const defaultNumericValue = Number(defaultValue);
      if (!isNaN(numericValue) && numericValue > 0) return numericValue;
      if (!isNaN(defaultNumericValue) && defaultNumericValue > 0)
        return defaultNumericValue;
      return 0;
    };

    for (const param of dynamicParameters) {
      const key = this.getConstraintKeyForParam(param);
      if (!key) continue;
      const defaultValue = param.defaultValue;
      if (this.isTimeType(param)) {
        (constraint as Record<string, string | number | undefined>)[key] =
          chooseTime(param.value, defaultValue);
      } else if (this.isNumberType(param)) {
        (constraint as Record<string, string | number | undefined>)[key] =
          chooseNumber(param.value, defaultValue);
      } else {
        (constraint as Record<string, string | number | undefined>)[key] =
          (param.value ?? defaultValue ?? '') as string | number;
      }
    }

    return constraint;
  }

  onParamValueChange(
    dynamicParameter: DynamicParameter,
    newValue: string | number | null | undefined,
  ): void {
    const key = this.getConstraintKeyForParam(dynamicParameter);

    if (this.isTimeType(dynamicParameter)) {
      const trimmedTimeValue = String(newValue ?? '').trim();
      const normalized =
        !trimmedTimeValue || trimmedTimeValue.toLowerCase() === 'null'
          ? '00:00'
          : trimmedTimeValue;
      dynamicParameter.value = normalized;
      if (key) this.onValueChange(normalized, key);
      return;
    }

    if (this.isNumberType(dynamicParameter)) {
      const numericValue = Number(newValue);
      const normalized = isNaN(numericValue) ? 0 : numericValue;
      dynamicParameter.value = normalized;
      if (key) this.onValueChange(normalized, key);
      return;
    }

    const trimmedTextValue = String(newValue ?? '').trim();
    dynamicParameter.value = trimmedTextValue;
    if (key) this.onValueChange(trimmedTextValue, key);
  }

  buildDynamicParametersUpdatePayload(): Array<{
    id: string;
    value: string | number;
  }> {
    const updates: Array<{ id: string; value: string | number }> = [];
    for (const group of this.dynamicParametersByCategory) {
      for (const dynamicParameter of group.items) {
        if (
          dynamicParameter?.id &&
          dynamicParameter.value !== undefined &&
          dynamicParameter.value !== null
        ) {
          updates.push({
            id: dynamicParameter.id,
            value: dynamicParameter.value,
          });
        }
      }
    }
    return updates;
  }

  updateDynamicParameters(): void {
    const payload = this.buildDynamicParametersUpdatePayload();
    if (!payload.length) return;
    this.showSpinner();
    this.constraintService.updateDynamicParameter(payload).subscribe({
      next: () => {
        this.toastr.success(
          this.transloco.translate('success', {}, 'index'),
          this.transloco.translate('set_default_parameter', {}, 'index'),
        );
      },
      error: (err) => {
        this.logger.error(err);
        this.toastr.error(
          this.transloco.translate('failed', {}, 'index'),
          this.transloco.translate('set_default_parameter_failed', {}, 'index'),
        );
      },
      complete: () => this.hiddenSpinner(),
    });
  }

  getBackendLocaleKey(): keyof LocalizedText {
    const active = this.transloco.getActiveLang();
    return active?.toLowerCase().startsWith('th') ? 'th_TH' : 'en_US';
  }

  getLocalized(text?: LocalizedText | string | null): string {
    if (!text) return '';
    const key = this.getBackendLocaleKey();
    if (typeof text === 'string') {
      try {
        const parsed = JSON.parse(text) as LocalizedText;
        return parsed[key] ?? '';
      } catch {
        return text;
      }
    }
    return text[key] ?? '';
  }

  coerceLocalizedText(
    value: LocalizedText | string | null | undefined,
  ): LocalizedText | null {
    if (!value) return null;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value) as LocalizedText;
      } catch {
        return { th_TH: value, en_US: value } as LocalizedText;
      }
    }
    return value as LocalizedText;
  }

  getSelectedDepotObject(): MyDepot | undefined {
    if (!this.selectedDepotIdName) return undefined;
    return this.depots.find(
      (depot) => depot.depotName === this.selectedDepotIdName,
    );
  }

  refreshDynamicParametersForSelectedDepot(): void {
    const selectedDepot = this.getSelectedDepotObject();
    const base = Array.isArray(this.allDynamicParameters)
      ? this.allDynamicParameters
      : [];

    let scoped = base;
    if (selectedDepot?.depotId) {
      scoped = base.filter(
        (dynamicParameter) =>
          dynamicParameter.depotId === selectedDepot.depotId,
      );
    }
    if (!scoped.length) {
      scoped = base.filter((dynamicParameter) => !dynamicParameter.depotId);
    }
    if (!scoped.length) {
      scoped = base;
    }

    const preferRank = (dynamicParameter: DynamicParameter): number => {
      if (dynamicParameter.depotId === selectedDepot?.depotId) return 0;
      if (!dynamicParameter.depotId) return 1;
      return 2;
    };
    const dedupMap: Record<string, DynamicParameter> = {};
    for (const dynamicParameter of scoped) {
      const keyName = (dynamicParameter.keyName || '').trim();
      if (!keyName) continue;
      const existing = dedupMap[keyName];
      if (!existing) {
        dedupMap[keyName] = dynamicParameter;
      } else {
        if (preferRank(dynamicParameter) < preferRank(existing)) {
          dedupMap[keyName] = dynamicParameter;
        }
      }
    }
    const scopedUnique = Object.values(dedupMap);
    const defaultLocalized: LocalizedText = { th_TH: '', en_US: '' };
    const normalized: DynamicParameter[] = scopedUnique.map(
      (dynamicParameter) => {
        return {
          ...dynamicParameter,
          displayName:
            this.coerceLocalizedText(dynamicParameter.displayName) ??
            defaultLocalized,
          category:
            this.coerceLocalizedText(dynamicParameter.category) ??
            defaultLocalized,
          description:
            this.coerceLocalizedText(dynamicParameter.description) ??
            defaultLocalized,
        };
      },
    );

    const groupsMap: Record<string, DynamicParameter[]> = {};
    for (const dynamicParameter of normalized) {
      const categoryKey = (
        dynamicParameter.category.en_US || 'Generals'
      ).trim();
      if (!groupsMap[categoryKey]) groupsMap[categoryKey] = [];
      groupsMap[categoryKey].push(dynamicParameter);
    }

    const categoryOrderFromParams: string[] = [];
    for (const dynamicParameter of normalized) {
      const categoryKey = (
        dynamicParameter.category.en_US || 'Generals'
      ).trim();
      if (!categoryOrderFromParams.includes(categoryKey))
        categoryOrderFromParams.push(categoryKey);
    }
    const orderedKeys = Object.keys(groupsMap).sort((a, b) => {
      const indexA = categoryOrderFromParams.indexOf(a);
      const indexB = categoryOrderFromParams.indexOf(b);
      if (indexA === -1 && indexB === -1) return a.localeCompare(b);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });

    const useConstraintsValues = this.hasMeaningfulConstraintsData();
    this.dynamicParametersByCategory = orderedKeys.map((categoryKey) => {
      const originalItems = groupsMap[categoryKey];
      const items = useConstraintsValues
        ? originalItems.map((dynamicParameter) => {
            const constraintKey =
              this.getConstraintKeyForParam(dynamicParameter);
            if (!constraintKey) return dynamicParameter;
            const constraintValue = this.constraintsData[constraintKey];
            if (constraintValue === undefined || constraintValue === null) {
              if (this.isTimeType(dynamicParameter)) {
                return { ...dynamicParameter, value: '00:00' };
              }
              return dynamicParameter;
            }
            if (this.isNumberType(dynamicParameter)) {
              return { ...dynamicParameter, value: Number(constraintValue) };
            }
            const trimmedValue = String(constraintValue).trim();
            return {
              ...dynamicParameter,
              value:
                trimmedValue === '' || trimmedValue.toLowerCase() === 'null'
                  ? '00:00'
                  : trimmedValue,
            };
          })
        : originalItems;
      return {
        key: categoryKey,
        items,
      };
    });
    this.cdr.detectChanges();
  }

  isTimeType(dynamicParameter: DynamicParameter): boolean {
    const normalizedValueType = (
      dynamicParameter.valueType || ''
    ).toLowerCase();
    return (
      normalizedValueType === 'time' || normalizedValueType.includes('duration')
    );
  }

  isNumberType(dynamicParameter: DynamicParameter): boolean {
    const normalizedValueType = (
      dynamicParameter.valueType || ''
    ).toLowerCase();
    return normalizedValueType.startsWith('number');
  }

  hasMeaningfulConstraintsData(): boolean {
    const c = this.constraintsData || ({} as Constraint);
    const hasTime =
      (c.earlyDeliveryTime && c.earlyDeliveryTime !== '00:00') ||
      (c.backToDepotTime && c.backToDepotTime !== '00:00') ||
      (c.maximumWorkDuration && c.maximumWorkDuration !== '00:00') ||
      (c.serviceDurationTime && c.serviceDurationTime !== '00:00');
    const hasNumber =
      (Number(c.numberOfVehicleAvailable) || 0) > 0 ||
      (Number(c.vehicleOrderSizeCapacity) || 0) > 0 ||
      (Number(c.maximumTravelDistance) || 0) > 0 ||
      (Number(c.minimumVehicle) || 0) > 0;
    return !!this.validateExperiment || hasTime || hasNumber;
  }

  getConstraintKeyForParam(
    dynamicParameter: DynamicParameter,
  ): keyof Constraint | null {
    const keyName = (dynamicParameter.keyName || '').trim();
    switch (keyName) {
      // keyName may arrive in PascalCase or camelCase; both map to the same key.
      case 'EarlyDeliveryTime':
      case 'earlyDeliveryTime':
        return 'earlyDeliveryTime';
      case 'BackToDepotTime':
      case 'backToDepotTime':
        return 'backToDepotTime';
      case 'MaximumWorkDuration':
      case 'maximumWorkDuration':
        return 'maximumWorkDuration';
      case 'NumberOfVehicleAvailable':
      case 'numberOfVehicleAvailable':
        return 'numberOfVehicleAvailable';
      case 'VehicleOrderSizeCapacity':
      case 'vehicleOrderSizeCapacity':
        return 'vehicleOrderSizeCapacity';
      case 'MaximumTravelDistance':
      case 'maximumTravelDistance':
        return 'maximumTravelDistance';
      case 'ServiceDurationTime':
      case 'serviceDurationTime':
        return 'serviceDurationTime';
      case 'MinimumVehicle':
      case 'minimumVehicle':
        return 'minimumVehicle';
      default:
        return null;
    }
  }

  isOverWeightKey(dynamicParameter: DynamicParameter): boolean {
    return dynamicParameter.keyName === 'VehicleOrderSizeCapacity';
  }

  isOverDistanceKey(dynamicParameter: DynamicParameter): boolean {
    return dynamicParameter.keyName === 'MaximumTravelDistance';
  }

  get availableVehicleTypes(): VehicleType[] {
    return this.myVehicleTypes.filter(
      (vehicle) => vehicle.isVehicleAvailable ?? false,
    );
  }

  isVehicleSelected(vehicleId: string): boolean {
    return this.selectedVehicleIds.includes(vehicleId);
  }

  onVehicleChecked(vehicleId: string, checked: boolean): void {
    if (checked) {
      this.vehicleSelectionError = false;
      if (!this.selectedVehicleIds.includes(vehicleId)) {
        this.selectedVehicleIds = [...this.selectedVehicleIds, vehicleId];
        if (this.selectedVehicleCounts[vehicleId] == null) {
          this.selectedVehicleCounts[vehicleId] = 1;
        }
        if (this.vehicleSelectionMode[vehicleId] == null) {
          this.vehicleSelectionMode[vehicleId] = 'count';
        }
      }
    } else {
      this.selectedVehicleIds = this.selectedVehicleIds.filter(
        (id) => id !== vehicleId,
      );
      if (this.selectedVehicleCounts[vehicleId] != null) {
        delete this.selectedVehicleCounts[vehicleId];
      }
      if (this.vehicleSelectionMode[vehicleId] != null) {
        delete this.vehicleSelectionMode[vehicleId];
      }
      // Clear selected license plates when vehicle is unchecked
      if (this.selectedLicensePlates[vehicleId] != null) {
        delete this.selectedLicensePlates[vehicleId];
      }
      if (this.selectedVehicleIdsByLicensePlate[vehicleId] != null) {
        delete this.selectedVehicleIdsByLicensePlate[vehicleId];
      }
    }
    this.cdr.detectChanges();
  }

  getVehicleName(vehicleId: string): string {
    const vehicle = this.myVehicleTypes.find(
      (v) => v.vehicleTypeId === vehicleId,
    );
    return vehicle ? vehicle.name : '';
  }

  getVehicleCount(vehicleId: string): number {
    const value = this.selectedVehicleCounts[vehicleId];
    return typeof value === 'number' && !isNaN(value) ? value : 1;
  }

  onVehicleCountChange(vehicleId: string, value: number): void {
    const normalized = Number(value);
    const min = this.getVehicleMinCount();
    const max = this.getVehicleMaxCount(vehicleId);
    let clamped = isNaN(normalized) ? min : Math.trunc(normalized);
    if (clamped < min) {
      clamped = min;
    } else if (clamped > max) {
      clamped = max;
    }

    this.selectedVehicleCounts[vehicleId] = clamped;
    this.cdr.detectChanges();
  }

  openVehicleItemModal(vehicleId: string) {
    const vehicleType = this.myVehicleTypes.find(
      (v) => v.vehicleTypeId === vehicleId,
    );

    if (!vehicleType) {
      this.toastr.warning(
        this.transloco.translate('vehicle_not_found', {}, 'index'),
      );
      return;
    }

    const modalRef = this.ngbModal.open(VehicleTypeDialogComponent, {
      centered: true,
      size: 'lg',
      animation: true,
      backdrop: 'static',
      keyboard: false,
    });
    modalRef.componentInstance.mode = 'view';
    modalRef.componentInstance.vehicleType = vehicleType;
  }

  // The limit is a per-experiment constraint that applies to every vehicle, so the id is not read yet.
  getVehicleMaxCount(_vehicleId: string): number {
    const maxByConstraint = Number(
      this.constraintsData?.numberOfVehicleAvailable,
    );
    if (!isNaN(maxByConstraint) && maxByConstraint > 0) {
      return maxByConstraint;
    }
    return this.defaultVehicleMaxCount;
  }

  getVehicleMinCount(): number {
    return 0;
  }

  getVehicleSelectionMode(vehicleId: string): 'count' | 'license-plate' {
    return this.vehicleSelectionMode[vehicleId] || 'count';
  }

  onVehicleSelectionModeChange(
    vehicleId: string,
    mode: 'count' | 'license-plate',
  ): void {
    const previousMode = this.vehicleSelectionMode[vehicleId];
    this.vehicleSelectionMode[vehicleId] = mode;

    // Only update mode, preserve existing count values
    if (previousMode !== mode) {
      if (mode === 'count') {
        // Switching to count mode - keep existing count, ensure it has a minimum value of 1
        if (
          this.selectedVehicleCounts[vehicleId] == null ||
          this.selectedVehicleCounts[vehicleId] === 0
        ) {
          this.selectedVehicleCounts[vehicleId] = 1;
        }
        // Note: We don't delete selectedLicensePlates or selectedVehicleIdsByLicensePlate
        // so user can switch back without losing their selection
      } else {
        // Switching to license-plate mode - preserve existing count value
        // Count will only update when user actually selects/deselects license plates
        if (
          this.selectedVehicleCounts[vehicleId] == null ||
          this.selectedVehicleCounts[vehicleId] === 0
        ) {
          this.selectedVehicleCounts[vehicleId] = 1;
        }
      }
    }

    this.cdr.detectChanges();
  }

  openLicensePlateSelectionDialog(event: Event, vehicleId: string): void {
    // Prevent the radio button from being triggered
    event.stopPropagation();

    const vehicleType = this.myVehicleTypes.find(
      (v) => v.vehicleTypeId === vehicleId,
    );

    if (!vehicleType) {
      this.toastr.warning(
        this.transloco.translate('vehicle_not_found', {}, 'index'),
      );
      return;
    }

    // Get the depot ID from the selected depot or experiment depots
    const depotId =
      this.getSelectedDepotObject()?.depotId ||
      this.experiment.depots?.[0]?.depotId;

    const modalRef = this.ngbModal.open(LicensePlateSelectionDialogComponent, {
      centered: true,
      size: 'lg',
      animation: true,
    });

    modalRef.componentInstance.vehicleType = vehicleType;
    modalRef.componentInstance.vehicleId = vehicleId;
    modalRef.componentInstance.depotId = depotId;
    modalRef.componentInstance.preSelectedLicensePlates =
      this.selectedLicensePlates[vehicleId] || [];

    modalRef.result.then(
      (result) => {
        if (result) {
          // Store the selected license plates for this vehicle type
          this.selectedLicensePlates[vehicleId] = result.selectedLicensePlates;
          this.selectedVehicleIdsByLicensePlate[vehicleId] =
            result.selectedVehicleIds;
          this.cdr.detectChanges();
        }
      },
      () => {},
    );
  }

  getSelectedLicensePlatesCount(vehicleId: string): number {
    return this.selectedLicensePlates[vehicleId]?.length || 0;
  }

  hasDynamicParameters(): boolean {
    return (
      this.dynamicParametersByCategory &&
      this.dynamicParametersByCategory.length > 0
    );
  }

  hasMyVehicleTypes(): boolean {
    return this.myVehicleTypes && this.myVehicleTypes.length > 0;
  }

  // ======================================================================
  // Open VRP — depot scope (global switcher)
  // ======================================================================

  get scopeDepotId(): string {
    if (!this.isFileSelectionStep && this.experiment?.depots?.length) {
      return this.experiment.depots[0].depotId;
    }
    return this.getSelectedDepotObject()?.depotId || '';
  }

  get scopeDepotName(): string {
    if (!this.isFileSelectionStep && this.experiment?.depots?.length) {
      return this.experiment.depots[0].depotName;
    }
    return this.selectedDepotIdName || '';
  }

  // ======================================================================
  // Open VRP — central vehicle pool (configuration panel)
  // ======================================================================

  loadVehiclePool(): void {
    this.poolLoading = true;
    this.vehicleService
      .getMyVehicles()
      .pipe(
        take(1),
        finalize(() => {
          this.poolLoading = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (vehicles: MyVehicles[]) => {
          const grouped: Record<string, MyVehicles[]> = {};
          for (const vehicle of vehicles || []) {
            const vehicleTypeId = vehicle.vehicleType?.vehicleTypeId;
            if (!vehicleTypeId || vehicle.isActive === false) continue;
            if (!grouped[vehicleTypeId]) grouped[vehicleTypeId] = [];
            grouped[vehicleTypeId].push(vehicle);
          }
          this.poolVehiclesByType = grouped;
        },
        error: (error) => {
          this.logger.error('Error loading vehicle pool:', error);
        },
      });
  }

  /** Run list (selected vehicles) of the current depot scope. */
  get runVehicleList(): OpenVrpRunVehicleEntry[] {
    const key = this.scopeDepotId || 'default';
    if (!this.runVehicleListByDepot[key]) {
      this.runVehicleListByDepot[key] = [];
    }
    return this.runVehicleListByDepot[key];
  }

  /** Vehicles of this type registered in the central pool. */
  getPoolVehicles(vehicleTypeId: string): MyVehicles[] {
    return this.poolVehiclesByType[vehicleTypeId] || [];
  }

  /** Whether this type has registered vehicles (license plates) in the pool. */
  isPoolTypeTracked(vehicleTypeId: string): boolean {
    return this.getPoolVehicles(vehicleTypeId).length > 0;
  }

  /** vehicleIds already reserved by "by plate" entries in this run. */
  private usedVehicleIdsInRun(): Set<string> {
    const used = new Set<string>();
    for (const entry of this.runVehicleList) {
      for (const vehicleId of entry.vehicleIds) {
        used.add(vehicleId);
      }
    }
    return used;
  }

  /** Plates of this type still selectable in "by plate" mode. */
  getPoolAvailableVehicles(vehicleTypeId: string): MyVehicles[] {
    const used = this.usedVehicleIdsInRun();
    return this.getPoolVehicles(vehicleTypeId).filter(
      (vehicle) => !used.has(vehicle.vehicleId),
    );
  }

  private getDemoMultiTrip(vehicleTypeId: string): {
    loadingDuration: string;
  } {
    const index = Math.max(
      0,
      this.myVehicleTypes.findIndex(
        (candidate) => candidate.vehicleTypeId === vehicleTypeId,
      ),
    );
    const preset =
      OPEN_VRP_MULTI_TRIP_DEMO[index % OPEN_VRP_MULTI_TRIP_DEMO.length];
    return preset;
  }

  toggleMultiTripDemo(): void {
    this.multiTripDemo = !this.multiTripDemo;
    this.poolBuilders = {};
    this.openPoolCardTypeId = null;
    // keep what the planner chose, only re-clamp it to the ceiling the
    // preview data now implies
    for (const entry of this.runVehicleList) {
      entry.maxTrip = this.clampMaxTrip(entry.maxTrip);
      entry.loadingDuration =
        entry.maxTrip > DEFAULT_MAX_TRIP
          ? entry.loadingDuration ||
            this.getVehicleTypeLoadingDuration(entry.vehicleTypeId) ||
            this.multiTripDefaults.defaultLoadingDuration
          : null;
    }
    this.cdr.detectChanges();
  }

  toggleMultiDepotDemo(): void {
    this.multiDepotDemo = !this.multiDepotDemo;
    // dropped so the next preview picks up any depots and vehicle types that
    // finished loading since the last one
    this.mockDepotRunLists = null;
    this.cdr.detectChanges();
  }

  /**
   * Sample depots for the preview. They are ordinary run entries, so they go
   * through the same aggregation as real ones instead of a parallel mock path.
   */
  private ensureMockDepotRunLists(
    usedDepotIds: Set<string>,
  ): OpenVrpDepotRunList[] {
    if (!this.mockDepotRunLists) {
      this.mockDepotRunLists = buildMockDepotRunLists(
        this.depots,
        this.myVehicleTypes.map((vehicleType) => ({
          vehicleTypeId: vehicleType.vehicleTypeId || '',
          vehicleTypeName: this.getVehicleName(vehicleType.vehicleTypeId || ''),
        })),
        usedDepotIds,
      );
    }
    return this.mockDepotRunLists;
  }

  trackDepotSummary(_index: number, summary: OpenVrpDepotSummary): string {
    return summary.depotId;
  }

  /**
   * Shows the full depot name only when the column was too narrow to fit it.
   * Measuring on hover rather than through a binding keeps it honest: the text
   * is laid out by then, and no layout is read on every change detection.
   */
  openTooltipIfTruncated(tooltip: NgbTooltip, element: HTMLElement): void {
    if (element.scrollWidth > element.clientWidth) {
      tooltip.open();
    }
  }


  /**
   * Trip ceiling of this type — the "/ N trips" the pool card counts up to.
   * The vehicle type's own maxTrip wins as soon as the API returns one;
   * until then every type falls back to the system default.
   */
  /**
   * Fleet-wide standard: the most trips a day any vehicle type may be raised
   * to. It is the hard bound of the trips box — a run can overwrite the
   * vehicle type's own number, but never go past this one.
   */
  getSystemMaxTrip(): number {
    return Math.max(this.multiTripDefaults.systemMaxTrip, DEFAULT_MAX_TRIP);
  }

  /**
   * This vehicle type's own max trips — the same number the vehicle type
   * dialog puts in formVehicleType.controls.maxTrip, and what a pool card
   * opens on. The API value wins once it ships; until then the system default
   * fills in. Never above the fleet-wide standard.
   */
  getVehicleTypeMaxTrip(vehicleTypeId: string): number {
    const vehicleType = this.myVehicleTypes.find(
      (candidate) => candidate.vehicleTypeId === vehicleTypeId,
    );
    const configured = Number(vehicleType?.maxTrip);
    const maxTrip =
      Number.isFinite(configured) && configured >= DEFAULT_MAX_TRIP
        ? Math.trunc(configured)
        : this.multiTripDefaults.defaultMaxTrip;
    return Math.min(
      Math.max(maxTrip, DEFAULT_MAX_TRIP),
      this.getSystemMaxTrip(),
    );
  }

  getVehicleTypeLoadingDuration(vehicleTypeId: string): string | null {
    if (this.multiTripDemo) {
      return this.getDemoMultiTrip(vehicleTypeId).loadingDuration;
    }
    const vehicleType = this.myVehicleTypes.find(
      (candidate) => candidate.vehicleTypeId === vehicleTypeId,
    );
    return vehicleType?.loadingDuration || null;
  }

  /**
   * Whether the trips box is offered at all. It follows the fleet-wide
   * standard, not the vehicle type: a type that defaults to one trip can
   * still be pushed higher for this run.
   */
  isMultiTripAllowed(): boolean {
    return this.getSystemMaxTrip() > DEFAULT_MAX_TRIP;
  }

  /** A run may overwrite the type's trips up to the fleet-wide standard. */
  private clampMaxTrip(maxTrip: number): number {
    const requested = Number(maxTrip);
    if (!Number.isFinite(requested) || requested < DEFAULT_MAX_TRIP) {
      return DEFAULT_MAX_TRIP;
    }
    return Math.min(Math.trunc(requested), this.getSystemMaxTrip());
  }

  changePoolBuilderMaxTrip(vehicleTypeId: string, delta: number): void {
    const builder = this.getPoolBuilder(vehicleTypeId);
    this.setPoolBuilderMaxTrip(vehicleTypeId, builder.maxTrip + delta);
  }

  /** Typed straight into the trips box — a stepper is painful past a few. */
  setPoolBuilderMaxTrip(
    vehicleTypeId: string,
    maxTrip: number | null,
  ): void {
    const builder = this.getPoolBuilder(vehicleTypeId);
    builder.maxTrip = this.clampMaxTrip(Number(maxTrip));
    this.syncBuilderLoadingDuration(vehicleTypeId, builder);
  }

  /**
   * A group only reloads from trip 2 onwards, so the reload time appears
   * with multi-trip and is dropped again when the group falls back to one trip.
   */
  private syncBuilderLoadingDuration(
    vehicleTypeId: string,
    builder: OpenVrpPoolBuilder,
  ): void {
    if (builder.maxTrip <= DEFAULT_MAX_TRIP) {
      builder.loadingDuration = null;
      return;
    }
    if (!builder.loadingDuration) {
      builder.loadingDuration =
        this.getVehicleTypeLoadingDuration(vehicleTypeId) ||
        this.multiTripDefaults.defaultLoadingDuration;
    }
  }

  /** Reload time of this pool card, overwritable for this run only. */
  getPoolBuilderLoadingDuration(vehicleTypeId: string): string {
    return (
      this.getPoolBuilder(vehicleTypeId).loadingDuration ||
      this.multiTripDefaults.defaultLoadingDuration
    );
  }

  setPoolBuilderLoadingDuration(
    vehicleTypeId: string,
    loadingDuration: string | null,
  ): void {
    const builder = this.getPoolBuilder(vehicleTypeId);
    builder.loadingDuration =
      loadingDuration || this.multiTripDefaults.defaultLoadingDuration;
  }

  private createDefaultBuilder(vehicleTypeId: string): OpenVrpPoolBuilder {
    const builder: OpenVrpPoolBuilder = {
      mode: 'count',
      count: 1,
      endOfRoute: 'return',
      chosenVehicleIds: [],
      startDepotId: null,
      endDepotId: null,
      // opens on the vehicle type's own trips, overwritable up to the standard
      maxTrip: this.getVehicleTypeMaxTrip(vehicleTypeId),
      loadingDuration: null,
    };
    this.syncBuilderLoadingDuration(vehicleTypeId, builder);
    return builder;
  }

  getPoolBuilder(vehicleTypeId: string): OpenVrpPoolBuilder {
    const key = `${this.scopeDepotId || 'default'}:${vehicleTypeId}`;
    if (!this.poolBuilders[key]) {
      this.poolBuilders[key] = this.createDefaultBuilder(vehicleTypeId);
    }
    const builder = this.poolBuilders[key];
    builder.maxTrip = this.clampMaxTrip(builder.maxTrip);
    return builder;
  }

  private resetPoolBuilder(vehicleTypeId: string): void {
    const key = `${this.scopeDepotId || 'default'}:${vehicleTypeId}`;
    this.poolBuilders[key] = this.createDefaultBuilder(vehicleTypeId);
  }

  togglePoolCard(vehicleTypeId: string): void {
    this.openPoolCardTypeId =
      this.openPoolCardTypeId === vehicleTypeId ? null : vehicleTypeId;
  }

  openPoolVehicleTypeInfo(event: Event, vehicleTypeId: string): void {
    event.stopPropagation();
    this.openVehicleItemModal(vehicleTypeId);
  }

  setPoolBuilderMode(vehicleTypeId: string, mode: OpenVrpSelectionMode): void {
    if (mode === 'license-plate' && !this.isPoolTypeTracked(vehicleTypeId)) {
      return;
    }
    this.getPoolBuilder(vehicleTypeId).mode = mode;
  }

  changePoolBuilderCount(vehicleTypeId: string, delta: number): void {
    const builder = this.getPoolBuilder(vehicleTypeId);
    this.setPoolBuilderCount(vehicleTypeId, builder.count + delta);
  }

  /**
   * Typed straight into the quantity box — a large group would mean dozens of
   * clicks on the stepper. The pool no longer caps a type, so the number is
   * only kept a whole, non-negative count.
   */
  setPoolBuilderCount(vehicleTypeId: string, count: number | null): number {
    const builder = this.getPoolBuilder(vehicleTypeId);
    const requested = Number(count);
    builder.count = Number.isFinite(requested)
      ? Math.max(0, Math.trunc(requested))
      : 0;
    return builder.count;
  }

  isPoolPlateChosen(vehicleTypeId: string, vehicleId: string): boolean {
    return this.getPoolBuilder(vehicleTypeId).chosenVehicleIds.includes(
      vehicleId,
    );
  }

  togglePoolPlate(
    vehicleTypeId: string,
    vehicleId: string,
    checked: boolean,
  ): void {
    const builder = this.getPoolBuilder(vehicleTypeId);
    if (checked) {
      if (!builder.chosenVehicleIds.includes(vehicleId)) {
        builder.chosenVehicleIds.push(vehicleId);
      }
    } else {
      builder.chosenVehicleIds = builder.chosenVehicleIds.filter(
        (id) => id !== vehicleId,
      );
    }
  }

  setPoolEndOfRoute(
    vehicleTypeId: string,
    endOfRoute: OpenVrpEndOfRoute,
  ): void {
    this.getPoolBuilder(vehicleTypeId).endOfRoute = endOfRoute;
  }

  onPoolStartDepotChange(vehicleTypeId: string, depotId: string): void {
    this.getPoolBuilder(vehicleTypeId).startDepotId = depotId || null;
  }

  /**
   * What the depot selects open on: the depot in scope while it is one of the
   * company's depots, and the first depot otherwise. A select can only land on
   * an option it actually lists, so this never resolves to an unknown depot.
   */
  private get defaultBuilderDepotId(): string {
    const scopeDepotId = this.scopeDepotId;
    const isListed = this.depots.some(
      (depot) => depot.depotId === scopeDepotId,
    );
    return (isListed ? scopeDepotId : this.depots[0]?.depotId) || '';
  }

  /** Opens on the depot in scope; a group may start from any depot. */
  getBuilderStartDepotId(vehicleTypeId: string): string {
    return (
      this.getPoolBuilder(vehicleTypeId).startDepotId ||
      this.defaultBuilderDepotId
    );
  }

  onPoolEndDepotChange(vehicleTypeId: string, depotId: string): void {
    this.getPoolBuilder(vehicleTypeId).endDepotId = depotId || null;
  }

  /** Returns to where the group started (A → A) until another depot is picked. */
  getBuilderEndDepotId(vehicleTypeId: string): string {
    return (
      this.getPoolBuilder(vehicleTypeId).endDepotId ||
      this.getBuilderStartDepotId(vehicleTypeId)
    );
  }

  canAddPoolEntry(vehicleTypeId: string): boolean {
    const builder = this.getPoolBuilder(vehicleTypeId);
    if (builder.mode === 'license-plate') {
      // a chosen plate may have been taken since, e.g. by loading a preset
      return this.getPoolAvailableVehicles(vehicleTypeId).some((vehicle) =>
        builder.chosenVehicleIds.includes(vehicle.vehicleId),
      );
    }
    return builder.count > 0;
  }

  addPoolEntryToRun(vehicleTypeId: string): void {
    if (!this.canAddPoolEntry(vehicleTypeId)) return;
    const builder = this.getPoolBuilder(vehicleTypeId);
    const startDepotId = this.getBuilderStartDepotId(vehicleTypeId);
    const startDepotName =
      this.depots.find((depot) => depot.depotId === startDepotId)
        ?.depotName || this.scopeDepotName;
    const returnToDepot = builder.endOfRoute === 'return';
    const endDepotId = returnToDepot
      ? this.getBuilderEndDepotId(vehicleTypeId)
      : null;
    const endDepotName = returnToDepot
      ? this.depots.find((depot) => depot.depotId === endDepotId)
          ?.depotName || startDepotName
      : null;

    const maxTrip = this.clampMaxTrip(builder.maxTrip);
    const baseEntry = {
      id: this.runEntryIdCounter++,
      vehicleTypeId,
      vehicleTypeName: this.getVehicleName(vehicleTypeId),
      endOfRoute: builder.endOfRoute,
      startDepotId,
      startDepotName,
      endDepotId,
      endDepotName,
      maxTrip,
      // the reload time the planner left on the card, not the master default
      loadingDuration:
        maxTrip > DEFAULT_MAX_TRIP
          ? this.getPoolBuilderLoadingDuration(vehicleTypeId)
          : null,
    };

    let entry: OpenVrpRunVehicleEntry;
    if (builder.mode === 'license-plate') {
      const chosenVehicles = this.getPoolAvailableVehicles(
        vehicleTypeId,
      ).filter((vehicle) =>
        builder.chosenVehicleIds.includes(vehicle.vehicleId),
      );
      if (!chosenVehicles.length) return;
      entry = {
        ...baseEntry,
        mode: 'license-plate',
        count: chosenVehicles.length,
        licensePlates: chosenVehicles.map((vehicle) => vehicle.licensePlate),
        vehicleIds: chosenVehicles.map((vehicle) => vehicle.vehicleId),
      };
    } else {
      entry = {
        ...baseEntry,
        mode: 'count',
        count: builder.count,
        licensePlates: [],
        vehicleIds: [],
      };
    }

    const mergedInto = addOrMergeRunEntry(this.runVehicleList, entry);
    if (mergedInto) {
      this.notifyRunEntryMerged(mergedInto, entry.count);
    }
    this.resetPoolBuilder(vehicleTypeId);
    this.openPoolCardTypeId = null;
    this.vehicleSelectionError = false;
    this.markVehicleConfigurationChanged();
  }

  /**
   * A group with exactly the same conditions never becomes a second row: its
   * vehicles are added to the existing row, and the planner is told which row
   * grew while it is briefly highlighted in the list.
   */
  private notifyRunEntryMerged(
    entry: OpenVrpRunVehicleEntry,
    addedCount: number,
  ): void {
    this.toastr.warning(
      this.transloco.translate(
        'run_entry_merged_message',
        { name: entry.vehicleTypeName, added: addedCount, total: entry.count },
        'index',
      ),
      this.transloco.translate('run_entry_merged_title', {}, 'index'),
      { timeOut: RUN_ENTRY_MERGE_NOTICE_MS },
    );
    this.highlightedRunEntryId = entry.id;
    clearTimeout(this.highlightTimer);
    this.highlightTimer = setTimeout(() => {
      this.highlightedRunEntryId = null;
    }, RUN_ENTRY_MERGE_NOTICE_MS);
    this.scrollRunEntryIntoView(entry.id);
  }

  /**
   * The run list scrolls on its own, so the row that grew can sit below the
   * fold — where neither the highlight nor the changed count would be seen.
   * `nearest` leaves a row that is already visible where it is.
   */
  private scrollRunEntryIntoView(entryId: number): void {
    // after the pending change detection, so the row is laid out with its
    // new count before it is measured
    setTimeout(() => {
      this.hostRef.nativeElement
        .querySelector<HTMLElement>(`[data-run-entry-id="${entryId}"]`)
        ?.scrollIntoView({
          block: 'nearest',
          behavior: this.prefersReducedMotion() ? 'auto' : 'smooth',
        });
    });
  }

  /** Honours the OS "reduce motion" setting for animated feedback. */
  private prefersReducedMotion(): boolean {
    return (
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false
    );
  }

  // ======================================================================
  // Open VRP — run list (selected vehicles)
  // ======================================================================

  removeRunEntry(entryId: number): void {
    const list = this.runVehicleList;
    const index = list.findIndex((entry) => entry.id === entryId);
    if (index < 0) return;
    list.splice(index, 1);
    this.markVehicleConfigurationChanged();
  }

  editRunEntry(entryId: number): void {
    const list = this.runVehicleList;
    const index = list.findIndex((entry) => entry.id === entryId);
    if (index < 0) return;
    const entry = list[index];
    // Removing the row returns the vehicles to the pool, then the entry
    // configuration is restored into the panel for editing (mockup behavior).
    list.splice(index, 1);
    const key = `${this.scopeDepotId || 'default'}:${entry.vehicleTypeId}`;
    this.poolBuilders[key] = {
      mode: entry.mode,
      count: entry.count,
      endOfRoute: entry.endOfRoute,
      chosenVehicleIds:
        entry.mode === 'license-plate' ? [...entry.vehicleIds] : [],
      startDepotId: entry.startDepotId || null,
      // a row that returns where it started keeps following the start depot,
      // so moving the start while editing moves the return with it
      endDepotId:
        entry.endDepotId !== entry.startDepotId ? entry.endDepotId : null,
      maxTrip: this.clampMaxTrip(entry.maxTrip),
      loadingDuration: entry.loadingDuration,
    };
    this.openPoolCardTypeId = entry.vehicleTypeId;
    this.markVehicleConfigurationChanged();
  }

  private markVehicleConfigurationChanged(): void {
    if (this.haveValidated) {
      this.haveUpdateAfterValidated = true;
    }
    this.cdr.detectChanges();
  }

  /**
   * Summary of the depot in scope, shown next to the run list and in the
   * validation tab. The summary pane itself uses `summaryView`, which reports
   * every depot.
   */
  get runListTotals(): OpenVrpRunSummaryTotals {
    return sumRunEntries(this.runVehicleList);
  }

  /** Run list of the depot in scope, one block per vehicle type (pane 2). */
  get runVehicleGroups(): OpenVrpRunVehicleGroup[] {
    return groupRunEntriesByVehicleType(this.runVehicleList);
  }

  trackRunVehicleGroup(_index: number, group: OpenVrpRunVehicleGroup): string {
    return group.vehicleTypeId;
  }

  trackRunVehicleEntry(_index: number, entry: OpenVrpRunVehicleEntry): number {
    return entry.id;
  }

  /**
   * Vehicles whose group starts from a depot other than the one in scope. The
   * start depot is selectable per group, so the validation tab only reports
   * the scope as consistent while this stays at zero.
   */
  get runListOutOfScopeStartCount(): number {
    const scopeDepotId = this.scopeDepotId;
    if (!scopeDepotId) return 0;
    return this.runVehicleList
      .filter(
        (entry) => !!entry.startDepotId && entry.startDepotId !== scopeDepotId,
      )
      .reduce((sum, entry) => sum + entry.count, 0);
  }

  /**
   * The summary pane's view model — one block per depot plus the fleet-wide
   * roll-up, assembled in a single getter so the template reads it once.
   */
  get summaryView(): {
    depots: OpenVrpDepotSummary[];
    grandTotals: OpenVrpRunSummaryTotals;
    isMultiDepot: boolean;
  } {
    const depots = this.depotSummaries;
    return {
      depots,
      grandTotals: sumDepotSummaries(depots),
      isMultiDepot: depots.length > 1,
    };
  }

  /**
   * One summary per depot taking part in this run. The depot in scope always
   * appears; any further depot that already carries a run list joins it, which
   * is exactly what arrives once the API reports more than one depot per run.
   * Until then the preview switch appends sample depots.
   */
  private get depotSummaries(): OpenVrpDepotSummary[] {
    const summaries: OpenVrpDepotSummary[] = [];
    const used = new Set<string>();

    const scopeDepotId = this.scopeDepotId || 'default';
    summaries.push({
      depotId: scopeDepotId,
      depotName: this.scopeDepotName,
      isMock: false,
      totals: sumRunEntries(this.runVehicleListByDepot[scopeDepotId]),
    });
    used.add(scopeDepotId);

    for (const depot of this.depots) {
      if (!depot?.depotId || used.has(depot.depotId)) continue;
      const entries = this.runVehicleListByDepot[depot.depotId];
      if (!entries?.length) continue;
      used.add(depot.depotId);
      summaries.push({
        depotId: depot.depotId,
        depotName: depot.depotName,
        isMock: false,
        totals: sumRunEntries(entries),
      });
    }

    if (this.multiDepotDemo) {
      for (const mockDepot of this.ensureMockDepotRunLists(used)) {
        summaries.push({
          depotId: mockDepot.depotId,
          depotName: mockDepot.depotName,
          isMock: true,
          totals: sumRunEntries(mockDepot.entries),
        });
      }
    }

    return summaries;
  }

  getRunEntryDetail(entry: OpenVrpRunVehicleEntry): string {
    if (entry.mode === 'license-plate' && entry.licensePlates.length) {
      return entry.licensePlates.join(', ');
    }
    return `${entry.count} ${this.transloco.translate('vehicles_unit', {}, 'index')}`;
  }

  getRunEntryTrips(entry: OpenVrpRunVehicleEntry): string {
    const maxTrip = entry.maxTrip || DEFAULT_MAX_TRIP;
    if (maxTrip <= DEFAULT_MAX_TRIP) return '';
    const trips = `${maxTrip} ${this.transloco.translate('trips_unit', {}, 'index')}`;
    if (!entry.loadingDuration) return trips;
    return `${trips} · ${this.transloco.translate('reload_at_depot', {}, 'index')} ${entry.loadingDuration}`;
  }

  getRunEntryRoute(entry: OpenVrpRunVehicleEntry): string {
    if (entry.endOfRoute === 'return') {
      return `${entry.startDepotName} → ${entry.endDepotName || entry.startDepotName}`;
    }
    return `${entry.startDepotName} → ${this.transloco.translate('ends_at_last_stop', {}, 'index')}`;
  }

  /**
   * Rebuild the run list UI from the legacy selection structures that are
   * populated when a historical experiment is reloaded from blob storage.
   */
  private rebuildRunListFromSelections(): void {
    const depotId =
      this.experiment?.depots?.[0]?.depotId || this.scopeDepotId || 'default';
    const depotName =
      this.experiment?.depots?.[0]?.depotName || this.scopeDepotName;
    const list: OpenVrpRunVehicleEntry[] = [];

    for (const vehicleTypeId of this.selectedVehicleIds) {
      const mode = this.getVehicleSelectionMode(vehicleTypeId);
      const baseEntry = {
        id: this.runEntryIdCounter++,
        vehicleTypeId,
        vehicleTypeName: this.getVehicleName(vehicleTypeId),
        endOfRoute: 'return' as OpenVrpEndOfRoute,
        startDepotId: depotId,
        startDepotName: depotName,
        endDepotId: depotId,
        endDepotName: depotName,
        // the blob carries no trip count yet, so a restored group falls back
        // to the vehicle type's own trips
        maxTrip: this.getVehicleTypeMaxTrip(vehicleTypeId),
        loadingDuration:
          this.getVehicleTypeMaxTrip(vehicleTypeId) > DEFAULT_MAX_TRIP
            ? this.getVehicleTypeLoadingDuration(vehicleTypeId) ||
              this.multiTripDefaults.defaultLoadingDuration
            : null,
      };
      if (mode === 'license-plate') {
        const vehicleIds =
          this.selectedVehicleIdsByLicensePlate[vehicleTypeId] || [];
        if (!vehicleIds.length) continue;
        list.push({
          ...baseEntry,
          mode: 'license-plate',
          count: vehicleIds.length,
          licensePlates: [
            ...(this.selectedLicensePlates[vehicleTypeId] || []),
          ],
          vehicleIds: [...vehicleIds],
        });
      } else {
        const count = this.getVehicleCount(vehicleTypeId);
        if (count <= 0) continue;
        list.push({
          ...baseEntry,
          mode: 'count',
          count,
          licensePlates: [],
          vehicleIds: [],
        });
      }
    }

    this.runVehicleListByDepot[depotId] = list;
  }

  // ======================================================================
  // Open VRP — preset configuration (save / load run list per depot)
  // ======================================================================

  /**
   * Memoised so the getter returns the *same* array instance between change
   * detection runs. Re-parsing storage on every run handed `*ngFor` brand new
   * objects each time, which made Angular destroy and re-create every preset
   * row — a row destroyed between mousedown and mouseup never emits `click`.
   * The cache is invalidated by `writeAllPresets()` and by a depot change.
   */
  get currentDepotPresets(): OpenVrpVehiclePreset[] {
    const depotId = this.scopeDepotId;
    const cacheKey = `${this.presetsVersion}|${depotId}`;
    if (cacheKey !== this.presetsCacheKey) {
      this.presetsCacheKey = cacheKey;
      this.presetsCache = depotId
        ? this.readAllPresets().filter((preset) => preset.depotId === depotId)
        : [];
    }
    return this.presetsCache;
  }

  trackPresetById(_index: number, preset: OpenVrpVehiclePreset): string {
    return preset.id;
  }

  openSavePresetDialog(): void {
    if (!this.runVehicleList.length) {
      this.toastr.warning(
        this.transloco.translate('no_vehicles_in_run', {}, 'index'),
        this.transloco.translate('save_preset', {}, 'index'),
      );
      return;
    }
    if (!this.savePresetModalTemplate) return;
    this.presetName = '';
    this.ngbModal
      .open(this.savePresetModalTemplate, { centered: true, animation: true })
      .result.then(
        (confirmed: boolean) => {
          if (confirmed) {
            this.savePreset();
          }
        },
        () => {},
      );
  }

  private savePreset(): void {
    const name = (this.presetName || '').trim();
    if (!name) return;
    const preset: OpenVrpVehiclePreset = {
      id: this.generateUniqueId(),
      name,
      depotId: this.scopeDepotId,
      depotName: this.scopeDepotName,
      createdAt: new Date().toISOString(),
      entries: this.runVehicleList.map(({ id: _id, ...savedEntry }) => ({
        ...savedEntry,
        licensePlates: [...savedEntry.licensePlates],
        vehicleIds: [...savedEntry.vehicleIds],
      })),
    };
    const presets = this.readAllPresets();
    presets.push(preset);
    this.writeAllPresets(presets);
    this.toastr.success(
      name,
      this.transloco.translate('preset_saved', {}, 'index'),
    );
  }

  loadPreset(preset: OpenVrpVehiclePreset): void {
    const key = this.scopeDepotId || 'default';
    this.runVehicleListByDepot[key] = [];
    let adjusted = false;

    for (const savedEntry of preset.entries) {
      const vehicleTypeName = this.getVehicleName(savedEntry.vehicleTypeId);
      if (!vehicleTypeName) {
        // vehicle type no longer exists in master data
        adjusted = true;
        continue;
      }
      const maxTrip = this.clampMaxTrip(
        savedEntry.maxTrip ?? this.getVehicleTypeMaxTrip(savedEntry.vehicleTypeId),
      );
      if (savedEntry.maxTrip != null && maxTrip !== savedEntry.maxTrip) {
        adjusted = true;
      }
      // a preset keeps the reload time the planner saved with it; the vehicle
      // type default only fills in for presets saved before it was editable
      const loadingDuration =
        maxTrip > DEFAULT_MAX_TRIP
          ? savedEntry.loadingDuration ||
            this.getVehicleTypeLoadingDuration(savedEntry.vehicleTypeId) ||
            this.multiTripDefaults.defaultLoadingDuration
          : null;
      // presets saved before identical rows were merged may still hold
      // duplicates; they fold together here just like a manual add
      if (savedEntry.mode === 'license-plate') {
        const chosenVehicles = this.getPoolAvailableVehicles(
          savedEntry.vehicleTypeId,
        ).filter((vehicle) =>
          savedEntry.vehicleIds.includes(vehicle.vehicleId),
        );
        if (chosenVehicles.length !== savedEntry.vehicleIds.length) {
          adjusted = true;
        }
        if (!chosenVehicles.length) continue;
        addOrMergeRunEntry(this.runVehicleList, {
          ...savedEntry,
          id: this.runEntryIdCounter++,
          vehicleTypeName,
          count: chosenVehicles.length,
          licensePlates: chosenVehicles.map(
            (vehicle) => vehicle.licensePlate,
          ),
          vehicleIds: chosenVehicles.map((vehicle) => vehicle.vehicleId),
          maxTrip,
          loadingDuration,
        });
      } else {
        if (savedEntry.count <= 0) continue;
        addOrMergeRunEntry(this.runVehicleList, {
          ...savedEntry,
          id: this.runEntryIdCounter++,
          vehicleTypeName,
          count: savedEntry.count,
          licensePlates: [],
          vehicleIds: [],
          maxTrip,
          loadingDuration,
        });
      }
    }

    this.openPoolCardTypeId = null;
    this.vehicleSelectionError = false;
    this.markVehicleConfigurationChanged();

    if (adjusted) {
      this.toastr.warning(
        this.transloco.translate(
          'preset_loaded_with_adjustments',
          {},
          'index',
        ),
        preset.name,
      );
    } else {
      this.toastr.success(
        preset.name,
        this.transloco.translate('preset_loaded', {}, 'index'),
      );
    }
  }

  deletePreset(preset: OpenVrpVehiclePreset, event: Event): void {
    event.stopPropagation();
    const presets = this.readAllPresets().filter(
      (existing) => existing.id !== preset.id,
    );
    this.writeAllPresets(presets);
    this.toastr.info(
      preset.name,
      this.transloco.translate('preset_deleted', {}, 'index'),
    );
    this.cdr.detectChanges();
  }

  private readAllPresets(): OpenVrpVehiclePreset[] {
    try {
      const raw = localStorage.getItem(this.openVrpPresetStorageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private writeAllPresets(presets: OpenVrpVehiclePreset[]): void {
    localStorage.setItem(
      this.openVrpPresetStorageKey,
      JSON.stringify(presets),
    );
    this.presetsVersion++;
  }

  // Check if any selected vehicle in 'license-plate' mode has no vehicle IDs selected
  getInvalidVehicleSelections(): string[] {
    const invalidVehicles: string[] = [];

    for (const vehicleTypeId of this.selectedVehicleIds) {
      const mode = this.getVehicleSelectionMode(vehicleTypeId);

      if (mode === 'license-plate') {
        const vehicleIds = this.selectedVehicleIdsByLicensePlate[vehicleTypeId];
        if (!vehicleIds || vehicleIds.length === 0) {
          invalidVehicles.push(vehicleTypeId);
        }
      }
    }

    return invalidVehicles;
  }

  openTransformValidationDialog(validationResponse?: TransformResult) {
    const modalRef = this.ngbModal.open(TransformValidationDialogComponent, {
      centered: true,
      animation: true,
      windowClass: 'transform-validation-modal',
    });
    modalRef.componentInstance.validationResponse = validationResponse;
  }

  setTransformWarnings(warnings: TransformWarning[]) {
    this.transformWarnings = warnings.map((warning) => ({
      ...warning,
      detail: this.deduplicateByInput(warning.detail),
    }));
    this.transformWarningCollapseStates = this.transformWarnings.map(
      () => true,
    );
  }

  private deduplicateByInput(details: WarningDetail[]): WarningDetail[] {
    const seenInputIds = new Set<string | number>();
    return details.filter((detail) => {
      if (detail.input === undefined || detail.input === null) return true;
      if (seenInputIds.has(detail.input)) return false;
      seenInputIds.add(detail.input);
      return true;
    });
  }

  toggleTransformWarningCollapse(index: number) {
    this.transformWarningCollapseStates[index] =
      !this.transformWarningCollapseStates[index];
  }

  getWarningTitle(title: string): string {
    const titleMap: Record<string, string> = {
      products: this.transloco.translate('product_missing', {}, 'index'),
    };
    return titleMap[title] || title;
  }

  getWarningTypeLabel(errorType: string): string {
    const normalizedKey = (errorType || '')
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, '_');
    const scopedKey = `validation.${normalizedKey}`;
    const translated = this.transloco.translate(scopedKey, { errorType });
    if (!translated || translated === scopedKey) {
      return this.transloco.translate('validation.unknown_validation_error', {
        errorType,
      });
    }
    return translated;
  }

  getValidationMessage(
    type: string,
    params: Record<string, unknown>,
  ): string {
    return this.cachedGetValidationMessage(type, params);
  }

  setValidationWarnings(warnings: ValidationWarningItem[]) {
    this.cachedGetValidationMessage = createCachedValidationMessageFn(
      this.transloco,
    );
    const safeWarnings = (warnings || []).map((warning) =>
      warning.errorType === 'missing_product'
        ? { ...warning, detail: this.deduplicateByInput(warning.detail) }
        : warning,
    );
    this.validationWarnings = safeWarnings;
    this.validationWarningCollapseStates = safeWarnings.map(() => false);
  }

  getRowsForWarning(warning: ValidationWarningItem): ValidationTableRow[] {
    return buildTableRows([warning]);
  }

  toggleValidationWarningCollapse(index: number) {
    this.validationWarningCollapseStates[index] =
      !this.validationWarningCollapseStates[index];
  }

  setValidationErrors(errors: ValidationWarningItem[]) {
    this.cachedGetValidationMessage = createCachedValidationMessageFn(
      this.transloco,
    );
    const safeErrors = errors || [];
    this.validationErrors = safeErrors;
    this.validationErrorCollapseStates = safeErrors.map(() => false);
  }

  getRowsForError(error: ValidationWarningItem): ValidationTableRow[] {
    return buildTableRows([error]);
  }

  toggleValidationErrorCollapse(index: number) {
    this.validationErrorCollapseStates[index] =
      !this.validationErrorCollapseStates[index];
  }
}
