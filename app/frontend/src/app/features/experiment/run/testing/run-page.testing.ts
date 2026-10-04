import { NO_ERRORS_SCHEMA, Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { Subject, of } from 'rxjs';
import { UserService } from '@core/services/auth/user.service';
import { DataService } from '@shared/services/data.service';
import { ExportFileService } from '@shared/services/export-file.service';
import { ConfigurationService } from '@features/configurations/services/configuration.service';
import { VehicleService } from '@features/configurations/services/vehicle.service';
import {
  OpenVrpRunVehicleEntry,
  VehicleProfileTypeEnum,
  VehicleType,
} from '@features/configurations/models/vehicle.model';
import { DynamicParameter } from '../../models/constraint.model';
import {
  Experiment,
  ExperimentStatus,
  MyDepot,
  Run,
} from '../../models/experiment.model';
import { DataGroup, LocationType } from '../../models/location.model';
import {
  Customer,
  Depot,
  PreOrderFileDescriptor,
  PreOrderFileItem,
  ReplaceType,
  ValidationType,
} from '../../models/pre-order.model';
import { RunPageSpies } from '../../models/test.model';
import { ConstraintService } from '../../services/constraint.service';
import { ExperimentService } from '../../services/experiment.service';
import { PreOrderService } from '../../services/pre-order.service';
import { RUN_PAGE_PROVIDERS } from '../services/run-page.providers';

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
      plan: { vrpSolutionLean: null, geoJson: null, vrpStats: null },
    },
    ...overrides,
  } as Experiment;
}

export function createCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    deliveryWeight: 10,
    index: 0,
    isDepot: false,
    latitude: 13.71,
    longitude: 100.51,
    metrics: null,
    name: 'CUST-1',
    nodeId: 'N1',
    pickupWeight: 0,
    processedAddress: {
      address: '1 Main St',
      district: null,
      postalCode: null,
      province: null,
      subdistrict: null,
    },
    originalAddress: {
      address: '1 Main St',
      district: 'District',
      postalCode: 10000,
      province: 'Province',
      subdistrict: null,
    },
    replaceType: ReplaceType.NO_REPLACE,
    required: true,
    serviceDuration: 300,
    timeWindowEarly: 0,
    timeWindowLate: 0,
    validationType: ValidationType.SUBDISTRICT_LEVEL,
    deliveryVolume: 0,
    pickupVolume: 0,
    zone: 'Z1',
    extra: {
      orderId: null,
      channel: null,
      customerName: 'Customer One',
      tel: null,
      productsInfo: [],
    },
    ...overrides,
  } as Customer;
}

export function createDepot(overrides: Partial<Depot> = {}): Depot {
  return {
    id: 'D1',
    deliveryWeight: 0,
    index: 0,
    isDepot: true,
    latitude: 13.7,
    longitude: 100.5,
    name: 'Depot A',
    nodeId: 'D1',
    pickupWeight: 0,
    processedAddress: {
      address: '',
      district: null,
      postalCode: null,
      province: null,
      subdistrict: null,
    },
    replaceType: ReplaceType.INPUT,
    required: false,
    serviceDuration: 0,
    timeWindowEarly: 0,
    timeWindowLate: 0,
    validationType: ValidationType.NON_VALIDATED,
    deliveryVolume: 0,
    pickupVolume: 0,
    zone: '',
    ...overrides,
  } as Depot;
}

export function createMyDepot(overrides: Partial<MyDepot> = {}): MyDepot {
  return {
    depotId: 'depot-1',
    depotName: 'Depot One',
    latitude: 13.7,
    longitude: 100.5,
    timeWindowEarly: '08:00',
    timeWindowLate: '18:00',
    createdAt: '',
    updatedAt: '',
    inputdata: [],
    columns: [],
    ...overrides,
  } as MyDepot;
}

export function createDynamicParameter(
  overrides: Partial<DynamicParameter> = {}
): DynamicParameter {
  return {
    companyName: 'Acme',
    id: 'param-1',
    category: { th_TH: 'ทั่วไป', en_US: 'General' },
    depotId: '',
    keyName: 'earlyDeliveryTime',
    displayName: { th_TH: '', en_US: 'Early Delivery Time' },
    valueType: 'time',
    value: '08:00',
    joiConfig: { type: 'string', required: false, message: '' },
    isRequired: false,
    defaultValue: '08:00',
    description: { th_TH: '', en_US: '' },
    createdAt: '',
    updatedAt: '',
    ...overrides,
  } as DynamicParameter;
}

export function createVehicleType(overrides: Partial<VehicleType> = {}): VehicleType {
  return {
    vehicleTypeId: 'vt-1',
    name: 'Truck A',
    access: null,
    dimension: null,
    maximumWeightCapacity: 1000,
    maximumVolumeCapacity: 10,
    timeWindowEarly: '08:00',
    timeWindowLate: '18:00',
    maximumDistance: 100,
    maximumDuration: '08:00',
    fixedCost: 0,
    unitDistanceCost: 0,
    unitDurationCost: 0,
    vehicleProfileType: VehicleProfileTypeEnum.TRUCK,
    isVehicleAvailable: true,
    createdAt: '',
    modifiedAt: '',
    ...overrides,
  } as VehicleType;
}

