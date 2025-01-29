import { AfterViewInit, Component, ElementRef, Injectable, OnInit, ViewChild, inject, signal } from '@angular/core';
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
import { Time } from 'src/app/models/time.model';
import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { Subscription, finalize } from 'rxjs';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import Icon from 'ol/style/Icon';
import SimpleGeometry from 'ol/geom/SimpleGeometry';
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { LocationService } from 'src/app/services/location.service';
import Overlay from 'ol/Overlay';
import { Coordinate } from 'ol/coordinate';
import OSM from 'ol/source/OSM';
import { NgxSpinnerService } from 'ngx-spinner';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';

import * as ExcelJS from 'exceljs';
import { PreOrder } from 'src/app/models/pre-order.model';
import Style from 'ol/style/Style';
import { ConstraintService } from 'src/app/services/constraint.service';
import { Constraint } from 'src/app/models/constraint.model';
import { ActivatedRoute } from '@angular/router';
import { Experiment } from 'src/app/models/experiment.model';
import { ExperimentService } from 'src/app/services/experiment.service';
import { NgbTimeStruct, NgbTimeAdapter} from '@ng-bootstrap/ng-bootstrap';

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

  // Experiment
  experiment = <Experiment>{};

  // Condition
  public isUpload!: boolean;

  preOrderFiles: File[] = [];
  readonly panelOpenState = signal(false);
  private readonly _formBuilder = inject(FormBuilder);
  public map!: Map
  public iconStyle?: Style;
  public vectorSource!: VectorSource;
  public vectorLayer!: VectorLayer;
  requiredFileType: string = '.xlsx, .xls';
  public fileName: string = '';
  public uploadProgress: number = -1;
  public uploadSub!: Subscription;
  public popUp?: Overlay;
  public popupContent?: PreOrder;
  value: string = 'File';
  active = 1;
  private dataPreOrder: Array<PreOrder> = [];


  displayedColumns: string[] = ['ORDERID_ORG', 'ADDRESS', 'AUMPHER', 'PROVICE'];
  dataSource = new MatTableDataSource<PreOrder>();
  clickedRows = new Set<PreOrder>();
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constraintsData!: Constraint;
  constructor(private readonly http: HttpClient,
    private readonly spinner: NgxSpinnerService,
    private readonly constraintService: ConstraintService,
    private readonly route: ActivatedRoute,
    private readonly experimentService: ExperimentService
  ) { }

  ngOnInit(): void {
    this.spinner.show()
    this.route.params.subscribe(params => {
      this.experimentService.getExperiment(params['RunId']).subscribe(response => {
        this.experiment = { ...response };

      });

    })

    this.constraintService.getParameter().subscribe(response => {
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
    this.dataSource.paginator = this.paginator;
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
    this.spinner.show();
    console.log(files)
    const file: File = files.target.files[0];
    if (file) {
      this.preOrderFiles.push(file);
      const target: DataTransfer = <DataTransfer>(files.target);
      if (target.files.length !== 1) {
        throw new Error('Cannot use multiple files');
      }
      this.processExcelFile(file);
      this.experiment.Name = file.name;
      this.isUpload = true;
      this.spinner.hide();

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

      if (this.validateData(preOrderData)) {
        this.dataSource.data = this.dataPreOrder = preOrderData;
        this.loadLocation(this.dataPreOrder);
      } else {
        console.error('Data validation failed');
      }
    }
    reader.readAsArrayBuffer(file);
  }
  uploadFile(file: any) {
    const formData = new FormData();
    formData.append("thumbnail", file);
    const upload$ = this.http.post("http://localhost:8080/fileupload", formData, {
      reportProgress: true,
      observe: 'events'
    })
      .pipe(
        finalize(() => this.reset())
      );

    this.uploadSub = upload$.subscribe(event => {
      this.uploadProgress = this.getEventMessage(event)
    })
  }

  droppedFiles(files: any): void {
    this.spinner.show();
    const filesAmount = files.length;
    console.log(files);
    for (let i = 0; i < filesAmount; i++) {
      const file = files[i];
      this.preOrderFiles.push(file);
    }
    this.isUpload = true;
    this.experiment.Name = files.name;
    setTimeout(() => {
      this.spinner.hide();
    }, 1000);
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

  setParameterDefault(){
    console.log(this.constraintsData);
    this.constraintService.updateParameter(this.constraintsData).subscribe(response =>{
      console.log("update parameter status code :",response.status_message);
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
    this.iconStyle = new Style({
      image: new Icon({
        anchor: [0.5, 0.5],
        anchorOrigin: 'bottom-left',
        anchorXUnits: 'fraction',
        anchorYUnits: 'pixels',
        crossOrigin: "anonymous",
        src: "assets/image/position.png"
      })
    });
  }
  private loadLocation(dataPreOrder: Array<PreOrder>) {
    this.initIconStyle();
    this.vectorSource.clear();
    dataPreOrder.forEach((item, index) => {
      if (item.LatLng) {
        let latlong = item.LatLng.split(",").map(Number);
        const location: Feature = new Feature({
          geometry: new Point(
            OlProj.fromLonLat([
              latlong[1], latlong[0]
            ])
          ),
          data: item,

        });
        location.setStyle(this.iconStyle);
        this.vectorSource.addFeature(location);
      }


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
  private validateData(data: PreOrder[]): boolean {
    for (const row of data) {
      if (!row.ADDRESS || typeof row.ADDRESS !== 'string') {
        console.error('Invalid or missing ADDRESS');
        return false;
      }
      if (!row.AUMPHER || typeof row.AUMPHER !== 'string') {
        console.error('Invalid or missing AUMPHER');
        return false;
      }
      // Add more validation rules as needed
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

}
