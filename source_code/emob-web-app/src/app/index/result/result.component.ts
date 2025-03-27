import { HttpClient } from '@angular/common/http';
import {
  AfterViewInit,
  Component,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { NgxSpinnerService } from 'ngx-spinner';
import { Circle, Fill, Stroke, Text } from 'ol/style';
import Style, { StyleFunction } from 'ol/style/Style';
import Icon from 'ol/style/Icon';
import Feature, { FeatureLike } from 'ol/Feature';
import VectorSource from 'ol/source/Vector';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import VectorLayer from 'ol/layer/Vector';
import {
  defaults as defaultControls,
  ZoomSlider,
  FullScreen,
  Attribution,
} from 'ol/control';
import * as OlProj from 'ol/proj';
import { LocationService } from 'src/app/services/location.service';
import GeoJSON from 'ol/format/GeoJSON';
import Overlay from 'ol/Overlay';
import { Coordinate } from 'ol/coordinate';

import {
  animate,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { Geometry, LineString, Point } from 'ol/geom';
import {
  DragPan,
  defaults as defaultInteractions,
  MouseWheelZoom,
} from 'ol/interaction';
import Tile from 'ol/Tile';
import ImageTile from 'ol/ImageTile';
import { Cluster, Vector, XYZ } from 'ol/source';
import CircleStyle from 'ol/style/Circle';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { MapDetailsDialogComponent } from '../components/map-details-dialog/map-details-dialog.component';
import { Workbook } from 'exceljs';
import { ActivatedRoute, Router } from '@angular/router';
import { ExperimentService } from 'src/app/services/experiment.service';
import { Experiment } from 'src/app/models/experiment.model';
import { routes } from '../../app-routing.module';

function randomColor() {
  let r = Math.floor(Math.random() * 256);
  let g = Math.floor(Math.random() * 256);
  let b = Math.floor(Math.random() * 256);
  let color = 'rgb(' + r + ',' + g + ',' + b + ')';

  return color;
}

interface RouteInfo {
  Route: string;
  Points: number; // Count of points
  Duration: string;
  Distance: number;
  Weight: number;
  RouteNumber: number; // Route list number
  DropPoints: number[]; // New column for storing number list of points for drops
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomDuration(): string {
  const hours = getRandomInt(1, 5);
  const minutes = getRandomInt(0, 59);
  return `${hours} hours ${minutes} minutes`;
}

function generateRandomRoute(routeNumber: number): RouteInfo {
  const pointCount = getRandomInt(5, 20); // Random count of points
  const dropPoints = Array.from({ length: pointCount }, () =>
    getRandomInt(1, 100)
  ); // Generate random drop points
  return {
    Route: `Route ${getRandomInt(1, 100)}`,
    Points: pointCount,
    Duration: getRandomDuration(),
    Distance: parseFloat((Math.random() * 200).toFixed(2)),
    Weight: getRandomInt(300, 600),
    RouteNumber: routeNumber,
    DropPoints: dropPoints, // Assign the drop points
  };
}

function generateRandomRoutes(count: number): RouteInfo[] {
  return Array.from({ length: count }, (_, index) =>
    generateRandomRoute(index + 1)
  );
}

const randomRoutes = generateRandomRoutes(5);


@Component({
  selector: 'app-result',
  templateUrl: './result.component.html',
  styleUrl: './result.component.scss',
  animations: [
    trigger('detailExpand', [
      state('collapsed,void', style({ height: '0px', minHeight: '0' })),
      state('expanded', style({ height: '*' })),
      transition(
        'expanded <=> collapsed',
        animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')
      ),
    ]),
  ],
})

export class ResultComponent implements OnInit, AfterViewInit {
  // Map related variables
  public map!: Map;
  public iconStyle?: Style;
  allFiles: File[] = [];
  public popUp?: Overlay;
  public popupContent?: any;
  private dimStyle: Style;
  private highlightedFeatureCollectionId: string | null = null;
  private featureCollections : any[] =[];


  readonly panelOpenState = signal(false);
  
  // report 
  headers: string[] = [];
  dataSourceReport: any[] = [];
  currentPage: number = 1;
  pageSize: number = 15;

  // Mat Table related variables
  dataSource = new MatTableDataSource<RouteInfo>(randomRoutes);
  columnsToDisplay = ['Route', 'Points', 'Duration', 'Distance', 'Weight'];
  columnsToDisplayWithExpand = [...this.columnsToDisplay, 'expand'];
  expandedElement: Array<any> = [];
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  // data store
  experiment?: Experiment;

  constructor(
    private readonly http: HttpClient,
    private readonly spinner: NgxSpinnerService,
    private readonly locationService: LocationService,
    private readonly ngbModal : NgbModal,
    private readonly route: ActivatedRoute,
    private readonly experimentService: ExperimentService,

  ) {
    this.spinner.show();

    this.dimStyle = new Style({
      stroke: new Stroke({
        color: 'rgba(0, 0, 0, 0.2)',
        width: 3
      })
    });
  }
  ngOnInit(): void {
    this.route.params.subscribe((params: { [x: string]: string }) => {
      this.experimentService
        .getExperiment(params['runId'])
        .subscribe((response: Experiment) => {
          console.log(response);
          this.experiment = { ...response };
          this.expandedElement = [];
          this.loadAndProcessGeoJSON();
          this.loadReportData();
          this.spinner.hide();
        });
    });
    
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
  }

  loadReportData() {
    this.http.get('./assets/report_20250323_180154.xlsx', { responseType: 'arraybuffer' })
      .subscribe(data => {
        this.fetchAndParseExcel(data);
      });
  }
  calculateDuration(start: any, end: any): number {
    if(!start || !end) return 0;
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    return endTime - startTime;
}

  async fetchAndParseExcel(data: any): Promise<void> {
    try {
  
      const workbook = new Workbook();
      await workbook.xlsx.load(data);
  
      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        throw new Error('Worksheet not found');
      }
  
      worksheet.getRow(1).eachCell({ includeEmpty: true }, (cell: any, colNumber: any) => {
        this.headers[colNumber - 1] = cell.value !== null ? String(cell.value) : `Column ${colNumber}`;
      });
  
      worksheet.eachRow((row: any, rowIndex: any) => {
        if (rowIndex === 1) return;
        const rowData: any = {};
        row.eachCell({ includeEmpty: true }, (cell: any, colNumber: any) => {
          let cellValue = cell.value;
          if (cellValue === null) {
            cellValue = '';
            switch (typeof cellValue) {
              case 'string':
                cellValue = cellValue.trim();
                break;
              case 'number':
                cellValue = Number(cellValue);
                break;
              case 'boolean':
                cellValue = cellValue ? 'Yes' : 'No';
                break;
              default:
                cellValue = String(cellValue);
            }
          }
          rowData[this.headers[colNumber - 1]] = cellValue;
        });
        this.dataSourceReport.push(rowData);
      });
    } catch (error) {
      console.error('Error fetching or parsing file:', error);
    }
  }

  get paginatedData() {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.dataSourceReport.slice(start, end);
  }


  loadAndProcessGeoJSON(): void {
    this.locationService.getJSON().subscribe((items) => {
      this.featureCollections = items.routes;
      const allFeatures: Feature<Geometry>[] = [];
      items.routes.forEach((item: any, index: number) => {
        const itemFeatures = new GeoJSON().readFeatures(item, {
          dataProjection: 'EPSG:4326',
          featureProjection: 'EPSG:3857',
        });
        // Reduce coordinates in LineString features by 50%
        const reducedItemFeatures = itemFeatures.map((feature, index, arr) => {
          const geometry = feature.getGeometry();
          if (geometry?.getType() === 'LineString') {
            const lineString = geometry as LineString;
            const coordinates = lineString.getCoordinates();
            const reducedCoordinates = coordinates.filter(
              (_, i) => i % 10 === 0
            ); // Keep every other coordinate
            console.log(
              index,
              'Original coordinates:',
              coordinates.length,
              'Reduced coordinates:',
              reducedCoordinates.length
            );
            lineString.setCoordinates(reducedCoordinates);
          }
          return feature;
        });
        allFeatures.push(...reducedItemFeatures);
      });

      // Create a cluster source for point features
      const clusterSource = new Cluster({
        distance: 40,
        source: new VectorSource({
          features: allFeatures.filter(
            (feature) => feature.getGeometry()!.getType() === 'Point'
          ),
        }),
      });
      const vectorSource = new VectorSource({
        features: allFeatures.filter(
          (feature) => feature.getGeometry()!.getType() !== 'Point'
        ),
      });
      console.log(clusterSource);
      const clusterLayer = new VectorLayer({
        source: clusterSource,
        style: this.clusterStyleFunction.bind(this),
      });

      this.initMap(clusterLayer, vectorSource);
    });
  }

  private initMap(clusterLayer: VectorLayer, vectorSource: VectorSource) {
    const vectorLayer = new VectorLayer({
      source: vectorSource,
      style: this.styleFunction.bind(this),
      updateWhileInteracting: true,
      updateWhileAnimating: true,
    });
    const tileLoadFunction = (tile: Tile, src: string) => {
      if (tile instanceof ImageTile) {
        const imageTile = tile.getImage() as HTMLImageElement;
        const abortController = new AbortController();
        const { signal } = abortController;

        fetch(src, { signal })
          .then(response => response.blob())
          .then(blob => {
            imageTile.src = URL.createObjectURL(blob);
          })
          .catch(error => {
            if (error.name === 'AbortError') {
              console.log('Tile request aborted:', src);
            } else {
              console.error('Tile load error:', error);
            }
          });

        // Abort the fetch request if the tile is no longer needed
        tile.setState(3); // 3 corresponds to TileState.LOADED
      }
    };
    const attribution = new Attribution({
      collapsible: true,
    });
    console.log(this.allFiles);
    this.map = new Map({
      layers: [
        new TileLayer({
          source: new XYZ({
            url: 'https://{a-d}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
            attributions:
              '&copy;<a href="https://carto.com" target="_blank"> CARTO</a>' +
              '&copy;<a href="http://openmaptiles.org/" target="_blank"> OpenMapTiles</a>' +
              '&copy;<a href="https://www.openstreetmap.org/copyright" target="_blank"> OpenStreetMap contributors</a>'+
              '&copy;<a href="http://map.project-osrm.org" target="_blank"> Project OSRM contributors</a>',
            crossOrigin: 'anonymous',
            cacheSize: 500000,
            tileLoadFunction: tileLoadFunction
          }),
        }),
        vectorLayer,
        clusterLayer,
      ],
      target: 'mapResult',
      view: new View({
        center: OlProj.fromLonLat([100.4683014, 13.7248785]),
        zoom: 10,
        maxZoom: 17,
        minZoom: 10,
      }),
      controls: defaultControls({ attribution: false }).extend([
        new ZoomSlider(),
        new FullScreen(),
        attribution,
      ]),
      interactions: defaultInteractions().extend([
        new DragPan(),
        new MouseWheelZoom(),
      ]),
    });
    this.map.on('pointermove', this.handlePointerMove.bind(this));
    this.map.on('pointermove', (event) => this.pointMove(event));
    this.map.on('click', this.handleClick.bind(this));

    // Initialize overlay for popup
    const element = document.getElementById('popupMapResult')!;
    this.popUp = new Overlay({
      element: element,
      offset: [0,-20],
    });
    this.map.addOverlay(this.popUp);

    
  }

  handlePointerMove(event: any): void {

    let coordinates: Coordinate;
    const feature = this.map.forEachFeatureAtPixel(
      event.pixel,
      function (feature) {
        return feature;
      }
    )!;
    if (feature) {
      const geometry = feature.getGeometry();
      if (geometry instanceof LineString) {
        // Get the closest point on the LineString to the event's pixel location
        coordinates = geometry.getClosestPoint(this.map.getCoordinateFromPixel(event.pixel));
        this.popupContent = feature.getProperties();
      } else if (geometry instanceof Point) {
        coordinates = geometry.getCoordinates();
      } else {
        // Handle other geometry types if needed
        coordinates = [];
      }
      this.popUp?.setPosition(coordinates);
      const properties = feature.getProperties();
    if (properties['features'] && properties['features'].length > 0) {
      const nestedFeatureProperties = properties['features'][0].getProperties();
      this.popupContent = nestedFeatureProperties;
    } else {
      this.popupContent = properties;
    }
    console.log(this.popupContent);
  } else {
    this.popUp?.setPosition(undefined);
  }


    if (feature && feature.getGeometry()?.getType() === 'LineString') {
      this.highlightedFeatureCollectionId = feature.getProperties()['route_index'];
    } else {
      this.highlightedFeatureCollectionId = null;
    }
    const vectorLayer = this.map.getLayers()?.item(1) as VectorLayer;
    vectorLayer.getSource()?.changed();
    const clusterLayer  = this.map.getLayers()?.item(2) as VectorLayer;
    clusterLayer.getSource()?.changed();
  }
  handleClick(event: any): void {
    const feature = this.map.forEachFeatureAtPixel(event.pixel, (feature) => feature);
    if (feature && feature.getGeometry()?.getType() === 'LineString') {
      const routeIndex = feature.getProperties()['route_index'];
      const featureCollection = this.featureCollections.find((collection: any) => {
        return collection.features.some((f: any) => f.properties.route_index === routeIndex);
      });
  
      if (featureCollection) {
        this.openModal(featureCollection);
      }
    }
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

  openModal(featureCollection: any): void {
    const modalRef = this.ngbModal.open(MapDetailsDialogComponent, { 
      size: 'xl',
      centered: true,
      windowClass: 'custom-modal-width',
      modalDialogClass: 'custom-modal-content',
    });
    modalRef.componentInstance.featureCollection = featureCollection;
  }

  styleFunction(feature: FeatureLike): Style | Style[] | undefined{
    const geometryType = feature.getGeometry()!.getType();
    const color = feature.getProperties()['color'];
    const text = feature.getProperties()['node_index'];
    const routeIndex = feature.getProperties()['route_index'];

    switch (geometryType) {
      case 'Point':
        return new Style({
          image: new Circle({
            radius: 15,
            fill: new Fill({
              color: color,
            }),
          }),
          text: new Text({
            text: text,
            font: '15px Calibri,sans-serif',
            fill: new Fill({
              color: '#fff',
            }),
          }),
        });
      case 'LineString':
        if (this.highlightedFeatureCollectionId === routeIndex) {
          return new Style({
            stroke: new Stroke({
              color: color,
              width: 6
            })
          });
        } else if (this.highlightedFeatureCollectionId !== null) {
          return this.dimStyle;
        } else {
          return new Style({
            stroke: new Stroke({
              color: color,
              width: 3
            })
          });
        }
      default:
        return undefined;
    }
  }

  clusterStyleFunction(feature: FeatureLike): Style | Style[] {
    const features = feature.get('features');
    const routeIndexes = features.map((f: FeatureLike) => f.getProperties()['route_index']);
    const isHighlighted = routeIndexes.includes(this.highlightedFeatureCollectionId);
  
    // Aggregate properties from individual features
    const colors = features.map((f: FeatureLike) => f.getProperties()['color']);
    const texts = features.map((f: FeatureLike) => f.getProperties()['route_order']);
  
    // Create an array of styles for each feature

      const color = colors[0] || '#3399CC'; // Default color if not specified
      const text = texts[0] || '';
  
      return new Style({
        image: new CircleStyle({
          radius: isHighlighted ? 15 : 10,
          fill: new Fill({
            color: isHighlighted ? '#ffcc33' : this.highlightedFeatureCollectionId !== null ? 'rgba(0, 0, 0, 0.2)' : color, // Highlight color if part of highlighted FeatureCollection
          }),
          stroke: new Stroke({
            color: '#fff',
            width: 2,
          }),
        }),
        text: new Text({
          text: text,
          font: '15px Calibri,sans-serif',
          fill: new Fill({
            color: '#fff',
          }),
        }),
      });
  
  }

  toggleRow(row: RouteInfo) {
    const index = this.expandedElement.findIndex((x) => x.Route == row.Route);
    if (index === -1) {
      this.expandedElement.push(row);
    } else {
      this.expandedElement.splice(index, 1);
    }
  }

  isExpanded(row: RouteInfo): string {
    const index = this.expandedElement.findIndex((x) => x.Route == row.Route);
    if (index === -1) {
      return 'collapsed';
    }
    return 'expanded';
  }

  isNumber(value: any): boolean {
    return !isNaN(value);
  }
  haveTime():boolean{
    return this.experiment?.timeStart !== null && this.experiment?.timeEnd !== null;
  }
}
