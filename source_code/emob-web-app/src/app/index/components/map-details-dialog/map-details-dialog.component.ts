import { Component, Input, OnInit, AfterViewInit } from '@angular/core';
import { OSM, Vector as VectorSource } from 'ol/source';
import { Vector as VectorLayer } from 'ol/layer';
import { GeoJSON } from 'ol/format';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Map, Overlay, View } from 'ol';
import { LineString, Point } from 'ol/geom';
import {
  Attribution,
  FullScreen,
  ZoomSlider,
  defaults as defaultControls,
} from 'ol/control';
import TileLayer from 'ol/layer/Tile';
import * as OlProj from 'ol/proj';
import {
  DragPan,
  MouseWheelZoom,
  defaults as defaultInteractions,
} from 'ol/interaction';
import { FeatureLike } from 'ol/Feature';
import { Fill, Icon, Stroke, Style, Text } from 'ol/style';
import CircleStyle from 'ol/style/Circle';
import { Coordinate } from 'ol/coordinate';
import { CustomerDetailsComponent } from '../customer-details/customer-details.component';
import {
  RouteInfo,
  PopupContent,
  GeoJSONFeatureCollection,
  PointDetail,
} from 'src/app/models/experiment.model';
import { FeatureProperties } from 'src/app/models/location.model';
import { MapBrowserEvent } from 'ol';

@Component({
  selector: 'app-map-details-dialog',
  templateUrl: './map-details-dialog.component.html',
  styleUrl: './map-details-dialog.component.scss',
})
export class MapDetailsDialogComponent implements OnInit, AfterViewInit {
  @Input() routeInfo!: RouteInfo;
  @Input() featureCollection: GeoJSONFeatureCollection | null = null;
  @Input() featureDepots: GeoJSONFeatureCollection[] = [];
  @Input() routingNodes: any[] = [];

  private routingNodesMap: Record<number, any> = {};
  private routingNodesByIdMap: Record<string, any> = {};

  private map!: Map;
  public popUp?: Overlay;
  public popupContent?: PopupContent | FeatureProperties;
  private highlightedFeatureCollectionId: number | null = null;

  public pointDetails: PointDetail[] = [];

  constructor(
    private readonly ngbActiveModal: NgbActiveModal,
    private readonly ngbModal: NgbModal
  ) {}

