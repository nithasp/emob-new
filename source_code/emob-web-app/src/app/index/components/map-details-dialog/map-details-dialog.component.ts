import { Component, Input, OnInit } from '@angular/core';
import { fromLonLat } from 'ol/proj';
import { Vector as VectorSource, XYZ } from 'ol/source';
import { Vector as VectorLayer } from 'ol/layer';
import { GeoJSON } from 'ol/format';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Map, View } from 'ol';
import { Circle, LineString } from 'ol/geom';
import { Attribution, FullScreen, ZoomSlider,defaults as defaultControls, } from 'ol/control';
import TileLayer from 'ol/layer/Tile';
import * as OlProj from 'ol/proj';
import { DragPan, MouseWheelZoom,defaults as defaultInteractions, } from 'ol/interaction';
import { FeatureLike } from 'ol/Feature';
import { Fill, Stroke, Style, Text } from 'ol/style';
import CircleStyle from 'ol/style/Circle';
@Component({
  selector: 'app-map-details-dialog',
  templateUrl: './map-details-dialog.component.html',
  styleUrl: './map-details-dialog.component.scss'
})
export class MapDetailsDialogComponent implements OnInit {
  @Input() featureCollection: any;

  private map!: Map;

  constructor(private readonly ngbActiveModal: NgbActiveModal) {}
  ngOnInit(): void {
    console.log(this.featureCollection);
    this.loadAndProcessGeoJSON(this.featureCollection);
  }

  loadAndProcessGeoJSON(item:any): void {
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
              (_, i) => i % 2 === 0
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

      const vectorSource = new VectorSource({
        features: [...reducedItemFeatures]
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
          source: new XYZ({
            url: 'https://{a-d}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
            attributions:
              '&copy;<a href="https://carto.com" "> CARTO</a>' +
              '&copy;<a href="http://openmaptiles.org/" > OpenMapTiles</a>' +
              '&copy;<a href="https://www.openstreetmap.org/copyright"> OpenStreetMap contributors</a>',
            crossOrigin: 'anonymous',
          }),
        }),
        vectorLayer,
      ],
      target: 'modalMap',
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
    
  }
  styleFunction(feature: FeatureLike): Style | Style[] | undefined{
    const geometryType = feature.getGeometry()!.getType();
    const color = feature.getProperties()['color'];
    const text = feature.getProperties()['route_order'];

    switch (geometryType) {
      case 'Point':
        return new Style({
          image: new CircleStyle({
            radius: text ? 15 : 20,
            fill: new Fill({
              color: text ? '#ffcc33' : '#000000',
            }),
            stroke: new Stroke({
              color: '#fff',
              width: 3,
            }),
          }),
          text: new Text({
            text: text ? text : 'Depot',
            font: text ? '12px  Calibri,sans-serif' :'normal small-caps bold 12px Calibri,sans-serif',
            fill: new Fill({
              color: '#fff',
            }),
          }),
        });
      case 'LineString':
      
          return new Style({
            stroke: new Stroke({
              color: color,
              width: 7
            })
          });
      default:
        return undefined;
    }
  }

  close(): void {
    this.ngbActiveModal.dismiss(false);
  }
}