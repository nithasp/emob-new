import { inject, Injectable } from '@angular/core';
import { Fill, Stroke, Text } from 'ol/style';
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
import { Geometry, LineString, Point } from 'ol/geom';
import { DragPan, defaults as defaultInteractions, MouseWheelZoom } from 'ol/interaction';
import Tile from 'ol/Tile';
import TileState from 'ol/TileState';
import ImageTile from 'ol/ImageTile';
import { Cluster } from 'ol/source';
import CircleStyle from 'ol/style/Circle';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { LoggerService } from '@core/services/logger.service';
import { DialogMapDetailsComponent } from '../dialogs/dialog-map-details/dialog-map-details.component';
import {
  RouteInfo,
  FeatureCollection,
  GeoJSONFeature,
  PopupContent,
  MapPointerBrowserEvent,
  RouteMetric,
  VrpGeoJsonData,
} from '../../models/location.model';
import { ResultPlanService } from './result-plan.service';

@Injectable()
export class ResultMapService {
  private readonly logger = inject(LoggerService);

  public map!: Map;
  public popUp?: Overlay;
  public popupContent?: PopupContent;
  private highlightedFeatureCollectionId: number | null = null;
  private featureCollections: FeatureCollection[] = [];
  private featureDepots: FeatureCollection[] = [];
  public mapAlreadyRendered: boolean = false;
  vectorLayer!: VectorLayer;
  clusterLayer!: VectorLayer;
  visibleRoutes = new Set<number>();

  private readonly dimStyle = new Style({
    stroke: new Stroke({
      color: 'rgba(0, 0, 0, 0.1)',
      width: 3,
    }),
  });

  constructor(
    private readonly ngbModal: NgbModal,
    private readonly plan: ResultPlanService,
  ) {}

  loadAndProcessGeoJSON(): void {
    const geoJson: VrpGeoJsonData = JSON.parse(
      JSON.stringify(this.plan.geoJsonRawData)
    );

    this.enrichGeoJsonData(geoJson);

    this.featureCollections = (geoJson.routes ?? []).map(
      (rc: FeatureCollection) => ({
        ...rc,
        routeIndex: rc.features[0]?.properties?.routeIndex,
      })
    );

    this.featureDepots = (geoJson.depots ?? []).map((depot: GeoJSONFeature) => ({
      type: 'FeatureCollection',
      features: [depot],
    }));

    const allFeatures: Feature<Geometry>[] = [];
    (geoJson.routes ?? []).forEach((item: FeatureCollection) => {
      const itemFeatures = new GeoJSON().readFeatures(item, {
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:3857',
      });

      const reducedItemFeatures = itemFeatures.map((feature) => {
        const geometry = feature.getGeometry();
        if (geometry?.getType() === 'LineString') {
          const lineString = geometry as LineString;
          const coordinates = lineString.getCoordinates();
          const reducedCoordinates = coordinates.filter((_, i) => i % 10 === 0);
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
          return feature.getGeometry()?.getType() === 'Point' && !feature.get('isDepot');
        }),
      }),
    });
    const vectorSource = new VectorSource({
      features: allFeatures.filter((feature) => {
        return feature.getGeometry()?.getType() !== 'Point';
      }),
    });
    const clusterLayer = new VectorLayer({
      source: clusterSource,
      style: this.clusterStyleFunction.bind(this),
    });

