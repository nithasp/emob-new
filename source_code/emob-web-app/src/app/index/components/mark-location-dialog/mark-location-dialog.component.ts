import { Component, OnInit, AfterViewInit, Input } from '@angular/core';
import Map from 'ol/Map';
import * as OlProj from 'ol/proj';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import { fromLonLat } from 'ol/proj';
import OSM from 'ol/source/OSM';
import { Feature, Overlay, MapBrowserEvent } from 'ol';
import { XYZ } from 'ol/source';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import {
  defaults as defaultControls,
  FullScreen,
  Attribution,
  ZoomSlider,
} from 'ol/control';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Icon, Style } from 'ol/style';
import { Point } from 'ol/geom';
import { Location } from 'src/app/models/location.model';
@Component({
  selector: 'app-mark-location-dialog',
  templateUrl: './mark-location-dialog.component.html',
  styleUrl: './mark-location-dialog.component.scss',
})
export class MarkLocationDialogComponent implements OnInit, AfterViewInit {
  popupContent: string = '';
  attribution!: Attribution;
  source!: XYZ;
  view!: View;
  marker!: Overlay;
  private map!: Map;
  iconLocation!: Style;
  isEditLocation: boolean = false;
  messageError!: boolean;
  vectorSource!: VectorSource;
  vectorLayer!: VectorLayer;

  @Input() location!: Location;
  @Input() address: string | null = null;
  constructor(private readonly activeModal: NgbActiveModal) {}

  ngOnInit() {}
  ngAfterViewInit() {
    this.vectorSource = new VectorSource({});
    this.vectorLayer = new VectorLayer({
      source: this.vectorSource,

      updateWhileInteracting: true,
      updateWhileAnimating: true,
    });
    this.initIconStyle();
    this.initMap();

    this.map.on('singleclick', (event) => this.markerMap(event));
    this.setLocation();
  }

  private initMap() {
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
      ],
      target: 'markLocationMap',
      view: new View({
        center: OlProj.transform(
          [Number(this.location.longitude), Number(this.location.latitude)],
          'EPSG:4326',
          'EPSG:3857'
        ),
        zoom: 17,
        maxZoom: 20,
        minZoom: 0,
      }),
      controls: defaultControls({ attribution: false }).extend([
        new ZoomSlider(),
        new FullScreen(),
        attribution,
      ]),
    });
  }
  async markerMap(event: MapBrowserEvent<UIEvent>): Promise<void> {
    const coords: number[] = OlProj.toLonLat(event.coordinate);
    const lat: number = coords[1];
    const lon: number = coords[0];
    console.log('Mark latlong:', coords);
    this.isEditLocation = true;
    this.location.latitude = lat;
    this.location.longitude = lon;
    this.setLocation();
  }
  private setLocation() {
    this.vectorSource.clear();

    console.log('setLocation', this.location);
    const location: Feature = new Feature({
      geometry: new Point(
        OlProj.fromLonLat([
          Number(this.location.longitude),
          Number(this.location.latitude),
        ])
      ),
    });
    location.setStyle(this.iconLocation);
    this.vectorSource.addFeature(location);
  }
  private initIconStyle() {
    this.iconLocation = new Style({
      image: new Icon({
        anchor: [0.5, 0.5],
        anchorOrigin: 'bottom-left',
        anchorXUnits: 'fraction',
        anchorYUnits: 'pixels',
        crossOrigin: 'anonymous',
        opacity: 1,
        src: `assets/image/position.png`,
      }),
    });
  }

  updateLocation() {
    this.isEditLocation = true;
    this.setLocation();
  }

  closeLocation() {
    if (!this.isEditLocation) {
      this.messageError = true;
      return;
    }

    this.activeModal.close(this.location);
  }

  cancel() {
    this.activeModal.close(null);
  }
}
