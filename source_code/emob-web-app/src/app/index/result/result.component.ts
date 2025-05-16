import { HttpClient } from '@angular/common/http';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  OnInit,
  signal,
  TemplateRef,
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
import GeoJSON from 'ol/format/GeoJSON';
import Overlay from 'ol/Overlay';
import { Coordinate, equals } from 'ol/coordinate';

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
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { MapDetailsDialogComponent } from '../components/map-details-dialog/map-details-dialog.component';
import { Workbook } from 'exceljs';
import { ActivatedRoute, Router } from '@angular/router';
import { ExperimentService } from 'src/app/services/experiment.service';
import { Experiment } from 'src/app/models/experiment.model';
import { ConfigurationService } from 'src/app/services/configuration.service';
import { firstValueFrom, take } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { RouteInfo } from 'src/app/models/location.model';
import { FormControl } from '@angular/forms';
import { MatSort } from '@angular/material/sort';
import { ConfirmationDialogComponent } from '../components/confirmation-dialog/confirmation-dialog.component';
import { DownloadResultFile } from '../../models/experiment.model';

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
  public activeFilters: Array<{
    column: string;
    criteria: string;
    value: string;
  }> = [];

  // Map related variables
  public map!: Map;
  public iconStyle?: Style;
  allFiles: File[] = [];
  public popUp?: Overlay;
  public popupContent?: any;
  private dimStyle: Style;
  private highlightedFeatureCollectionId: number | null = null;
  private featureCollections: any[] = [];
  private featureDepots: any[] = [];
  public mapAlreadyRendered: boolean = false;
  readonly panelOpenState = signal(false);

  // report
  headersReport: string[] = [];
  dataSourceReport: any[] = [];

  // Mat Table related variables
  dataRouteInfo = new MatTableDataSource<RouteInfo>([]);
  searchControl = new FormControl();
  showFilterPanel = false;
  columnsToDisplay: string[] = [
    'route_label',
    'number_delivery_points',
    'service_time',
    'travel_distance',
    'travel_duration',
    'weight',
  ];
  filterCriteriaToDisplay: string[] = [
    'equal',
    'does_not_equal',
    'greater_than',
    'greater_than_or_equal',
    'less_than',
    'less_than_or_equal',
    'contains',
    'does_not_contain',
    'starts_with',
    'does_not_start_with',
    'ends_with',
    'does_not_end_with',
  ];
  operatorSymbols: Record<string, string> = {
    equal: '=',
    does_not_equal: '≠',
    greater_than: '>',
    greater_than_or_equal: '>=',
    less_than: '<',
    less_than_or_equal: '<=',
    contains: '∋',
    does_not_contain: '∌',
    starts_with: '^=',
    does_not_start_with: '!^=',
    ends_with: '$=',
    does_not_end_with: '!$=',
  };
  selectedFilterCriteria: string = 'equal';
  selectedSearchOption: string = 'route_label';
  columnsToDisplayWithExpand = [...this.columnsToDisplay, 'expand'];
  expandedElement: Array<any> = [];
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild('filterModal', { static: true })
  filterModal!: TemplateRef<any>;

  // data store
  experiment?: Experiment;

  constructor(
    private readonly http: HttpClient,
    private readonly spinner: NgxSpinnerService,
    private readonly ngbModal: NgbModal,
    private readonly route: ActivatedRoute,
    private readonly experimentService: ExperimentService,
    private readonly configurationService: ConfigurationService,
    private readonly toastr: ToastrService,
    private readonly router: Router
  ) {
    this.spinner.show();

    this.dimStyle = new Style({
      stroke: new Stroke({
        color: 'rgba(0, 0, 0, 0.1)',
        width: 3,
      }),
    });
  }
  ngOnInit(): void {
    this.route.params
      .pipe(take(1))
      .subscribe((params: { [x: string]: string }) => {
        this.experimentService
          .getExperimentResult(params['experimentId'])
          .subscribe(async (response: Experiment) => {
            console.log(response);
            this.experiment = { ...response };
            this.expandedElement = [];
            await this.loadReportData(response.fileUrl.outputReportUrl);
            this.spinner.hide();
            await this.loadAndProcessGeoJSON(response.fileUrl.outputGeoJsonUrl);

            this.dataRouteInfo.filterPredicate =
              this.multiFilterPredicate.bind(this);
          });
      });
  }

  ngAfterViewInit(): void {
    //this.searchControl.valueChanges.subscribe((v) => this.applyFilter(v));
  }

  filterPredicate(data: RouteInfo, filter: string): boolean {
    if (!filter) return true;
    const { column, value } = JSON.parse(filter) as {
      column: string;
      value: string;
    };
    const rawValue = data[column as keyof RouteInfo];
    return this.evaluateFilter(column, rawValue, value);
  }

  evaluateFilter(
    column: string,
    rawValue: any,
    searchValue: string,
    crit?: string
  ): boolean {
    const critUsed = crit ?? this.selectedFilterCriteria;
    const search = searchValue.trim().toLowerCase();
    let displayValue: number | string;
    switch (column) {
      case 'service_time':
        displayValue = Number(rawValue) / 60;
        break;
      case 'travel_duration':
        displayValue = Number((Number(rawValue) / 60).toFixed(2));
        break;
      case 'travel_distance':
      case 'weight':
        displayValue = Math.round(Number(rawValue));
        break;
      default:
        displayValue = rawValue;
    }
    const dvStr = displayValue.toString().toLowerCase();
    const dvNum =
      typeof displayValue === 'number' ? displayValue : Number(dvStr);

    switch (critUsed) {
      case 'equal':
        return !isNaN(dvNum) ? dvNum === Number(search) : dvStr === search;
      case 'does_not_equal':
        return !isNaN(dvNum) ? dvNum !== Number(search) : dvStr !== search;
      case 'greater_than':
        return !isNaN(dvNum) && dvNum > Number(search);
      case 'greater_than_or_equal':
        return !isNaN(dvNum) && dvNum >= Number(search);
      case 'less_than':
        return !isNaN(dvNum) && dvNum < Number(search);
      case 'less_than_or_equal':
        return !isNaN(dvNum) && dvNum <= Number(search);
      case 'contains':
        return dvStr.includes(search);
      case 'does_not_contain':
        return !dvStr.includes(search);
      case 'starts_with':
        return dvStr.startsWith(search);
      case 'does_not_start_with':
        return !dvStr.startsWith(search);
      case 'ends_with':
        return dvStr.endsWith(search);
      case 'does_not_end_with':
        return !dvStr.endsWith(search);
      default:
        return false;
    }
  }

  async loadReportData(url: string) {
    const arrayBuffer = await this.fetchDataFromFileUrl(url);
    await this.fetchAndParseExcel(arrayBuffer, 0);
    await this.fetchAndParseExcel(arrayBuffer, 1);
  }
  calculateDuration(start: any, end: any): number {
    if (!start || !end) return 0;
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    return endTime - startTime;
  }

  async fetchAndParseExcel(data: any, options: any = 0): Promise<void> {
    try {
      const workbook = new Workbook();
      await workbook.xlsx.load(data);

      const worksheet = workbook.worksheets[options];
      const headers: any[] = [];
      if (!worksheet) {
        throw new Error('Worksheet not found');
      }

      worksheet
        .getRow(1)
        .eachCell({ includeEmpty: true }, (cell: any, colNumber: any) => {
          headers[colNumber - 1] =
            cell.value !== null ? String(cell.value) : `Column ${colNumber}`;
        });
      if (options === 0) this.headersReport = headers;
      // if(options === 1){
      //   this.columnsToDisplay = headers;
      //   this.columnsToDisplayWithExpand = [...this.columnsToDisplay, 'expand'];

      // }

      worksheet.eachRow((row: any, rowIndex: any) => {
        if (rowIndex === 1) return;
        const rowData: any = {};
        row.eachCell({ includeEmpty: true }, (cell: any, colNumber: any) => {
          let cellValue = cell.value;
          if (cellValue === null) {
            cellValue = '';
          }
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
          rowData[headers[colNumber - 1]] = cellValue;
        });
        console.log(rowData);
        if (options === 0) this.dataSourceReport.push(rowData);
        if (options === 1) {
          rowData['customers_distance'] = rowData['customers_distance']
            .split('➠')
            .map(Number);
          rowData['route'] = JSON.parse(rowData['route']) as number[];
          rowData['zone'] = JSON.parse(
            rowData['zone'].replace(/'/g, '"')
          ) as string[];
          console.log(rowData);

          this.dataRouteInfo.data.push(rowData);
          this.dataRouteInfo.sort = this.sort;
          this.dataRouteInfo.paginator = this.paginator;
          this.dataRouteInfo.filterPredicate = this.createFilter();
        }
      });
    } catch (error) {
      console.error('Error fetching or parsing file:', error);
    }
  }

  createFilter(): (data: RouteInfo, filter: string) => boolean {
    return (data: RouteInfo, filter: string): boolean => {
      const searchTerms = JSON.parse(filter);
      return Object.keys(searchTerms).every((key: any) => {
        const value = data[key as keyof RouteInfo];
        const searchValues = searchTerms[key]
          .split(',')
          .map((term: string) => term.trim().toLowerCase());

        if (Array.isArray(value)) {
          return searchValues.every((searchValue: string) =>
            value.some((item: any) =>
              item.toString().toLowerCase().includes(searchValue)
            )
          );
        } else {
          return searchValues.some((searchValue: string) => {
            if (searchValue === '') return false;
            return value.toString().toLowerCase() === searchValue;
          });
        }
      });
    };
  }

  private async loadAndProcessGeoJSON(url: string): Promise<void> {
    const geoJson = await this.dataFromFileUrlToJson(url);
    this.featureCollections = geoJson.routes.map(
      (rc: { features: { properties: { route_index: number } }[] }) => ({
        ...rc,
        route_index: rc.features[0]?.properties?.route_index,
      })
    );
    this.featureDepots = geoJson.depots;
    console.log(geoJson);
    //mapping routes to features
    const allFeatures: Feature<Geometry>[] = [];
    geoJson.routes.forEach((item: any, index_: number) => {
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
          const reducedCoordinates = coordinates.filter((_, i) => i % 10 === 0); // Keep every other coordinate
          console.log(
            index_,
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

    // mapping depots for features
    const depotFeatures: Feature<Geometry>[] = [];
    geoJson.depots.forEach((depot: any) => {
      const itemFeatures = new GeoJSON().readFeatures(depot, {
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:3857',
      });
      depotFeatures.push(...itemFeatures);
    });
    vectorSource.addFeatures(depotFeatures);

    this.initMap(clusterLayer, vectorSource);
    this.mapAlreadyRendered = true;
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
    console.log(`Decoded text: ${text}`);
    const jsonData = JSON.parse(text);
    console.log(`Parsed JSON data: ${JSON.stringify(jsonData)}`);

    return jsonData;
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
          .then((response) => response.blob())
          .then((blob) => {
            imageTile.src = URL.createObjectURL(blob);
          })
          .catch((error) => {
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
              '&copy;<a href="https://www.openstreetmap.org/copyright" target="_blank"> OpenStreetMap contributors</a>' +
              '&copy;<a href="http://map.project-osrm.org" target="_blank"> Project OSRM contributors</a>',
            crossOrigin: 'anonymous',
            cacheSize: 500000,
            tileLoadFunction: tileLoadFunction,
          }),
        }),
        vectorLayer,
        clusterLayer,
      ],
      target: 'mapResult',
      view: new View({
        center: OlProj.fromLonLat([100.53139488523458, 13.786463255129673]),
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
      offset: [0, -20],
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
        coordinates = geometry.getClosestPoint(
          this.map.getCoordinateFromPixel(event.pixel)
        );
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
        const nestedFeatureProperties =
          properties['features'][0].getProperties();
        this.popupContent = nestedFeatureProperties;
      } else {
        this.popupContent = properties;
      }
      console.log(this.popupContent);
    } else {
      this.popUp?.setPosition(undefined);
    }

    if (feature && feature.getGeometry()?.getType() === 'LineString') {
      this.highlightedFeatureCollectionId =
        feature.getProperties()['route_index'];
    } else {
      this.highlightedFeatureCollectionId = null;
    }
    const vectorLayer = this.map.getLayers()?.item(1) as VectorLayer;
    vectorLayer.getSource()?.changed();
    const clusterLayer = this.map.getLayers()?.item(2) as VectorLayer;
    clusterLayer.getSource()?.changed();
  }

  handleClick(event: any): void {
    const feature = this.map.forEachFeatureAtPixel(event.pixel, (feat) => feat);
    if (!feature || feature.getGeometry()?.getType() !== 'LineString') {
      return;
    }

    const routeIndex = feature.getProperties()['route_index'];
    if (routeIndex == null) {
      console.error('Clicked LineString has no route_index');
      return;
    }

    this.openRouteDetails(routeIndex);
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

  openModal(featureCollection: any, featureDepots: any[]): void {
    const modalRef = this.ngbModal.open(MapDetailsDialogComponent, {
      size: 'xl',
      centered: true,
      windowClass: 'custom-modal-width',
      modalDialogClass: 'custom-modal-content',
    });
    modalRef.componentInstance.featureCollection = featureCollection;
    modalRef.componentInstance.featureDepots = featureDepots;
  }

  styleFunction(feature: FeatureLike): Style | Style[] | undefined {
    const geometryType = feature.getGeometry()!.getType();
    const color = feature.getProperties()['color'];
    const text = feature.getProperties()['node_index'];
    const routeIndex = feature.getProperties()['route_index'];
    switch (geometryType) {
      case 'Point':
        return new Style({
          image: new Icon({
            anchor: [0.5, 0.5],
            anchorOrigin: 'bottom-left',
            anchorXUnits: 'fraction',
            anchorYUnits: 'pixels',
            crossOrigin: 'anonymous',
            opacity: 1,
            src: `assets/image/depot.png`,
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
              width: 6,
            }),
          });
        } else if (this.highlightedFeatureCollectionId !== null) {
          return this.dimStyle;
        } else {
          return new Style({
            stroke: new Stroke({
              color: color,
              width: 3,
            }),
          });
        }
      default:
        return undefined;
    }
  }

  clusterStyleFunction(feature: FeatureLike): Style | Style[] {
    const features = feature.get('features');
    const routeIndexes = features.map(
      (f: FeatureLike) => f.getProperties()['route_index']
    );
    const isHighlighted = routeIndexes.includes(
      this.highlightedFeatureCollectionId
    );

    // Aggregate properties from individual features
    const colors = features.map((f: FeatureLike) => f.getProperties()['color']);
    const texts = features.map(
      (f: FeatureLike) => f.getProperties()['route_order']
    );

    // Create an array of styles for each feature

    const color = colors[0] || '#3399CC'; // Default color if not specified
    const text = texts[0] || '';

    return new Style({
      image: new CircleStyle({
        radius: isHighlighted ? 15 : 10,
        fill: new Fill({
          color: isHighlighted
            ? '#ffcc33'
            : this.highlightedFeatureCollectionId !== null
            ? 'rgba(0, 0, 0, 0.1)'
            : color, // Highlight color if part of highlighted FeatureCollection
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
    const index = this.expandedElement.findIndex(
      (x) => x.route_index == row.route_index
    );
    if (index === -1) {
      this.expandedElement.push(row);
    } else {
      this.expandedElement.splice(index, 1);
    }
  }

  isExpanded(row: RouteInfo): string {
    const index = this.expandedElement.findIndex(
      (x) => x.route_index == row.route_index
    );
    if (index === -1) {
      return 'collapsed';
    }
    return 'expanded';
  }

  isNumber(value: any): boolean {
    return !isNaN(value);
  }
  haveTime(): boolean {
    return (
      this.experiment?.timeStart !== null && this.experiment?.timeEnd !== null
    );
  }

  applyFilter(p0: any = ''): void {
    const raw = this.searchControl.value?.toString().trim();
    if (!raw) return;

    this.activeFilters.push({
      column: this.selectedSearchOption,
      criteria: this.selectedFilterCriteria,
      value: raw,
    });

    // clear the input
    this.searchControl.setValue('');

    // re-apply the table filter
    this.dataRouteInfo.filter = JSON.stringify(this.activeFilters);
  }

  removeFilter(filt: { column: string; criteria: string; value: string }) {
    // remove this filter
    this.activeFilters = this.activeFilters.filter((x) => x !== filt);

    // if you want to reset your dropdowns back to the first items when everything is cleared:
    if (!this.activeFilters.length) {
      this.selectedSearchOption = this.columnsToDisplay[0];
      this.selectedFilterCriteria = this.filterCriteriaToDisplay[0];
    }

    // update the table filter
    this.dataRouteInfo.filter = this.activeFilters.length
      ? JSON.stringify(this.activeFilters)
      : '';
  }

  multiFilterPredicate(data: RouteInfo, filter: string): boolean {
    if (!filter) return true;
    interface F {
      column: string;
      criteria: string;
      value: string;
    }
    const filters = JSON.parse(filter) as F[];

    // OR across all chips
    return filters.some((f) =>
      this.evaluateFilter(
        f.column,
        data[f.column as keyof RouteInfo],
        f.value,
        f.criteria
      )
    );
  }

  setSearchOption(value: string) {
    this.selectedSearchOption = value;
    //this.clearFilter();
  }

  setSelectedFilterCriteria(value: string) {
    this.selectedFilterCriteria = value;
    this.applyFilter(this.searchControl.value || '');
  }

  openRouteDetails(routeIndex: number): void {
    let depotStartId: number | null = null;
    let depotEndId: number | null = null;

    const collection = this.featureCollections.find(
      (collection: any) => {
        return collection.features.some((feature: any) => {
          if (feature.properties.route_index === routeIndex) {
            depotStartId = feature.properties.start_depot_id;
            depotEndId = feature.properties.end_depot_id;
            return collection.route_index === routeIndex;
          }
          return false;
        })
      }
    );

    if (!collection) {
      console.error(`No route found for index ${routeIndex}`);
      return;
    }

    const featureDepots: any[] = [];
    if (this.featureDepots.length === 1) {
      featureDepots.push(this.featureDepots[0]);
    }
    {
      const matchingDepots = this.featureDepots.filter((depot: any) =>
        [depotStartId, depotEndId].includes(depot.properties.depot_id)
      );
      featureDepots.push(...matchingDepots);
    }
    if (!featureDepots) {
      console.error(
        `No depot found with depot_id ${depotStartId} : ${depotEndId}`
      );
      return;
    }

    console.log('featureDepots:', featureDepots);

    this.openModal(collection, featureDepots);
  }




  onMouseEnter(row: RouteInfo) {
    if (!this.mapAlreadyRendered) return;
    console.log('Mouse entered row:', row);
    this.highlightedFeatureCollectionId = row.route_index;
    const vectorLayer = this.map.getLayers()?.item(1) as VectorLayer;
    vectorLayer.getSource()?.changed();
    const clusterLayer = this.map.getLayers()?.item(2) as VectorLayer;
    clusterLayer.getSource()?.changed();
  }

  onMouseLeave(row: RouteInfo) {
    if (!this.mapAlreadyRendered) return;
    console.log('Mouse left row:', row);
    this.highlightedFeatureCollectionId = null;
    const vectorLayer = this.map.getLayers()?.item(1) as VectorLayer;
    vectorLayer.getSource()?.changed();
    const clusterLayer = this.map.getLayers()?.item(2) as VectorLayer;
    clusterLayer.getSource()?.changed();
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

  tryToRerunExperiment() {
    const dialogRef = this.openConfirmDialog(
      'Try to Rerun experiment',
      'Confirm to try to Rerun experiment',
      'Are you sure to try to rerun experiment ?'
    );
    dialogRef.result.then((confirmed: boolean) => {
      if (confirmed) {
        this.spinner.show();
        this.experimentService
          .replicateExperiment(this.experiment!.runId)
          .subscribe((response) => {
            this.spinner.hide();
            this.toastr.success(
              'Success to replicate experiment',
              'Replicate Experiment'
            );
            this.router.navigate(['/users/run', response.runId]);
          });
      }
    });
  }

  downloadPlan() {
    this.spinner.show();
    this.experimentService
      .getExperimentResultUrl(this.experiment!.runId)
      .subscribe((response: DownloadResultFile) => {
        this.configurationService
          .downloadFile(response.fileUrl.resultFileBlobPathUrl)
          .subscribe((response) => {
            const contentDisposition = response.headers.get(
              'Content-Disposition'
            );
            let fileName = 'downloadedFile';
            if (contentDisposition) {
              const matches = /filename="([^"]*)"/.exec(contentDisposition);
              if (matches && matches.length > 0) {
                fileName = matches[1];
              }
            }

            const blob = response.body;
            if (blob) {
              const link = document.createElement('a');
              link.href = window.URL.createObjectURL(blob);
              link.download = fileName;
              link.target = '_blank'; // Open in a new window
              link.click();
              this.spinner.hide();
              this.toastr.success('Success to download plan', 'Download Plan');
              window.URL.revokeObjectURL(link.href); // Clean up
            } else {
              console.error('Download failed: Blob is null');
              this.spinner.hide();
            }
          });
      });
  }

  openFilter(): void {
    this.ngbModal.open(this.filterModal, {
      size: 'lg',
      centered: true,
      modalDialogClass: 'filter-modal',
    });
  }

  onAddFilter(modal: NgbModalRef): void {
    const raw = this.searchControl.value?.toString().trim();
    if (raw) {
      this.activeFilters.push({
        column: this.selectedSearchOption,
        criteria: this.selectedFilterCriteria,
        value: raw,
      });
      this.dataRouteInfo.filter = JSON.stringify(this.activeFilters);
      this.searchControl.setValue('');
    }
    modal.close();
  }

  clearFilter(): void {
    this.searchControl.setValue('');
    this.dataRouteInfo.filter = '';
    this.activeFilters = [];
  }
}
