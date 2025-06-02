import { HttpClient } from '@angular/common/http';
import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnInit,
  signal,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { NgxSpinnerService } from 'ngx-spinner';
import { Circle, Fill, Stroke, Text } from 'ol/style';
import Style from 'ol/style/Style';
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
import TileState from 'ol/TileState';
import ImageTile from 'ol/ImageTile';
import { Cluster, Vector as OlVectorSource, XYZ } from 'ol/source';
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
import { TranslocoService } from '@jsverse/transloco';
import { LanguageChangeService } from 'src/app/services/language-change.service';

/**
 * Interface representing a Depot. In a real application, replace with a model from your backend.
 */
interface Depot {
  id: number;
  name: string;
  coords: [number, number]; // [longitude, latitude]
}

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
  // ─── Existing properties ───────────────────────────────────────────────────
  public activeFilters: Array<{ column: string; criteria: string; value: string }> =
    [];

  public map!: Map;
  public popUp?: Overlay;
  public popupContent?: any;
  private dimStyle: Style;
  private highlightedFeatureCollectionId: number | null = null;
  private featureCollections: any[] = [];
  private featureDepots: any[] = [];
  public mapAlreadyRendered: boolean = false;
  readonly panelOpenState = signal(false);

  headersReport: string[] = [];
  dataSourceReport: any[] = [];

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
  @ViewChild('filterModal', { static: false, read: TemplateRef })
  filterModal!: TemplateRef<any>;
  vectorLayer!: VectorLayer;
  clusterLayer!: VectorLayer;

  @ViewChild('chipListbox') chipListbox!: ElementRef<HTMLElement>;
  hasOverflow = false;
  showAllLines = false;

  // ─── (NEW) Properties for “Change Depot Location” feature ───────────────
  /** FormControl bound to the mat-select multiple dropdown */
  depotsControl = new FormControl<number[]>([]);
  /** All depots available for selection (mock data for now) */
  availableDepots: Depot[] = [];
  /** Currently selected depot IDs */
  selectedDepotIds: number[] = [];

  // ─── Data store for experiment and loading state ─────────────────────────
  experiment?: Experiment;
  isLoading: boolean = true;

  visibleRoutes = new Set<number>();

  constructor(
    private readonly http: HttpClient,
    private readonly spinner: NgxSpinnerService,
    private readonly ngbModal: NgbModal,
    private readonly route: ActivatedRoute,
    private readonly experimentService: ExperimentService,
    private readonly configurationService: ConfigurationService,
    private readonly toastr: ToastrService,
    private readonly router: Router,
    private readonly transloco: TranslocoService,
    private readonly languageChangeService: LanguageChangeService
  ) {
    this.spinner.show();

    this.dimStyle = new Style({
      stroke: new Stroke({
        color: 'rgba(0, 0, 0, 0.1)',
        width: 3,
      }),
    });
  }

  @HostListener('window:resize')
  onWindowResize() {
    this.checkOverflow();
  }

  ngOnInit(): void {
    // 1) Load mock depot list so the <mat-select> has options immediately
    this.loadMockDepots();

    // 2) Fetch experiment result data
    this.route.params
      .pipe(take(1))
      .subscribe((params: { [x: string]: string }) => {
        this.experimentService
          .getExperimentResult(params['experimentId'])
          .subscribe(async (response: Experiment) => {
            console.log(response);
            this.experiment = { ...response };
            this.expandedElement = [];

            // 3) Load and parse report (Excel) first
            await this.loadReportData(response.fileUrl.outputReportUrl);
            this.spinner.hide();

            // 4) Load and process GeoJSON (routes + depots), then initialize map
            await this.loadAndProcessGeoJSON(response.fileUrl.outputGeoJsonUrl);

            // 5) After routing data is loaded, set up filtering logic
            this.dataRouteInfo.filterPredicate =
              this.multiFilterPredicate.bind(this);

            this.isLoading = false;
          });
      });

    // 6) Re-check chip overflow when language toggles
    this.checkFilterOverflowTwolinesWhenLanguageChange();
  }

  ngAfterViewInit(): void {
    // Ensure overflow check after view init
    setTimeout(() => this.checkOverflow(), 0);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // ─── (NEW) Load mock depots for the multiple-select dropdown ───────────────
  private loadMockDepots() {
    // Replace these with a real API call in production.
    this.availableDepots = [
      { id: 1, name: 'Bangkok Depot', coords: [100.5018, 13.7563] },
      { id: 2, name: 'Chiang Mai Depot', coords: [98.9817, 18.7969] },
      { id: 3, name: 'Phuket Depot', coords: [98.3879, 7.9519] },
          {
      id: 4,
      name: 'North-East Depot',
      coords: [100.93639488523458, 13.991463255129673]
    },
    {
      id: 5,
      name: 'South-West Depot',
      coords: [100.92639488523458, 13.981463255129673]
    }
    ];

    // Preselect the first depot by default
    this.selectedDepotIds = [1, 4];
    this.depotsControl.setValue(this.selectedDepotIds);

    // If the map is already initialized, draw the preselected depots
    setTimeout(() => this.updateDepotLocations(), 200);
  }

  // ─── (NEW) Called whenever user changes the depot selection dropdown ─────
  onDepotSelectionChange(): void {
    const selected = this.depotsControl.value as number[];
    this.selectedDepotIds = Array.isArray(selected) ? selected : [];
    this.updateDepotLocations();
  }

  // ─── (NEW) Remove old depot points and draw new ones on the map ───────────
  updateDepotLocations(): void {
    if (!this.map || !this.vectorLayer) {
      return; // Map not ready yet
    }
    const source = this.vectorLayer.getSource() as VectorSource;
    if (!source) {
      return;
    }

    // 1) Remove any existing features tagged isDepot = true
    source.getFeatures().forEach((feat) => {
      if (feat.get('isDepot') === true) {
        source.removeFeature(feat);
      }
    });

    // 2) For each selected depot ID, create a new Point and add it
    this.selectedDepotIds.forEach((depotId) => {
      const depot = this.availableDepots.find((d) => d.id === depotId);
      if (!depot) return;

      const [lon, lat] = depot.coords;
      const projected = OlProj.fromLonLat([lon, lat]);

      const pointFeature = new Feature({
        geometry: new Point(projected),
        depot_id: depotId,
        name: depot.name,
        isDepot: true,
      });

      // Style the depot point with an icon + label
      pointFeature.setStyle(
        new Style({
          image: new Icon({
            anchor: [0.5, 0.5],
            anchorOrigin: 'bottom-left',
            anchorXUnits: 'fraction',
            anchorYUnits: 'pixels',
            src: `assets/image/depot.png`,
            crossOrigin: 'anonymous',
            scale: 0.8,
          }),
          text: new Text({
            text: depot.name,
            font: '12px Calibri, sans-serif',
            fill: new Fill({ color: '#000' }),
            stroke: new Stroke({ color: '#fff', width: 2 }),
            offsetY: -25,
          }),
        })
      );

      source.addFeature(pointFeature);
    });

    // 3) Trigger a redraw of the vector source
    source.changed();
  }

  // ─── Load and parse the report Excel file to populate headersReport & dataSourceReport ───
  async loadReportData(url: string) {
    if (!url) {
      console.warn('loadReportData called with null URL, skipping.');
      this.toastr.warning(
        this.transloco.translate('no_report_available_to_load', {}, 'index'),
        this.transloco.translate('warning')
      );
      return;
    }
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
            cell.value !== null ? String(cell.value) : `column_${colNumber}`;
        });
      if (options === 0) this.headersReport = headers;

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
  // 1) Fetch the raw GeoJSON (routes + depots)
  const geoJson = await this.dataFromFileUrlToJson(url);

  // 2) Extract and index each "route collection" by its first feature's route_index
  this.featureCollections = (geoJson.routes as any[]).map((rc) => ({
    ...rc,
    route_index: rc.features[0]?.properties?.route_index,
  }));

  // 3) Keep the raw GeoJSON depot‐features for later (e.g., in openRouteDetails)
  this.featureDepots = geoJson.depots;

  console.log('Loaded GeoJSON:', geoJson);

  // 4) Build a flat list of all Features (LineStrings + Points) from the "routes" array
  const allFeatures: Feature<Geometry>[] = [];
  (geoJson.routes as any[]).forEach((item: any, index_: number) => {
    // Read each route's GeoJSON into OL Features (in EPSG:3857)
    const itemFeatures = new GeoJSON().readFeatures(item, {
      dataProjection: 'EPSG:4326',
      featureProjection: 'EPSG:3857',
    });

    // For any LineString, reduce the number of points for performance (every 10th)
    const reducedItemFeatures = itemFeatures.map((feature) => {
      const geometry = feature.getGeometry();
      if (geometry?.getType() === 'LineString') {
        const lineString = geometry as LineString;
        const coords = lineString.getCoordinates();
        // Keep every 10th coordinate
        const reducedCoords = coords.filter((_, idx) => idx % 10 === 0);
        lineString.setCoordinates(reducedCoords);
      }
      return feature;
    });

    allFeatures.push(...reducedItemFeatures);
  });

  // 5) Create a clustering source for any Point features (these are stops along routes)
  const clusterSource = new Cluster({
    distance: 40,
    source: new VectorSource({
      features: allFeatures.filter((feat) => {
        const geom = feat.getGeometry();
        return geom?.getType() === 'Point';
      }),
    }),
  });

  // 6) Make a VectorLayer for clustered points, using our clusterStyleFunction
  const clusterLayerInstance = new VectorLayer({
    source: clusterSource,
    style: this.clusterStyleFunction.bind(this),
  });

  // 7) Make a VectorSource for all non-Point features (LineStrings only)
  const vectorSource = new VectorSource({
    features: allFeatures.filter((feat) => {
      const geom = feat.getGeometry();
      return geom?.getType() !== 'Point';
    }),
  });

  // 8) Read each depot GeoJSON feature and add it to vectorSource 
  const depotFeatures: Feature<Geometry>[] = [];
  (geoJson.depots as any[]).forEach((depotGeo: any) => {
    const featuresFromDepot = new GeoJSON().readFeatures(depotGeo, {
      dataProjection: 'EPSG:4326',
      featureProjection: 'EPSG:3857',
    });
    depotFeatures.push(...featuresFromDepot);
  });
  vectorSource.addFeatures(depotFeatures);

  // ─── Merge “default” depots into availableDepots and mark them selected ───
  const defaultDepots: Depot[] = (geoJson.depots as any[]).map((d: any) => {
    const props = d.properties as { depot_id: number; name?: string };
    const coords = (d.geometry.coordinates as [number, number]);
    return {
      id: props.depot_id,
      name: props.name ?? `Depot ${props.depot_id}`,
      coords: coords,
    };
  });

  // Append GeoJSON depots to any existing mock depots
  this.availableDepots = [
    ...defaultDepots,
   ...this.availableDepots,  
  ];

  // Add default depot IDs to selectedDepotIds (deduplicated)
  const defaultIds = defaultDepots.map((d) => d.id);
  this.selectedDepotIds = Array.from(
    new Set([...this.selectedDepotIds, ...defaultIds])
  );
  // Update the FormControl so the mat-select shows them as selected
  this.depotsControl.setValue(this.selectedDepotIds);

  // 9) Now that we have our two vector sources (one for lines+depot GeoJSON, one for clusters),
  //    initialize the OL Map with both layers:
  this.initMap(clusterLayerInstance, vectorSource);
  this.mapAlreadyRendered = true;

  // 10) Finally, draw any pre‐selected depots (both mock and default) on the map
  this.updateDepotLocations();
}



  private async fetchDataFromFileUrl(url: string) {
    const blob = await firstValueFrom(
      this.configurationService.getDatafromUrl(url)
    );
    const arrayBuffer = await blob.arrayBuffer();
    return arrayBuffer;
  }

  private async dataFromFileUrlToJson(url: string) {
    console.log(`Fetching data from url: ${url}`);
    const arrayBuffer = await this.fetchDataFromFileUrl(url);
    console.log(`Fetched array buffer with length: ${arrayBuffer.byteLength}`);
    const text = new TextDecoder().decode(arrayBuffer);
    console.log(`Decoded text: ${text}`);
    const jsonData = JSON.parse(text);
    console.log(`Parsed JSON data: ${JSON.stringify(jsonData)}`);
    return jsonData;
  }

  private initMap(
    clusterLayerInstance: VectorLayer,
    vectorSource: VectorSource
  ): void {
    // ─── Create the vectorLayer for route lines & depot GeoJSON features ──────
    this.vectorLayer = new VectorLayer({
      source: vectorSource,
      style: this.styleFunction.bind(this),
      updateWhileInteracting: true,
      updateWhileAnimating: true,
    });

    // ─── Assign the clusterLayer created earlier ───────────────────────────────
    this.clusterLayer = clusterLayerInstance;

    // ─── Tile layer (Carto Light basemap) ─────────────────────────────────────
    const tileLoadFunction = (tile: Tile, src: string) => {
      if (tile instanceof ImageTile) {
        const imageEl = tile.getImage() as HTMLImageElement;
        const controller = new AbortController();
        const { signal } = controller;

        fetch(src, { signal })
          .then((res) => res.blob())
          .then((blob) => {
            imageEl.src = URL.createObjectURL(blob);
          })
          .catch((err) => {
            if (err.name !== 'AbortError') console.error('Tile load error', err);
          });

        tile.setState(TileState.LOADED);
      }
    };

    const tileLayer = new TileLayer({
      source: new XYZ({
        url: 'https://{a-d}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        attributions:
          '&copy;<a href="https://carto.com" target="_blank"> CARTO</a>' +
          '&copy;<a href="http://openmaptiles.org/" target="_blank"> OpenMapTiles</a>' +
          '&copy;<a href="https://www.openstreetmap.org/copyright" target="_blank"> OpenStreetMap contributors</a>' +
          '&copy;<a href="http://map.project-osrm.org" target="_blank"> Project OSRM contributors</a>',
        crossOrigin: 'anonymous',
        cacheSize: 500000,
        tileLoadFunction,
      }),
    });

    // ─── Instantiate the map with all layers ──────────────────────────────────
    this.map = new Map({
      target: 'mapResult',
      layers: [tileLayer, this.vectorLayer, this.clusterLayer],
      view: new View({
        center: OlProj.fromLonLat([100.53139488523458, 13.786463255129673]),
        zoom: 10,
        //minZoom: 10,
        //maxZoom: 17,
      }),
      controls: defaultControls({ attribution: false }).extend([
        new ZoomSlider(),
        new FullScreen(),
        new Attribution(),
      ]),
      interactions: defaultInteractions().extend([
        new DragPan(),
        new MouseWheelZoom(),
      ]),
    });

    // ─── Overlay for popups ─────────────────────────────────────────────────────
    this.popUp = new Overlay({
      element: document.getElementById('popupMapResult')!,
      offset: [0, -30],
    });
    this.map.addOverlay(this.popUp);

    // ─── Event listeners for pointer move & click ─────────────────────────────
    this.map.on('pointermove', this.handlePointerMove.bind(this));
    this.map.on('pointermove', (event) => this.pointMove(event));
    this.map.on('click', this.handleClick.bind(this));
  }

  handlePointerMove(event: any): void {
    let coordinates: Coordinate;
    const feature = this.map.forEachFeatureAtPixel(event.pixel, (feat) => feat);

    if (feature) {
      const geometry = feature.getGeometry();
      if (geometry instanceof LineString) {
        coordinates = geometry.getClosestPoint(
          this.map.getCoordinateFromPixel(event.pixel)
        );
        this.popupContent = feature.getProperties();
      } else if (geometry instanceof Point) {
        coordinates = geometry.getCoordinates();
      } else {
        coordinates = [];
      }

      this.popUp?.setPosition(coordinates);
      const props = feature.getProperties();
      if (props['features'] && props['features'].length > 0) {
        this.popupContent = (props['features'][0] as FeatureLike).getProperties();
      } else {
        this.popupContent = props;
      }
    } else {
      this.popUp?.setPosition(undefined);
    }

    // Determine hovered route index
    if (feature && feature.getGeometry()?.getType() === 'LineString') {
      this.highlightedFeatureCollectionId = feature.get('route_index') as number;
    } else if (feature && feature.get('features')) {
      const members = feature.get('features') as FeatureLike[];
      this.highlightedFeatureCollectionId =
        (members[0]?.get('route_index') as number) || null;
    } else {
      this.highlightedFeatureCollectionId = null;
    }

    // Clear dim styles on hovered route
    const hoverId = this.highlightedFeatureCollectionId;
    if (hoverId != null) {
      this.vectorLayer
        .getSource()!
        .getFeatures()
        .forEach((feat) => {
          if (feat.get('route_index') === hoverId) {
            feat.setStyle(undefined);
          }
        });

      this.clusterLayer
        .getSource()!
        .getFeatures()
        .forEach((clusterFeat) => {
          const members = clusterFeat.get('features') as FeatureLike[];
          if (members.some((m) => m.get('route_index') === hoverId)) {
            clusterFeat.setStyle(undefined);
          }
        });
    }

    // Force redraw
    this.vectorLayer.getSource()?.changed();
    this.clusterLayer.getSource()?.changed();
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

  styleFunction(feature: FeatureLike): Style | Style[] {
    const geom = feature.getGeometry();
    if (geom?.getType() === 'Point' && feature.get('isDepot') === true) {
      // Style for dynamically added depot points
      return (feature as Feature<Geometry>).getStyle() as Style;
    }

    // if (geom?.getType() === 'Point') {
    //   // Style for depot features from GeoJSON
    //   return new Style({
    //     image: new Icon({
    //       anchor: [0.5, 0.5],
    //       anchorOrigin: 'bottom-left',
    //       anchorXUnits: 'fraction',
    //       anchorYUnits: 'pixels',
    //       crossOrigin: 'anonymous',
    //       opacity: 1,
    //       src: `assets/image/depot.png`,
    //     }),
    //     text: new Text({
    //       text: feature.get('depot_id')?.toString() || '',
    //       font: '12px Calibri,sans-serif',
    //       fill: new Fill({ color: '#000' }),
    //     }),
    //   });
    // }

    const idx = feature.get('route_index') as number;
    const color = feature.get('color') as string;
    const hovered = this.highlightedFeatureCollectionId;

    // 1) HOVER-ONLY MODE
    if (hovered != null) {
      if (idx === hovered) {
        return new Style({
          stroke: new Stroke({ color: '#04948c', width: 6 }),
        });
      }
      return []; // hide all non-hovered lines
    }

    // 2) FILTER-AWARE MODE
    if (this.visibleRoutes.size > 0) {
      if (!this.visibleRoutes.has(idx)) {
        return this.dimStyle; // dim out-of-filter lines
      }
      return new Style({
        stroke: new Stroke({ color, width: 3 }),
      });
    }

    // 3) NO HOVER, NO FILTERS → default behavior
    if (this.highlightedFeatureCollectionId === idx) {
      return new Style({
        stroke: new Stroke({ color: '#04948c', width: 6 }),
      });
    }
    return new Style({
      stroke: new Stroke({ color, width: 3 }),
    });
  }

  clusterStyleFunction(feature: FeatureLike): Style | Style[] {
    const members = feature.get('features') as FeatureLike[];
    const idxs = members.map((m) => m.get('route_index') as number);
    const baseColor = (members[0].get('color') as string) || '#3399CC';
    const orderTxt = String(members[0].get('route_order') || '');

    const hovered = this.highlightedFeatureCollectionId;

    // 1) HOVER-ONLY MODE
    if (hovered != null) {
      if (idxs.includes(hovered)) {
        return new Style({
          image: new CircleStyle({
            radius: 15,
            fill: new Fill({ color: '#242484' }),
            stroke: new Stroke({ color: '#fff', width: 2 }),
          }),
          text: new Text({
            text: orderTxt,
            font: '15px Calibri,sans-serif',
            fill: new Fill({ color: '#fff' }),
          }),
        });
      }
      return []; // hide all other clusters
    }

    // 2) FILTER-AWARE MODE
    if (this.visibleRoutes.size > 0) {
      const anyVisible = idxs.some((i) => this.visibleRoutes.has(i));
      if (!anyVisible) {
        return new Style({
          image: new CircleStyle({
            radius: 10,
            fill: new Fill({ color: 'rgba(0,0,0,0.1)' }),
            stroke: new Stroke({ color: '#fff', width: 2 }),
          }),
          text: new Text({
            text: orderTxt,
            font: '15px Calibri,sans-serif',
            fill: new Fill({ color: '#fff' }),
          }),
        });
      }
      return new Style({
        image: new CircleStyle({
          radius: 10,
          fill: new Fill({ color: baseColor }),
          stroke: new Stroke({ color: '#fff', width: 2 }),
        }),
        text: new Text({
          text: orderTxt,
          font: '15px Calibri,sans-serif',
          fill: new Fill({ color: '#fff' }),
        }),
      });
    }

    // 3) NO HOVER, NO FILTERS
    if (idxs.includes(hovered!)) {
      return new Style({
        image: new CircleStyle({
          radius: 15,
          fill: new Fill({ color: '#242484' }),
          stroke: new Stroke({ color: '#fff', width: 2 }),
        }),
        text: new Text({
          text: orderTxt,
          font: '15px Calibri,sans-serif',
          fill: new Fill({ color: '#fff' }),
        }),
      });
    }
    return new Style({
      image: new CircleStyle({
        radius: 10,
        fill: new Fill({ color: baseColor }),
        stroke: new Stroke({ color: '#fff', width: 2 }),
      }),
      text: new Text({
        text: orderTxt,
        font: '15px Calibri,sans-serif',
        fill: new Fill({ color: '#fff' }),
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
    return index === -1 ? 'collapsed' : 'expanded';
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

    this.searchControl.setValue('');

    this.dataRouteInfo.filter = JSON.stringify(this.activeFilters);

    setTimeout(() => this.checkOverflow(), 0);
  }

  removeFilter(filt: { column: string; criteria: string; value: string }) {
    this.activeFilters = this.activeFilters.filter((x) => x !== filt);
    this.dataRouteInfo.filter = this.activeFilters.length
      ? JSON.stringify(this.activeFilters)
      : '';

    if (this.activeFilters.length === 0) {
      this.resetRouteMapUi();
    }

    setTimeout(() => {
      this.checkOverflow();
      this.applyMapFilter();
      if (this.showAllLines && !this.hasOverflow) {
        this.showAllLines = false;
      }
    }, 0);
  }

  multiFilterPredicate(data: RouteInfo, filter: string): boolean {
    if (!filter) return true;
    interface F {
      column: string;
      criteria: string;
      value: string;
    }
    const filters = JSON.parse(filter) as F[];

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
  }

  setSelectedFilterCriteria(value: string) {
    this.selectedFilterCriteria = value;
    this.applyFilter(this.searchControl.value || '');
  }

  openRouteDetails(routeIndex: number): void {
    let depotStartId: number | null = null;
    let depotEndId: number | null = null;

    const collection = this.featureCollections.find((collection: any) => {
      return collection.features.some((feature: any) => {
        if (feature.properties.route_index === routeIndex) {
          depotStartId = feature.properties.start_depot_id;
          depotEndId = feature.properties.end_depot_id;
          return collection.route_index === routeIndex;
        }
        return false;
      });
    });

    if (!collection) {
      console.error(`No route found for index ${routeIndex}`);
      return;
    }

    const featureDepots: any[] = [];
    if (this.featureDepots.length === 1) {
      featureDepots.push(this.featureDepots[0]);
    } else {
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
      this.transloco.translate('rerun_experiment_try', {}, 'index'),
      this.transloco.translate('retry_experiment_confirmation', {}, 'index'),
      this.transloco.translate('retry_experiment_message', {}, 'index')
    );

    dialogRef.result.then((confirmed: boolean) => {
      if (confirmed) {
        this.spinner.show();
        this.experimentService
          .replicateExperiment(this.experiment!.runId)
          .subscribe((response) => {
            this.spinner.hide();
            this.toastr.success(
              this.transloco.translate(
                'success_to_replicate_experiment',
                {},
                'index'
              ),
              this.transloco.translate('replicate_experiment', {}, 'index')
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
      .subscribe({
        next: (response: DownloadResultFile) => {
          this.configurationService
            .downloadFile(response.fileUrl.resultFileBlobPathUrl)
            .subscribe({
              next: (resp) => {
                const contentDisposition = resp.headers.get(
                  'Content-Disposition'
                );
                let fileName = 'downloadedFile';
                if (contentDisposition) {
                  const m = /filename="([^"]*)"/.exec(contentDisposition);
                  if (m) fileName = m[1];
                }
                const blob = resp.body;
                if (blob) {
                  const link = document.createElement('a');
                  link.href = window.URL.createObjectURL(blob);
                  link.download = fileName;
                  link.click();
                  window.URL.revokeObjectURL(link.href);
                  this.toastr.success(
                    this.transloco.translate(
                      'success_to_download_plan',
                      {},
                      'index'
                    ),
                    this.transloco.translate('download_plan', {}, 'index')
                  );
                }
                this.spinner.hide();
              },
              error: (err) => {
                console.error('Download failed', err);
                this.spinner.hide();
                this.toastr.error(
                  this.transloco.translate(
                    'failed_to_download_plan',
                    {},
                    'index'
                  ),
                  this.transloco.translate('download_plan', {}, 'index')
                );
              },
            });
        },
        error: (err) => {
          console.error('Could not get download URL', err);
          this.spinner.hide();
          this.toastr.error(
            this.transloco.translate('failed_to_get_download_url', {}, 'index'),
            this.transloco.translate('download_plan', {}, 'index')
          );
        },
      });
  }

  openFilter(): void {
    this.ngbModal.open(this.filterModal, {
      size: 'lg',
      backdrop: false,
      centered: false,
      windowClass: 'filter-modal-window',
      modalDialogClass: 'filter-modal',
    });
    setTimeout(() => this.positionFilterModal(), 0);
  }

  positionFilterModal() {
    const dialog = document.querySelector(
      '.filter-modal-window .modal-dialog'
    ) as HTMLElement;
    if (!dialog) return;

    dialog.style.position = 'absolute';
    dialog.style.margin = '0';
    dialog.style.transform = 'none';

    if (window.innerWidth >= 768) {
      const wrapper = document.querySelector(
        '.filter-button-wrapper'
      ) as HTMLElement;
      if (!wrapper) return;

      const wr = wrapper.getBoundingClientRect();
      const margin = 8;

      const aboveTop = wr.top - dialog.offsetHeight - margin;
      dialog.style.top = `${aboveTop}px`;
      dialog.style.left = `${wr.left + 50}px`;

      const rect = dialog.getBoundingClientRect();
      if (rect.top < 0 || rect.bottom > window.innerHeight) {
        const belowTop = wr.bottom + margin;
        dialog.style.top = `${belowTop}px`;
      }
    } else {
      dialog.style.top = '50%';
      dialog.style.left = '50%';
      dialog.style.transform = 'translate(-50%, -50%)';
    }
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
      this.applyMapFilter();
    }
    modal.close();

    setTimeout(() => this.checkOverflow(), 0);
  }

  clearFilter(): void {
    this.searchControl.setValue('');
    this.dataRouteInfo.filter = '';
    this.activeFilters = [];
    this.applyMapFilter();

    if (this.activeFilters.length === 0) {
      this.resetRouteMapUi();
    }

    setTimeout(() => {
      this.checkOverflow();
      this.showAllLines = false;
      this.hasOverflow = false;
    }, 0);
  }

  resetRouteMapUi(): void {
    this.highlightedFeatureCollectionId = null;
    const vectorLayer = this.map.getLayers().item(1) as VectorLayer;
    const clusterLayer = this.map.getLayers().item(2) as VectorLayer;
    vectorLayer.getSource()?.changed();
    clusterLayer.getSource()?.changed();
    this.popUp?.setPosition(undefined);
    this.popupContent = undefined;
  }

  checkOverflow() {
    const chipListbox = document.querySelector('.chipListbox') as HTMLElement;
    if (!chipListbox) return;

    const chips = Array.from(
      chipListbox.querySelectorAll('mat-chip')
    ) as HTMLElement[];
    if (chips.length === 0) {
      this.hasOverflow = false;
      this.showAllLines = false;
      chipListbox.classList.remove('lines-ellipsis');
      chipListbox.style.maxHeight = '';
      return;
    }

    const rowTops = new Set<number>();
    chips.forEach((chip) => {
      const { top } = chip.getBoundingClientRect();
      rowTops.add(Math.round(top));
    });
    const numRows = rowTops.size;

    this.hasOverflow = numRows > 2;
    if (!this.hasOverflow) {
      this.showAllLines = false;
      chipListbox.classList.remove('lines-ellipsis');
      chipListbox.style.maxHeight = '';
    } else if (!this.showAllLines) {
      const containerTop = chipListbox.getBoundingClientRect().top;
      const sortedChips = chips.sort(
        (a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top
      );

      const secondRowTop = Array.from(rowTops).sort((a, b) => a - b)[1];
      const chipsInSecondRow = sortedChips.filter(
        (c) => Math.round(c.getBoundingClientRect().top) === secondRowTop
      );
      const bottomOfRow2 = Math.max(
        ...chipsInSecondRow.map((c) => c.getBoundingClientRect().bottom)
      );
      const maxH = bottomOfRow2 - containerTop;

      chipListbox.classList.add('lines-ellipsis');
      chipListbox.style.maxHeight = `${maxH}px`;
    }
  }

  toggleOverflow(): void {
    const chipListbox = document.querySelector(
      '.chipListbox'
    ) as HTMLElement | null;
    if (!chipListbox) return;

    const firstChip = chipListbox.querySelector(
      'mat-chip'
    ) as HTMLElement | null;
    if (!firstChip) return;
    const cs = window.getComputedStyle(firstChip);
    const chipH = firstChip.offsetHeight;
    const chipM = parseFloat(cs.marginBottom);
    const collapsedH = (chipH + chipM) * 2;

    if (!this.showAllLines) {
      chipListbox.classList.remove('lines-ellipsis');
      chipListbox.style.maxHeight = `${chipListbox.scrollHeight + 3 + 10}px`;

      const onExpand = (e: TransitionEvent) => {
        if (e.propertyName === 'max-height') {
          chipListbox.style.maxHeight = '';
          chipListbox.removeEventListener('transitionend', onExpand);
        }
      };
      chipListbox.addEventListener('transitionend', onExpand);
    } else {
      chipListbox.classList.remove('lines-ellipsis');
      chipListbox.style.maxHeight = `${chipListbox.scrollHeight + 3 + 8}px`;

      requestAnimationFrame(() => {
        chipListbox.style.maxHeight = `${collapsedH + 3 + 8}px`;
      });

      const onCollapse = (e: TransitionEvent) => {
        if (e.propertyName === 'max-height') {
          chipListbox.classList.add('lines-ellipsis');
          chipListbox.removeEventListener('transitionend', onCollapse);
        }
      };
      chipListbox.addEventListener('transitionend', onCollapse);
    }

    this.showAllLines = !this.showAllLines;
    this.applyMapFilter();
  }

  applyMapFilter() {
    const visibleRoutesArr = (
      this.dataRouteInfo.filteredData as RouteInfo[]
    ).map((r) => r.route_index);
    this.visibleRoutes = new Set(visibleRoutesArr);

    // 1) Vector lines
    this.vectorLayer
      .getSource()!
      .getFeatures()
      .forEach((feat) => {
        if (feat.getGeometry()?.getType() === 'LineString') {
          const idx = feat.get('route_index') as number;
          if (!this.visibleRoutes.has(idx)) {
            feat.setStyle(this.dimStyle);
          } else {
            feat.setStyle(undefined);
          }
        }
      });

    // 2) Clusters
    this.clusterLayer
      .getSource()!
      .getFeatures()
      .forEach((clusterFeat) => {
        const members = clusterFeat.get('features') as FeatureLike[];
        const routeIndexes = members.map((m) => m.get('route_index') as number);
        const isAnyVisible = routeIndexes.some((i) =>
          this.visibleRoutes.has(i)
        );
        if (isAnyVisible) {
          clusterFeat.setStyle(undefined);
        } else {
          clusterFeat.setStyle(
            new Style({
              image: new CircleStyle({
                radius: 10,
                fill: new Fill({ color: 'rgba(0,0,0,0.1)' }),
                stroke: new Stroke({ color: '#fff', width: 2 }),
              }),
              text: new Text({
                text: String(members[0].get('route_order') || ''),
                font: '15px Calibri,sans-serif',
                fill: new Fill({ color: '#fff' }),
              }),
            })
          );
        }
      });

    this.vectorLayer.changed();
    this.clusterLayer.changed();
  }

  checkFilterOverflowTwolinesWhenLanguageChange() {
    this.languageChangeService.langToggled$.subscribe(() => {
      this.applyFilter();
      setTimeout(() => this.checkOverflow(), 0);
    });
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
}
