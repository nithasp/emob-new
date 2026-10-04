import { Injectable } from '@angular/core';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import {
  defaults as defaultControls,
  ZoomSlider,
  FullScreen,
  Attribution,
} from 'ol/control';
import * as OlProj from 'ol/proj';
import Feature from 'ol/Feature';
import type { FeatureLike } from 'ol/Feature';
import Point from 'ol/geom/Point';
import Icon from 'ol/style/Icon';
import SimpleGeometry from 'ol/geom/SimpleGeometry';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Overlay from 'ol/Overlay';
import { Coordinate } from 'ol/coordinate';
import MapBrowserEvent from 'ol/MapBrowserEvent';
import OSM from 'ol/source/OSM';
import Style from 'ol/style/Style';
import Text from 'ol/style/Text';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import { logMessage } from '@core/services/logger.service';
import { Customer, Depot } from '../../models/pre-order.model';
import { MyDepot } from '../../models/experiment.model';
import {
  DataGroup,
  DisplayLocationType,
  IconStyle,
  LocationType,
} from '../../models/location.model';

@Injectable()
export class RunMapService {
  private map!: Map;
  private readonly iconStyle: Partial<IconStyle> = {};
  private vectorLayer!: VectorLayer;
  private vectorLayerDepot!: VectorLayer;
  private popUp?: Overlay;
  public popupContent?: { data: Customer; isDepot: boolean } | null;

  readonly vectorSource = new VectorSource({});
  readonly vectorSourceDepot = new VectorSource({});

  initIconStyle() {
    Object.values(LocationType).forEach((type) => {
      const iconLocation = new Style({
        image: new Icon({
          anchor: [0.5, 0.5],
          anchorOrigin: 'bottom-left',
          anchorXUnits: 'fraction',
          anchorYUnits: 'pixels',
          crossOrigin: 'anonymous',
          opacity: 1,
          src: `assets/image/${type}.png`,
        }),
      });

      if (type === LocationType.Verify) {
        iconLocation.getImage()?.setOpacity(0.1);
        this.iconStyle.verify = iconLocation;
      } else if (type === LocationType.Uncertain) {
        this.iconStyle.uncertain = iconLocation;
      } else if (type === LocationType.Unverify) {
        this.iconStyle.unverify = iconLocation;
      } else if (type === LocationType.Edit) {
        this.iconStyle.edit = iconLocation;
      }
    });
  }