    const depotFeatures: Feature<Geometry>[] = [];
    (geoJson.depots ?? []).forEach((depot: GeoJSONFeature) => {
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

  private enrichGeoJsonData(geoJson: VrpGeoJsonData): void {
    const routeMetricsMap: Record<number, RouteMetric> = {};
    (this.plan.vrpSolutionData?.solutionMetrics?.routeMetrics ?? []).forEach(
      (rm: RouteMetric) => {
        if (rm?.routeIndex != null) routeMetricsMap[rm.routeIndex] = rm;
      }
    );

    geoJson.depots?.forEach((depot: GeoJSONFeature) => {
      const nodeId = depot.properties?.nodeId;
      const node = nodeId ? this.plan.routingNodesByIdMap[nodeId] : undefined;
      if (node) {
        depot.properties = {
          ...depot.properties,
          isDepot: true,
          depotId: node.nodeId,
          name: node.name,
          nodeIndex: node.index,
        };
      }
    });

    geoJson.routes?.forEach((route: FeatureCollection) => {
      let routeMetric: RouteMetric | undefined;

      route.features?.forEach((feature: GeoJSONFeature) => {
        if (feature.geometry?.type === 'LineString') {
          const routeIdx = feature.properties?.routeIndex ?? 0;
          routeMetric = routeMetricsMap[routeIdx];

          const customerNodes = routeMetric?.routeNodes?.slice(1, -1) ?? [];
          const zones = [
            ...new Set(
              customerNodes
                .map((idx: number) => this.plan.routingNodesMap[idx]?.zone)
                .filter((z: string | undefined): z is string => !!z)
            ),
          ];

          feature.properties = {
            ...feature.properties,
            routeIndex: feature.properties?.routeIndex,
            routeLabel: feature.properties?.routeLabel,
            distance: routeMetric?.routeDistance ?? 0,
            duration: routeMetric?.routeDuration ?? 0,
            weight: routeMetric?.routeWeight ?? 0,
            numCustomers: routeMetric?.customerCount ?? 0,
            zone: zones.join(', '),
            serviceDuration: routeMetric?.routeServiceDuration ?? 0,
            travelDuration: routeMetric?.routeTravelDuration ?? 0,
          };
        } else if (feature.geometry?.type === 'Point') {
          const nodeId = feature.properties?.nodeId;
          const node = nodeId ? this.plan.routingNodesByIdMap[nodeId] : undefined;
          if (node) {
            let routeOrder = 0;
            if (routeMetric?.routeNodes && node.index != null) {
              routeOrder = routeMetric.routeNodes.indexOf(node.index);
              if (routeOrder < 0) routeOrder = 0;
            }

            feature.properties = {
              ...feature.properties,
              nodeIndex: node.index,
              name: node.name,
              weight: node.deliveryWeight ?? 0,
              isDepot: node.isDepot ?? false,
              routeOrder: routeOrder,
              routeIndex: routeMetric?.routeIndex ?? 0,
              routeLabel: routeMetric?.routeLabel ?? 0,
              originalAddress: node.originalAddress,
            };
          }
        }
      });
    });
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
              this.logger.error('Tile load error', err);
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

    this.map.on('pointermove', (event: MapPointerBrowserEvent) =>
      this.handlePointerMove(event)
    );
    this.map.on('click', (event: MapPointerBrowserEvent) =>
      this.handleClick(event)
    );

    const element = document.getElementById('popupMapResult')!;
    this.popUp = new Overlay({
      element: element,
      offset: [0, -30],
    });
    this.map.addOverlay(this.popUp);
  }

  handlePointerMove(event: MapPointerBrowserEvent): void {
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
        this.popupContent = (
          props['features'][0] as FeatureLike
        ).getProperties();
      } else {
        this.popupContent = props;
      }
    } else {
      this.popUp?.setPosition(undefined);
    }

    if (feature && feature.getGeometry()?.getType() === 'LineString') {
      this.highlightedFeatureCollectionId = feature.get(
        'routeIndex'
      ) as number;
    } else if (feature && feature.get('features')) {
      const members = feature.get('features') as FeatureLike[];
      this.highlightedFeatureCollectionId =
        (members[0]?.get('routeIndex') as number) || null;
    } else {
      this.highlightedFeatureCollectionId = null;
    }

    const hoverId = this.highlightedFeatureCollectionId;
    if (hoverId != null) {
      this.vectorLayer
        .getSource()!
        .getFeatures()
        .forEach((feat) => {
          if (feat.get('routeIndex') === hoverId) {
            feat.setStyle(undefined);
          }
        });

      this.clusterLayer
        .getSource()!
        .getFeatures()
        .forEach((clusterFeat) => {
          const members = clusterFeat.get('features') as FeatureLike[];
          if (members.some((m) => m.get('routeIndex') === hoverId)) {
            clusterFeat.setStyle(undefined);
          }
        });
    }

    this.vectorLayer.getSource()?.changed();
    this.clusterLayer.getSource()?.changed();

    this.pointMove(event);
  }

  handleClick(event: MapPointerBrowserEvent): void {
    const feature = this.map.forEachFeatureAtPixel(
      event.pixel,
      (feat: FeatureLike) => feat
    );
    if (!feature || feature.getGeometry()?.getType() !== 'LineString') {
      return;
    }

    const routeIndex: number | undefined =
      feature.getProperties()['routeIndex'] as number | undefined;
    if (routeIndex == null) {
      this.logger.error('Clicked LineString has no routeIndex');
      return;
    }

    this.openRouteDetails(routeIndex);
  }

  private pointMove(evt: MapPointerBrowserEvent): void {
    const target = this.map.getTargetElement();
    const pixel = this.map.getEventPixel(evt.originalEvent);
    const hit = this.map.hasFeatureAtPixel(pixel);

    if (hit) {
      target.style.cursor = 'pointer';
    } else {
      target.style.cursor = '';
    }
  }

