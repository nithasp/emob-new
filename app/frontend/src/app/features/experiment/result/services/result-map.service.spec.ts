import { TestBed } from '@angular/core/testing';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import OlMap from 'ol/Map';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import LineString from 'ol/geom/LineString';
import { Style } from 'ol/style';
import CircleStyle from 'ol/style/Circle';
import Overlay from 'ol/Overlay';
import { DialogMapDetailsComponent } from '../dialogs/dialog-map-details/dialog-map-details.component';
import { ResultMapService } from './result-map.service';
import { ResultFilterComponent } from '../components/result-filter/result-filter.component';
import { ResultPlanService } from './result-plan.service';
import { configureResultPage, createRouteInfo } from '../testing/result-page.testing';

describe('ResultMapService', () => {
  let filter: ResultFilterComponent;
  let plan: ResultPlanService;
  let resultMap: ResultMapService;
  let ngbModalSpy: jasmine.SpyObj<NgbModal>;

  beforeEach(async () => {
    ({ ngbModalSpy } = await configureResultPage({ declarations: [ResultFilterComponent] }));
    plan = TestBed.inject(ResultPlanService);
    resultMap = TestBed.inject(ResultMapService);
    filter = TestBed.createComponent(ResultFilterComponent).componentInstance;
  });

  it('should create', () => {
    expect(resultMap).toBeTruthy();
  });

  describe('styleFunction()', () => {
    it('styles Point features as a depot icon with a name label', () => {
      const feature = new Feature({
        geometry: new Point([0, 0]),
        name: 'Depot A',
      });
      const style = resultMap.styleFunction(feature) as Style;
      expect(style.getImage()).toBeTruthy();
      expect(style.getText()?.getText()).toBe('Depot A');
    });

    it('highlights the hovered route and hides all others', () => {
      (resultMap as any).highlightedFeatureCollectionId = 5;
      const hoveredLine = new Feature({
        geometry: new LineString([
          [0, 0],
          [1, 1],
        ]),
        routeIndex: 5,
      });
      const otherLine = new Feature({
        geometry: new LineString([
          [0, 0],
          [1, 1],
        ]),
        routeIndex: 6,
      });

      const hoveredStyle = resultMap.styleFunction(hoveredLine) as Style;
      expect(hoveredStyle.getStroke()?.getColor()).toBe('#04948c');
      expect(resultMap.styleFunction(otherLine)).toEqual([]);
    });

    it('dims lines outside the active route filter', () => {
      resultMap.visibleRoutes = new Set([1]);
      const outOfFilter = new Feature({
        geometry: new LineString([
          [0, 0],
          [1, 1],
        ]),
        routeIndex: 2,
        color: '#ff0000',
      });
      const inFilter = new Feature({
        geometry: new LineString([
          [0, 0],
          [1, 1],
        ]),
        routeIndex: 1,
        color: '#ff0000',
      });

      expect(resultMap.styleFunction(outOfFilter)).toBe(
        (resultMap as any).dimStyle
      );
      const inFilterStyle = resultMap.styleFunction(inFilter) as Style;
      expect(inFilterStyle.getStroke()?.getColor()).toBe('#ff0000');
    });

    it('falls back to the route color with no hover and no filter', () => {
      const line = new Feature({
        geometry: new LineString([
          [0, 0],
          [1, 1],
        ]),
        routeIndex: 9,
        color: '#123456',
      });
      const style = resultMap.styleFunction(line) as Style;
      expect(style.getStroke()?.getColor()).toBe('#123456');
    });
  });

  describe('clusterStyleFunction()', () => {
    function clusterFeature(members: Feature[]): Feature {
      return new Feature({ geometry: new Point([0, 0]), features: members });
    }

    it('highlights only the hovered cluster and hides the rest', () => {
      (resultMap as any).highlightedFeatureCollectionId = 1;
      const hovered = clusterFeature([
        new Feature({ routeIndex: 1, routeOrder: 3 }),
      ]);
      const notHovered = clusterFeature([new Feature({ routeIndex: 2 })]);

      const style = resultMap.clusterStyleFunction(hovered) as Style;
      expect(style.getText()?.getText()).toBe('3');
      expect(resultMap.clusterStyleFunction(notHovered)).toEqual([]);
    });

    it('dims clusters with no member route in the active filter', () => {
      resultMap.visibleRoutes = new Set([1]);
      const outOfFilter = clusterFeature([new Feature({ routeIndex: 2 })]);
      const inFilter = clusterFeature([
        new Feature({ routeIndex: 1, color: '#abcdef' }),
      ]);

      const dimmed = resultMap.clusterStyleFunction(outOfFilter) as Style;
      expect((dimmed.getImage() as CircleStyle).getFill()?.getColor()).toBe(
        'rgba(0,0,0,0.1)'
      );

      const visible = resultMap.clusterStyleFunction(inFilter) as Style;
      expect((visible.getImage() as CircleStyle).getFill()?.getColor()).toBe(
        '#abcdef'
      );
    });
  });

  describe('openRouteDetails()', () => {
    beforeEach(() => {
      (resultMap as any).featureCollections = [
        { type: 'FeatureCollection', features: [], routeIndex: 5 },
      ];
      (resultMap as any).featureDepots = [
        { type: 'FeatureCollection', features: [] },
      ];
      plan.dataRouteInfo.data = [createRouteInfo({ routeIndex: 5 })];
      ngbModalSpy.open.and.returnValue({
        componentInstance: {},
      } as unknown as NgbModalRef);
    });

    it('opens the map details dialog seeded with the matching route data', () => {
      resultMap.openRouteDetails(5);

      expect(plan.routeInfoDetails?.routeIndex).toBe(5);
      expect(ngbModalSpy.open).toHaveBeenCalledWith(
        DialogMapDetailsComponent,
        jasmine.objectContaining({ size: 'xl' })
      );
      const modalRef = ngbModalSpy.open.calls.mostRecent().returnValue;
      expect(modalRef.componentInstance.routeInfo).toBe(
        plan.routeInfoDetails
      );
    });

    it('does nothing when no route matches the given index', () => {
      spyOn(console, 'error');
      resultMap.openRouteDetails(999);
      expect(ngbModalSpy.open).not.toHaveBeenCalled();
    });

    it('does nothing when featureDepots has not been initialized', () => {
      spyOn(console, 'error');
      (resultMap as any).featureDepots = [];
      resultMap.openRouteDetails(5);
      expect(ngbModalSpy.open).not.toHaveBeenCalled();
    });
  });

  describe('map pointer interaction', () => {
    function buildVectorLayer(features: Feature[] = []): VectorLayer {
      return new VectorLayer({ source: new VectorSource({ features }) });
    }

    beforeEach(() => {
      resultMap.vectorLayer = buildVectorLayer();
      resultMap.clusterLayer = buildVectorLayer();
      resultMap.popUp = jasmine.createSpyObj('Overlay', [
        'setPosition',
      ]) as unknown as Overlay;
    });

    function fakeMap(feature: Feature | undefined) {
      return {
        forEachFeatureAtPixel: (_pixel: number[], cb: (f: Feature) => unknown) =>
          feature ? cb(feature) : undefined,
        getCoordinateFromPixel: () => [0, 0],
        getEventPixel: () => [0, 0],
        hasFeatureAtPixel: () => !!feature,
        getTargetElement: () => document.createElement('div'),
      };
    }

    it('handlePointerMove() clears the popup when nothing is hovered', () => {
      (resultMap as any).map = fakeMap(undefined);
      resultMap.handlePointerMove({ pixel: [0, 0], originalEvent: {} } as any);
      expect(resultMap.popUp!.setPosition).toHaveBeenCalledWith(undefined);
      expect((resultMap as any).highlightedFeatureCollectionId).toBeNull();
    });

    it('handlePointerMove() highlights the hovered LineString route', () => {
      const line = new Feature({
        geometry: new LineString([
          [0, 0],
          [1, 1],
        ]),
        routeIndex: 4,
      });
      (resultMap as any).map = fakeMap(line);

      resultMap.handlePointerMove({ pixel: [0, 0], originalEvent: {} } as any);

      expect((resultMap as any).highlightedFeatureCollectionId).toBe(4);
      expect(resultMap.popUp!.setPosition).toHaveBeenCalled();
    });

    it('handleClick() opens route details for a clicked LineString with a routeIndex', () => {
      const line = new Feature({
        geometry: new LineString([
          [0, 0],
          [1, 1],
        ]),
        routeIndex: 4,
      });
      (resultMap as any).map = fakeMap(line);
      spyOn(resultMap, 'openRouteDetails');

      resultMap.handleClick({ pixel: [0, 0] } as any);

      expect(resultMap.openRouteDetails).toHaveBeenCalledWith(4);
    });

    it('handleClick() does nothing for non-LineString or missing features', () => {
      (resultMap as any).map = fakeMap(undefined);
      spyOn(resultMap, 'openRouteDetails');

      resultMap.handleClick({ pixel: [0, 0] } as any);

      expect(resultMap.openRouteDetails).not.toHaveBeenCalled();
    });

    it('handleClick() logs an error when the LineString has no routeIndex', () => {
      spyOn(console, 'error');
      const line = new Feature({
        geometry: new LineString([
          [0, 0],
          [1, 1],
        ]),
      });
      (resultMap as any).map = fakeMap(line);
      spyOn(resultMap, 'openRouteDetails');

      resultMap.handleClick({ pixel: [0, 0] } as any);

      expect(resultMap.openRouteDetails).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('applyMapFilter() / resetRouteMapUi() / onMouseEnter() / onMouseLeave()', () => {
    let vectorLayer: VectorLayer;

    let clusterLayer: VectorLayer;

    let lineInFilter: Feature;

    let lineOutOfFilter: Feature;

    let clusterVisible: Feature;

    let clusterHidden: Feature;

    beforeEach(() => {
      lineInFilter = new Feature({
        geometry: new LineString([
          [0, 0],
          [1, 1],
        ]),
        routeIndex: 0,
      });
      lineOutOfFilter = new Feature({
        geometry: new LineString([
          [0, 0],
          [1, 1],
        ]),
        routeIndex: 1,
      });
      clusterVisible = new Feature({
        geometry: new Point([0, 0]),
        features: [new Feature({ routeIndex: 0, routeOrder: 1 })],
      });
      clusterHidden = new Feature({
        geometry: new Point([0, 0]),
        features: [new Feature({ routeIndex: 1, routeOrder: 2 })],
      });

      vectorLayer = new VectorLayer({
        source: new VectorSource({
          features: [lineInFilter, lineOutOfFilter],
        }),
      });
      clusterLayer = new VectorLayer({
        source: new VectorSource({ features: [clusterVisible, clusterHidden] }),
      });

      resultMap.vectorLayer = vectorLayer;
      resultMap.clusterLayer = clusterLayer;
      plan.dataRouteInfo.filterPredicate =
        filter.multiFilterPredicate.bind(filter);
      plan.dataRouteInfo.data = [
        createRouteInfo({ routeIndex: 0 }),
        createRouteInfo({ routeIndex: 1 }),
      ];
      plan.dataRouteInfo.filter = JSON.stringify([
        { column: 'routeIndex', criteria: 'equal', value: '0' },
      ]);
    });

    it('applyMapFilter() dims out-of-filter lines and clusters, leaves in-filter ones alone', () => {
      resultMap.applyMapFilter();

      expect(resultMap.visibleRoutes.has(0)).toBeTrue();
      expect(resultMap.visibleRoutes.has(1)).toBeFalse();
      expect(lineInFilter.getStyle()).toBeUndefined();
      expect(lineOutOfFilter.getStyle()).toBe((resultMap as any).dimStyle);
      expect(clusterVisible.getStyle()).toBeUndefined();
      expect(clusterHidden.getStyle()).toBeInstanceOf(Style);
    });

    it('resetRouteMapUi() clears the highlight and popup', () => {
      resultMap.popUp = jasmine.createSpyObj('Overlay', [
        'setPosition',
      ]) as unknown as Overlay;
      resultMap.popupContent = { foo: 'bar' };
      (resultMap as any).map = new OlMap({
        layers: [new TileLayer(), vectorLayer, clusterLayer],
      });
      (resultMap as any).highlightedFeatureCollectionId = 3;

      resultMap.resetRouteMapUi();

      expect((resultMap as any).highlightedFeatureCollectionId).toBeNull();
      expect(resultMap.popUp!.setPosition).toHaveBeenCalledWith(undefined);
      expect(resultMap.popupContent).toBeUndefined();
    });

    it('onMouseEnter()/onMouseLeave() set and clear the highlighted route once the map has rendered', () => {
      resultMap.mapAlreadyRendered = true;
      (resultMap as any).map = new OlMap({
        layers: [new TileLayer(), vectorLayer, clusterLayer],
      });

      resultMap.onMouseEnter(createRouteInfo({ routeIndex: 2 }));
      expect((resultMap as any).highlightedFeatureCollectionId).toBe(2);

      resultMap.onMouseLeave(createRouteInfo({ routeIndex: 2 }));
      expect((resultMap as any).highlightedFeatureCollectionId).toBeNull();
    });

    it('onMouseEnter() is a no-op before the map has rendered', () => {
      resultMap.mapAlreadyRendered = false;
      resultMap.onMouseEnter(createRouteInfo({ routeIndex: 2 }));
      expect((resultMap as any).highlightedFeatureCollectionId).toBeNull();
    });
  });
});
