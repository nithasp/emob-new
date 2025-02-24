import { AfterViewInit, Component, Injectable, OnInit, ViewChild, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import {
  defaults as defaultControls,
  ZoomSlider,
  FullScreen,
  Attribution
} from "ol/control";
import * as OlProj from "ol/proj";
import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { Subscription } from 'rxjs';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import Icon from 'ol/style/Icon';
import SimpleGeometry from 'ol/geom/SimpleGeometry';
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Overlay from 'ol/Overlay';
import { Coordinate } from 'ol/coordinate';
import OSM from 'ol/source/OSM';
import { NgxSpinnerService } from 'ngx-spinner';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';

import * as ExcelJS from 'exceljs';
import { Customer, PreOrder, ReplaceType, UploadPreOrder, ValidationType } from 'src/app/models/pre-order.model';
import Style from 'ol/style/Style';
import { ConstraintService } from 'src/app/services/constraint.service';
import { Constraint } from 'src/app/models/constraint.model';
import { ActivatedRoute } from '@angular/router';
import { Experiment } from 'src/app/models/experiment.model';
import { ExperimentService } from 'src/app/services/experiment.service';
import { NgbTimeStruct, NgbTimeAdapter, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ConfirmationDialogComponent } from '../components/confirmation-dialog/confirmation-dialog.component';
import { ToastrService } from "ngx-toastr";
import { PreOrderService } from 'src/app/services/pre-order.service';
import { ChangeDetectorRef } from '@angular/core';
import { MatSort } from '@angular/material/sort';
import { DataGroup, IconStyle, LocationType } from 'src/app/models/location.model';

const pad = (i: number): string => (i < 10 ? `0${i}` : `${i}`);

/**
 * Example of a String Time adapter
 */
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
  providers: [{ provide: NgbTimeAdapter, useClass: NgbTimeStringAdapter }]
})
export class RunComponent implements OnInit, AfterViewInit {

  private readonly requiredColumns: Array<string> = [
    'ADDRESS', 'AUMPHER', 'CHANNEL', 'COMPANY_ID', 'CUSTOMER_NAME', 'DELIVERYDATE', 'ORDERDATE', 'ORDERID',
    'ORDERID_ORG', 'ORDER_ID', 'PRODUCTID', 'PRODUCTNAME', 'PROVICE', 'TUMBOL', 'ZIPCODE'];
  // ngNav
  public activeNavId = 1;
  // Experiment
  experiment = <Experiment>{};

  // Condition
  public isUpload!: boolean;

  preOrderFiles: File[] = [];
  readonly panelOpenState = signal(false);
  private readonly _formBuilder = inject(FormBuilder);
  public map!: Map
  public iconStyle: Partial<IconStyle> = {};
  public vectorSource!: VectorSource;
  public vectorLayer!: VectorLayer;
  requiredFileType: string = '.xlsx, .xls';
  public fileName: string = '';
  public uploadProgress: number = -1;
  public uploadSub!: Subscription;
  public popUp?: Overlay;
  public popupContent?: PreOrder;
  value: string = 'File';
  private dataPreOrder: Array<PreOrder> = [];
  groupedDataPreOrder: any = {};
  public preOrdercount: number = 0;
  public uploadDataGroupCustomers?: DataGroup;


  displayedColumns: string[] = ['ORDERID_ORG', 'ADDRESS', 'AUMPHER', 'PROVICE'];
  dataSource = new MatTableDataSource<Customer>();
  clickedRows = new Set<PreOrder>();
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