export function createRunEntry(
  overrides: Partial<OpenVrpRunVehicleEntry> = {}
): OpenVrpRunVehicleEntry {
  return {
    id: 1,
    vehicleTypeId: 'vt-1',
    vehicleTypeName: 'Truck A',
    mode: 'count',
    count: 1,
    licensePlates: [],
    vehicleIds: [],
    endOfRoute: 'return',
    startDepotId: 'depot-1',
    startDepotName: 'Depot 1',
    endDepotId: null,
    endDepotName: null,
    maxTrip: 1,
    loadingDuration: null,
    ...overrides,
  };
}

export function createDataGroup(overrides: Partial<DataGroup> = {}): DataGroup {
  return {
    verify: { customers: [], type: LocationType.Verify },
    uncertain: { customers: [], type: LocationType.Uncertain },
    unverify: { customers: [], type: LocationType.Unverify },
    edit: { customers: [], type: LocationType.Edit },
    ...overrides,
  } as DataGroup;
}

export function createFile(name: string, type: string, content = 'content'): File {
  return new File([content], name, { type });
}

export function createFileDescriptorItem(
  id: string,
  overrides: Partial<PreOrderFileDescriptor> = {}
): PreOrderFileItem {
  return {
    id,
    file: {
      keyName: 'k1',
      name: 'file.xlsx',
      blobPath: '',
      displayName: 'Category A',
      type: 'xlsx',
      size: 100,
      ...overrides,
    },
  };
}

export function createRunPageSpies(): RunPageSpies {
  const vehicleServiceSpy = jasmine.createSpyObj<VehicleService>(
    'VehicleService',
    ['getMyVehicleTypes', 'getMyVehicles'],
  );
  // The vehicle pool is loaded as part of the page's init flow, so every spec needs this to emit
  vehicleServiceSpy.getMyVehicles.and.returnValue(of([]));

  return {
    spinnerSpy: jasmine.createSpyObj<NgxSpinnerService>('NgxSpinnerService', [
      'show',
      'hide',
    ]),
    constraintServiceSpy: jasmine.createSpyObj<ConstraintService>(
      'ConstraintService',
      ['getDynamicParameters', 'updateDynamicParameter'],
    ),
    experimentServiceSpy: jasmine.createSpyObj<ExperimentService>(
      'ExperimentService',
      [
        'getExperiment',
        'getMyCompany',
        'getMyDepots',
        'validateExperiment',
        'submitExperiment',
        'replicateExperiment',
      ],
    ),
    ngbModalSpy: jasmine.createSpyObj<NgbModal>('NgbModal', ['open']),
    toastrSpy: jasmine.createSpyObj<ToastrService>('ToastrService', [
      'success',
      'error',
      'warning',
      'info',
    ]),
    preOrderServiceSpy: jasmine.createSpyObj<PreOrderService>(
      'PreOrderService',
      ['uploadPreOrder'],
    ),
    routerSpy: jasmine.createSpyObj<Router>('Router', ['navigate']),
    userServiceSpy: jasmine.createSpyObj<UserService>('UserService', [
      'getUserId',
    ]),
    configurationServiceSpy: jasmine.createSpyObj<ConfigurationService>(
      'ConfigurationService',
      ['getDatafromUrl'],
    ),
    dataServiceSpy: jasmine.createSpyObj<DataService>('DataService', [
      'saveData',
      'clearData',
    ]),
    exportServiceSpy: jasmine.createSpyObj<ExportFileService>(
      'ExportFileService',
      ['exportMultipleCsv'],
    ),
    vehicleServiceSpy,
    paramsSubject: new Subject<{ [key: string]: string }>(),
  };
}

// Declared components never render their template: the specs call methods directly, which keeps
// material and the other template dependencies out of the test module
export async function configureRunPage(
  options: { declarations?: Type<unknown>[] } = {},
): Promise<RunPageSpies> {
  const spies = createRunPageSpies();

  await TestBed.configureTestingModule({
    declarations: options.declarations ?? [],
    imports: [
      TranslocoTestingModule.forRoot({
        langs: { en: {} },
        translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
      }),
    ],
    providers: [
      { provide: NgxSpinnerService, useValue: spies.spinnerSpy },
      { provide: ConstraintService, useValue: spies.constraintServiceSpy },
      {
        provide: ActivatedRoute,
        useValue: { params: spies.paramsSubject.asObservable() },
      },
      { provide: ExperimentService, useValue: spies.experimentServiceSpy },
      { provide: NgbModal, useValue: spies.ngbModalSpy },
      { provide: ToastrService, useValue: spies.toastrSpy },
      { provide: PreOrderService, useValue: spies.preOrderServiceSpy },
      { provide: Router, useValue: spies.routerSpy },
      { provide: UserService, useValue: spies.userServiceSpy },
      { provide: ConfigurationService, useValue: spies.configurationServiceSpy },
      { provide: DataService, useValue: spies.dataServiceSpy },
      { provide: ExportFileService, useValue: spies.exportServiceSpy },
      { provide: VehicleService, useValue: spies.vehicleServiceSpy },
      ...RUN_PAGE_PROVIDERS,
    ],
    schemas: [NO_ERRORS_SCHEMA],
  }).compileComponents();

  return spies;
}
