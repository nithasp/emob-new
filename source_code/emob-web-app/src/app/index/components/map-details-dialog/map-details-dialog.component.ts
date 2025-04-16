import { Component, Input, OnInit } from '@angular/core';
import { fromLonLat } from 'ol/proj';
import { Vector as VectorSource, XYZ } from 'ol/source';
import { Vector as VectorLayer } from 'ol/layer';
import { GeoJSON } from 'ol/format';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Map, Overlay, View } from 'ol';
import { Circle, LineString, Point } from 'ol/geom';
import { Attribution, FullScreen, ZoomSlider,defaults as defaultControls, } from 'ol/control';
import TileLayer from 'ol/layer/Tile';
import * as OlProj from 'ol/proj';
import { DragPan, MouseWheelZoom,defaults as defaultInteractions, } from 'ol/interaction';
import { FeatureLike } from 'ol/Feature';
import { Fill, Icon, Stroke, Style, Text } from 'ol/style';
import CircleStyle from 'ol/style/Circle';
import { Coordinate } from 'ol/coordinate';
@Component({
  selector: 'app-map-details-dialog',
  templateUrl: './map-details-dialog.component.html',
  styleUrl: './map-details-dialog.component.scss'
})
export class MapDetailsDialogComponent implements OnInit {
  @Input() featureCollection: any;
  @Input() featureDepots: any[] =[];
  private map!: Map;
  public popUp?: Overlay;
  public popupContent?: any;
  private highlightedFeatureCollectionId:number|null = null;

  constructor(private readonly ngbActiveModal: NgbActiveModal) {}
  ngOnInit(): void {
    console.log(this.featureCollection);
    this.loadAndProcessGeoJSON(this.featureCollection,this.featureDepots);
  }

  loadAndProcessGeoJSON(item:any,depots:any[]): void {
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

    // mapping depots for features
    depots.forEach((depot: any) => {
      const features = new GeoJSON().readFeatures(depot, {
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:3857',
      });
    vectorSource.addFeatures(features);
      
    })

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
        center: OlProj.fromLonLat([ 100.53139488523458,13.786463255129673]),
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
      offset: [0, -20],
    });
    this.map.addOverlay(this.popUp);
    
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
  }
  styleFunction(feature: FeatureLike): Style | Style[] | undefined{
    const geometryType = feature.getGeometry()!.getType();
    const color = feature.getProperties()['color'] as string;
    const text = feature.getProperties()['route_order'] as string;
    const isDepot = feature.getProperties()['is_depot'] as boolean;

    switch (geometryType) {
      case 'Point':
        if(isDepot){
          return new Style({
            image: new Icon({
              anchor: [0.5, 0.5],
              anchorOrigin: 'bottom-left',
              anchorXUnits: 'fraction',
              anchorYUnits: 'pixels',
              crossOrigin: 'anonymous',
              opacity: 1,
              src: `assets/image/depot.png`,
            })          
          });
        }else return new Style({
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