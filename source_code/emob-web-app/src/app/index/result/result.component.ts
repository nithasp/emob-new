import { HttpClient } from '@angular/common/http';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
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
import Style, { StyleFunction } from 'ol/style/Style';
import Icon from 'ol/style/Icon';
import Feature, { FeatureLike } from 'ol/Feature';
import VectorSource from 'ol/source/Vector';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import VectorLayer from 'ol/layer/Vector';
import MapBrowserEvent from 'ol/MapBrowserEvent';
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
import TileState from 'ol/TileState';
import ImageTile from 'ol/ImageTile';
import { Cluster, Vector, XYZ } from 'ol/source';
import CircleStyle from 'ol/style/Circle';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { MapDetailsDialogComponent } from '../components/map-details-dialog/map-details-dialog.component';
import { Workbook } from 'exceljs';
import { ActivatedRoute, Router } from '@angular/router';
import { ExperimentService } from 'src/app/services/experiment.service';
import {
  Experiment,
  NodeSheet,
  PlanDetail,
} from 'src/app/models/experiment.model';
import { ConfigurationService } from 'src/app/services/configuration.service';
import { firstValueFrom, take } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { 
  RouteInfo, 
  FeatureProperties, 
  GeoJSONFeature, 
  FeatureCollection, 
  ReportDataItem, 
  PreOrderDataItem, 
  PopupContent,
  NumberValue
} from 'src/app/models/location.model';
import { FormControl } from '@angular/forms';
import { MatSort } from '@angular/material/sort';
import { ConfirmationDialogComponent } from '../components/confirmation-dialog/confirmation-dialog.component';
import { DownloadResultFile } from '../../models/experiment.model';
import { TranslocoService } from '@jsverse/transloco';
import { LanguageChangeService } from 'src/app/services/language-change.service';
import { CustomerDetailsComponent } from '../components/customer-details/customer-details.component';

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

  public map!: Map;
  public iconStyle?: Style;
  allFiles: File[] = [];
  public popUp?: Overlay;
  public popupContent?: PopupContent;
  private dimStyle: Style;
  private highlightedFeatureCollectionId: number | null = null;
  private featureCollections: FeatureCollection[] = [];
  private featureDepots: FeatureCollection[] = [];
  private featureRoutes: FeatureCollection[] = [];
  public mapAlreadyRendered: boolean = false;
  readonly panelOpenState = signal(false);

  headersReport: string[] = [];
  dataSourceReport: ReportDataItem[] = [];

  dataRouteInfo = new MatTableDataSource<RouteInfo>([]);
  searchControl = new FormControl<string>('');
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
  expandedElement: RouteInfo[] = [];
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild('filterModal', { static: false, read: TemplateRef })
  filterModal!: TemplateRef<unknown>;
  vectorLayer!: VectorLayer;
  clusterLayer!: VectorLayer;

  @ViewChild('chipListbox') chipListbox!: ElementRef<HTMLElement>;
  hasOverflow = false;
  showAllLines = false;

  // data store
  experiment?: Experiment;
  nodeSheetData: NodeSheet[] = [];
  planDetailData: PlanDetail[] = [];
  preOrderData: PreOrderDataItem[] = [];
  routeInfoDetails: RouteInfo | null = null;
  visibleRoutes = new Set<number>();

  isLoading: boolean = true;

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
    private languageChangeService: LanguageChangeService
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
    this.route.params
      .pipe(take(1))
      .subscribe((params: { [x: string]: string }) => {
        this.experimentService
          .getExperimentResult(params['experimentId'])
          .subscribe(async (response: Experiment) => {
            console.log(response);
            this.experiment = { ...response };
            this.expandedElement = [];
            if (response.fileUrl.outputReportUrl) {
              await this.loadReportData(response.fileUrl.outputReportUrl);
            }
            if (this.experiment.fileUrl.outputPlanDetailUrl) {
              await this.loadPlanDetailData(
                this.experiment.fileUrl.outputPlanDetailUrl
              );
            }

            if (response.fileUrl.preOrderUrl) {
              await this.downloadExcelFromUrlAsJson(response.fileUrl.preOrderUrl);
            }

            this.spinner.hide();
            if (response.fileUrl.outputGeoJsonUrl) {
              await this.loadAndProcessGeoJSON(response.fileUrl.outputGeoJsonUrl);
            }

            this.dataRouteInfo.filterPredicate =
              this.multiFilterPredicate.bind(this);

            this.checkFilterOverflowTwolinesWhenLanguageChange();
            this.isLoading = false;
          });
      });
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.checkOverflow(), 0);
  }

  filterPredicate(data: RouteInfo, filter: string): boolean {
    if (!filter) return true;
    const { column, value } = JSON.parse(filter) as {
      column: string;
      value: string;
    };
    const rawValue = data[column as keyof RouteInfo];
    return this.evaluateFilter(column, rawValue as number, value);
  }

  evaluateFilter(
    column: string,
    rawValue: number,
    searchValue: string,
    crit?: string
  ): boolean {
    console.log('rawValue', rawValue);

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

  async loadPlanDetailData(url: string) {
    const arrayBuffer = await this.fetchDataFromFileUrl(url);
    await this.fetchAndParseExcel(arrayBuffer, 0, true);
  }

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
    await this.fetchAndParseExcel(arrayBuffer, 3);
  }
  
  calculateDuration(start: string | Date | number, end: string | Date | number): number {
    if (!start || !end) return 0;
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    return endTime - startTime;
  }

  toSnakeCaseHeader(raw: string): string {
    if (!raw) return '';
    return raw
      .toString()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .replace(/["']/g, '')
      .replace(/[^A-Za-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .replace(/_+/g, '_')
      .toLowerCase();
  }

  async fetchAndParseExcel(
    data: ArrayBuffer,
    sheetIndex: number = 0,
    isPlanDetail: boolean = false
  ): Promise<void> {
    const workbook = new Workbook();
    await workbook.xlsx.load(data);
    const worksheet = workbook.worksheets[sheetIndex];
    if (!worksheet) throw new Error(`Worksheet ${sheetIndex} not found`);

    let headers: string[] = [];
    worksheet.getRow(1).eachCell({ includeEmpty: true }, (cell, col) => {
      headers[col - 1] =
        cell.value != null ? String(cell.value).trim() : `Column ${col}`;
    });

    for (let i = 0; i < headers.length; i++) {
      const original = headers[i] ?? `Column ${i + 1}`;
      const snake = this.toSnakeCaseHeader(original);
      headers[i] = snake || `column_${i + 1}`;
    }
    if (!isPlanDetail && sheetIndex === 0) {
      this.headersReport = headers;
    }

    worksheet.eachRow((row, rowIndex) => {
      if (rowIndex === 1) return;
      const rowData: Record<string, any> = {};
      row.eachCell({ includeEmpty: true }, (cell, col) => {
        let v = cell.value;
        if (v == null) v = '';
        else if (typeof v === 'string') v = v.trim();
        else if (typeof v === 'boolean') v = v ? 'Yes' : 'No';
        else if (typeof v === 'number') v = Number(v);
        else v = String(v);
        rowData[headers[col - 1]] = v;
      });

      if (isPlanDetail) {
        this.planDetailData.push(rowData as PlanDetail);
      } else {
        switch (sheetIndex) {
          case 0:
            this.dataSourceReport.push(rowData);
            break;
          case 1:
            rowData['customers_distance'] = (
              rowData['customers_distance'] as string
            )
              .split('➠')
              .map(Number);
            rowData['route'] = JSON.parse(rowData['route'] as string);
            rowData['zone'] = JSON.parse(
              (rowData['zone'] as string).replace(/'/g, '"')
            );
            this.dataRouteInfo.data.push(rowData as any);
            this.dataRouteInfo.sort = this.sort;
            this.dataRouteInfo.paginator = this.paginator;
            this.dataRouteInfo.filterPredicate = this.createFilter();
            break;
          case 3:
            this.nodeSheetData.push(rowData as NodeSheet);
            break;
        }
      }
    });
  }

  createFilter(): (data: RouteInfo, filter: string) => boolean {
    return (data: RouteInfo, filter: string): boolean => {
      const searchTerms = JSON.parse(filter);
      return Object.keys(searchTerms).every((key: string) => {
        const value = data[key as keyof RouteInfo];
        const searchValues = searchTerms[key]
          .split(',')
          .map((term: string) => term.trim().toLowerCase());

        if (Array.isArray(value)) {
          return searchValues.every((searchValue: string) =>
            value.some((item: string | number) =>
              item.toString().toLowerCase().includes(searchValue)
            )
          );
        } else {
          return searchValues.some((searchValue: string) => {
            if (searchValue === '') return false;
            if (value === null || value === undefined) return false;
            return value.toString().toLowerCase() === searchValue;
          });
        }
      });
    };
  }

  private async loadAndProcessGeoJSON(url: string): Promise<void> {
    const geoJson = await this.dataFromFileUrlToJson(url);
    this.featureCollections = geoJson.routes.map(
      (rc: FeatureCollection) => ({
        ...rc,
        route_index: rc.features[0]?.properties?.route_index,
      })
    );
    this.featureDepots = geoJson.depots;
    this.featureRoutes = geoJson.routes;

    const allFeatures: Feature<Geometry>[] = [];
    geoJson.routes.forEach((item: FeatureCollection, index_: number) => {
      const itemFeatures = new GeoJSON().readFeatures(item, {
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:3857',
      });

      const reducedItemFeatures = itemFeatures.map((feature, index, arr) => {
        const geometry = feature.getGeometry();
        if (geometry?.getType() === 'LineString') {
          const lineString = geometry as LineString;
          const coordinates = lineString.getCoordinates();
          const reducedCoordinates = coordinates.filter((_, i) => i % 10 === 0);
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

    const clusterSource = new Cluster({
      distance: 40,
      source: new VectorSource({
        features: allFeatures.filter((feature) => {
          if (feature.getGeometry() && feature.getGeometry()!.getType()) {
            return feature.getGeometry()!.getType() === 'Point';
          } else {
            return false;
          }
        }),
      }),
    });
    const vectorSource = new VectorSource({
      features: allFeatures.filter((feature) => {
        if (feature.getGeometry() && feature.getGeometry()!.getType()) {
          return feature.getGeometry()!.getType() !== 'Point';
        } else {
          return false;
        }
      }),
    });
    console.log(clusterSource);
    const clusterLayer = new VectorLayer({
      source: clusterSource,
      style: this.clusterStyleFunction.bind(this),
    });

    const depotFeatures: Feature<Geometry>[] = [];
    geoJson.depots.forEach((depot: FeatureCollection) => {
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

  private initMap(clusterLayer: VectorLayer, vectorSource: VectorSource): void {
    this.vectorLayer = new VectorLayer({
      source: vectorSource,
      style: this.styleFunction.bind(this),
      updateWhileInteracting: true,
      updateWhileAnimating: true,
    });

    this.clusterLayer = new VectorLayer({
      source: clusterLayer.getSource() || undefined,
      style: this.clusterStyleFunction.bind(this),
    });

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
            if (err.name !== 'AbortError')
              console.error('Tile load error', err);
          });

        tile.setState(TileState.LOADED);
      }
    };

    const attribution = new Attribution({ collapsible: true });

    this.map = new Map({
      target: 'mapResult',
      layers: [
        new TileLayer({
          source: new OSM({
            attributions:
              '&copy;<a href="https://www.openstreetmap.org/copyright" target="_blank"> OpenStreetMap contributors</a>',
            crossOrigin: 'anonymous',
            cacheSize: 500000,
            tileLoadFunction,
          }),
        }),
        this.vectorLayer,
        this.clusterLayer,
      ],
      view: new View({
        center: OlProj.fromLonLat([100.53139488523458, 13.786463255129673]),
        zoom: 10,
        minZoom: 10,
        maxZoom: 17,
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
      offset: [0, -30],
    });
    this.map.addOverlay(this.popUp);
  }

  handlePointerMove(event: MapBrowserEvent<UIEvent>): void {
    // show popup and compute hovered feature
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

      // position and fill popup
      this.popUp?.setPosition(coordinates);
      const props = feature.getProperties();
      if (props['features'] && props['features'].length > 0) {
        this.popupContent = (
          props['features'][0] as FeatureLike
        ).getProperties();
      } else {
        this.popupContent = props;
      }
    } else {
      this.popUp?.setPosition(undefined);
    }

    // determine which route (if any) is hovered
    if (feature && feature.getGeometry()?.getType() === 'LineString') {
      this.highlightedFeatureCollectionId = feature.get(
        'route_index'
      ) as number;
    } else if (feature && feature.get('features')) {
      // if it's a cluster, pick one child route_index
      const members = feature.get('features') as FeatureLike[];
      this.highlightedFeatureCollectionId =
        (members[0]?.get('route_index') as number) || null;
    } else {
      this.highlightedFeatureCollectionId = null;
    }

    // ─── CLEAR OUT “DIM” STYLES ON HOVERED ROUTE ───────────────────────────────
    const hoverId = this.highlightedFeatureCollectionId;
    if (hoverId != null) {
      // 1) reset any manual style on the line itself
      this.vectorLayer
        .getSource()!
        .getFeatures()
        .forEach((feat) => {
          if (feat.get('route_index') === hoverId) {
            feat.setStyle(undefined);
          }
        });

      // 2) reset any manual style on its cluster(s)
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

    // force a redraw so styleFunction / clusterStyleFunction re-runs
    this.vectorLayer.getSource()?.changed();
    this.clusterLayer.getSource()?.changed();
  }

  handleClick(event: MapBrowserEvent<UIEvent>): void {
    const feature = this.map.forEachFeatureAtPixel(event.pixel, (feat: FeatureLike) => feat);
    if (!feature || feature.getGeometry()?.getType() !== 'LineString') {
      return;
    }

    const routeIndex: number | undefined = feature.getProperties()['route_index'];
    if (routeIndex == null) {
      console.error('Clicked LineString has no route_index');
      return;
    }

    this.openRouteDetails(routeIndex);
  }

  private pointMove(evt: MapBrowserEvent<UIEvent>): void {
    const target = this.map.getTargetElement();
    const pixel = this.map.getEventPixel(evt.originalEvent);
    const hit = this.map.hasFeatureAtPixel(pixel);

    if (hit) {
      target.style.cursor = 'pointer';
    } else {
      target.style.cursor = '';
    }
  }

  openModal(featureCollection: FeatureCollection, featureDepots: FeatureCollection[]): void {
    const modalRef = this.ngbModal.open(MapDetailsDialogComponent, {
      size: 'xl',
      centered: true,
      windowClass: 'custom-modal-width',
      modalDialogClass: 'custom-modal-content',
    });
    modalRef.componentInstance.featureCollection = featureCollection;
    modalRef.componentInstance.featureDepots = featureDepots;
    modalRef.componentInstance.routeInfo = this.routeInfoDetails;
  }

  styleFunction(feature: FeatureLike): Style | Style[] {
    const geom = feature.getGeometry();
    // ─── DEPOT POINTS ───────────────────────────────────────────────────────────
    if (geom?.getType() === 'Point') {
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
          text: feature.get('depot_id')?.toString() || '',
          font: '12px Calibri,sans-serif',
          fill: new Fill({ color: '#000' }),
        }),
      });
    }

    // ─── ROUTE LINES ────────────────────────────────────────────────────────────
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

    //─── 1) HOVER-ONLY MODE ────────────────────────────────────────────────────────
    if (hovered != null) {
      if (idxs.includes(hovered)) {
        // only draw the hovered cluster, highlighted
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

    //─── 2) FILTER-AWARE MODE ──────────────────────────────────────────────────────
    if (this.visibleRoutes.size > 0) {
      const anyVisible = idxs.some((i) => this.visibleRoutes.has(i));
      if (!anyVisible) {
        // out-of-filter clusters get dimmed
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
      // in-filter & not hovered → normal color/size
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

    //─── 3) NO HOVER, NO FILTERS → ORIGINAL BEHAVIOR ───────────────────────────────
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
    if (index === -1) {
      return 'collapsed';
    }
    return 'expanded';
  }

  isNumber(value: NumberValue): boolean {
    if (value === null || value === undefined) {
      return false;
    }

    if (typeof value === 'object') {
      const stringValue = String(value);
      return !isNaN(Number(stringValue));
    }
    
    return !isNaN(Number(value));
  }

  getNumberValue(value: NumberValue): number {
    if (value === null || value === undefined) {
      return 0;
    }
    
    if (typeof value === 'boolean') {
      return value ? 1 : 0;
    }
    
    if (typeof value === 'number') {
      return value;
    }
    
    if (typeof value === 'object') {
      // For objects, try to convert to string first
      const stringValue = String(value);
      const numValue = Number(stringValue);
      return isNaN(numValue) ? 0 : numValue;
    }

    const numValue = Number(value);
    return isNaN(numValue) ? 0 : numValue;
  }
  haveTime(): boolean {
    return (
      this.experiment?.timeStart !== null && this.experiment?.timeEnd !== null
    );
  }

  applyFilter(searchValue: string = ''): void {
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
        data[f.column as keyof RouteInfo] as number,
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

    this.routeInfoDetails = this.dataRouteInfo.data.find(
      (r) => r.route_index === routeIndex
    ) || null;

    const collection = this.featureCollections.find((collection: FeatureCollection) => {
      return collection.features.some((feature: GeoJSONFeature) => {
        if (feature.properties.route_index === routeIndex) {
          depotStartId = feature.properties.start_depot_id || null;
          depotEndId = feature.properties.end_depot_id || null;
          return collection.route_index === routeIndex;
        }
        return false;
      });
    });

    if (!collection) {
      console.error(`No route found for index ${routeIndex}`);
      return;
    }

    const featureDepots: FeatureCollection[] = [];
    
    // Debug logging
    console.log('featureDepots array:', this.featureDepots);
    console.log('depotStartId:', depotStartId, 'depotEndId:', depotEndId);
    
    // Check if featureDepots is properly initialized
    if (!this.featureDepots || !Array.isArray(this.featureDepots)) {
      console.error('featureDepots is not properly initialized:', this.featureDepots);
      return;
    }
    
    if (this.featureDepots.length === 1) {
      featureDepots.push(this.featureDepots[0]);
    } else {
      const matchingDepots = this.featureDepots.filter((depot: FeatureCollection) => {
        // Check if depot has features and at least one feature exists
        if (!depot || !depot.features || !Array.isArray(depot.features) || depot.features.length === 0) {
          console.warn('Depot missing features or invalid structure:', depot);
          return false;
        }
        
        // Safely access the first feature and its properties
        const firstFeature = depot.features[0];
        if (!firstFeature || !firstFeature.properties) {
          console.warn('Depot feature missing properties:', firstFeature);
          return false;
        }
        
        const depotId = firstFeature.properties.depot_id || null;
        const isMatch = [depotStartId, depotEndId].includes(depotId);
        console.log('Checking depot:', depotId, 'isMatch:', isMatch);
        return isMatch;
      });
      featureDepots.push(...matchingDepots);
    }
    if (featureDepots.length === 0) {
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
    // Clear the current highlight
    this.highlightedFeatureCollectionId = null;

    // Grab your vector and cluster layers by index
    const vectorLayer = this.map.getLayers().item(1) as VectorLayer;
    const clusterLayer = this.map.getLayers().item(2) as VectorLayer;

    // Tell OL that the source changed so it re-runs your style functions
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
    // compute visibleRoutes array exactly as you do now
    const visibleRoutesArr = (
      this.dataRouteInfo.filteredData as RouteInfo[]
    ).map((r) => r.route_index);
    this.visibleRoutes = new Set(visibleRoutesArr);

    // 1) vector lines
    this.vectorLayer
      .getSource()!
      .getFeatures()
      .forEach((feat) => {
        if (feat.getGeometry()?.getType() === 'LineString') {
          const idx = feat.get('route_index') as number;
          if (!this.visibleRoutes.has(idx)) {
            // outside filter → dim
            feat.setStyle(this.dimStyle);
          } else {
            // inside filter → let styleFunction handle normal vs hover
            feat.setStyle(undefined);
          }
        }
      });

    // 2) clusters (points)
    this.clusterLayer
      .getSource()!
      .getFeatures()
      .forEach((clusterFeat) => {
        const members = clusterFeat.get('features') as FeatureLike[];
        const routeIndexes = members.map((m) => m.get('route_index') as number);
        // if *none* of the member routes is in your filter → dim
        const isAnyVisible = routeIndexes.some((i) =>
          this.visibleRoutes.has(i)
        );
        if (isAnyVisible) {
          clusterFeat.setStyle(undefined);
        } else {
          // dim circle for “hidden” clusters
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

  handleDistance(distance: number) {
    if (distance) {
      const matchedItem = this.nodeSheetData.find(
        (item) => item.node_index === distance
      );

      const matchedOrderId = this.planDetailData.find(
        (item) => item.ORDERID_ORG === matchedItem?.node_name
      );

      const matchedPreOrderData = this.preOrderData.find(
        (item) => item['ORDERID'] === matchedItem?.node_name
      );

      const matchedFC = this.featureRoutes.find((fc: FeatureCollection) =>
        fc.features.some(
          (feature: GeoJSONFeature) => feature.properties.node_index === distance
        )
      );

      let planDetails = null;
      const refactormatchedPreOrderData = {
        ...matchedPreOrderData,
        validation_type: matchedItem?.validation_type,
        replace_type: matchedItem?.replace_type,
        PROVINCE: matchedPreOrderData?.['PROVICE'] || '',
      };

      planDetails = {
        ...refactormatchedPreOrderData,
        details: [refactormatchedPreOrderData],
      };
      const matchedFeatureRoutes = {
        ...matchedFC,
        features: matchedFC?.features.filter(
          (feature: GeoJSONFeature) => feature.properties.node_index === distance
        ) || [],
      };

      if (matchedFC && matchedFeatureRoutes.features && matchedFeatureRoutes.features[0]) {
        const { type, properties, geometry } = matchedFeatureRoutes.features[0];

        planDetails = {
          ORDERID_ORG: properties.name,
          CHANNEL: properties.extra?.channel,
          CUSTOMER_NAME: properties.extra?.customer_name,
          TEL: properties.extra?.tel,
          AUMPHER: properties.original_address?.district,
          PROVINCE: properties.original_address?.province,
          ZIPCODE: properties.original_address?.postal_code,
          ADDRESS: properties.original_address?.address,
          latitude: geometry.coordinates[1],
          longitude: geometry.coordinates[0],

          details: properties.extra?.products_info?.map((product) => ({
            PRODUCTID: product.product_id,
            ORDER_ID: product.order_id,
            PRODUCTNAME: product.product_name,
            QUANTITYMAIN: product.quantity_major,
            QUANTITYMINOR: product.quantity_minor,
            UserConfirm: product.user_confirm,
            DateConfirm: product.date_confirm,
          })),
        };
      } else {
        planDetails = {
          ...refactormatchedPreOrderData,
          details: [refactormatchedPreOrderData],
        };
      }

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

      modalRef.componentInstance.dataPreOder = planDetails;
      modalRef.componentInstance.dataCustomer = planDetails;
      modalRef.componentInstance.isGeolocationDisplay = false;
    }
  }

  splitLatLng(order: Record<string, any>): Record<string, any> {
    if (typeof order['LatLng'] === 'string') {
      const [latStr, lngStr] = order['LatLng'].split(',');
      order['latitude'] = parseFloat(latStr.trim());
      order['longitude'] = parseFloat(lngStr.trim());
    }
    return order;
  }

  async downloadExcelFromUrlAsJson(
    location: string
  ): Promise<PreOrderDataItem[]> {
    try {
      const arrayBuffer = await this.fetchDataFromFileUrl(location);
      const workbook = new Workbook();
      await workbook.xlsx.load(arrayBuffer);

      const worksheet =
        workbook.getWorksheet('PreOrder') || workbook.worksheets[0];
      if (!worksheet) {
        this.toastr.warning('Worksheet "PreOrder" not found');
        return [];
      }

      // build headers
      const headers: string[] = [];
      worksheet.getRow(1).eachCell((cell, colNumber) => {
        headers[colNumber] = cell.text.trim();
      });

      // parse rows
      const result: Record<string, any>[] = [];
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const obj: Record<string, any> = {};
        row.eachCell((cell, colNumber) => {
          const key = headers[colNumber];
          if (key) obj[key] = cell.value;
        });
        result.push(obj);
      });

      const transformed: PreOrderDataItem[] = result.map((r) => this.splitLatLng(r)) as PreOrderDataItem[];

      this.preOrderData = transformed;
      console.log('this.preOrderData', this.preOrderData);
      return transformed;
    } catch (err: unknown) {
      console.error('downloadExcelFromUrlAsJson failed', err);
      this.toastr.error('Failed to fetch or parse PreOrder file');
      return [];
    }
  }
}
