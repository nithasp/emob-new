import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { Subject, of, throwError } from 'rxjs';
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

import { ResultComponent } from './result.component';
import { MapDetailsDialogComponent } from '../components/map-details-dialog/map-details-dialog.component';
import { ConfirmationDialogComponent } from '../components/confirmation-dialog/confirmation-dialog.component';
import { SnakeCasePipe } from 'src/app/directives/snakecase.pipe.directive';
import { ExperimentService } from 'src/app/services/experiment.service';
import { ConfigurationService } from 'src/app/services/configuration.service';
import { LanguageChangeService } from 'src/app/services/language-change.service';
import {
  DownloadResultFile,
  Experiment,
  ExperimentStatus,
  Run,
} from 'src/app/models/experiment.model';
import {
  RouteInfo,
  RoutingNode,
  VrpGeoJsonData,
  VrpSolutionData,
} from 'src/app/models/location.model';

function createRouteInfo(overrides: Partial<RouteInfo> = {}): RouteInfo {
  return {
    averageCustomersDistance: 0,
    customersDistance: [],
    depot2firstDistance: 0,
    last2depotDistance: 0,
    maxCustomersDistance: 0,
    numberDeliveryPoints: 1,
    numberOfReplaceTypes: '',
    numberOfValidateTypes: '',
    numberZone: 1,
    nodeId: 'N1',
    nodeIndex: 1,
    nodeLabel: 1,
    route: [0, 1, 0],
    routeDistances: [],
    routeLabel: 1,
    routeIndex: 0,
    serviceTime: 300,
    totalCustomersDistance: 0,
    totalDuration: 1200,
    travelDistance: 1000,
    travelDuration: 900,
    utilize: 0,
    weight: 50,
    zone: ['Z1'],
    ...overrides,
  };
}

function createExperiment(overrides: Partial<Experiment> = {}): Experiment {
  return {
    companyName: 'Acme',
    runId: 'run-1',
    name: 'Test Run',
    timestamp: '2026-07-16T00:00:00Z',
    configurations: [],
    inputdata: [],
    depots: [],
    timeStart: null,
    timeEnd: null,
    timeDuration: null,
    triggeredBy: 'user-1',
    triggeredByName: 'User One',
    status: ExperimentStatus.Succeeded,
    run: Run.Original,
    groupId: 'group-1',
    countGeocoding: 0,
    countReroute: 0,
    fileUrls: {
      transform: { locations: null, warning: null },
      validate: {
        parameterFormats: null,
        vehicleTypes: null,
        preVRPSolution: null,
        errorWarning: null,
      },
      plan: {
        vrpSolutionLean: 'https://example.com/vrp-solution.json',
        geoJson: 'https://example.com/geojson.json',
        vrpStats: 'https://example.com/vrp-stats.json',
      },
    },
    ...overrides,
  } as Experiment;
}

const mockVrpStats: Record<string, unknown> = {
  customerCount: 1,
  routeCount: 1,
  feasibleRouteCount: 1,
  infeasibleRouteCount: 0,
  isSolutionFeasible: true,
  totalFitness: 1.23,
  totalCost: 100,
  totalWeight: 50,
  totalVolume: 2,
  totalDistance: 1000,
  totalDuration: 1200,
  totalTravelDuration: 900,
  totalServiceDuration: 300,
  totalBreakDuration: 0,
  excessWeight: 0,
  excessVolume: 0,
  excessDistance: 0,
  excessDuration: 0,
  excessEarlyTime: 0,
  excessLateTime: 0,
  hasExcessWeight: false,
  hasExcessVolume: false,
  hasExcessDistance: false,
  hasExcessDuration: false,
  hasExcessEarlyTime: false,
  hasExcessLateTime: false,
  hasIncorrectOrder: false,
  dataUnits: {
    weightUnit: 'kg',
    volumeUnit: 'm3',
    distanceUnit: 'km',
    timeUnit: 'min',
  },
  unassignedCustomers: [],
};

