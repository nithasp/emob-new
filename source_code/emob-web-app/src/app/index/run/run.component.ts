import {
  AfterViewInit,
  Component,
  Injectable,
  OnInit,
  ViewChild,
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
  CustomerUpdated,
  DataPreOrder,
  Depot,
  FileWithCategory,
  GroupedDataPreOrder,
  PreOrder,
  PreOrderFileDescriptor,
  PreOrderFileItem,
  ProductInfo,
  ReplaceType,
  ValidationType,
} from 'src/app/models/pre-order.model';

import Style from 'ol/style/Style';
import { ConstraintService } from 'src/app/services/constraint.service';
import {
  Constraint,
  DynamicParameter,
  LocalizedText,
  ConstraintValue,
} from 'src/app/models/constraint.model';
import type { TimingAndCapacity } from 'src/app/models/constraint.model';
import { ActivatedRoute, Router } from '@angular/router';
import {
  Experiment,
  InputDataItem,
  Result,
  StatusExperiment,
  Validate,
  Company,
  MyDepot,
  DepotInputRequirement,
} from 'src/app/models/experiment.model';
import { ExperimentService } from 'src/app/services/experiment.service';
import {
  NgbTimeStruct,
  NgbTimeAdapter,
  NgbModal,
} from '@ng-bootstrap/ng-bootstrap';
import { ConfirmationDialogComponent } from '../components/confirmation-dialog/confirmation-dialog.component';
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
import { VehicleProfileTypeItemDialogComponent } from '../components/vehicle-profile-type-item-dialog/vehicle-profile-type-item-dialog.component';
import { VehicleTypeDialogComponent } from '../components/vehicle-type-dialog/vehicle-type-dialog.component';
import { CustomerListComponent } from '../components/customer-list/customer-list.component';
import { LicensePlateSelectionDialogComponent } from '../components/license-plate-selection-dialog/license-plate-selection-dialog.component';
import { ValidateMessage } from 'src/app/models/validation-message';
import { UserMSGraphService } from 'src/app/services/user.service';
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
import { VehicleType } from 'src/app/models/vehicle.model';

