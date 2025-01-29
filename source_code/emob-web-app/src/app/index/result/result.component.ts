import { HttpClient } from '@angular/common/http';
import { AfterViewInit, Component, OnInit, signal, ViewChild } from '@angular/core';
import { NgxSpinnerService } from 'ngx-spinner';
import { Fill, Stroke, Text } from 'ol/style';
import Style, { StyleFunction } from 'ol/style/Style';
import Icon from 'ol/style/Icon';
import Feature, { FeatureLike } from 'ol/Feature';
import VectorSource from 'ol/source/Vector';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import VectorLayer from "ol/layer/Vector";
import {
  defaults as defaultControls,
  ZoomSlider,
  FullScreen,
  Attribution
} from "ol/control";
import * as OlProj from "ol/proj";
import { LocationService } from 'src/app/services/location.service';
import GeoJSON from 'ol/format/GeoJSON';
import Overlay from 'ol/Overlay';
import { PreOrder } from 'src/app/models/pre-order.model';
import { Coordinate } from 'ol/coordinate';
import SimpleGeometry from 'ol/geom/SimpleGeometry';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { Geometry } from 'ol/geom';
import { DragPan, defaults as defaultInteractions, MouseWheelZoom } from 'ol/interaction';
import Tile from 'ol/Tile';
import ImageTile from 'ol/ImageTile';
import { XYZ } from 'ol/source';

function randomColor() {
  let r = Math.floor(Math.random() * 256);
  let g = Math.floor(Math.random() * 256);
  let b = Math.floor(Math.random() * 256);
  let color = 'rgb(' + r + ',' + g + ',' + b + ')';

  return (color);
}
const styleFunction: StyleFunction = (feature: FeatureLike): Style | undefined => {
  const geometryType = feature.getGeometry()!.getType();
  const color = feature.getProperties()['color'];
  const text = feature.getProperties()['node_index'];

  switch (geometryType) {
    case 'Point':
      return new Style({
        // image : new Circle({
        //   radius: 10,
        //   fill: new Fill({
        //     color: color
        //   }),
        // }),     
        image: new Icon({
          anchor: [0.5, 0.5],
          anchorXUnits: 'fraction',
          anchorYUnits: 'fraction',
          scale: 1,
          src: "assets/image/position.png",
          opacity: 0.8
        }),
        text: new Text({
          text: text,
          fill: new Fill({
            color: '#fff',

          }),
        })
      });
    case 'LineString':
      return new Style({
        stroke: new Stroke({
          color: color,
          width: 3,
        })
      });
    default:
      return undefined;
  }
};

interface RouteInfo {
  Route: string;
  Points: number; // Count of points
  Duration: string;
  Distance: number;
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
  const dropPoints = Array.from({ length: pointCount }, () => getRandomInt(1, 100)); // Generate random drop points
  return {
    Route: `Route ${getRandomInt(1, 100)}`,
    Points: pointCount,
    Duration: getRandomDuration(),
    Distance: parseFloat((Math.random() * 200).toFixed(2)),
    RouteNumber: routeNumber,
    DropPoints: dropPoints // Assign the drop points
  };
}

function generateRandomRoutes(count: number): RouteInfo[] {
  return Array.from({ length: count }, (_, index) => generateRandomRoute(index + 1));
}

const randomRoutes = generateRandomRoutes(150);
console.log(randomRoutes);



@Component({
  selector: 'app-result',
  templateUrl: './result.component.html',
  styleUrl: './result.component.scss',
  animations: [
    trigger('detailExpand', [
      state('collapsed,void', style({ height: '0px', minHeight: '0' })),
      state('expanded', style({ height: '*' })),
      transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ]),
  ],
})
export class ResultComponent implements OnInit, AfterViewInit {
  public map!: Map
  public iconStyle?: Style;
  allFiles: File[] = [];
  public popUp?: Overlay;
  public popupContent?: PreOrder;
  readonly panelOpenState = signal(false);
  dataSource = new MatTableDataSource<RouteInfo>(randomRoutes);;
  columnsToDisplay = ['Route', 'Points', 'Duration', 'Distance'];
  columnsToDisplayWithExpand = [...this.columnsToDisplay, 'expand'];
  expandedElement: any[] = [];
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(private readonly http: HttpClient,
    private readonly spinner: NgxSpinnerService,
    private readonly locationService: LocationService
  ) { }
  ngOnInit(): void {
    this.spinner.show();
    this.initMap();

    this.locationService.getJSON().subscribe(items => {
      const vectorSource = new VectorSource({});
      const features: Feature<Geometry>[] = [];

      items.forEach((item: any, index: number) => {
        if (index < 50) {
          const itemFeatures = new GeoJSON().readFeatures(item, {
            dataProjection: 'EPSG:4326',
            featureProjection: 'EPSG:3857'
          });
          features.push(...itemFeatures);
        }
      });

      vectorSource.addFeatures(features);

      const vectorLayer = new VectorLayer({
        source: vectorSource,
        style: styleFunction,
        updateWhileInteracting: true,
        updateWhileAnimating: true
      });

      this.map.addLayer(vectorLayer);
    });
    this.spinner.hide();

  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
  }
  private initMap() {
    const attribution = new Attribution({
      collapsible: true,
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
    console.log(this.allFiles)
    this.map = new Map({
      layers: [
        new TileLayer({
          source: new XYZ({
            url: 'https://{a-d}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
            attributions:
              '&copy;<a href="https://carto.com" "> CARTO</a>' +
              '&copy;<a href="http://openmaptiles.org/" > OpenMapTiles</a>' +
              '&copy;<a href="https://www.openstreetmap.org/copyright"> OpenStreetMap contributors</a>',
            crossOrigin: 'anonymous',
            cacheSize: 500000,
            tileLoadFunction: tileLoadFunction
          }),
        })
      ],
      target: 'mapResult',
      view: new View({
        center: OlProj.transform(
          [100.4683014, 13.7248785],
          "EPSG:4326",
          "EPSG:3857"
        ),
        zoom: 10,
        maxZoom: 17,
        minZoom: 10,
      }),
      controls: defaultControls({ attribution: false }).extend([
        new ZoomSlider(),
        new FullScreen(),
        attribution
      ]),
      interactions: defaultInteractions().extend([new DragPan(), new MouseWheelZoom()])
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
      console.log(feature.getProperties());
      this.popupContent = feature.get('properties');
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



  drop(event: CdkDragDrop<number[]>) {
    console.log(event)
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );
    }
    console.log(this.dataSource.data)
  }
  toggleRow(row: RouteInfo) {
    const index = this.expandedElement.findIndex(x => x.Route == row.Route);
    if (index === -1) {
      this.expandedElement.push(row);
    } else {
      this.expandedElement.splice(index, 1);
    }
  }

  isExpanded(row: RouteInfo): string {
    if (
      this.expandedElement.findIndex(x => x.Route == row.Route) !== -1
    ) {
      return 'expanded';
    }
    return 'collapsed';
  }
}
