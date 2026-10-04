import { HttpClient } from '@angular/common/http';
import { NO_ERRORS_SCHEMA, Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { TranslocoService } from '@jsverse/transloco';
import { Subject } from 'rxjs';
import { LanguageChangeService } from '@core/services/language-change.service';
import { ConfigurationService } from '@features/configurations/services/configuration.service';
import {
  Experiment,
  ExperimentStatus,
  Run,
} from '../../models/experiment.model';
import { RouteInfo } from '../../models/location.model';
import {
  ResultPageSpies,
  SpecVrpGeoJsonData,
  SpecVrpSolutionData,
} from '../../models/test.model';
import { ExperimentService } from '../../services/experiment.service';
import { RESULT_PAGE_PROVIDERS } from '../services/result-page.providers';

export function createRouteInfo(overrides: Partial<RouteInfo> = {}): RouteInfo {
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

export function createExperiment(overrides: Partial<Experiment> = {}): Experiment {
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

export const mockVrpStats: Record<string, unknown> = {
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

export const mockVrpSolution: SpecVrpSolutionData = {
  vrpData: {
    routingNodes: [
      {
        index: 0,
        nodeId: 'D1',
        isDepot: true,
        name: 'Depot',
        latitude: 13.7,
        longitude: 100.5,
      },
      {
        index: 1,
        nodeId: 'C1',
        isDepot: false,
        name: 'Customer 1',
        zone: 'Z1',
        deliveryWeight: 50,
        latitude: 13.71,
        longitude: 100.51,
        originalAddress: {
          address: '1 Main St',
          district: 'D',
          province: 'P',
          postalCode: '10000',
        },
        additionalProperties: { channel: 'app', telephone: '0800000000' },
      },
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

export const mockGeoJson: SpecVrpGeoJsonData = {
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

export function createResultPageSpies(): ResultPageSpies {
  const routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);
  routerSpy.navigate.and.resolveTo(true);

  const translocoSpy = jasmine.createSpyObj<TranslocoService>(
    'TranslocoService',
    ['translate'],
  );
  translocoSpy.translate.and.callFake(((key: string) => key) as never);

  return {
    spinnerSpy: jasmine.createSpyObj<NgxSpinnerService>('NgxSpinnerService', [
      'show',
      'hide',
    ]),
    ngbModalSpy: jasmine.createSpyObj<NgbModal>('NgbModal', ['open']),
    experimentServiceSpy: jasmine.createSpyObj<ExperimentService>(
      'ExperimentService',
      ['getExperiment', 'replicateExperiment', 'getExperimentResultUrl'],
    ),
    configurationServiceSpy: jasmine.createSpyObj<ConfigurationService>(
      'ConfigurationService',
      ['getDatafromUrl', 'downloadFile'],
    ),
    toastrSpy: jasmine.createSpyObj<ToastrService>('ToastrService', [
      'success',
      'error',
      'warning',
      'info',
    ]),
    routerSpy,
    translocoSpy,
    httpSpy: jasmine.createSpyObj<HttpClient>('HttpClient', ['get', 'post']),
    paramsSubject: new Subject<{ [key: string]: string }>(),
  };
}

export async function configureResultPage(
  options: { declarations?: Type<unknown>[] } = {},
): Promise<ResultPageSpies> {
  const spies = createResultPageSpies();
  const declarations = options.declarations ?? [];

  TestBed.configureTestingModule({
    declarations,
    providers: [
      { provide: HttpClient, useValue: spies.httpSpy },
      { provide: NgxSpinnerService, useValue: spies.spinnerSpy },
      { provide: NgbModal, useValue: spies.ngbModalSpy },
      {
        provide: ActivatedRoute,
        useValue: { params: spies.paramsSubject.asObservable() },
      },
      { provide: ExperimentService, useValue: spies.experimentServiceSpy },
      { provide: ConfigurationService, useValue: spies.configurationServiceSpy },
      { provide: ToastrService, useValue: spies.toastrSpy },
      { provide: Router, useValue: spies.routerSpy },
      { provide: TranslocoService, useValue: spies.translocoSpy },
      LanguageChangeService,
      ...RESULT_PAGE_PROVIDERS,
    ],
    schemas: [NO_ERRORS_SCHEMA],
  });
  for (const component of declarations) {
    TestBed.overrideComponent(component, { set: { template: '' } });
  }
  await TestBed.compileComponents();

  return spies;
}