const pad = (i: number): string => (i < 10 ? `0${i}` : `${i}`);

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
  // Condition
  public activeNavId = 1;
  public isUpload!: boolean;
  public isFileSelectionStep: boolean = true;
  public requiredFileType: string = '.xlsx, .xls';
  readonly validTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ];

  private requiredColumns: Array<string> = [];
  private depotInputDataItems: Array<{
    keyName: string;
    displayName: string;
    columnRequired: string[];
  }> = [];

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

  // NgbTable
  page = 1;
  pageSize = 10;
  ngbValidationTableCollectionSize = 0;
  validateDataTable: Customer[] = [];

  // Ngbcollapse
  ngbOverDistanceCollapse = true;
  ngbOverWeightCollapse = true;
  ngbZeroWeightCollapse = true;
  ngbUnverifyCollapse = true;

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
  public selectedDepotId: string | null = null;
  public selectedDepotIds: string[] = [];
  public inputDataKeys: string[] = [];
  // dynamic parameters rendering
  public allDynamicParameters: DynamicParameter[] = [];
  public dynamicParametersByCategory: Array<{
    key: string;
    items: DynamicParameter[];
  }> = [];

  // vehicles
  public myVehicleTypes: VehicleType[] = [];
  public selectedVehicleIds: string[] = [];
  public selectedVehicleCounts: Record<string, number> = {};
  public vehicleSelectionMode: Record<string, 'count' | 'license-plate'> = {};
  public selectedLicensePlates: Record<string, string[]> = {};
  public selectedVehicleIdsByLicensePlate: Record<string, string[]> = {};
  private readonly defaultVehicleMaxCount = 1000;

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
    private readonly userMsGraphService: UserMSGraphService,
    private readonly configurationService: ConfigurationService,
    private readonly dataService: DataService,
    private readonly exportService: ExportFileService,
    private readonly transloco: TranslocoService,
    private readonly vehicleService: VehicleService
  ) { }

  public generateUniqueId(): string {
    return 'f-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now();
  }

  get requiredFileTypes(): string[] {
    return this.depotInputDataItems.map((item) => item.displayName);
  }

  // trackBy helpers to keep accordion stable across change detection/language swaps
  trackByGroup(
    index: number,
    group: { key: string; items: DynamicParameter[] }
  ): string {
    return group.key;
  }
  trackByParam(index: number, p: DynamicParameter): string {
    return p.id || `${p.depotId}-${p.keyName}-${index}`;
  }

  ngOnInit(): void {
    this.spinner.show();

    this.getMyVehicleTypes();
  }
  ngAfterViewInit() {
    setTimeout(() => {
      this.isCreateMode = history.state.isCreateMode;
      this.route.params
        .pipe(take(1))
        .subscribe((params: { [x: string]: string }) => {
          this.experimentService
            .getExperiment(params['runId'])
            .subscribe((response: Experiment) => {
              this.experiment = { ...response };
              console.log('experiment', this.experiment);
              if (this.experiment.status !== StatusExperiment.Initializing) {
                this.spinner.hide();
                this.openConfirmDialog(
                  this.transloco.translate('warning'),
                  `${this.transloco.translate(
                    'this_experiment_have_been',
                    {},
                    'index'
                  )} ${this.experiment.status}`,
                  `${this.transloco.translate(
                    'we_will_to_go_back_to_the_experiments_page',
                    {},
                    'index'
                  )}?`,
                  this.transloco.translate('acknowledge', {}, 'index'),
                  true
                ).result.then((confirmed) => {
                  this.spinner.hide();
                  this.router.navigate(['/users/experiments']);
                });
              } else
                this.userMsGraphService
                  .getUserId()
                  .subscribe((userId: string | null) => {
                    if (userId !== this.experiment.triggeredBy) {
                      this.openConfirmDialog(
                        this.transloco.translate('warning'),
                        this.transloco.translate(
                          'you_are_not_the_creator_of_this_experiment',
                          {},
                          'index'
                        ),
                        `${this.transloco.translate(
                          'we_will_to_go_back_to_the_experiments_page',
                          {},
                          'index'
                        )}?`,
                        this.transloco.translate('acknowledge', {}, 'index'),
                        true
                      ).result.then((confirmed) => {
                        this.spinner.hide();
                        this.router.navigate(['/users/experiments']);
                      });
                    } else if (!this.experiment.preOrderBlobPath) {
                      this.getDynamicParameters();
                      this.isFilePreview = true;
                    } else {
                      this.initializeDataFromExperiment(
                        this.experiment
                      ).finally(() => {
                        this.isFileSelectionStep = false;
                        setTimeout(() => {
                          this.toastr.success(
                            this.transloco.translate(
                              'success_load_experiment',
                              {},
                              'index'
                            ),
                            this.experiment.name
                          );
                          this.spinner.hide();
                        }, 500);
                      });
                    }
                  });
            });
        });

      this.initIconStyle();
      this.initMap();
      this.getMyDepots();
      this.getValidateMessage();
    }, 100);
    this.dataSource.paginator = this.paginator; // For pagination
    this.dataSource.sort = this.sort; // For sort
    // react to language changes: only trigger change detection (no regroup)
    this.transloco.langChanges$.subscribe(() => {
      this.cdr.detectChanges();
    });
  }

  async initializeDataFromExperiment(experiment: Experiment) {
    console.log("initialize Data From Experiment's historical", experiment);
    // Load Parameter
    if (experiment.parameterBlobPath && experiment.fileUrl.parameterUrl) {
      this.dataFromFileUrlToJson(experiment.fileUrl.parameterUrl).then(
        (response: Constraint) => {
          console.log('Constraint', response);
          this.constraintsData = { ...response };
          this.constraintsFromFileLoaded = true;
          // Ensure UI reflects constraint values on init
          if (this.allDynamicParameters?.length) {
            this.refreshDynamicParametersForSelectedDepot();
          }
          console.log(this.constraintsData);
        }
      );
    } else {
      this.getDynamicParameters();
    }
    // ensure dynamic parameter metadata for rendering is loaded too
    this.getDynamicParameters();

    this.toastr.info(
      this.transloco.translate('loading_preorder_data', {}, 'index'),
      `${this.transloco.translate('please_wait', {}, 'index')} ...`
    );

    this.preOrderFiles = (experiment.inputdata || []).map(
      (inputItem: InputDataItem) => {
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
      }
    );

    this.toastr.info(
      this.transloco.translate('loading_geo_location_data', {}, 'index'),
      `${this.transloco.translate('please_wait', {}, 'index')} ...`
    );

    // load geocoding location
    if (experiment.fileUrl.LocationBlobPathUrl) {
      await this.dataFromFileUrlToJson(
        experiment.fileUrl.LocationBlobPathUrl
      ).then((response: Result) => {
        console.log('Result', response);
        this.groupingCustomer(response.customers, response.depots);
      });
    }
    if (experiment.fileUrl.locationUpdateBlobPathUrl) {
      this.toastr.info(
        this.transloco.translate('loading_geo_location_data', {}, 'index'),
        `${this.transloco.translate('please_wait', {}, 'index')} ...`
      );
      // load geocoding location edited
      await this.dataFromFileUrlToJson(
        experiment.fileUrl.locationUpdateBlobPathUrl
      ).then((response: { customers: CustomerUpdated[] }) => {
        this.updateCustomerGroup(response.customers);
        this.dataService
          .getData(experiment.runId)
          .subscribe((data: CustomerUpdated[]) => {
            console.log('data user edited location', data);
            if (data && data.length > 0) {
              const newData = data.filter(
                (newItem) =>
                  !this.customersLocationUpdated.some(
                    (existingItem) =>
                      existingItem.index === newItem.index &&
                      existingItem.name === newItem.name
                  )
              );
              console.log(newData);
              if (newData.length > 0) {
                this.toastr.info(
                  `${this.transloco.translate('please_wait', {}, 'index')} ` +
                  newData.length +
                  ` ${this.transloco.translate(
                    'new_edited_location_data_suffix',
                    {},
                    'index'
                  )}`,
                  `${this.transloco.translate('please_wait', {}, 'index')}...`
                );
                this.haveUpdateAfterValidated = true;
              }
              this.updateCustomerGroup(newData);
            }
          });
      });
    }

    if (experiment.fileUrl.validatedBlobPathUrl) {
      // load validation data
      this.toastr.info(
        this.transloco.translate('loading_validation_data', {}, 'index'),
        `${this.transloco.translate('please_wait', {}, 'index')} ...`
      );
      await this.dataFromFileUrlToJson(
        experiment.fileUrl.validatedBlobPathUrl
      ).then((response: Result) => {
        console.log('Result', response);
        this.validateExperiment = response.validate;
        this.ngbValidationTableCollectionSize =
          this.validateExperiment.filters.order_data.invalid_coordinate.length;
        this.refreshValidationTable();
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
  initializeDefaultParameter() {
    this.constraintService
      .getMyParameter()
      .subscribe((response: Constraint) => {
        this.constraintsData = { ...response };
        console.log(this.constraintsData);

        if (this.isCreateMode) {
          this.spinner.hide();
        }
      });
  }
  refreshValidationTable() {
    this.validateDataTable =
      this.validateExperiment?.filters?.order_data?.invalid_coordinate
        .map((customer, i) => ({ id: i + 1, ...customer }))
        .slice(
          (this.page - 1) * this.pageSize,
          (this.page - 1) * this.pageSize + this.pageSize
        ) || [];
  }
  onFileSelected(eventOrFiles: Event | FileList) {
    let file: File | undefined;
    if (eventOrFiles instanceof FileList) {
      if (eventOrFiles.length === 0) return;
      file = eventOrFiles[0];
      if (eventOrFiles.length > 1) {
        this.toastr.warning(
          this.transloco.translate('cannot_use_multiple_files', {}, 'index')
        );
      }
    } else {
      const input = eventOrFiles.target as HTMLInputElement | null;
      const files = input?.files || null;
      if (!files || files.length === 0) return;
      file = files[0];
      if (files.length > 1) {
        this.toastr.warning(
          this.transloco.translate('cannot_use_multiple_files', {}, 'index')
        );
      }
    }
    if (!file) return;
    if (!this.validTypes.includes(file.type)) {
      this.showInvalidModal(
        this.transloco.translate('file_invalid', {}, 'index'),
        this.transloco.translate('select_excel_file', {}, 'index')
      );
      this.toastr.error(
        `${this.transloco.translate('file_invalid', {}, 'index')}:`,
        file.type
      );
      return;
    }
    this.uploadFile(file);
  }

  /**
   * The function `groupDataById` in TypeScript groups data by a specified ID, department, aumpher, and
   * province.
   */
  groupDataById() {
    this.groupedDataPreOrder = this.dataPreOrder.reduce((acc, row) => {
      const ORDERID_ORG = row.ORDERID_ORG;
      const ADDRESS = row.ADDRESS;
      const AUMPHER = row.AUMPHER;
      const PROVINCE = row.PROVINCE;
      const TEL = row.TEL;
      const CUSTOMER_NAME = row.CUSTOMER_NAME;
      const CHANNEL = row.CHANNEL;
      const ZIPCODE = row.ZIPCODE;
      if (!acc[ORDERID_ORG]) {
        acc[ORDERID_ORG] = {
          ZIPCODE,
          TEL,
          CUSTOMER_NAME,
          CHANNEL,
          ORDERID_ORG,
          ADDRESS,
          AUMPHER,
          PROVINCE,
          details: [],
        };
      }
      acc[ORDERID_ORG].details.push(row);
      return acc;
    }, {} as GroupedDataPreOrder);
  }

  async uploadFile(file: FileWithCategory) {
    const id = this.generateUniqueId();

    const { isValid, keyName, displayName } =
      await this.validateSingleFileAgainstDepot(file);

    if (!isValid || !keyName || !displayName) return;

    // Find if a file of this type already exists
    const index = this.preOrderFiles.findIndex(
      (f) => f.file.keyName === keyName
    );

    if (index !== -1) {
      // Show confirmation dialog before replacing
      const currentDisplayName = this.preOrderFiles[index].file.displayName;
      const confirmDialog = this.openConfirmDialog(
        this.transloco.translate('replace_data_confirmation', {}, 'index'),
        '',
        `${this.transloco.translate(
          'want_to_replace_data_type',
          {},
          'index'
        )} ${currentDisplayName} ${this.transloco.translate(
          'with_the_new_data',
          {},
          'index'
        )}?`,
        this.transloco.translate('confirm', {}, 'index'),
        false
      );
      confirmDialog.result.then((confirmed: boolean) => {
        if (confirmed) {
          file.keyName = keyName;
          file.displayName = displayName;
          file.isFirstOfType = true;
          this.preOrderFiles[index] = { id, file };
          this.isFilePreview = true;
        }
        // If not confirmed, do nothing
      });
    } else {
      file.keyName = keyName;
      file.displayName = displayName;
      file.isFirstOfType = true;
      this.preOrderFiles.push({ id, file });
      this.isFilePreview = true;
    }
  }

  async validateSingleFileAgainstDepot(file: FileWithCategory): Promise<{
    isValid: boolean;
    keyName?: string;
    displayName?: string;
    isFirstOfType?: boolean;
  }> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e: ProgressEvent<FileReader>) => {
        try {
          const result = e.target?.result;
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
                .replace(/[\s_\-]/g, '');

            const allSheets = workbook.worksheets.map(
              (ws: ExcelJS.Worksheet) => ({
                name: ws.name,
                normalized: normalize(ws.name),
              })
            );

            console.log(
              'Detected sheets:',
              allSheets.map((sheet) => sheet.name)
            );

            worksheet =
              workbook.worksheets.find(
                (ws: ExcelJS.Worksheet) => ws.getRow(1)?.cellCount > 0
              ) || workbook.worksheets[0];
          }

          const columnNames = (
            worksheet!.getRow(1).values as (string | undefined)[]
          ).filter((value) => typeof value === 'string');

          const matchingInputDataItem =
            this.findMatchingInputDataItem(columnNames);
          if (matchingInputDataItem) {
            resolve({
              isValid: true,
              keyName: matchingInputDataItem.keyName,
              displayName: matchingInputDataItem.displayName,
              isFirstOfType: true,
            });
          } else {
            // Show missing columns for each required input data type
            const validationErrors = [];
            for (const item of this.depotInputDataItems) {
              const missingColumns = item.columnRequired.filter(
                (col) => !columnNames.includes(col)
              );
              if (missingColumns.length === item.columnRequired.length) {
                // All required columns are missing
                validationErrors.push(
                  `<strong>${this.transloco.translate(
                    'file_for',
                    {},
                    'index'
                  )} "${item.displayName}" ${this.transloco.translate(
                    'missing_columns_as_follows',
                    {},
                    'index'
                  )}</strong><span>:</span> <br/><ul>${item.columnRequired
                    .map((col) => `<li>${col}</li>`)
                    .join('')}</ul>`
                );
              } else if (missingColumns.length > 0) {
                // Some columns are missing
                validationErrors.push(
                  `<strong>${this.transloco.translate(
                    'file_for',
                    {},
                    'index'
                  )}" ${item.displayName}" ${this.transloco.translate(
                    'missing_columns_as_follows',
                    {},
                    'index'
                  )}</strong><span>:</span> <ul>${missingColumns
                    .map((col) => `<li>${col}</li>`)
                    .join('')}</ul>`
                );
              }
            }
            this.showInvalidModal(
              `${this.transloco.translate(
                'column_name_mismatch_template',
                {},
                'index'
              )}`,
              validationErrors
            );
            resolve({ isValid: false });
          }
        } catch (error) {
          console.error('Error validating file:', error);
          resolve({ isValid: false });
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  handleUploadSubmit() {
    // Transform preOrderFiles to newPayload format (send actual File object)
    const newPayload = this.preOrderFiles
      .filter((item): item is { id: string; file: FileWithCategory } =>
        this.isFileWithCategory(item.file)
      )
      .map(({ file }) => ({ file, keyName: file.keyName || '' }));

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
      'index'
    );
    dialogRef.componentInstance.question = `${this.transloco.translate(
      'do_you_want_to_upload_file',
      {},
      'index'
    )} ?`;

    dialogRef.result
      .then((confirmed: boolean) => {
        if (confirmed) {
          this.spinner.show();
          // Prepare depotIds (single or multiple selection)
          let depotIds: string[] = [];
          if (this.selectedDepotId) {
            const found = this.depots.find(
              (d) => d.depotName === this.selectedDepotId
            );
            if (found && found.depotId) {
              depotIds = [found.depotId];
              depotIds = [found.depotId];
            }
          }

          this.preOrderService
            .uploadPreOrder(this.experiment.runId, depotIds, newPayload)
            .subscribe((response: Experiment) => {
              // Refresh experiment data first, then proceed with grouping to ensure latest depots exist
              this.experimentService
                .getExperiment(this.experiment.runId)
                .pipe(take(1))
                .subscribe(async (exp: Experiment) => {
                  this.experiment = { ...exp };
                  if (response.result) {
                    this.groupingCustomer(
                      response.result.customers,
                      response.result.depots
                    );
                  }

                  this.experiment.name = response.name;
                  // Map inputdata to UI structure expected by template
                  this.preOrderFiles = (this.experiment.inputdata || []).map(
                    (inputItem: InputDataItem) => {
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
                    }
                  );

                  this.isFilePreview = false;
                  this.isFileSelectionStep = false;
                  this.spinner.hide();
                  this.toastr.success(
                    `${this.transloco.translate(
                      'upload_preorder_success',
                      {},
                      'index'
                    )}.`
                  );
                  // Fetch latest dynamic parameters for the selected depot and rebuild UI
                  this.getDynamicParameters();
                });
            });
        }
      })
      .catch((error) => {
        console.error('Dialog was dismissed:', error);
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
      this.experiment.run !== 'Original' &&
      this.experiment.status !== StatusExperiment.Initializing
    ) {
      this.toastr.warning(
        this.transloco.translate('cannot_delete_file', {}, 'index'),
        this.transloco.translate('original_experiment_warning', {}, 'index')
      );
      this.openConfirmDialog(
        this.transloco.translate('cannot_delete_file', {}, 'index'),
        this.transloco.translate('original_experiment_warning', {}, 'index'),
        `${this.transloco.translate('rewrite_file_instruction', {}, 'index')}.`,
        this.transloco.translate('acknowledge', {}, 'index')
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
      'index'
    );
    dialogRef.componentInstance.question = `${this.transloco.translate(
      'confirm_to_set_default_parameter',
      {},
      'index'
    )} ?`;
    dialogRef.componentInstance.message = `${this.transloco.translate(
      'to_set_a_default_parameter_you_can_use_it_to_submit_an_experiment_in_the_future',
      {},
      'index'
    )}.`;

    dialogRef.result
      .then((confirmed: boolean) => {
        if (confirmed) {
          this.updateDynamicParameters();
        }
      })
      .catch((error) => {
        console.error('Dialog was dismissed:', error);
      });
  }

  private initIconStyle() {
    Object.values(LocationType).forEach((type) => {
      let iconLocation = new Style({
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
      tw_early?: string | number;
      tw_late?: string | number;
      createdAt?: string;
      updatedAt?: string;
    }>
  ) {
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
        tw_early: String(item.tw_early ?? ''),
        tw_late: String(item.tw_late ?? ''),
        createdAt: item.createdAt || '',
        updatedAt: item.updatedAt || '',
      };
      return mapped;
    });

    this.depots = normalizedIncoming;

    if (!this.experiment.depots || this.experiment.depots.length === 0) {
      this.experiment.depots = normalizedIncoming.map((depot: MyDepot) => ({
        companyName: this.experiment.companyName,
        depotId: depot.depotId || '',
        depotName: depot.depotName,
        latitude: Number(depot.latitude),
        longitude: Number(depot.longitude),
        tw_early: depot.tw_early || '',
        tw_late: depot.tw_late || '',
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
      this.selectedDepotId = defaultDepotName;
      this.selectedDepotIds = [];
    } else {
      this.selectedDepotId = null;
      this.selectedDepotIds = [];
      this.inputDataKeys = [];
      this.depotInputDataItems = [];
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
                  ])
                ),

                data: { data: customer, isDepot: false },
              });
              location.setStyle(
                this.iconStyle[
                uploadDataGroupCustomers[key as keyof DataGroup].type
                ]
              );
              this.vectorSource.addFeature(location);
            }
          }
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
    console.log(this.preOrderFiles);
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
          'EPSG:3857'
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
      console.log(evt);
    });
    // display popup on click
    this.map.on('singleclick', (event) => this.popupShow(event, element));
    this.map.on('pointermove', (event) => this.pointMove(event));

    console.log(this.haveUpdateAfterValidated, this.haveValidated);
  }

  private pointMove(
    evt: MapBrowserEvent<PointerEvent | KeyboardEvent | WheelEvent>
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
    element: HTMLElement
  ) {
    let coordinates: Coordinate = [];
    const feature = this.map.forEachFeatureAtPixel(
      evt.pixel,
      (f: FeatureLike) => f
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
      | undefined
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
        (customer.replace_type === ReplaceType.NO_REPLACE ||
          customer.replace_type === ReplaceType.INPUT) &&
        (customer.validation_type === ValidationType.SUBDISTRICT_LEVEL ||
          customer.validation_type === ValidationType.DISTRICT_LEVEL)
      ) {
        verify.push(customer);
      } else if (
        customer.replace_type === ReplaceType.SUBDISTRICT_LEVEL ||
        customer.replace_type === ReplaceType.DISTRICT_LEVEL
      ) {
        uncertain.push(customer);
      } else if (
        customer.replace_type === ReplaceType.PROVINCE_LEVEL ||
        customer.validation_type === ValidationType.NO_VALID ||
        customer.validation_type === ValidationType.NAN_INPUT ||
        customer.validation_type === ValidationType.NON_VALIDATED
      ) {
        unverify.push(customer);
      }
    });

    return { verify, uncertain, unverify };
  }
  private validateData(columnNames: Array<string>): boolean {
    const missingColumns = this.requiredColumns.filter(
      (col) => !columnNames.includes(col)
    );

    if (missingColumns.length > 0) {
      this.showInvalidModal(
        `${this.transloco.translate(
          'column_name_mismatch_template',
          {},
          'index'
        )}`,
        missingColumns
      );
      this.toastr.error(
        `${this.transloco.translate(
          'column_name_mismatch_template',
          {},
          'index'
        )}`,
        missingColumns.join(',')
      );
      return false;
    }
    return true;
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
          ...this.uploadDataGroupCustomers[key as keyof DataGroup].customers
        );
      }
    }

    this.dataSource.data = newData;
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
      (item) => item.index === customer.index && item.name === customer.name
    );

    if (existingIndex !== -1) {
      modalRef.componentInstance.locationType = LocationType.Edit;
    }

    // Create dataPreOder using primarily customer.extra data
    const dataPreOder: DataPreOrder = {
      ORDERID_ORG: customer.name,
      CHANNEL: customer.extra.channel,
      CUSTOMER_NAME: customer.extra.customer_name,
      TEL: customer.extra.tel,
      ADDRESS: customer.original_address.address,
      AUMPHER: customer.original_address.district,
      PROVINCE: customer.original_address.province,
      ZIPCODE: customer.original_address.postal_code,
      details: customer.extra.products_info.map((product: ProductInfo) => ({
        PRODUCTID: product.product_id,
        ORDER_ID: product.order_id,
        PRODUCTNAME: product.product_name,
        QUANTITYMAIN: product.quantity_major,
        QUANTITYMINOR: product.quantity_minor,
        UserConfirm: product.user_confirm,
        DateConfirm: product.date_confirm,
      })),
    };

    // Pass customer directly as dataCustomer (the component expects Customer type)
    modalRef.componentInstance.dataPreOder = dataPreOder;
    modalRef.componentInstance.dataCustomer = customer;

    modalRef.result.then((locationUpdated: Location) => {
      if (
        Number(customer.longitude) !== Number(locationUpdated.longitude) ||
        Number(customer.latitude) !== Number(locationUpdated.latitude)
      ) {
        const updatedCustomer = {
          node_id: customer.node_id,
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
          this.customersLocationUpdated
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
        this.customersLocationUpdated
      );
    });
  }

  moveCustomerToEdit(customer: Customer, locationUpdated: Location) {
    // Find and remove the customer from uncertain
    const uncertainIndex =
      this.uploadDataGroupCustomers!.uncertain.customers.findIndex(
        (c) => c.name === customer.name
      );
    // Find and remove the customer from unverify
    const unverifyIndex =
      this.uploadDataGroupCustomers!.unverify.customers.findIndex(
        (c) => c.name === customer.name
      );
    if (uncertainIndex !== -1) {
      const _customer =
        this.uploadDataGroupCustomers!.uncertain.customers.splice(
          uncertainIndex,
          1
        )[0];
      _customer.latitude = locationUpdated.latitude;
      _customer.longitude = locationUpdated.longitude;
      this.uploadDataGroupCustomers!.edit.customers.push(_customer);
    } else if (unverifyIndex !== -1) {
      const _customer =
        this.uploadDataGroupCustomers!.unverify.customers.splice(
          unverifyIndex,
          1
        )[0];
      _customer.latitude = locationUpdated.latitude;
      _customer.longitude = locationUpdated.longitude;
      this.uploadDataGroupCustomers!.edit.customers.push(_customer);
    }
    this.loadLocation(this.uploadDataGroupCustomers!);
  }
  updateCustomerLocation(customersLocationUpdated: Customer) {
    this.customersLocationUpdated.push(customersLocationUpdated);
    this.toastr.info(
      this.transloco.translate('updating_customer_location', {}, 'index'),
      `${this.transloco.translate('location_in_memory', {}, 'index')}.`
    );
  }
  isVerified(orderId: string): boolean {
    return (
      this.uploadDataGroupCustomers?.verify.customers.some(
        (customer) => customer.name === orderId
      ) ?? false
    );
  }

  isUncertain(orderId: string): boolean {
    return (
      this.uploadDataGroupCustomers?.uncertain.customers.some(
        (customer) => customer.name === orderId
      ) ?? false
    );
  }

  isUnverified(orderId: string): boolean {
    return (
      this.uploadDataGroupCustomers?.unverify.customers.some(
        (customer) => customer.name === orderId
      ) ?? false
    );
  }
  isEdited(orderId: string): boolean {
    return (
      this.uploadDataGroupCustomers?.edit.customers.some(
        (customer) => customer.name === orderId
      ) ?? false
    );
  }
  countOrder(orderId: string) {
    return this.groupedDataPreOrder[orderId]?.details.length;
  }

  validateExperimentPreOrder() {
    const parameterPayload = this.buildValidateParameterFromDynamic();
    // proceed with validation using constructed parameterPayload
    if (
      (parameterPayload.earlyDeliveryTime || '') >
      (parameterPayload.backToDepotTime || '')
    ) {
      this.showInvalidModal(
        'INVALID : Early Delivery Time',
        'Early Delivery Time must be less than Back to Depot Time'
      );
      return;
    }
    this.showSpinner();
    this.experimentService
      .validateExperiment(
        this.experiment.runId,
        parameterPayload as Constraint,
        this.customersLocationUpdated
      )
      .pipe(
        finalize(() => {
          this.hiddenSpinner();
        })
      )
      .subscribe({
        next: (result) => {
          this.haveUpdateAfterValidated = false;
          // Sync constraints with the payload used for validation so UI reflects latest
          const mergedConstraint: Constraint = {
            ...this.constraintsData,
            ...(parameterPayload as Partial<Constraint>),
          };
          this.constraintsData = mergedConstraint;
          this.validateExperiment = result.result?.validate || null;
          this.ngbValidationTableCollectionSize =
            this.validateExperiment?.filters.order_data.invalid_coordinate
              .length || 0;
          this.dataService.clearData(this.experiment.runId);
          // Rebuild dynamic parameters so values reflect constraintsData when validated
          this.refreshDynamicParametersForSelectedDepot();
          this.refreshValidationTable();
          this.navigateToTab(3);
          // Mark validation as completed and show corresponding messages (success path)
          this.haveValidated = true;
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
          console.error(err);
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
      'index'
    );
    dialogRef.componentInstance.question = `${this.transloco.translate(
      'confirm_to_submit_experiment',
      {},
      'index'
    )} ?`;
    dialogRef.componentInstance.message = `${this.transloco.translate(
      'submitting_an_experiment_to_the_ai_service_will_start_the_planning_process',
      {},
      'index'
    )}.`;

    dialogRef.result
      .then((confirmed: boolean) => {
        if (confirmed) {
          this.showSpinner();
          this.experimentService
            .submitExperiment(this.experiment.runId)
            .subscribe({
              next: (result) => {
                console.log(result);
                this.toastr.success(
                  this.transloco.translate('submit_experiment', {}, 'index'),
                  this.transloco.translate('succeed', {}, 'index')
                );
                this.router.navigate(['/users/experiments']);
              },
              error: (err) => {
                this.toastr.error(
                  this.transloco.translate('submit_experiment', {}, 'index'),
                  this.transloco.translate('failed', {}, 'index')
                );
              },
              complete: () => {
                this.hiddenSpinner();
              },
            });
        }
      })
      .catch((error) => {
        console.error('Dialog was dismissed:', error);
      });
  }

  openConfirmDialog(
    title: string,
    message: string,
    question: string,
    acceptButton: string = 'Confirm',
    disableCancelButton: boolean = true
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
      this.configurationService.getDatafromUrl(url)
    );
    const arrayBuffer = await blob.arrayBuffer();
    return arrayBuffer;
  }

  async dataFromFileUrlToJson(url: string) {
    console.log(`Fetching data from url: ${url}`);
    const arrayBuffer = await this.fetchDataFromFileUrl(url);
    console.log(`Fetched array buffer with length: ${arrayBuffer.byteLength}`);
    const text = new TextDecoder().decode(arrayBuffer);
    const jsonData = JSON.parse(text);

    return jsonData;
  }

  updateCustomerGroup(customers: Array<CustomerUpdated>) {
    console.log('new value customer details', customers);
    customers.forEach((item) => {
      const existingIndex = this.customersLocationUpdated.findIndex(
        (i) => i.index === item.index && i.name === item.name
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
          (c) => c.name === item.name
        );
      // Find and remove the customer from unverify
      const unverifyIndex =
        this.uploadDataGroupCustomers!.unverify.customers.findIndex(
          (c) => c.name === item.name
        );
      if (uncertainIndex !== -1) {
        this.moveCustomerToEdit(
          this.uploadDataGroupCustomers!.uncertain.customers[uncertainIndex],
          {
            longitude: Number(item.longitude),
            latitude: Number(item.latitude),
          }
        );
      } else if (unverifyIndex !== -1) {
        this.moveCustomerToEdit(
          this.uploadDataGroupCustomers!.unverify.customers[unverifyIndex],
          {
            longitude: Number(item.longitude),
            latitude: Number(item.latitude),
          }
        );
      }
    });
  }
  groupingCustomer(customers: Customer[], depots: Depot[]) {
    this.countUploadedCustomers = customers.length;
    // Sum all products_info lengths across customers for preOrderCount
    this.preOrderCount = customers.reduce((sum, customer) => {
      const products = customer?.extra?.products_info;
      return sum + (Array.isArray(products) ? products.length : 0);
    }, 0);
    const groupedCustomer = this.groupCustomers(customers);
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
    console.log(
      'prepared uploadDataGroupCustomers',
      this.uploadDataGroupCustomers
    );
    this.reInitializeDataTable();
    this.loadLocation(this.uploadDataGroupCustomers);
    this.loadLocationDepot(depots);
    this.isUpload = true;
    this.isFileSelectionStep = false;
  }
  isOriginalExperiment(): boolean {
    return this.experiment.run === 'Original';
  }

  onValueChange<K extends keyof Constraint>(
    newValue: Constraint[K],
    property: K
  ): void {
    this.updateConstraint(this.constraintsData, property, newValue);
    this.haveUpdateAfterValidated = true;
  }

  updateConstraint<K extends keyof Constraint>(
    obj: Constraint,
    key: K,
    value: Constraint[K]
  ): void {
    obj[key] = value;
  }

  exportValidationData() {
    const files: Array<{
      data: Array<Record<string, string | number>>;
      name: string;
    }> = [];
    if (
      this.validateExperiment?.filters.order_data &&
      this.validateExperiment?.filters.order_data.invalid_coordinate.length > 0
    ) {
      files.push({
        data:
          this.validateExperiment?.warning.zero_weight.map((customer, i) => ({
            index: i + 1,
            ORDER_ID: customer.name,
            ADDRESS: customer.original_address.address ?? '',
            SUBDISTRICT: customer.original_address.subdistrict ?? '',
            DISTRICT: customer.original_address.district ?? '',
            PROVINCE: customer.original_address.province ?? '',
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
              (customer.metrics?.product_ids || []).join(',') ?? '',
            PRODUCT_ID_MISSING:
              (customer.metrics?.missing_product_ids || []).join(',') ?? '',
          })) || [],
        name:
          'Zero_Weight_' + this.experiment.name + '_' + this.experiment.runId,
      });
    }
    this.exportService.exportMultipleCsv(
      files.map((file) => file.data),
      files.map((file) => file.name)
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
                  'index'
                )}.`,
              },
              overWeight: {
                title: `${this.transloco.translate(
                  'over_weight_warning',
                  {},
                  'index'
                )}!`,
                message: `${this.transloco.translate(
                  'over_weight_description',
                  {},
                  'index'
                )}.`,
              },
            },
            orderData: {
              invalidCoordinate: {
                title: `${this.transloco.translate(
                  'unverify_coordinate_danger',
                  {},
                  'index'
                )}!`,
                message: `${this.transloco.translate(
                  'unverify_coordinate_description',
                  {},
                  'index'
                )}.`,
              },
            },
          },
          warningMessage: {
            zeroWeight: {
              title: `${this.transloco.translate(
                'zero_weight_warning',
                {},
                'index'
              )}!`,
              message: `${this.transloco.translate(
                'zero_weight_description',
                {},
                'index'
              )}.`,
            },
          },
        };
      });
  }

  async onDepotSelectionChange() {
    const depot = this.depots.find((d) => d.depotName === this.selectedDepotId);
    if (depot) {
      this.updateDepot([depot]);
      this.updateInputDataKeysFromDepot(depot);
    } else {
      this.inputDataKeys = [];
      this.depotInputDataItems = [];
    }
    await this.validateUploadedFilesAgainstDepot();
    // refresh dynamic parameters render when depot changes
    this.refreshDynamicParametersForSelectedDepot();
  }

  updateDepot(
    depots: Array<Pick<MyDepot, 'depotName' | 'latitude' | 'longitude'>>
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
        console.error('Error fetching myCompany data:', error);
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
          this.selectedDepotId = this.depots[0].depotName;
          this.selectedDepotIds = [];

          // Update input data keys from the first depot
          this.updateInputDataKeysFromDepot(this.depots[0]);
          // refresh dynamic parameters view for selected depot
          this.refreshDynamicParametersForSelectedDepot();

          if (this.selectedDepotId) {
            localStorage.setItem('selectedDepotId', this.selectedDepotId);
          }
        }
      },
      error: (error) => {
        console.error('Error fetching myDepots data:', error);
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

  handleInputDataKeyChange(
    fileObj: PreOrderFileItem,
    event: { value: string }
  ) {
    const selectedDisplayName = event.value;
    const found = this.depotInputDataItems.find(
      (item) => item.displayName === selectedDisplayName
    );
    if (found) {
      if (this.isFileWithCategory(fileObj.file)) {
        fileObj.file.keyName = found.keyName;
        fileObj.file.displayName = found.displayName;
      } else {
        (fileObj.file as PreOrderFileDescriptor).keyName = found.keyName;
        (fileObj.file as PreOrderFileDescriptor).displayName =
          found.displayName;
      }
    } else {
      if (this.isFileWithCategory(fileObj.file)) {
        fileObj.file.keyName = '';
        fileObj.file.displayName = '';
      } else {
        (fileObj.file as PreOrderFileDescriptor).keyName = '';
        (fileObj.file as PreOrderFileDescriptor).displayName = '';
      }
    }
  }

  updateInputDataKeysFromDepot(depot: MyDepot) {
    this.depotInputDataItems =
      depot.inputdata?.map((item) => ({
        keyName: item.keyName,
        displayName: item.displayName,
        columnRequired: item.columnRequired || [],
      })) || [];

    const uniqueItems = this.depotInputDataItems.filter(
      (item, index, self) =>
        index ===
        self.findIndex((existingItem) => existingItem.keyName === item.keyName)
    );
    this.inputDataKeys = uniqueItems.map((item) => item.displayName);
  }

  async validateUploadedFilesAgainstDepot() {
    const validFiles = [];
    for (const file of this.preOrderFiles) {
      const isValid = await this.validateFileAgainstDepotRequirements(file);
      if (isValid) {
        validFiles.push(file);
      } else {
        this.toastr.warning(
          `File ${file.file.name} does not match current depot requirements and has been removed.`
        );
      }
    }
    this.preOrderFiles = validFiles;
  }

  validateFileAgainstDepotRequirements(
    file: PreOrderFileItem
  ): Promise<boolean> {
    // Read the file to get column names
    return new Promise<boolean>((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e: ProgressEvent<FileReader>) => {
        try {
          const result = e.target?.result;
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
                .replace(/[\s_\-]/g, '');

            const allSheets = workbook.worksheets.map(
              (ws: ExcelJS.Worksheet) => ({
                name: ws.name,
                normalized: normalize(ws.name),
              })
            );

            console.log(
              'Detected sheets:',
              allSheets.map((sheet) => sheet.name)
            );

            worksheet =
              workbook.worksheets.find(
                (ws: ExcelJS.Worksheet) => ws.getRow(1)?.cellCount > 0
              ) || workbook.worksheets[0];
          }

          const columnNames = (
            worksheet!.getRow(1).values as (string | undefined)[]
          ).filter((value) => typeof value === 'string');

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
          console.error('Error validating file:', error);
          resolve(false);
        }
      };
      if (this.isFileWithCategory(file.file)) {
        reader.readAsArrayBuffer(file.file);
      } else {
        // For descriptor items (loaded from server), consider them valid
        resolve(true);
      }
    });
  }

  isFileWithCategory(
    value: File | (Partial<FileWithCategory> & object) | null | undefined
  ): value is FileWithCategory {
    return (
      !!value &&
      typeof value === 'object' &&
      ('arrayBuffer' in (value as File) || value instanceof File)
    );
  }

  findMatchingInputDataItem(
    columnNames: string[]
  ): { keyName: string; displayName: string; columnRequired: string[] } | null {
    return (
      this.depotInputDataItems.find((item) => {
        return item.columnRequired.every((requiredCol) =>
          columnNames.includes(requiredCol)
        );
      }) || null
    );
  }

  canExecuteHandleUploadSubmit(): boolean {
    if (this.preOrderFiles.length === 0) return false;
    const requiredDisplayNames = this.depotInputDataItems.map(
      (item) => item.displayName
    );
    const uploadedDisplayNames = this.preOrderFiles
      .map(
        (preOrderFileItem) =>
          (preOrderFileItem.file as FileWithCategory).displayName
      )
      .filter((displayName) => !!displayName);
    return requiredDisplayNames.every((required) =>
      uploadedDisplayNames.includes(required)
    );
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
      'index'
    );
    dialogRef.componentInstance.question = this.transloco.translate(
      'do_you_want_to_back_to_upload_step',
      {},
      'index'
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

        // Refresh depot list and input requirements from server with spinner
        this.getMyDepots(true);
      })
      .catch(() => {
        // dismissed: do nothing
      });
  }

  getDynamicParameters() {
    const selectedDepotId =
      this.getSelectedDepotObject()?.depotId ||
      this.experiment.depots?.[0]?.depotId;
    this.constraintService
      .getDynamicParameters(selectedDepotId)
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
    dynamicParameters: DynamicParameter[]
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
      defaultValue: string | number | null | undefined
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
      defaultValue: string | number | null | undefined
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

  getConstraintValue(
    dynamicParameter: DynamicParameter
  ): string | number | null {
    const key = this.getConstraintKeyForParam(dynamicParameter);
    if (!key) return null;
    const constraintValue = this.constraintsData[key];
    if (this.isTimeType(dynamicParameter)) {
      const trimmedValue = String(constraintValue ?? '').trim();
      return !trimmedValue || trimmedValue.toLowerCase() === 'null'
        ? '00:00'
        : trimmedValue;
    }
    if (this.isNumberType(dynamicParameter)) {
      const numericValue = Number(constraintValue);
      return isNaN(numericValue) ? 0 : numericValue;
    }
    return constraintValue as string | number;
  }

  onParamValueChange(
    dynamicParameter: DynamicParameter,
    newValue: string | number | null | undefined
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
      next: (res) => {
        this.toastr.success(
          this.transloco.translate('success', {}, 'index'),
          this.transloco.translate('set_default_parameter', {}, 'index')
        );
      },
      error: (err) => {
        console.error(err);
        this.toastr.error(
          this.transloco.translate('failed', {}, 'index'),
          this.transloco.translate('set_default_parameter_failed', {}, 'index')
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
    value: LocalizedText | string | null | undefined
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
    if (!this.selectedDepotId) return undefined;
    return this.depots.find(
      (depot) => depot.depotName === this.selectedDepotId
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
        (dynamicParameter) => dynamicParameter.depotId === selectedDepot.depotId
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
    type DynamicParameterRaw = Omit<
      DynamicParameter,
      'category' | 'displayName' | 'description'
    > & {
      category: LocalizedText | string | null | undefined;
      displayName: LocalizedText | string | null | undefined;
      description: LocalizedText | string | null | undefined;
    };
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
      }
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

  getUnitKey(dynamicParameter: DynamicParameter): string | null {
    switch (dynamicParameter.keyName) {
      case 'VehicleOrderSizeCapacity':
        return 'kilogram';
      case 'MaximumTravelDistance':
        return 'kilometer';
      default:
        return null;
    }
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
    dynamicParameter: DynamicParameter
  ): keyof Constraint | null {
    const keyName = (dynamicParameter.keyName || '').trim();
    switch (keyName) {
      // support PascalCase
      case 'EarlyDeliveryTime':
      // support camelCase
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

  isTimeInvalid(dynamicParameter: DynamicParameter): boolean {
    if (!this.isTimeType(dynamicParameter)) return false;
    const parameterValue = dynamicParameter.value;
    if (parameterValue === null || parameterValue === undefined) return true;
    const normalizedValue = (
      typeof parameterValue === 'string'
        ? parameterValue
        : String(parameterValue)
    )
      .trim()
      .toLowerCase();
    if (!normalizedValue || normalizedValue === 'null') return true;
    return false;
  }

  isOverWeightKey(dynamicParameter: DynamicParameter): boolean {
    return dynamicParameter.keyName === 'VehicleOrderSizeCapacity';
  }

  isOverDistanceKey(dynamicParameter: DynamicParameter): boolean {
    return dynamicParameter.keyName === 'MaximumTravelDistance';
  }

  getMyVehicleTypes() {
    this.vehicleService.getMyVehicleTypes().subscribe((res: VehicleType[]) => {
      this.myVehicleTypes = res || [];
      this.cdr.detectChanges();
    });
  }

  get availableVehicleTypes(): VehicleType[] {
    return this.myVehicleTypes.filter(
      (vehicle) => vehicle.isVehicleAvailable ?? false
    );
  }

  isVehicleSelected(vehicleId: string): boolean {
    return this.selectedVehicleIds.includes(vehicleId);
  }

  isVehicleAvailable(vehicleId: string): boolean {
    const vehicle = this.myVehicleTypes.find(
      (v) => v.vehicleTypeId === vehicleId
    );
    return vehicle ? vehicle.isVehicleAvailable ?? false : false;
  }

  onVehicleChecked(vehicleId: string, checked: boolean): void {
    if (checked) {
      if (!this.selectedVehicleIds.includes(vehicleId)) {
        this.selectedVehicleIds = [...this.selectedVehicleIds, vehicleId];
        if (this.selectedVehicleCounts[vehicleId] == null) {
          this.selectedVehicleCounts[vehicleId] = 1;
        }
        // Set default selection mode to 'count'
        if (this.vehicleSelectionMode[vehicleId] == null) {
          this.vehicleSelectionMode[vehicleId] = 'count';
        }
      }
    } else {
      this.selectedVehicleIds = this.selectedVehicleIds.filter(
        (id) => id !== vehicleId
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
      (v) => v.vehicleTypeId === vehicleId
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
      (v) => v.vehicleTypeId === vehicleId
    );

    if (!vehicleType) {
      this.toastr.warning(
        this.transloco.translate('vehicle_not_found', {}, 'index')
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

  log() {
    console.log('this.selectedVehicleIds', this.selectedVehicleIds);
    console.log('this.selectedVehicleCounts', this.selectedVehicleCounts);
    console.log('this.myVehicleTypes', this.myVehicleTypes);

    console.log('this.depots', this.depots);
    console.log('this.selectedDepotId', this.selectedDepotId);

    console.log('this.experiment', this.experiment);

    console.log(
      'this.experiment.depots[0].depotId',
      this.experiment.depots[0]?.depotId
    );

    console.log('this.constraintsData', this.constraintsData);
  }

  getVehicleMaxCount(vehicleId: string): number {
    const maxByConstraint = Number(
      this.constraintsData?.numberOfVehicleAvailable
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
    mode: 'count' | 'license-plate'
  ): void {
    const previousMode = this.vehicleSelectionMode[vehicleId];
    this.vehicleSelectionMode[vehicleId] = mode;

    // Reset values when switching modes
    if (previousMode !== mode) {
      if (mode === 'count') {
        // Switching to count mode - reset license plate selections
        if (this.selectedLicensePlates[vehicleId]) {
          delete this.selectedLicensePlates[vehicleId];
        }
        if (this.selectedVehicleIdsByLicensePlate[vehicleId]) {
          delete this.selectedVehicleIdsByLicensePlate[vehicleId];
        }
        // Reset count to default 1 if not set
        if (this.selectedVehicleCounts[vehicleId] == null) {
          this.selectedVehicleCounts[vehicleId] = 1;
        }
      } else {
        // Switching to license-plate mode - update count based on selected plates
        const selectedPlatesCount =
          this.selectedLicensePlates[vehicleId]?.length || 0;
        this.selectedVehicleCounts[vehicleId] = selectedPlatesCount;
      }
    }

    this.cdr.detectChanges();
  }

  openLicensePlateSelectionDialog(event: Event, vehicleId: string): void {
    // Prevent the radio button from being triggered
    event.stopPropagation();

    const vehicleType = this.myVehicleTypes.find(
      (v) => v.vehicleTypeId === vehicleId
    );

    if (!vehicleType) {
      this.toastr.warning(
        this.transloco.translate('vehicle_not_found', {}, 'index')
      );
      return;
    }

    // Get the depot ID from the selected depot or experiment depots
    const depotId =
      this.getSelectedDepotObject()?.depotId ||
      this.experiment.depots?.[0]?.depotId;

    const modalRef = this.ngbModal.open(
      LicensePlateSelectionDialogComponent,
      {
        centered: true,
        size: 'lg',
        animation: true
      }
    );

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

          // Update the vehicle count based on selected license plates
          this.selectedVehicleCounts[vehicleId] =
            result.selectedLicensePlates.length;

          this.toastr.success(
            `${result.selectedLicensePlates.length} ${this.transloco.translate(
              'license_plates_selected',
              {},
              'index'
            )}`
          );

          this.cdr.detectChanges();
        }
      },
      () => {
        // Modal dismissed (closed without result)
      }
    );
  }

  getSelectedLicensePlatesCount(vehicleId: string): number {
    return this.selectedLicensePlates[vehicleId]?.length || 0;
  }

  getSelectedLicensePlatesDisplay(vehicleId: string): string {
    const plates = this.selectedLicensePlates[vehicleId];
    if (!plates || plates.length === 0) {
      return this.transloco.translate(
        'no_license_plates_selected',
        {},
        'index'
      );
    }
    if (plates.length <= 3) {
      return plates.join(', ');
    }
    return `${plates.slice(0, 3).join(', ')} +${plates.length - 3}`;
  }
}
