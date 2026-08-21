import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbActiveModal, NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { TranslocoTestingModule } from '@jsverse/transloco';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import LineString from 'ol/geom/LineString';
import { Style } from 'ol/style';
import CircleStyle from 'ol/style/Circle';

import { MapDetailsDialogComponent } from './map-details-dialog.component';
import { CustomerDetailsComponent } from '../customer-details/customer-details.component';
import { SnakeCasePipe } from 'src/app/directives/snakecase.pipe.directive';
import { GeoJSONFeatureCollection, RouteInfo, PointDetail } from 'src/app/models/experiment.model';
import { RoutingNode } from 'src/app/models/location.model';

describe('MapDetailsDialogComponent', () => {
  let component: MapDetailsDialogComponent;
  let fixture: ComponentFixture<MapDetailsDialogComponent>;
  let ngbActiveModalSpy: jasmine.SpyObj<NgbActiveModal>;
  let ngbModalSpy: jasmine.SpyObj<NgbModal>;

  beforeEach(async () => {
    ngbActiveModalSpy = jasmine.createSpyObj('NgbActiveModal', ['close', 'dismiss']);
    ngbModalSpy = jasmine.createSpyObj('NgbModal', ['open']);

    await TestBed.configureTestingModule({
      declarations: [MapDetailsDialogComponent, SnakeCasePipe],
      imports: [
        CommonModule,
        TranslocoTestingModule.forRoot({
          langs: { en: {} },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
        }),
      ],
      providers: [
        { provide: NgbActiveModal, useValue: ngbActiveModalSpy },
        { provide: NgbModal, useValue: ngbModalSpy },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(MapDetailsDialogComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    if (document.body.contains(fixture.nativeElement)) {
      document.body.removeChild(fixture.nativeElement);
    }
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('ngOnInit()', () => {
    it('indexes routingNodes and finds a match via handleDistance()', () => {
      component.routingNodes = [
        { index: 5, nodeId: 'N5', name: 'Cust 5', latitude: 1, longitude: 2 } as RoutingNode,
      ];
      fixture.detectChanges();

      ngbModalSpy.open.and.returnValue({ componentInstance: {} } as unknown as NgbModalRef);
      component.handleDistance(5);

      expect(ngbModalSpy.open).toHaveBeenCalledWith(
        CustomerDetailsComponent,
        jasmine.objectContaining({ centered: true })
      );
      const modalRef = ngbModalSpy.open.calls.mostRecent().returnValue;
      expect(modalRef.componentInstance.dataCustomer.ORDERID_ORG).toBe('N5');
      expect(modalRef.componentInstance.dataCustomer.CUSTOMER_NAME).toBe('Cust 5');
      expect(modalRef.componentInstance.isGeolocationDisplay).toBeFalse();
    });

    it('does nothing in handleDistance() when the node index has no match', () => {
      component.routingNodes = [{ index: 5, nodeId: 'N5' } as RoutingNode];
      fixture.detectChanges();

      component.handleDistance(999);

      expect(ngbModalSpy.open).not.toHaveBeenCalled();
    });

    it('does nothing in handleDistance() for a falsy node index', () => {
      fixture.detectChanges();
      component.handleDistance(0);
      expect(ngbModalSpy.open).not.toHaveBeenCalled();
    });
  });

  describe('getDepotDetailsPoint()', () => {
    it('extracts point details from the feature collection', () => {
      component.featureCollection = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { name: 'Stop A', routeOrder: 2, weight: 12.5 },
            geometry: { type: 'Point', coordinates: [100.5, 13.75] },
          },
          {
            type: 'Feature',
            properties: { name: 'Route line' },
            geometry: {
              type: 'LineString',
              coordinates: [
                [100.5, 13.75],
                [100.6, 13.8],
              ],
            },
          },
        ],
      } as GeoJSONFeatureCollection;
      fixture.detectChanges();

      expect(component.pointDetails.length).toBe(1);
      expect(component.pointDetails[0]).toEqual({
        routeOrder: 2,
        name: 'Stop A',
        weight: 12.5,
      });
    });

    it('leaves pointDetails empty when there is no feature collection', () => {
      fixture.detectChanges();
      expect(component.pointDetails).toEqual([]);
    });
  });

  describe('sortedPointDetails()', () => {
    it('sorts by routeOrder ascending and drops routeOrder 0 (depots)', () => {
      fixture.detectChanges();
      component.pointDetails = [
        { name: 'C', weight: 1, routeOrder: 3 },
        { name: 'Depot', weight: 0, routeOrder: 0 },
        { name: 'A', weight: 1, routeOrder: 1 },
      ] as PointDetail[];

      expect(component.sortedPointDetails().map((p) => p.name)).toEqual(['A', 'C']);
    });
  });

  describe('handlePointClick()', () => {
    beforeEach(() => {
      component.featureCollection = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { name: 'Stop A', routeOrder: 2, nodeIndex: 7 },
            geometry: { type: 'Point', coordinates: [100.5, 13.75] },
          },
        ],
      } as GeoJSONFeatureCollection;
      component.routingNodes = [{ index: 7, nodeId: 'N7', name: 'Stop A' } as RoutingNode];
      fixture.detectChanges();
      ngbModalSpy.open.and.returnValue({ componentInstance: {} } as unknown as NgbModalRef);
    });

    it('resolves the matching nodeIndex and opens the customer details dialog', () => {
      component.handlePointClick({ name: 'Stop A', routeOrder: 2, weight: 5 });
      expect(ngbModalSpy.open).toHaveBeenCalled();
      const modalRef = ngbModalSpy.open.calls.mostRecent().returnValue;
      expect(modalRef.componentInstance.dataCustomer.ORDERID_ORG).toBe('N7');
    });

    it('does nothing when no point feature matches', () => {
      component.handlePointClick({ name: 'Unknown', routeOrder: 99, weight: 5 });
      expect(ngbModalSpy.open).not.toHaveBeenCalled();
    });
  });

  describe('styleFunction()', () => {
    beforeEach(() => fixture.detectChanges());

    it('returns a depot icon style for a depot point', () => {
      const feature = new Feature({
        geometry: new Point([0, 0]),
        isDepot: true,
      });
      const style = component.styleFunction(feature) as Style;
      expect(style.getImage()).toBeTruthy();
    });

    it('returns a circle marker with route order text for a non-depot point', () => {
      const feature = new Feature({
        geometry: new Point([0, 0]),
        isDepot: false,
        routeOrder: 4,
      });
      const style = component.styleFunction(feature) as Style;
      expect(style.getImage() instanceof CircleStyle).toBeTrue();
      expect(style.getText()?.getText()).toBe('4');
    });

    it('returns a stroked line style for a LineString', () => {
      const feature = new Feature({
        geometry: new LineString([
          [0, 0],
          [1, 1],
        ]),
      });
      const style = component.styleFunction(feature) as Style;
      expect(style.getStroke()).toBeTruthy();
    });

    it('returns undefined for unsupported geometry types', () => {
      const feature = new Feature({
        geometry: new Point([0, 0]),
      });
      // Polygon isn't handled explicitly, but any geometry other than
      // Point/LineString should fall through to the default branch.
      spyOn(feature, 'getGeometry').and.returnValue({
        getType: () => 'Polygon',
      } as any);

      expect(component.styleFunction(feature)).toBeUndefined();
    });
  });

  describe('close()', () => {
    it('dismisses the active modal with false', () => {
      fixture.detectChanges();
      component.close();
      expect(ngbActiveModalSpy.dismiss).toHaveBeenCalledWith(false);
    });
  });

  describe('loadAndProcessGeoJSON()', () => {
    it('builds the map and popup overlay from a valid feature collection', () => {
      document.body.appendChild(fixture.nativeElement);
      fixture.detectChanges();

      const featureCollection: GeoJSONFeatureCollection = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { routeOrder: 1, isDepot: false },
            geometry: { type: 'Point', coordinates: [100.5, 13.75] },
          },
          {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: [
                [100.5, 13.75],
                [100.51, 13.76],
                [100.52, 13.77],
                [100.53, 13.78],
              ],
            },
          },
        ],
      };

      expect(() => component.loadAndProcessGeoJSON(featureCollection, [])).not.toThrow();
      expect(component.popUp).toBeTruthy();
    });

    it('does nothing when the feature collection is null', () => {
      fixture.detectChanges();
      expect(() => component.loadAndProcessGeoJSON(null, [])).not.toThrow();
      expect(component.popUp).toBeUndefined();
    });
  });
});