const mockVrpSolution: VrpSolutionData = {
  vrpData: {
    routingNodes: [
      { index: 0, nodeId: 'D1', isDepot: true, name: 'Depot', latitude: 13.7, longitude: 100.5 },
      {
        index: 1,
        nodeId: 'C1',
        isDepot: false,
        name: 'Customer 1',
        zone: 'Z1',
        deliveryWeight: 50,
        latitude: 13.71,
        longitude: 100.51,
        originalAddress: { address: '1 Main St', district: 'D', province: 'P', postalCode: '10000' },
        additionalProperties: { channel: 'app', telephone: '0800000000' },
      } as RoutingNode,
    ],
  },
  solutionMetrics: {
    routeMetrics: [
      {
        routeIndex: 0,
        routeLabel: 1,
        routeNodes: [0, 1, 0],
        customerCount: 1,
        routeWeight: 50,
        routeDistance: 1000,
        routeDuration: 1200,
        routeTravelDuration: 900,
        routeServiceDuration: 300,
      },
    ],
  },
};

const mockGeoJson: VrpGeoJsonData = {
  routes: [
    {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { routeIndex: 0, routeLabel: 1, distances: [500, 500] },
          geometry: {
            type: 'LineString',
            coordinates: [
              [100.5, 13.7],
              [100.505, 13.705],
              [100.51, 13.71],
            ],
          },
        },
        {
          type: 'Feature',
          properties: { nodeId: 'C1' },
          geometry: { type: 'Point', coordinates: [100.51, 13.71] },
        },
      ],
    },
  ],
  depots: [
    {
      type: 'Feature',
      properties: { nodeId: 'D1' },
      geometry: { type: 'Point', coordinates: [100.5, 13.7] },
    },
  ],
};