  constraintsData!: Constraint;
  constructor(private readonly http: HttpClient,
    private readonly spinner: NgxSpinnerService,
    private readonly constraintService: ConstraintService,
    private readonly route: ActivatedRoute,
    private readonly experimentService: ExperimentService,
    private readonly ngbModal: NgbModal,
    private readonly toastr: ToastrService,
    private readonly preOrderService: PreOrderService,
    private readonly cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.spinner.show()
    this.route.params.subscribe((params: { [x: string]: string; }) => {
      this.experimentService.getExperiment(params['runId']).subscribe((response: Experiment) => {
        this.experiment = { ...response };
      });

    })

    this.constraintService.getParameter().subscribe((response: Constraint) => {
      this.constraintsData = { ...response };
      console.log(this.constraintsData);
    })

    this.initIconStyle();
    this.vectorSource = new VectorSource({});
    this.vectorLayer = new VectorLayer({
      source: this.vectorSource,

      updateWhileInteracting: true,
      updateWhileAnimating: true
    });

    this.initMap();
    this.spinner.hide()
  }
  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator; // For pagination
    this.dataSource.sort = this.sort; // For sort
  }

  firstFormGroup = this._formBuilder.group({
    firstCtrl: ['', Validators.required],
  });
  secondFormGroup = this._formBuilder.group({
    secondCtrl: ['', Validators.required],
  });
  isLinear = false;

  prependZero(num: number) {
    if (num <= 9)
      return "0" + num;
    else
      return num;
  }

  onFileSelected(files: any) {
    console.log(files)
    let file: File;
    if (files instanceof FileList) {
      file = files[0];
      if (files.length > 1) {
        this.toastr.warning('Cannot use multiple files');
      }

    } else {
      file = files.target.files[0];
      const target: DataTransfer = <DataTransfer>(files.target);
      if (target.files.length > 1) {
        this.toastr.warning('Cannot use multiple files');
      }
    }
    if (file) {
      this.uploadFile(file);
    }
  }

  private async processExcelFile(file: File) {
    const reader = new FileReader();

    reader.onload = async (e: any) => {
      const preOrderData: PreOrder[] = [];
      const arrayBuffer = e.target.result;
      const workbook: ExcelJS.Workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);
      console.log("worksheet lenght", workbook.worksheets.length);
      const worksheet = workbook.getWorksheet(1)! || workbook.getWorksheet("PreOrder")!;
      if (!worksheet) {
        console.error('Worksheet not found');
        return;
      }

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) { // Assuming the first row is the header
          const rowData: any = {};
          row.eachCell((cell, colNumber) => {
            const header = worksheet.getRow(1).getCell(colNumber).value as string;
            rowData[header] = cell.value;
          });
          preOrderData.push(rowData as PreOrder);
        }
      });
      const columnNames = (worksheet.getRow(1).values as (string | undefined)[]).filter(value => typeof value === 'string');
      console.log("Cloumn on excel file :", columnNames)
      if (this.validateData(columnNames)) {
        this.dataPreOrder = preOrderData;
        this.preOrdercount = this.dataPreOrder.length;
        this.groupDataById();
      } else {
        console.error('Data validation failed');
      }
    }
    reader.readAsArrayBuffer(file);
  }


  /**
   * The function `groupDataById` in TypeScript groups data by a specified ID, department, aumpher, and
   * province.
   */
  groupDataById() {
    this.groupedDataPreOrder = this.dataPreOrder.reduce((acc, row) => {
      const ORDERID_ORG = row.ORDERID_ORG // Assuming the ID is in the first column
      const ADDRESS = row.ADDRESS; // Assuming the Department is in the fourth column
      const AUMPHER = row.AUMPHER; // Assuming the aumpher is in the fourth column
      const PROVICE = row.PROVICE; // Assuming the province is in the fourth column
      if (!acc[ORDERID_ORG]) {
        acc[ORDERID_ORG] = { ADDRESS, AUMPHER, PROVICE, details: [] };
      }
      acc[ORDERID_ORG].details.push(row);
      return acc;
    }, {} as { [ORDERID_ORG: string]: { ADDRESS: string; AUMPHER: string; PROVICE: string; details: Array<PreOrder> } });

    // this.reInitializeDatatable();
  }

  /**
   * The `uploadFile` function in TypeScript uploads a file to a server using HTTP POST request with
   * progress tracking.
   * @param {any} file - The `uploadFile` function you provided is used to upload a file to a server
   * using Angular's HttpClient. It creates a FormData object, appends the file to it, and then makes a
   * POST request to the specified URL with the FormData object.
   */
  uploadFile(file: File) {
    const focusedElement = document.activeElement as HTMLElement;
    if (focusedElement) {
      focusedElement.blur();
    }
    const dialogRef = this.ngbModal.open(ConfirmationDialogComponent, {
      centered: true,
      size: 'lg',
      animation: true,

    });
    dialogRef.componentInstance.title = 'Confirm to Upload file ?'
    dialogRef.componentInstance.message = 'Please make sure to upload the file, and note that there may be a cost associated with finding the location.'

    dialogRef.result.then((confirmed: boolean) => {
      if (confirmed) {
        this.spinner.show();
        this.processExcelFile(file);
        this.preOrderFiles.push(file);
        this.preOrderService.uploadPreOrder(this.experiment.runId, file).subscribe((response: UploadPreOrder) => {
          console.log(response);
          this.dataSource.data = response.result.customers;
          const groupedCustomer = this.groupCustomers(response);
          this.uploadDataGroupCustomers = {
            verify: {
              customers: groupedCustomer.verify,
              type: LocationType.Verify
            },
            uncertain: {
              customers: groupedCustomer.uncertain,
              type: LocationType.Uncertain
            },
            unverify: {
              customers: groupedCustomer.unverify,
              type: LocationType.Unverify
            }
          };
          this.loadLocation(this.uploadDataGroupCustomers);
          console.log(this.uploadDataGroupCustomers);
          this.experiment.name = response.name;
          this.isUpload = true;
          this.spinner.hide();
          this.toastr.success('Uploading');

        });



      }
    }).catch((error) => {
      console.error('Dialog was dismissed:', error);
    });
  }


  deleteFileinList(index: number) {
    this.spinner.show();
    this.preOrderFiles.splice(index, 1)
    this.vectorSource.clear();
    this.dataPreOrder = [];
    this.isUpload = false;
    setTimeout(() => {
      /** spinner ends after 5 seconds */
      this.spinner.hide();
    }, 1000);

  }
  cancelUpload() {
    this.uploadSub.unsubscribe();
    this.reset();
  }

  setParameterDefault() {
    const focusedElement = document.activeElement as HTMLElement;
    if (focusedElement) {
      focusedElement.blur();
    }
    const dialogRef = this.ngbModal.open(ConfirmationDialogComponent, {
      centered: true,
      size: 'sm',
      animation: true,

    });
    dialogRef.componentInstance.message = 'Confirm to set default Parameter ?'
    dialogRef.componentInstance.title = 'Confirm to action'

    dialogRef.result.then((confirmed: boolean) => {
      if (confirmed) {
        this.constraintService.updateParameter(this.constraintsData).subscribe(
          (response: { status_message: string | undefined; }) => {
            this.toastr.success(response.status_message, 'Set default Parameter');
          },
          (error: any) => {
            this.toastr.error('Failed to set default Parameter', 'Error');
            console.error('Error updating parameter:', error);
          }
        );
      }
    }).catch((error) => {
      console.error('Dialog was dismissed:', error);
    });
  }

  reset() {
    this.uploadProgress = -1;
    this.uploadSub.unsubscribe();
  }
  private getEventMessage(event: HttpEvent<any>): number {

    if (event.type == HttpEventType.UploadProgress) {
      // Compute and show the % done:
      const percentDone = event.total ? Math.round(100 * event.loaded / event.total) : 0;
      return percentDone;
    } else {
      return 0;
    }


  }

  private initIconStyle() {
    Object.values(LocationType).forEach(type => {
      let iconLocation = new Style({
        image: new Icon({
          anchor: [0.5, 0.5],
          anchorOrigin: 'bottom-left',
          anchorXUnits: 'fraction',
          anchorYUnits: 'pixels',
          crossOrigin: "anonymous",
          opacity: 0.8,
          src: `assets/image/${type}.png`
        })
      });

      if (type === LocationType.Verify) {
        iconLocation.getImage()?.setOpacity(0.2);
        this.iconStyle.verify = iconLocation;
      } else if (type === LocationType.Uncertain) {
        this.iconStyle.uncertain = iconLocation;
      } else if (type === LocationType.Unverify) {
        this.iconStyle.unverify = iconLocation;
      }
    });
  }
  private loadLocation(uploadDataGroupCustomers: DataGroup) {
    this.vectorSource.clear();
    Object.keys(uploadDataGroupCustomers).forEach(key => {
      uploadDataGroupCustomers[key as keyof DataGroup].customers.forEach(customer => {
        if (customer.latitude && customer.longitude) {
          const location: Feature = new Feature({
            geometry: new Point(
              OlProj.fromLonLat([
                Number(customer.longitude), Number(customer.latitude)
              ])
            ),
            data: this.groupedDataPreOrder[customer.name]

          });
          location.setStyle(this.iconStyle[uploadDataGroupCustomers[key as keyof DataGroup].type]);
          this.vectorSource.addFeature(location);
        }
      });
    });

  }


  private popupShow(evt: any, element: any) {
    let coordinates: Coordinate;
    const feature = this.map.forEachFeatureAtPixel(evt.pixel,
      function (feature) {
        return feature;
      })!;
    if (feature) {
      const geometry = feature.getGeometry();
      if (geometry instanceof SimpleGeometry) {
        coordinates = geometry.getFlatCoordinates();
      } else {
        // Handle GeometryCollection or other types if needed
        coordinates = [];
      }

      this.popUp?.setPosition(coordinates)
      console.log(feature);
      this.popupContent = feature.get('data');
      console.log(this.popupContent)

    } else {

      this.popupContent = undefined;

    }
  }

  private pointMove(evt: any, element: any) {
    let target = this.map.getTarget()!;
    let jTarget = typeof target === "string" ? $("#" + target) : $(target);
    let pixel = this.map.getEventPixel(evt.originalEvent);
    let hit = this.map.hasFeatureAtPixel(pixel);
    if (hit) {
      jTarget.css("cursor", "pointer");
    } else {
      jTarget.css("cursor", "");
    }

  }
  /**
   * The `initMap` function initializes a map with layers, controls, and overlays in TypeScript using
   * OpenLayers library.
   */
  private initMap() {
    const attribution = new Attribution({
      collapsible: true,
    });
    console.log(this.preOrderFiles)
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
            maxZoom: 20
          })
        }),
        this.vectorLayer
      ],
      target: 'map',
      view: new View({
        center: OlProj.transform(
          [100.4683014, 13.7248785],
          "EPSG:4326",
          "EPSG:3857"
        ),
        zoom: 10,
        maxZoom: 20,
        minZoom: 0,
      }),
      controls: defaultControls({ attribution: false }).extend([
        new ZoomSlider(),
        new FullScreen(),
        attribution
      ]),
      // interactions: defaults({
      //   dragPan: false, mouseWheelZoom: false
      // }).extend([new DragPan({/* options */ }), new MouseWheelZoom({/* options */})])
    });


    const element = document.getElementById('popup')!;
    this.popUp = new Overlay({
      element: element,
      positioning: 'top-right',
      stopEvent: false,
      offset: [0, -50],

    });
    this.map.addOverlay(this.popUp);
    this.map.getViewport().addEventListener('contextmenu', function (evt) {
      evt.preventDefault();
      console.log(evt);

    })
    // display popup on click
    this.map.on('click', event => this.popupShow(event, element));
    this.map.on('pointermove', event => this.pointMove(event, element));
  }
  private groupCustomers(result: UploadPreOrder) {
    const verify: Customer[] = [];
    const uncertain: Customer[] = [];
    const unverify: Customer[] = [];

    result.result.customers.forEach(customer => {
      if (
        (customer.replace_type === ReplaceType.NO_REPLACE || customer.replace_type === ReplaceType.INPUT) &&
        (customer.validation_type === ValidationType.SUBDISTRICT_LEVEL || customer.validation_type === ValidationType.DISTRICT_LEVEL)
      ) {
        verify.push(customer);
      } else if (
        customer.replace_type === ReplaceType.SUBDISTRICT_LEVEL || customer.replace_type === ReplaceType.DISTRICT_LEVEL
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
    const missingColumns = this.requiredColumns.filter(col => !columnNames.includes(col));

    if (missingColumns.length > 0) {
      console.error('Missing required columns:', missingColumns);
      this.toastr.error('Missing required columns:', missingColumns.join(","));
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
  }
  // private reInitializeDatatable(): void {
  //   // Convert grouped data to array for MatTable
  //   this.dataSource.data = Object.keys(this.groupedDataPreOrder).map(key => ({
  //     ORDERID_ORG: key,
  //     ADDRESS: this.groupedDataPreOrder[key].ADDRESS,
  //     AUMPHER: this.groupedDataPreOrder[key].AUMPHER,
  //     PROVICE: this.groupedDataPreOrder[key].PROVICE
  //   }));
  // }

  isVerified(orderId: string): boolean {
    return this.uploadDataGroupCustomers?.verify.customers.some(customer => customer.name === orderId) ?? false;
  }

  isUncertain(orderId: string): boolean {
    return this.uploadDataGroupCustomers?.uncertain.customers.some(customer => customer.name === orderId) ?? false;
  }

  isUnverified(orderId: string): boolean {
    return this.uploadDataGroupCustomers?.unverify.customers.some(customer => customer.name === orderId) ?? false;
  }
}