  styleFunction(feature: FeatureLike): Style | Style[] {
    const geom = feature.getGeometry();
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
          text: feature.get('name')?.toString() || '',
          font: '12px Calibri,sans-serif',
          fill: new Fill({ color: '#000' }),
        }),
      });
    }

    const idx = feature.get('routeIndex') as number;
    const color = feature.get('color') as string;
    const hovered = this.highlightedFeatureCollectionId;

    if (hovered != null) {
      if (idx === hovered) {
        return new Style({
          stroke: new Stroke({ color: '#04948c', width: 6 }),
        });
      }
      return [];
    }

    if (this.visibleRoutes.size > 0) {
      if (!this.visibleRoutes.has(idx)) {
        return this.dimStyle;
      }
      return new Style({
        stroke: new Stroke({ color, width: 3 }),
      });
    }

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
    const idxs = members.map((m) => m.get('routeIndex') as number);
    const baseColor = (members[0].get('color') as string) || '#3399CC';
    const orderTxt = String(members[0].get('routeOrder') || '');

    const hovered = this.highlightedFeatureCollectionId;

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
      return [];
    }

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

  applyMapFilter() {
    const visibleRoutesArr = (
      this.plan.dataRouteInfo.filteredData as RouteInfo[]
    ).map((r) => r.routeIndex);
    this.visibleRoutes = new Set(visibleRoutesArr);

    this.vectorLayer
      .getSource()!
      .getFeatures()
      .forEach((feat) => {
        if (feat.getGeometry()?.getType() === 'LineString') {
          const idx = feat.get('routeIndex') as number;
          if (!this.visibleRoutes.has(idx)) {
            feat.setStyle(this.dimStyle);
          } else {
            feat.setStyle(undefined);
          }
        }
      });

    this.clusterLayer
      .getSource()!
      .getFeatures()
      .forEach((clusterFeat) => {
        const members = clusterFeat.get('features') as FeatureLike[];
        const routeIndexes = members.map((m) => m.get('routeIndex') as number);
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
                text: String(members[0].get('routeOrder') || ''),
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

  resetRouteMapUi(): void {
    this.highlightedFeatureCollectionId = null;

    const vectorLayer = this.map.getLayers().item(1) as VectorLayer;
    const clusterLayer = this.map.getLayers().item(2) as VectorLayer;

    vectorLayer.getSource()?.changed();
    clusterLayer.getSource()?.changed();

    this.popUp?.setPosition(undefined);
    this.popupContent = undefined;
  }

  onMouseEnter(row: RouteInfo) {
    if (!this.mapAlreadyRendered) return;
    this.logger.log('Mouse entered row:', row);

    this.highlightedFeatureCollectionId = row.routeIndex;
    const vectorLayer = this.map.getLayers()?.item(1) as VectorLayer;
    vectorLayer.getSource()?.changed();
    const clusterLayer = this.map.getLayers()?.item(2) as VectorLayer;
    clusterLayer.getSource()?.changed();
  }

  onMouseLeave(row: RouteInfo) {
    if (!this.mapAlreadyRendered) return;
    this.logger.log('Mouse left row:', row);
    this.highlightedFeatureCollectionId = null;
    const vectorLayer = this.map.getLayers()?.item(1) as VectorLayer;
    vectorLayer.getSource()?.changed();
    const clusterLayer = this.map.getLayers()?.item(2) as VectorLayer;
    clusterLayer.getSource()?.changed();
  }

  openRouteDetails(routeIndex: number): void {
    this.plan.routeInfoDetails =
      this.plan.dataRouteInfo.data.find((r) => r.routeIndex === routeIndex) || null;

    const collection = this.featureCollections.find(
      (fc: FeatureCollection) => fc.routeIndex === routeIndex
    );

    if (!collection) {
      this.logger.error(`No route found for index ${routeIndex}`);
      return;
    }

    if (!this.featureDepots || !Array.isArray(this.featureDepots) || this.featureDepots.length === 0) {
      this.logger.error('featureDepots is not properly initialized');
      return;
    }

    const featureDepots = [...this.featureDepots];
    this.openModal(collection, featureDepots);
  }

  openModal(
    featureCollection: FeatureCollection,
    featureDepots: FeatureCollection[]
  ): void {
    const modalRef = this.ngbModal.open(DialogMapDetailsComponent, {
      size: 'xl',
      centered: true,
      windowClass: 'custom-modal-width',
      modalDialogClass: 'custom-modal-content',
    });

    modalRef.componentInstance.featureCollection = featureCollection;
    modalRef.componentInstance.featureDepots = featureDepots;
    modalRef.componentInstance.routeInfo = this.plan.routeInfoDetails;
    modalRef.componentInstance.routingNodes = this.plan.routingNodes;
  }
}
