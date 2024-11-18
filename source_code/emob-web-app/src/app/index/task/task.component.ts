import { AfterViewInit, Component, ElementRef, OnInit, ViewChild, inject, signal } from '@angular/core';
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
import Style from 'ol/style/Style';
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { LocationService } from 'src/app/services/location.service';
import Overlay from 'ol/Overlay';
import { Coordinate } from 'ol/coordinate';
import OSM from 'ol/source/OSM';
import { NgxSpinnerService } from 'ngx-spinner';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';

import * as XLSX from 'xlsx';
import { PreOrder } from 'src/app/models/pre-order.model';


@Component({
  selector: 'app-task',
  templateUrl: './task.component.html',
  styleUrl: './task.component.scss'
})
export class TaskComponent implements OnInit, AfterViewInit {
  allFiles: File[] = [];
  readonly panelOpenState = signal(false);
  private readonly _formBuilder = inject(FormBuilder);
  public map!: Map
  public iconStyle?: Style;
  public vectorSource: VectorSource = new VectorSource();
  requiredFileType: string = '.xlsx, .xls';
  public fileName: string = '';
  public uploadProgress: number = -1;
  public uploadSub!: Subscription;
  public popUp?: Overlay;
  public popupContent?: PreOrder;
  value: string = 'File';
  active = 1;
  test_value: Time = new Time(9, 0);

  private dataPreOrder: Array<PreOrder> = [];


  displayedColumns: string[] = ['ORDERID_ORG', 'ADDRESS', 'AUMPHER', 'PROVICE'];
  dataSource = new MatTableDataSource<PreOrder>();
  clickedRows = new Set<PreOrder>();
  @ViewChild(MatPaginator) paginator!: MatPaginator;


  constructor(private readonly http: HttpClient,
    private readonly locationService: LocationService,
    private readonly elementRef: ElementRef<HTMLElement>,
    private spinner: NgxSpinnerService
  ) { }

  ngOnInit(): void {
    this.initIconStyle();
    this.initMap();

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
      this.allFiles.push(file);
      const target: DataTransfer = <DataTransfer>(files.target);
      if (target.files.length !== 1) throw new Error('Cannot use multiple files');
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const binaryStr: string = e.target.result;
        const workbook: XLSX.WorkBook = XLSX.read(binaryStr, { type: 'binary' });

        const firstSheetName: string = workbook.SheetNames[0];
        const worksheet: XLSX.WorkSheet = workbook.Sheets[firstSheetName];

        const jsonData = XLSX.utils.sheet_to_json<PreOrder>(worksheet);
        if (this.validateData(jsonData)) {
          this.dataPreOrder = jsonData;
          this.dataSource.data = this.dataPreOrder
          console.log(this.dataPreOrder);
          this.vectorSource.clear();
          this.initIconStyle();
          this.dataPreOrder.forEach((item, index) => {
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
              console.log(location);
              this.vectorSource.addFeature(location);
            }


          });

        } else {
          console.error('Data validation failed');
        }
      };
      reader.readAsArrayBuffer(target.files[0]);



    }
    this.loadLocation();
    setTimeout(() => {
      /** spinner ends after 5 seconds */
      this.spinner.hide();
    }, 1000);

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
  droppedFiles(allFiles: any): void {
    this.spinner.show();
    const filesAmount = allFiles.length;
    console.log(allFiles);
    for (let i = 0; i < filesAmount; i++) {
      const file = allFiles[i];
      this.allFiles.push(file);
    }
    this.loadLocation();
    setTimeout(() => {
      /** spinner ends after 5 seconds */
      this.spinner.hide();
    }, 1000);
  }
  deleteFileinList(index: number) {
    this.spinner.show();
    this.allFiles.splice(index, 1)
    this.vectorSource.clear();
    setTimeout(() => {
      /** spinner ends after 5 seconds */
      this.spinner.hide();
    }, 1000);

  }
  cancelUpload() {
    this.uploadSub.unsubscribe();
    this.reset();
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
  private loadLocation() {
    this.initIconStyle();
    this.vectorSource.clear();
    this.locationService.mockupdata.forEach((item, index) => {
      const location: Feature = new Feature({
        geometry: new Point(
          OlProj.fromLonLat([
            item[0], item[1]
          ])
        ),
        name: index,
        population: 4000,
        rainfall: 500
      });
      location.setStyle(this.iconStyle);
      this.vectorSource.addFeature(location);

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
    console.log(this.allFiles)
    this.map = new Map();
    this.map = new Map({
      layers: [
        new TileLayer({
          source: new OSM({
            url: 'https://{a-d}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
            attributions:
              '&copy;<a href="https://carto.com" "> CARTO</a>' +
              '&copy;<a href="http://openmaptiles.org/" > OpenMapTiles</a>' +
              '&copy;<a href="https://www.openstreetmap.org/copyright"> OpenStreetMap contributors</a>',
            crossOrigin: 'anonymous'

          })
        }),
        new VectorLayer({
          source: this.vectorSource
        })
      ],
      target: 'map',
      view: new View({
        center: OlProj.transform(
          [100.4683014, 13.7248785],
          "EPSG:4326",
          "EPSG:3857"
        ),
        zoom: 10,
        maxZoom: 30,
        minZoom: 8
      }),
      controls: defaultControls({ attribution: false }).extend([
        new ZoomSlider(),
        new FullScreen(),
        attribution
      ])
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