describe('ResultComponent', () => {
  let component: ResultComponent;
  let fixture: ComponentFixture<ResultComponent>;
  let spinnerSpy: jasmine.SpyObj<NgxSpinnerService>;
  let ngbModalSpy: jasmine.SpyObj<NgbModal>;
  let experimentServiceSpy: jasmine.SpyObj<ExperimentService>;
  let configurationServiceSpy: jasmine.SpyObj<ConfigurationService>;
  let toastrSpy: jasmine.SpyObj<ToastrService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let paramsSubject: Subject<{ [key: string]: string }>;

  beforeEach(async () => {
    spinnerSpy = jasmine.createSpyObj('NgxSpinnerService', ['show', 'hide']);
    ngbModalSpy = jasmine.createSpyObj('NgbModal', ['open']);
    experimentServiceSpy = jasmine.createSpyObj('ExperimentService', [
      'getExperiment',
      'replicateExperiment',
      'getExperimentResultUrl',
    ]);
    configurationServiceSpy = jasmine.createSpyObj('ConfigurationService', [
      'getDatafromUrl',
      'downloadFile',
    ]);
    toastrSpy = jasmine.createSpyObj('ToastrService', ['success', 'error']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    paramsSubject = new Subject<{ [key: string]: string }>();

    await TestBed.configureTestingModule({
      declarations: [ResultComponent, SnakeCasePipe],
      imports: [
        CommonModule,
        TranslocoTestingModule.forRoot({
          langs: { en: {} },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
        }),
      ],
      providers: [
        { provide: NgxSpinnerService, useValue: spinnerSpy },
        { provide: NgbModal, useValue: ngbModalSpy },
        { provide: ActivatedRoute, useValue: { params: paramsSubject.asObservable() } },
        { provide: ExperimentService, useValue: experimentServiceSpy },
        { provide: ConfigurationService, useValue: configurationServiceSpy },
        { provide: ToastrService, useValue: toastrSpy },
        { provide: Router, useValue: routerSpy },
        LanguageChangeService,
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(ResultComponent);
    component = fixture.componentInstance;
    // Triggers ngOnInit (subscribes to route.params, which hasn't emitted yet)
    // and ngAfterViewInit (schedules a harmless checkOverflow via setTimeout).
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(spinnerSpy.show).toHaveBeenCalled();
  });

  describe('full plan-loading pipeline (ngOnInit)', () => {
    beforeEach(() => {
      experimentServiceSpy.getExperiment.and.returnValue(of(createExperiment()));
      spyOn(component, 'dataFromFileUrlToJson').and.callFake((url: string) => {
        if (url.includes('vrp-stats')) return Promise.resolve(mockVrpStats);
        if (url.includes('vrp-solution')) return Promise.resolve(mockVrpSolution);
        if (url.includes('geojson')) return Promise.resolve(mockGeoJson);
        return Promise.resolve({});
      });
    });

    it('loads plan data, builds the report/dashboard, routes, and the map', fakeAsync(() => {
      paramsSubject.next({ experimentId: 'run-1' });
      tick();

      expect(experimentServiceSpy.getExperiment).toHaveBeenCalledWith('run-1');
      expect(component.isLoading).toBeFalse();
      expect(spinnerSpy.hide).toHaveBeenCalled();

      // buildVrpStatsReport
      expect(component.headersReport).toEqual(['property', 'value']);
      const customerCountRow = component.dataSourceReport.find(
        (r) => r.property === 'customerCount'
      );
      expect(customerCountRow?.value).toBe(1);
      const feasibleRow = component.dataSourceReport.find(
        (r) => r.property === 'isSolutionFeasible'
      );
      expect(feasibleRow?.value).toBe('Yes');
      const weightUnitRow = component.dataSourceReport.find((r) => r.property === 'weightUnit');
      expect(weightUnitRow?.value).toBe('kg');
      const unassignedRow = component.dataSourceReport.find(
        (r) => r.property === 'unassignedCustomers'
      );
      expect(unassignedRow?.value).toBe(0);

      // buildVrpStatsDashboard
      expect(component.vrpDashboardCards.find((c) => c.label === 'customerCount')?.value).toBe(1);
      expect(
        component.vrpDashboardRows.find((r) => r.metric === 'totalWeight')?.totalValue
      ).toBe(50);

      // buildRouteInfoFromVrpSolution
      expect(component.dataRouteInfo.data.length).toBe(1);
      const route = component.dataRouteInfo.data[0];
      expect(route.routeLabel).toBe(1);
      expect(route.numberDeliveryPoints).toBe(1);
      expect(route.weight).toBe(50);
      expect(route.travelDistance).toBe(1000);
      expect(route.zone).toEqual(['Z1']);
      expect(route.routeDistances).toEqual([500, 500]);

      // loadAndProcessGeoJSON / initMap
      expect(component.map).toBeInstanceOf(OlMap);
      expect(component.mapAlreadyRendered).toBeTrue();
    }));

    it('shows an error toast and stops loading when plan data fails to fetch', fakeAsync(() => {
      (component.dataFromFileUrlToJson as jasmine.Spy).and.callFake((url: string) => {
        if (url.includes('vrp-stats')) return Promise.reject(new Error('network error'));
        return Promise.resolve({});
      });

      paramsSubject.next({ experimentId: 'run-1' });
      tick();

      expect(toastrSpy.error).toHaveBeenCalled();
      expect(component.isLoading).toBeFalse();
      expect(spinnerSpy.hide).toHaveBeenCalled();
      expect(component.dataRouteInfo.data.length).toBe(0);
    }));
  });

  describe('evaluateFilter()', () => {
    it('converts serviceTime from seconds to minutes before comparing', () => {
      expect(component.evaluateFilter('serviceTime', 300, '5', 'equal')).toBeTrue();
    });

    it('converts travelDuration from seconds to minutes (2dp) before comparing', () => {
      expect(component.evaluateFilter('travelDuration', 125, '2.08', 'equal')).toBeTrue();
    });

    it('rounds travelDistance and weight before comparing', () => {
      expect(component.evaluateFilter('travelDistance', 999.6, '1000', 'equal')).toBeTrue();
      expect(component.evaluateFilter('weight', 49.5, '50', 'equal')).toBeTrue();
    });

    it('passes other columns through unmodified', () => {
      expect(component.evaluateFilter('routeLabel', 7, '7', 'equal')).toBeTrue();
    });

    const cases: Array<[string, number, string, boolean]> = [
      ['equal', 10, '10', true],
      ['equal', 10, '11', false],
      ['does_not_equal', 10, '11', true],
      ['does_not_equal', 10, '10', false],
      ['greater_than', 10, '5', true],
      ['greater_than', 10, '10', false],
      ['greater_than_or_equal', 10, '10', true],
      ['less_than', 5, '10', true],
      ['less_than', 10, '10', false],
      ['less_than_or_equal', 10, '10', true],
    ];
    cases.forEach(([criteria, raw, search, expected]) => {
      it(`"${criteria}" on routeLabel ${raw} vs "${search}" -> ${expected}`, () => {
        expect(component.evaluateFilter('routeLabel', raw, search, criteria)).toBe(expected);
      });
    });

    it('supports string operators: contains/starts_with/ends_with and their negations', () => {
      // numberOfReplaceTypes is treated as a passthrough (string) column
      expect(
        component.evaluateFilter('numberOfReplaceTypes', 'ABCDEF' as unknown as number, 'CDE', 'contains')
      ).toBeTrue();
      expect(
        component.evaluateFilter('numberOfReplaceTypes', 'ABCDEF' as unknown as number, 'XYZ', 'does_not_contain')
      ).toBeTrue();
      expect(
        component.evaluateFilter('numberOfReplaceTypes', 'ABCDEF' as unknown as number, 'ABC', 'starts_with')
      ).toBeTrue();
      expect(
        component.evaluateFilter('numberOfReplaceTypes', 'ABCDEF' as unknown as number, 'XYZ', 'does_not_start_with')
      ).toBeTrue();
      expect(
        component.evaluateFilter('numberOfReplaceTypes', 'ABCDEF' as unknown as number, 'DEF', 'ends_with')
      ).toBeTrue();
      expect(
        component.evaluateFilter('numberOfReplaceTypes', 'ABCDEF' as unknown as number, 'XYZ', 'does_not_end_with')
      ).toBeTrue();
    });

    it('returns false for an unknown criteria', () => {
      expect(component.evaluateFilter('routeLabel', 10, '10', 'unknown_op')).toBeFalse();
    });
  });

  describe('isNumber() / getNumberValue()', () => {
    it('isNumber() handles null/undefined/objects/numeric strings', () => {
      expect(component.isNumber(null)).toBeFalse();
      expect(component.isNumber(undefined)).toBeFalse();
      expect(component.isNumber(42)).toBeTrue();
      expect(component.isNumber('42')).toBeTrue();
      expect(component.isNumber('abc')).toBeFalse();
      expect(component.isNumber({ toString: () => '5' })).toBeTrue();
    });

    it('getNumberValue() coerces booleans, numbers, objects, and strings', () => {
      expect(component.getNumberValue(null)).toBe(0);
      expect(component.getNumberValue(undefined)).toBe(0);
      expect(component.getNumberValue(true)).toBe(1);
      expect(component.getNumberValue(false)).toBe(0);
      expect(component.getNumberValue(3.5)).toBe(3.5);
      expect(component.getNumberValue('7')).toBe(7);
      expect(component.getNumberValue('abc')).toBe(0);
      expect(component.getNumberValue({ toString: () => '9' })).toBe(9);
    });
  });

  describe('multiFilterPredicate()', () => {
    it('returns true when there is no active filter', () => {
      expect(component.multiFilterPredicate(createRouteInfo(), '')).toBeTrue();
    });

    it('matches when any of the OR-ed filters matches (equal on routeLabel)', () => {
      const filter = JSON.stringify([{ column: 'routeLabel', criteria: 'equal', value: '1' }]);
      expect(component.multiFilterPredicate(createRouteInfo({ routeLabel: 1 }), filter)).toBeTrue();
      expect(component.multiFilterPredicate(createRouteInfo({ routeLabel: 2 }), filter)).toBeFalse();
    });
  });

  describe('applyFilter() / removeFilter() / setSearchOption() / setSelectedFilterCriteria()', () => {
    beforeEach(() => {
      // resetRouteMapUi()/applyMapFilter() touch the live OL map, which isn't
      // set up in this describe block; that's covered separately below.
      spyOn(component, 'resetRouteMapUi');
      spyOn(component, 'applyMapFilter');
    });

    it('does nothing when the search control is empty', () => {
      component.searchControl.setValue('');
      component.applyFilter();
      expect(component.activeFilters.length).toBe(0);
    });

    it('pushes a new filter, clears the input, and updates the data source filter', () => {
      component.selectedSearchOption = 'routeLabel';
      component.selectedFilterCriteria = 'equal';
      component.searchControl.setValue('1');

      component.applyFilter();

      expect(component.activeFilters).toEqual([
        { column: 'routeLabel', criteria: 'equal', value: '1' },
      ]);
      expect(component.searchControl.value).toBe('');
      expect(component.dataRouteInfo.filter).toBe(JSON.stringify(component.activeFilters));
    });

    it('setSearchOption() updates the selected column', () => {
      component.setSearchOption('weight');
      expect(component.selectedSearchOption).toBe('weight');
    });

    it('setSelectedFilterCriteria() updates the criteria and re-applies the filter', () => {
      component.searchControl.setValue('1');
      component.setSelectedFilterCriteria('contains');
      expect(component.selectedFilterCriteria).toBe('contains');
      expect(component.activeFilters[0].criteria).toBe('contains');
    });

    it('removeFilter() removes only the matching filter entry', fakeAsync(() => {
      component.searchControl.setValue('1');
      component.applyFilter();
      component.searchControl.setValue('2');
      component.applyFilter();
      const [first] = component.activeFilters;

      component.removeFilter(first);
      tick();

      expect(component.activeFilters.length).toBe(1);
      expect(component.dataRouteInfo.filter).toBe(JSON.stringify(component.activeFilters));
    }));

    it('removeFilter() clears the data source filter once no filters remain', fakeAsync(() => {
      component.searchControl.setValue('1');
      component.applyFilter();
      const [first] = component.activeFilters;

      component.removeFilter(first);
      tick();

      expect(component.activeFilters.length).toBe(0);
      expect(component.dataRouteInfo.filter).toBe('');
    }));

    it('clearFilter() resets the search control and active filters', () => {
      component.searchControl.setValue('1');
      component.applyFilter();

      component.clearFilter();

      expect(component.searchControl.value).toBe('');
      expect(component.activeFilters).toEqual([]);
      expect(component.dataRouteInfo.filter).toBe('');
    });
  });

  describe('toggleRow() / isExpanded()', () => {
    it('expands a collapsed row and collapses an expanded one', () => {
      const row = createRouteInfo({ routeIndex: 3 });
      expect(component.isExpanded(row)).toBe('collapsed');

      component.toggleRow(row);
      expect(component.isExpanded(row)).toBe('expanded');

      component.toggleRow(row);
      expect(component.isExpanded(row)).toBe('collapsed');
    });
  });

  describe('styleFunction()', () => {
    it('styles Point features as a depot icon with a name label', () => {
      const feature = new Feature({ geometry: new Point([0, 0]), name: 'Depot A' });
      const style = component.styleFunction(feature) as Style;
      expect(style.getImage()).toBeTruthy();
      expect(style.getText()?.getText()).toBe('Depot A');
    });

    it('highlights the hovered route and hides all others', () => {
      (component as any).highlightedFeatureCollectionId = 5;
      const hoveredLine = new Feature({ geometry: new LineString([[0, 0], [1, 1]]), routeIndex: 5 });
      const otherLine = new Feature({ geometry: new LineString([[0, 0], [1, 1]]), routeIndex: 6 });

      const hoveredStyle = component.styleFunction(hoveredLine) as Style;
      expect(hoveredStyle.getStroke()?.getColor()).toBe('#04948c');
      expect(component.styleFunction(otherLine)).toEqual([]);
    });

    it('dims lines outside the active route filter', () => {
      component.visibleRoutes = new Set([1]);
      const outOfFilter = new Feature({ geometry: new LineString([[0, 0], [1, 1]]), routeIndex: 2, color: '#ff0000' });
      const inFilter = new Feature({ geometry: new LineString([[0, 0], [1, 1]]), routeIndex: 1, color: '#ff0000' });

      expect(component.styleFunction(outOfFilter)).toBe((component as any).dimStyle);
      const inFilterStyle = component.styleFunction(inFilter) as Style;
      expect(inFilterStyle.getStroke()?.getColor()).toBe('#ff0000');
    });

    it('falls back to the route color with no hover and no filter', () => {
      const line = new Feature({ geometry: new LineString([[0, 0], [1, 1]]), routeIndex: 9, color: '#123456' });
      const style = component.styleFunction(line) as Style;
      expect(style.getStroke()?.getColor()).toBe('#123456');
    });
  });

  describe('clusterStyleFunction()', () => {
    function clusterFeature(members: Feature[]): Feature {
      return new Feature({ geometry: new Point([0, 0]), features: members });
    }

    it('highlights only the hovered cluster and hides the rest', () => {
      (component as any).highlightedFeatureCollectionId = 1;
      const hovered = clusterFeature([new Feature({ routeIndex: 1, routeOrder: 3 })]);
      const notHovered = clusterFeature([new Feature({ routeIndex: 2 })]);

      const style = component.clusterStyleFunction(hovered) as Style;
      expect(style.getText()?.getText()).toBe('3');
      expect(component.clusterStyleFunction(notHovered)).toEqual([]);
    });

    it('dims clusters with no member route in the active filter', () => {
      component.visibleRoutes = new Set([1]);
      const outOfFilter = clusterFeature([new Feature({ routeIndex: 2 })]);
      const inFilter = clusterFeature([new Feature({ routeIndex: 1, color: '#abcdef' })]);

      const dimmed = component.clusterStyleFunction(outOfFilter) as Style;
      expect((dimmed.getImage() as CircleStyle).getFill()?.getColor()).toBe('rgba(0,0,0,0.1)');

      const visible = component.clusterStyleFunction(inFilter) as Style;
      expect((visible.getImage() as CircleStyle).getFill()?.getColor()).toBe('#abcdef');
    });
  });

  describe('handleDistance()', () => {
    it('opens the customer details dialog for a matched routing node', () => {
      (component as any).routingNodesMap = {
        7: { index: 7, nodeId: 'N7', name: 'Cust 7', latitude: 1, longitude: 2 } as RoutingNode,
      };
      ngbModalSpy.open.and.returnValue({ componentInstance: {} } as unknown as NgbModalRef);

      component.handleDistance(7);

      expect(ngbModalSpy.open).toHaveBeenCalled();
      const modalRef = ngbModalSpy.open.calls.mostRecent().returnValue;
      expect(modalRef.componentInstance.dataCustomer.ORDERID_ORG).toBe('N7');
    });

    it('does nothing for an unmatched or falsy node index', () => {
      (component as any).routingNodesMap = {};
      component.handleDistance(0);
      component.handleDistance(999);
      expect(ngbModalSpy.open).not.toHaveBeenCalled();
    });
  });

  describe('openRouteDetails()', () => {
    beforeEach(() => {
      (component as any).featureCollections = [
        { type: 'FeatureCollection', features: [], routeIndex: 5 },
      ];
      (component as any).featureDepots = [{ type: 'FeatureCollection', features: [] }];
      component.dataRouteInfo.data = [createRouteInfo({ routeIndex: 5 })];
      ngbModalSpy.open.and.returnValue({ componentInstance: {} } as unknown as NgbModalRef);
    });

    it('opens the map details dialog seeded with the matching route data', () => {
      component.openRouteDetails(5);

      expect(component.routeInfoDetails?.routeIndex).toBe(5);
      expect(ngbModalSpy.open).toHaveBeenCalledWith(
        MapDetailsDialogComponent,
        jasmine.objectContaining({ size: 'xl' })
      );
      const modalRef = ngbModalSpy.open.calls.mostRecent().returnValue;
      expect(modalRef.componentInstance.routeInfo).toBe(component.routeInfoDetails);
    });

    it('does nothing when no route matches the given index', () => {
      spyOn(console, 'error');
      component.openRouteDetails(999);
      expect(ngbModalSpy.open).not.toHaveBeenCalled();
    });

    it('does nothing when featureDepots has not been initialized', () => {
      spyOn(console, 'error');
      (component as any).featureDepots = [];
      component.openRouteDetails(5);
      expect(ngbModalSpy.open).not.toHaveBeenCalled();
    });
  });

  describe('tryToRerunExperiment()', () => {
    beforeEach(() => {
      component.experiment = createExperiment();
    });

    it('replicates the experiment and navigates on confirmation + success', fakeAsync(() => {
      ngbModalSpy.open.and.returnValue({
        componentInstance: {},
        result: Promise.resolve(true),
      } as unknown as NgbModalRef);
      experimentServiceSpy.replicateExperiment.and.returnValue(
        of({ runId: 'new-run' } as Experiment)
      );

      component.tryToRerunExperiment();
      tick();

      expect(experimentServiceSpy.replicateExperiment).toHaveBeenCalledWith('run-1');
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/users/run', 'new-run']);
      expect(toastrSpy.success).toHaveBeenCalled();
    }));

    it('does not replicate when the dialog is not confirmed', fakeAsync(() => {
      ngbModalSpy.open.and.returnValue({
        componentInstance: {},
        result: Promise.resolve(false),
      } as unknown as NgbModalRef);

      component.tryToRerunExperiment();
      tick();

      expect(experimentServiceSpy.replicateExperiment).not.toHaveBeenCalled();
    }));

    it('shows an error toast when replication fails', fakeAsync(() => {
      ngbModalSpy.open.and.returnValue({
        componentInstance: {},
        result: Promise.resolve(true),
      } as unknown as NgbModalRef);
      experimentServiceSpy.replicateExperiment.and.returnValue(
        throwError(() => new Error('replicate failed'))
      );

      component.tryToRerunExperiment();
      tick();

      expect(toastrSpy.error).toHaveBeenCalled();
    }));
  });

  describe('downloadPlan()', () => {
    beforeEach(() => {
      component.experiment = createExperiment();
    });

    it('downloads the file and shows a success toast', fakeAsync(() => {
      const downloadResult: DownloadResultFile = {
        resultFileBlobPath: 'path',
        fileUrl: { resultFileBlobPathUrl: 'https://example.com/plan.csv' },
      };
      experimentServiceSpy.getExperimentResultUrl.and.returnValue(of(downloadResult));
      configurationServiceSpy.downloadFile.and.returnValue(
        of(
          new HttpResponse({
            body: new Blob(['data']),
            headers: new HttpHeaders({ 'Content-Disposition': 'attachment; filename="plan.csv"' }),
          })
        )
      );

      component.downloadPlan();
      tick();

      expect(toastrSpy.success).toHaveBeenCalled();
      expect(spinnerSpy.hide).toHaveBeenCalled();
    }));

    it('shows an error toast when the result URL lookup fails', fakeAsync(() => {
      experimentServiceSpy.getExperimentResultUrl.and.returnValue(
        throwError(() => new Error('failed'))
      );

      component.downloadPlan();
      tick();

      expect(toastrSpy.error).toHaveBeenCalled();
      expect(spinnerSpy.hide).toHaveBeenCalled();
    }));

    it('shows an error toast when the file download fails', fakeAsync(() => {
      const downloadResult: DownloadResultFile = {
        resultFileBlobPath: 'path',
        fileUrl: { resultFileBlobPathUrl: 'https://example.com/plan.csv' },
      };
      experimentServiceSpy.getExperimentResultUrl.and.returnValue(of(downloadResult));
      configurationServiceSpy.downloadFile.and.returnValue(throwError(() => new Error('failed')));

      component.downloadPlan();
      tick();

      expect(toastrSpy.error).toHaveBeenCalled();
      expect(spinnerSpy.hide).toHaveBeenCalled();
    }));
  });

  describe('map pointer interaction', () => {
    function buildVectorLayer(features: Feature[] = []): VectorLayer {
      return new VectorLayer({ source: new VectorSource({ features }) });
    }

    beforeEach(() => {
      component.vectorLayer = buildVectorLayer();
      component.clusterLayer = buildVectorLayer();
      component.popUp = jasmine.createSpyObj('Overlay', ['setPosition']) as unknown as Overlay;
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
      (component as any).map = fakeMap(undefined);
      component.handlePointerMove({ pixel: [0, 0], originalEvent: {} } as any);
      expect(component.popUp!.setPosition).toHaveBeenCalledWith(undefined);
      expect((component as any).highlightedFeatureCollectionId).toBeNull();
    });

    it('handlePointerMove() highlights the hovered LineString route', () => {
      const line = new Feature({ geometry: new LineString([[0, 0], [1, 1]]), routeIndex: 4 });
      (component as any).map = fakeMap(line);

      component.handlePointerMove({ pixel: [0, 0], originalEvent: {} } as any);

      expect((component as any).highlightedFeatureCollectionId).toBe(4);
      expect(component.popUp!.setPosition).toHaveBeenCalled();
    });

    it('handleClick() opens route details for a clicked LineString with a routeIndex', () => {
      const line = new Feature({ geometry: new LineString([[0, 0], [1, 1]]), routeIndex: 4 });
      (component as any).map = fakeMap(line);
      spyOn(component, 'openRouteDetails');

      component.handleClick({ pixel: [0, 0] } as any);

      expect(component.openRouteDetails).toHaveBeenCalledWith(4);
    });

    it('handleClick() does nothing for non-LineString or missing features', () => {
      (component as any).map = fakeMap(undefined);
      spyOn(component, 'openRouteDetails');

      component.handleClick({ pixel: [0, 0] } as any);

      expect(component.openRouteDetails).not.toHaveBeenCalled();
    });

    it('handleClick() logs an error when the LineString has no routeIndex', () => {
      spyOn(console, 'error');
      const line = new Feature({ geometry: new LineString([[0, 0], [1, 1]]) });
      (component as any).map = fakeMap(line);
      spyOn(component, 'openRouteDetails');

      component.handleClick({ pixel: [0, 0] } as any);

      expect(component.openRouteDetails).not.toHaveBeenCalled();
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
      lineInFilter = new Feature({ geometry: new LineString([[0, 0], [1, 1]]), routeIndex: 0 });
      lineOutOfFilter = new Feature({ geometry: new LineString([[0, 0], [1, 1]]), routeIndex: 1 });
      clusterVisible = new Feature({
        geometry: new Point([0, 0]),
        features: [new Feature({ routeIndex: 0, routeOrder: 1 })],
      });
      clusterHidden = new Feature({
        geometry: new Point([0, 0]),
        features: [new Feature({ routeIndex: 1, routeOrder: 2 })],
      });

      vectorLayer = new VectorLayer({
        source: new VectorSource({ features: [lineInFilter, lineOutOfFilter] }),
      });
      clusterLayer = new VectorLayer({
        source: new VectorSource({ features: [clusterVisible, clusterHidden] }),
      });

      component.vectorLayer = vectorLayer;
      component.clusterLayer = clusterLayer;
      component.dataRouteInfo.filterPredicate = component.multiFilterPredicate.bind(component);
      component.dataRouteInfo.data = [
        createRouteInfo({ routeIndex: 0 }),
        createRouteInfo({ routeIndex: 1 }),
      ];
      component.dataRouteInfo.filter = JSON.stringify([
        { column: 'routeIndex', criteria: 'equal', value: '0' },
      ]);
    });

    it('applyMapFilter() dims out-of-filter lines and clusters, leaves in-filter ones alone', () => {
      component.applyMapFilter();

      expect(component.visibleRoutes.has(0)).toBeTrue();
      expect(component.visibleRoutes.has(1)).toBeFalse();
      expect(lineInFilter.getStyle()).toBeUndefined();
      expect(lineOutOfFilter.getStyle()).toBe((component as any).dimStyle);
      expect(clusterVisible.getStyle()).toBeUndefined();
      expect(clusterHidden.getStyle()).toBeInstanceOf(Style);
    });

    it('resetRouteMapUi() clears the highlight and popup', () => {
      component.popUp = jasmine.createSpyObj('Overlay', ['setPosition']) as unknown as Overlay;
      component.popupContent = { foo: 'bar' };
      (component as any).map = new OlMap({ layers: [new TileLayer(), vectorLayer, clusterLayer] });
      (component as any).highlightedFeatureCollectionId = 3;

      component.resetRouteMapUi();

      expect((component as any).highlightedFeatureCollectionId).toBeNull();
      expect(component.popUp!.setPosition).toHaveBeenCalledWith(undefined);
      expect(component.popupContent).toBeUndefined();
    });

    it('onMouseEnter()/onMouseLeave() set and clear the highlighted route once the map has rendered', () => {
      component.mapAlreadyRendered = true;
      (component as any).map = new OlMap({ layers: [new TileLayer(), vectorLayer, clusterLayer] });

      component.onMouseEnter(createRouteInfo({ routeIndex: 2 }));
      expect((component as any).highlightedFeatureCollectionId).toBe(2);

      component.onMouseLeave(createRouteInfo({ routeIndex: 2 }));
      expect((component as any).highlightedFeatureCollectionId).toBeNull();
    });

    it('onMouseEnter() is a no-op before the map has rendered', () => {
      component.mapAlreadyRendered = false;
      component.onMouseEnter(createRouteInfo({ routeIndex: 2 }));
      expect((component as any).highlightedFeatureCollectionId).toBeNull();
    });
  });

  describe('checkOverflow()', () => {
    it('returns early when the chip list is not present in the DOM', () => {
      expect(() => component.checkOverflow()).not.toThrow();
      expect(component.hasOverflow).toBeFalse();
    });
  });
});
