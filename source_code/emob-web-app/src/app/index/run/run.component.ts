import {
  AfterViewInit,
  ChangeDetectionStrategy,
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
import Point from 'ol/geom/Point';
import Icon from 'ol/style/Icon';
import SimpleGeometry from 'ol/geom/SimpleGeometry';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Overlay from 'ol/Overlay';
import { Coordinate } from 'ol/coordinate';
import OSM from 'ol/source/OSM';
import { NgxSpinnerService } from 'ngx-spinner';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';

import * as ExcelJS from 'exceljs';
import {
  Address,
  Customer,
  CustomerUpdated,
  DataCustomer,
  DataPreOrder,
  Depot,
  GroupedDataPreOrder,
  PreOrder,
  ProductInfo,
  ReplaceType,
  ValidationType,
} from 'src/app/models/pre-order.model';
import Style from 'ol/style/Style';
import { ConstraintService } from 'src/app/services/constraint.service';
import { Constraint } from 'src/app/models/constraint.model';
import { ActivatedRoute, Router } from '@angular/router';
import {
  Experiment,
  Result,
  StatusExperiment,
  Validate,
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
import { CustomerListComponent } from '../components/customer-list/customer-list.component';
import { ValidateMessage } from 'src/app/models/validation-message';
import { UserMSGraphService } from 'src/app/services/user.service';
import { firstValueFrom, take } from 'rxjs';
import { ConfigurationService } from 'src/app/services/configuration.service';
import { DataService } from 'src/app/services/data.service';
import { ExportFileService } from 'src/app/services/export-file.service';
import { set } from 'ol/transform';
import { TranslocoService } from '@jsverse/transloco';

const pad = (i: number): string => (i < 10 ? `0${i}` : `${i}`);

@Injectable()
export class NgbTimeStringAdapter extends NgbTimeAdapter<string> {
  fromModel(value: string | null): NgbTimeStruct | null {
    if (!value) {
      return null;
    }
    const split = value.split(':');
    return {
      hour: parseInt(split[0], 10),
      minute: parseInt(split[1], 10),
      second: parseInt(split[2], 10),
    };
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
  public requiredFileType: string = '.xlsx, .xls';
  readonly validTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ];
  private readonly requiredColumns: Array<string> = [
    'ORDERID_ORG',
    'CHANNEL',
    'ORDERDATE',
    'DELIVERYDATE',
    'ADDRESS',
    'TUMBOL',
    'AUMPHER',
    'PROVICE',
    'ZIPCODE',
    'PRODUCTID',
    'PRODUCTNAME',
    'QUANTITYMAIN',
    'QUANTITYMINOR',
    'DELIVERYDATE_CONFIRM',
    'ORDER_ID',
  ];
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
  public preOrderFiles: File[] = [];
  public popupContent?: { data: Customer; isDepot: boolean } | null;
  private dataPreOrder: Array<PreOrder> = [];
  public groupedDataPreOrder: Partial<GroupedDataPreOrder> = {};
  public preOrderCount: number = 0;
  public uploadDataGroupCustomers?: DataGroup | null;
  public customersLocationUpdated: Array<CustomerUpdated> = [];
  public countUploadedCustomers: number = 0;
  public constraintsData: Constraint = {
    MaxWorkDuration: 0,
    maxTravelDistance: 0,
    deliveryTime: '',
    limitVehicleCapacity: 0,
    availableCar: 0,
    earlyDeliveryTime: '',
    backToDepotTime: '',
    maximumWorkDuration: '',
    numberOfVehicleAvailable: 0,
    vehicleOrderSizeCapacity: 0,
    maximumTravelDistance: 0,
    serviceDurationTime: '',
  };
  public validateExperiment: Validate | null = null;

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
    private readonly transloco: TranslocoService
  ) {}

  ngOnInit(): void {
    this.spinner.show();
  }
  ngAfterViewInit() {
    setTimeout(() => {
      this.isCreateMode = history.state.isCreateMode;
      this.route.params
        .pipe(take(1))
        .subscribe((params: { [x: string]: string }) => {
          console.log(params);
          this.experimentService
            .getExperiment(params['runId'])
            .subscribe((response: Experiment) => {
              this.experiment = { ...response };
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
                      this.initializeDefaultParameter();
                    } else {
                      this.initializeDataFromExperiment(
                        this.experiment
                      ).finally(() => {
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
      this.getValidateMessage();
    }, 100);
    this.dataSource.paginator = this.paginator; // For pagination
    this.dataSource.sort = this.sort; // For sort
  }

  async initializeDataFromExperiment(experiment: Experiment) {
    console.log("initialize Data From Experiment's historical", experiment);
    // Load Parameter
    if (experiment.parameterBlobPath) {
      this.dataFromFileUrlToJson(experiment.fileUrl.parameterUrl).then(
        (response: Constraint) => {
          console.log('Constraint', response);
          this.constraintsData = { ...response };
          console.log(this.constraintsData);
        }
      );
    } else {
      this.initializeDefaultParameter();
    }

    this.toastr.info(
      this.transloco.translate('loading_preorder_data', {}, 'index'),
      `${this.transloco.translate('please_wait', {}, 'index')} ...`
    );
    // Load PreOrder
    const isLoadPrOrder = await this.dataFromFileUrlToExcel(
      experiment.fileUrl.preOrderUrl
    );
    console.log('isLoadPrOrder', isLoadPrOrder);
    if (!isLoadPrOrder) {
      this.toastr.warning(
        this.transloco.translate('cannot_load_data', {}, 'index'),
        this.transloco.translate('reupload_preorder_file', {}, 'index')
      );
    }
    this.toastr.info(
      this.transloco.translate('loading_geo_location_data', {}, 'index'),
      `${this.transloco.translate('please_wait', {}, 'index')} ...`
    );
    // load geocoding location
    await this.dataFromFileUrlToJson(
      experiment.fileUrl.LocationBlobPathUrl
    ).then((response: Result) => {
      console.log('Result', response);
      this.groupingCustomer(response.customers, response.depots);
    });
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
  onFileSelected(files: any) {
    console.log(files);
    let file: File;
    if (files instanceof FileList) {
      file = files[0];
      if (files.length > 1) {
        this.toastr.warning(
          this.transloco.translate('cannot_use_multiple_files', {}, 'index')
        );
      }
    } else {
      file = files.target.files[0];
      const target: DataTransfer = <DataTransfer>files.target;
      if (target.files.length > 1) {
        this.toastr.warning(
          this.transloco.translate('cannot_use_multiple_files', {}, 'index')
        );
      }
    }
    if (file) {
      if (!this.validTypes.includes(file.type)) {
        this.showInvalidModal(
          this.transloco.translate('file_invalid', {}, 'index'),
          this.transloco.translate('select_excel_file', {}, 'index')
        );
        this.toastr.error(
          `${this.transloco.translate('file_invalid', {}, 'index')}:`,
          file.type
        );
      } else {
        // Proceed with file processing
        this.uploadFile(file);
      }
    }
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

  async uploadFile(file: File) {
    const isValid = await this.processExcelFile(file);
    if (isValid) {
      console.log('Data is valid');

      const focusedElement = document.activeElement as HTMLElement;
      if (focusedElement) {
        focusedElement.blur();
      }
      const dialogRef = this.ngbModal.open(ConfirmationDialogComponent, {
        centered: true,
        animation: true,
      });
      dialogRef.componentInstance.title = this.transloco.translate(
        'upload_preorder_file_confirmation',
        {},
        'index'
      );
      dialogRef.componentInstance.question = `${this.transloco.translate(
        'confirm_to_upload_file',
        {},
        'index'
      )} ?`;
      dialogRef.componentInstance.message = `${this.transloco.translate(
        'please_make_sure_to_upload_the_file_and_note_that_there_may_be_a_cost_associated_with_finding_the_location',
        {},
        'index'
      )}.`;

      dialogRef.result
        .then((confirmed: boolean) => {
          if (confirmed) {
            this.spinner.show();

            this.preOrderService
              .uploadPreOrder(this.experiment.runId, file)
              .subscribe((response: Experiment) => {
                this.groupingCustomer(
                  response.result.customers,
                  response.result.depots
                );
                this.preOrderFiles.push(file);
                this.experiment.name = response.name;
                this.spinner.hide();
                this.toastr.success(
                  `${this.transloco.translate(
                    'upload_preorder_success',
                    {},
                    'index'
                  )}.`
                );
              });
          }
        })
        .catch((error) => {
          console.error('Dialog was dismissed:', error);
          this.spinner.hide();
        });
    } else {
      console.log('Data is invalid');
    }
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

  resetFileInput(event: any): void {
    event.target.value = null;
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
          this.constraintService
            .updateParameter(this.constraintsData)
            .subscribe(
              (response: { status_message: string | undefined }) => {
                this.toastr.success(
                  response.status_message,
                  this.transloco.translate('set_default_parameter', {}, 'index')
                );
              },
              (error: any) => {
                this.toastr.error(
                  this.transloco.translate(
                    'set_default_parameter_failed',
                    {},
                    'index'
                  ),
                  this.transloco.translate('error', {}, 'index')
                );
                console.error('Error updating parameter:', error);
              }
            );
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

  private loadLocationDepot(depots: Array<Depot>) {
    this.vectorSourceDepot.clear();
    let iconLocation = new Style({
      image: new Icon({
        anchor: [0.5, 0.5],
        anchorOrigin: 'bottom-left',
        anchorXUnits: 'fraction',
        anchorYUnits: 'pixels',
        crossOrigin: 'anonymous',
        opacity: 1,
        src: `assets/image/depot.png`,
      }),
    });

    depots.forEach((depot) => {
      if (depot.latitude && depot.longitude) {
        const location: Feature = new Feature({
          geometry: new Point(
            OlProj.fromLonLat([Number(depot.longitude), Number(depot.latitude)])
          ),

          data: { data: depot, isDepot: true },
        });
        location.setStyle(iconLocation);
        this.vectorSourceDepot.addFeature(location);
      }
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

  private popupShow(evt: any, element: any) {
    let coordinates: Coordinate;
    const feature = this.map.forEachFeatureAtPixel(
      evt.pixel,
      function (feature) {
        return feature;
      }
    )!;
    if (feature) {
      const geometry = feature.getGeometry();
      if (geometry instanceof SimpleGeometry) {
        coordinates = geometry.getFlatCoordinates();
      } else {
        // Handle GeometryCollection or other types if needed
        coordinates = [];
      }
      console.log(coordinates, feature);
      this.popUp?.setPosition(coordinates);

      this.popupContent = feature.get('data');
      console.log(this.popupContent);
    } else {
      this.popUp?.setPosition(undefined);
    }
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
            url: 'https://{a-d}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
            attributions:
              '&copy;<a href="https://carto.com" "> CARTO</a>' +
              '&copy;<a href="http://openmaptiles.org/" > OpenMapTiles</a>' +
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

  private pointMove(evt: any): void {
    const target = this.map.getTargetElement();
    const pixel = this.map.getEventPixel(evt.originalEvent);
    const hit = this.map.hasFeatureAtPixel(pixel);

    if (hit) {
      target.style.cursor = 'pointer';
    } else {
      target.style.cursor = '';
    }
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
        `${this.transloco.translate('missing_required_columns', {}, 'index')}:`,
        missingColumns
      );
      this.toastr.error(
        `${this.transloco.translate('missing_required_columns', {}, 'index')}:`,
        missingColumns.join(',')
      );
      return false;
    }
    return true;
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    console.log('filterValue', filterValue);
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
    if (
      this.constraintsData.earlyDeliveryTime >
      this.constraintsData.backToDepotTime
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
        this.constraintsData,
        this.customersLocationUpdated
      )
      .subscribe({
        next: (result) => {
          this.haveUpdateAfterValidated = false;
          console.log(result);
          this.validateExperiment = result.result.validate;
          this.ngbValidationTableCollectionSize =
            this.validateExperiment.filters.order_data.invalid_coordinate.length;
          this.dataService.clearData(this.experiment.runId);
          this.refreshValidationTable();
          this.navigateToTab(3);
        },
        error: console.error,
        complete: () => {
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
          this.hiddenSpinner();
        },
      });
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
  async dataFromFileUrlToExcel(url: string): Promise<boolean> {
    try {
      const arrayBuffer = await this.fetchDataFromFileUrl(url);
      const isReadExcel = await this.readExcel(arrayBuffer);
      const fileName = 'PreOrder.xlsx';
      const mimeType =
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

      const file: File = this.arrayBufferToFile(
        arrayBuffer,
        fileName,
        mimeType
      );
      this.preOrderFiles.push(file);
      return isReadExcel;
    } catch (error) {
      this.toastr.error(
        this.transloco.translate('file_fetch_or_parse_error', {}, 'index')
      );
      console.error('Error fetching or parsing file:', error);
      return false;
    }
  }

  private async processExcelFile(file: File): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (e: any) => {
        try {
          const arrayBuffer = e.target.result;
          const isReadExcel = await this.readExcel(arrayBuffer);
          resolve(isReadExcel);
        } catch (error) {
          console.error('Error processing Excel file:', error);
          this.toastr.error(
            this.transloco.translate('excel_process_failed', {}, 'index')
          );
          resolve(false);
        }
      };

      reader.onerror = (error) => {
        console.error('File reading error:', error);
        this.toastr.error(
          this.transloco.translate('cannot_read_file', {}, 'index')
        );
        reject(false);
      };

      reader.readAsArrayBuffer(file);
    });
  }

  appendExcelData(
    preOrderData: PreOrder[],
    worksheet: ExcelJS.Worksheet
  ): boolean {
    const columnNames = (
      worksheet.getRow(1).values as (string | undefined)[]
    ).filter((value) => typeof value === 'string');
    console.log('Columns in excel file:', columnNames);

    if (this.validateData(columnNames)) {
      this.dataPreOrder = preOrderData;
      this.preOrderCount = this.dataPreOrder.length;
      this.groupDataById();
      return true;
    } else {
      this.toastr.error(
        this.transloco.translate('data_validation_failed', {}, 'index')
      );
      return false;
    }
  }

  async readExcel(arrayBuffer: ArrayBuffer): Promise<boolean> {
    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(arrayBuffer);
      const data: PreOrder[] = [];
      console.log('Worksheet length:', workbook.worksheets.length);

      let worksheet =
        workbook.getWorksheet('PreOrder') || workbook.worksheets[0];

      if (!worksheet) {
        this.toastr.warning(
          this.transloco.translate('worksheet_not_found', {}, 'index')
        );
        return false;
      }

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          // Assuming the first row is the header
          const rowData: any = {};
          row.eachCell((cell, colNumber) => {
            const header = worksheet.getRow(1).getCell(colNumber)
              .value as string;
            rowData[header] = cell.value;
          });
          // Correcting the user input template word
          rowData['PROVINCE'] = rowData['PROVICE'];
          delete rowData['PROVICE']; // Optionally remove the incorrect key
          data.push(rowData as PreOrder);
        }
      });

      return this.appendExcelData(data, worksheet);
    } catch (error) {
      console.error('Error reading Excel file:', error);
      this.toastr.error(
        this.transloco.translate('excel_read_failed', {}, 'index')
      );
      return false;
    }
  }

  arrayBufferToFile(
    arrayBuffer: ArrayBuffer,
    fileName: string,
    mimeType: string
  ): File {
    const blob = new Blob([arrayBuffer], { type: mimeType });
    return new File([blob], fileName, { type: mimeType });
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
    const groupedCustomer = this.groupCustomers(customers);
    console.log('groupedCustomer', groupedCustomer);
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
    console.log(this.uploadDataGroupCustomers);
    this.isUpload = true;
  }
  isOriginalExperiment(): boolean {
    return this.experiment.run === 'Original';
  }

  onValueChange(newValue: number | string, property: keyof Constraint): void {
    this.updateConstraint(this.constraintsData, property, newValue as any);
    console.log(`${property} changed to:`, newValue);
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
    const files: Array<{ data: any; name: string }> = [];
    if (
      this.validateExperiment?.filters.order_data &&
      this.validateExperiment?.filters.order_data.invalid_coordinate.length > 0
    ) {
      files.push({
        data: this.validateExperiment?.warning.zero_weight.map(
          (customer, i) => ({
            index: i + 1,
            ORDER_ID: customer.name,
            ADDRESS: customer.original_address.address,
            SUBDISTRICT: customer.original_address.subdistrict,
            DISTRICT: customer.original_address.district,
            PROVINCE: customer.original_address.province,
          })
        ),
        name:
          'Remove_Order_' + this.experiment.name + '_' + this.experiment.runId,
      });
    }
    if (
      this.validateExperiment?.warning &&
      this.validateExperiment?.warning.zero_weight.length > 0
    ) {
      console.log(this.validateExperiment?.warning.zero_weight);
      files.push({
        data: this.validateExperiment?.warning.zero_weight.map(
          (customer, i) => ({
            index: i + 1,
            ORDER_ID: customer.name,
            PRODUCT_ID_ZERO_WEIGHT: customer.metrics?.product_ids.join(','),
            PRODUCT_ID_MISSING: customer.metrics?.missing_product_ids.join(','),
          })
        ),
        name:
          'Zero_Weight_' + this.experiment.name + '_' + this.experiment.runId,
      });
    }
    console.log(files);
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

  log() {
    console.log(this.haveUpdateAfterValidated, this.haveValidated);
  }
}