  ngOnInit(): void {
    this.routingNodes.forEach((node: any) => {
      if (node?.index != null) this.routingNodesMap[node.index] = node;
      if (node?.nodeId) this.routingNodesByIdMap[node.nodeId] = node;
    });
    this.getDepotDetailsPoint();
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.loadAndProcessGeoJSON(this.featureCollection, this.featureDepots);
    });
  }

  loadAndProcessGeoJSON(
    item: GeoJSONFeatureCollection | null,
    depots: GeoJSONFeatureCollection[]
  ): void {
    if (!item) {
      return;
    }

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
        const reducedCoordinates = coordinates.filter((_, i) => i % 2 === 0); // Keep every other coordinate
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

    const vectorSource = new VectorSource({
      features: [...reducedItemFeatures],
    });

    // mapping depots for features
    depots.forEach((depot: GeoJSONFeatureCollection) => {
      const features = new GeoJSON().readFeatures(depot, {
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:3857',
      });
      vectorSource.addFeatures(features);
    });

    this.initMap(vectorSource);
  }

  private initMap(vectorSource: VectorSource) {
    const vectorLayer = new VectorLayer({
      source: vectorSource,
      style: this.styleFunction.bind(this),
      updateWhileInteracting: true,
      updateWhileAnimating: true,
    });
    const attribution = new Attribution({
      collapsible: true,
    });
    this.map = new Map({
      layers: [
        new TileLayer({
          source: new OSM({
            attributions:
              '&copy;<a href="https://www.openstreetmap.org/copyright" target="_blank"> OpenStreetMap contributors</a>',
            crossOrigin: 'anonymous',
          }),
        }),
        vectorLayer,
      ],
      target: 'modalMap',
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

    // Initialize overlay for popup
    const element = document.getElementById('popupMapDeatils')!;
    this.popUp = new Overlay({
      element: element,
      offset: [0, -30],
    });
    this.map.addOverlay(this.popUp);
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
  handlePointerMove(event: MapBrowserEvent<UIEvent>): void {
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
      const properties = feature.getProperties() as FeatureProperties;
      if (properties.features && properties.features.length > 0) {
        const nestedFeatureProperties =
          properties.features[0].getProperties();
        this.popupContent = nestedFeatureProperties as FeatureProperties;
      } else {
        this.popupContent = properties;
      }
      console.log(this.popupContent);
    } else {
      this.popUp?.setPosition(undefined);
    }

    if (feature && feature.getGeometry()?.getType() === 'LineString') {
      const properties = feature.getProperties() as FeatureProperties;
      this.highlightedFeatureCollectionId = properties.route_index || null;
    } else {
      this.highlightedFeatureCollectionId = null;
    }
    const vectorLayer = this.map.getLayers()?.item(1) as VectorLayer;
    vectorLayer.getSource()?.changed();
  }
  styleFunction(feature: FeatureLike): Style | Style[] | undefined {
    const geometryType = feature.getGeometry()!.getType();
    const text = String(feature.getProperties()['route_order'] ?? '');
    const isDepot = feature.getProperties()['is_depot'] as boolean;

    switch (geometryType) {
      case 'Point':
        if (isDepot) {
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
          });
        } else
          return new Style({
            image: new CircleStyle({
              radius: 15,
              fill: new Fill({
                color: '#242484',
              }),
              stroke: new Stroke({
                color: '#fff',
                width: 3,
              }),
            }),
            text: new Text({
              text: text,
              font: '15px  Calibri,sans-serif',
              fill: new Fill({
                color: '#fff',
              }),
            }),
          });
      case 'LineString':
        return new Style({
          stroke: new Stroke({
            color: '#04948c',
            width: 7,
          }),
        });
      default:
        return undefined;
    }
  }

  close(): void {
    this.ngbActiveModal.dismiss(false);
  }

  getDepotDetailsPoint(): void {
    if (!this.featureCollection) {
      return;
    }

    const allFeatures = new GeoJSON().readFeatures(this.featureCollection, {
      dataProjection: 'EPSG:4326',
      featureProjection: 'EPSG:3857',
    });

    const pointFeatures = allFeatures.filter(
      (f) => f.getGeometry()?.getType() === 'Point'
    );

    this.pointDetails = pointFeatures.map((f) => {
      const props = f.getProperties() as FeatureProperties;
      return {
        route_order: props.route_order || 0,
        name: props.name || '',
        weight: props.weight || 0,
      };
    });
  }

  sortedPointDetails() {
    return [...this.pointDetails].sort((a, b) => a.route_order - b.route_order);
  }

  handlePointClick(pointDetail: PointDetail): void {
    if (!this.featureCollection) {
      return;
    }

    // Find the node_index from the featureCollection based on the point name
    const allFeatures = new GeoJSON().readFeatures(this.featureCollection, {
      dataProjection: 'EPSG:4326',
      featureProjection: 'EPSG:3857',
    });

    const pointFeature = allFeatures.find((f) => {
      if (f.getGeometry()?.getType() === 'Point') {
        const props = f.getProperties();
        return (
          props['name'] === pointDetail.name &&
          props['route_order'] === pointDetail.route_order
        );
      }
      return false;
    });

    if (!pointFeature) {
      console.warn('Point feature not found for:', pointDetail);
      return;
    }

    const nodeIndex = pointFeature.getProperties()['node_index'];
    if (!nodeIndex) {
      console.warn('node_index not found for point:', pointDetail);
      return;
    }

    this.handleDistance(nodeIndex);
  }

  handleDistance(nodeIndex: number): void {
    if (!nodeIndex) return;

    const matchedItem = this.routingNodesMap[nodeIndex];
    if (!matchedItem) return;

    const planDetails = {
      ORDERID_ORG: matchedItem?.nodeId ?? '',
      CHANNEL: matchedItem?.additionalProperties?.channel ?? '',
      CUSTOMER_NAME: matchedItem?.name ?? '',
      TEL: matchedItem?.additionalProperties?.telephone?.toString() ?? '',
      AUMPHER: matchedItem?.originalAddress?.district ?? '',
      PROVINCE: matchedItem?.originalAddress?.province ?? '',
      ZIPCODE: matchedItem?.originalAddress?.postalCode ?? '',
      ADDRESS: matchedItem?.originalAddress?.address ?? '',
      latitude: matchedItem?.latitude ?? 0,
      longitude: matchedItem?.longitude ?? 0,
      details:
        matchedItem?.productQuantity?.map((product: any) => ({
          PRODUCTID: product?.productId ?? '',
          ORDER_ID: product?.skuCode ?? '',
          PRODUCTNAME: product?.name ?? '',
          QUANTITYMAIN: product?.productQuantity ?? 0,
        })) ?? [],
    };

    const modalRef = this.ngbModal.open(CustomerDetailsComponent, {
      centered: true,
      size: 'xl',
      animation: true,
      backdrop: 'static',
      keyboard: false,
      beforeDismiss: () => false,
    });

    modalRef.componentInstance.dataPreOder = planDetails;
    modalRef.componentInstance.dataCustomer = planDetails;
    modalRef.componentInstance.isGeolocationDisplay = false;
  }
}