  initMap() {
    this.vectorLayer = new VectorLayer({
      source: this.vectorSource,

      updateWhileInteracting: true,
      updateWhileAnimating: true,
    });
    this.vectorLayerDepot = new VectorLayer({
      source: this.vectorSourceDepot,

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
              '&copy;<a href="https://www.openstreetmap.org/copyright"> OpenStreetMap contributors</a>',
            crossOrigin: 'anonymous',
            cacheSize: 10000,
            maxZoom: 20,
          }),
        }),
        this.vectorLayer,
        this.vectorLayerDepot,
      ],
      target: 'map',
      view: new View({
        center: OlProj.transform(
          [100.53139488523458, 13.786463255129673],
          'EPSG:4326',
          'EPSG:3857',
        ),
        zoom: 10,
        maxZoom: 20,
        minZoom: 0,
      }),
      controls: defaultControls({ attribution: false }).extend([
        new ZoomSlider(),
        new FullScreen(),
        attribution,
      ]),
    });

    const element = document.getElementById('popup')!;
    this.popUp = new Overlay({
      element: element,
      positioning: 'top-right',
      offset: [0, -50],
    });
    this.map.addOverlay(this.popUp);
    this.map.getViewport().addEventListener('contextmenu', function (evt) {
      evt.preventDefault();
      logMessage(evt);
    });
    this.map.on('singleclick', (event) => this.popupShow(event));
    this.map.on('pointermove', (event) => this.pointMove(event));
  }

  plotDepots(
    depots: Array<Pick<MyDepot, 'depotName' | 'latitude' | 'longitude'>>,
  ) {
    this.vectorSourceDepot.clear();

    const iconWithLabel = (label: string) =>
      new Style({
        image: new Icon({
          anchor: [0.5, 1],
          anchorOrigin: 'bottom-left',
          anchorXUnits: 'fraction',
          anchorYUnits: 'pixels',
          crossOrigin: 'anonymous',
          opacity: 1,
          scale: 1,
          src: `assets/image/depot.png`,
        }),
        text: new Text({
          text: label,
          offsetY: 25,
          font: '12px Arial',
          fill: new Fill({ color: '#000000' }),
          stroke: new Stroke({ color: '#ffffff', width: 2 }),
        }),
      });

    depots.forEach((depot) => {
      const lon = Number(depot.longitude);
      const lat = Number(depot.latitude);
      const coord = OlProj.fromLonLat([lon, lat]);
      const feature = new Feature({
        geometry: new Point(coord),
        data: { data: depot, isDepot: true },
      });
      feature.setStyle(iconWithLabel(depot.depotName));
      this.vectorSourceDepot.addFeature(feature);
    });
  }

  loadLocation(
    uploadDataGroupCustomers: DataGroup,
    displayLocationType: DisplayLocationType,
  ) {
    this.vectorSource.clear();
    Object.keys(uploadDataGroupCustomers).forEach((key: string) => {
      if (displayLocationType[key as keyof DisplayLocationType]) {
        uploadDataGroupCustomers[key as keyof DataGroup].customers.forEach(
          (customer) => {
            if (customer.latitude && customer.longitude) {
              const location: Feature = new Feature({
                geometry: new Point(
                  OlProj.fromLonLat([
                    Number(customer.longitude),
                    Number(customer.latitude),
                  ]),
                ),

                data: { data: customer, isDepot: false },
              });
              location.setStyle(
                this.iconStyle[
                  uploadDataGroupCustomers[key as keyof DataGroup].type
                ],
              );
              this.vectorSource.addFeature(location);
            }
          },
        );
      }
    });
  }

  closePopupMapShow() {
    this.popUp?.setPosition(undefined);
    const closer = document.getElementById('popup-closer');
    closer?.blur();
  }

  private pointMove(
    evt: MapBrowserEvent<PointerEvent | KeyboardEvent | WheelEvent>,
  ): void {
    const target = this.map.getTargetElement();
    const pixel = this.map.getEventPixel(evt.originalEvent);
    const hit = this.map.hasFeatureAtPixel(pixel);

    if (hit) {
      target.style.cursor = 'pointer';
    } else {
      target.style.cursor = '';
    }
  }

  private popupShow(
    evt: MapBrowserEvent<PointerEvent | KeyboardEvent | WheelEvent>,
  ) {
    let coordinates: Coordinate = [];
    const feature = this.map.forEachFeatureAtPixel(
      evt.pixel,
      (f: FeatureLike) => f,
    );
    if (feature) {
      const geometry = feature.getGeometry();
      if (geometry instanceof SimpleGeometry) {
        const flat = geometry.getFlatCoordinates();
        coordinates = [flat[0], flat[1]] as Coordinate;
      } else {
        coordinates = [];
      }
      this.popUp?.setPosition(coordinates);
      if (feature instanceof Feature) {
        const raw = feature.get('data');
        this.popupContent = this.isPopupPayload(raw) ? raw : null;
      } else {
        this.popupContent = null;
      }
    } else {
      this.popUp?.setPosition(undefined);
    }
  }

  private isPopupPayload(
    value:
      | {
          data?:
            | Customer
            | Depot
            | MyDepot
            | Pick<MyDepot, 'depotName' | 'latitude' | 'longitude'>;
          isDepot?: boolean;
        }
      | null
      | undefined,
  ): value is { data: Customer; isDepot: boolean } {
    if (!value || typeof value !== 'object') return false;
    return 'data' in value && 'isDepot' in value;
  }

  /** The delay waits for the 0.3s slide transition of the map column to end. */
  refreshSize(): void {
    setTimeout(() => this.map?.updateSize(), 350);
  }
}
