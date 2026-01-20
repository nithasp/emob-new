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
  NodeSheet,
  PlanDetail,
  RouteInfo,
  PopupContent,
  ProductInfo,
  PreOrderData,
  GeoJSONFeatureCollection,
  GeoJSONFeature,
  PlanDetailsData,
  PointDetail,
} from 'src/app/models/experiment.model';
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
  @Input() nodeSheetData: NodeSheet[] = [];
  @Input() planDetailData: PlanDetail[] = [];
  @Input() preOrderData: PreOrderData[] = [];
  @Input() featureRoutes: GeoJSONFeatureCollection[] = [];

  private map!: Map;
  public popUp?: Overlay;
  public popupContent?: PopupContent;
  private highlightedFeatureCollectionId: number | null = null;

  public pointDetails: PointDetail[] = [];

  constructor(
    private readonly ngbActiveModal: NgbActiveModal,
    private readonly ngbModal: NgbModal
  ) {}

  ngOnInit(): void {
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
  }
  styleFunction(feature: FeatureLike): Style | Style[] | undefined {
    const geometryType = feature.getGeometry()!.getType();
    const text = feature.getProperties()['route_order'] as string;
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
      const props = f.getProperties();
      return {
        route_order: props['route_order'],
        name: props['name'],
        weight: props['weight'],
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

  handleDistance(distance: number): void {
    if (distance) {
      const matchedItem = this.nodeSheetData.find(
        (item) => item.node_index === distance
      );

      const matchedPreOrderData = this.preOrderData.find(
        (item) => item.ORDERID === matchedItem?.node_name
      );

      const matchedFC = this.featureRoutes.find((fc) =>
        fc.features.some(
          (feature: GeoJSONFeature) =>
            feature.properties.node_index === distance
        )
      );

      let planDetails: PlanDetailsData | null = null;
      const refactormatchedPreOrderData: PreOrderData = {
        ...matchedPreOrderData,
        validation_type: matchedItem?.validation_type,
        replace_type: matchedItem?.replace_type,
        PROVINCE: matchedPreOrderData?.PROVICE || '',
      };

      const matchedFeatureRoutes = matchedFC
        ? {
            ...matchedFC,
            features: matchedFC.features.filter(
              (feature: GeoJSONFeature) =>
                feature.properties.node_index === distance
            ),
          }
        : null;

      if (
        matchedFeatureRoutes &&
        matchedFeatureRoutes.features &&
        matchedFeatureRoutes.features.length > 0
      ) {
        const { properties, geometry } = matchedFeatureRoutes.features[0];
        planDetails = {
          ORDERID: properties.name || '',
          ORDERID_ORG: properties.name,
          CHANNEL: properties.extra?.channel,
          CUSTOMER_NAME: properties.extra?.customer_name,
          TEL: properties.extra?.tel,
          AUMPHER: properties.original_address?.district,
          PROVINCE: properties.original_address?.province,
          ZIPCODE: properties.original_address?.postal_code,
          ADDRESS: properties.original_address?.address,
          latitude: (geometry.coordinates as number[])[1],
          longitude: (geometry.coordinates as number[])[0],
          details:
            properties.extra?.products_info?.map((product: ProductInfo) => ({
              ...product,
              ORDERID: product.order_id,
              PRODUCTID: product.product_id,
              ORDER_ID: product.order_id,
              PRODUCTNAME: product.product_name,
              QUANTITYMAIN: product.quantity_major,
              QUANTITYMINOR: product.quantity_minor,
              UserConfirm: product.user_confirm,
              DateConfirm: product.date_confirm,
            })) || [],
        };
      } else {
        planDetails = {
          ...refactormatchedPreOrderData,
          details: [refactormatchedPreOrderData as PreOrderData & ProductInfo],
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

  splitLatLng(order: PreOrderData): PreOrderData {
    if (typeof order.LatLng === 'string') {
      const [latStr, lngStr] = order.LatLng.split(',');
      order.latitude = parseFloat(latStr.trim());
      order.longitude = parseFloat(lngStr.trim());
    }
    return order;
  }
}
