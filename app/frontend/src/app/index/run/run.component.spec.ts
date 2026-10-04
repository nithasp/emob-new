import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { Subject, of, throwError } from 'rxjs';
import VectorSource from 'ol/source/Vector';

import { RunComponent, NgbTimeStringAdapter } from './run.component';
import { ConstraintService } from 'src/app/services/constraint.service';
import { ExperimentService } from 'src/app/services/experiment.service';
import { PreOrderService } from 'src/app/services/pre-order.service';
import { UserService } from 'src/app/services/user.service';
import { ConfigurationService } from 'src/app/services/configuration.service';
import { DataService } from 'src/app/services/data.service';
import { ExportFileService } from 'src/app/services/export-file.service';
import { VehicleService } from 'src/app/services/vehicle.service';
import {
  Experiment,
  ExperimentStatus,
  Run,
  MyDepot,
  Validate,
  TransformWarning,
  ValidationWarningItem,
  ValidateExperimentResponse,
  UploadPreOrderResponse,
} from 'src/app/models/experiment.model';
import {
  Customer,
  Depot,
  ReplaceType,
  ValidationType,
  PreOrderFileItem,
  PreOrderFileDescriptor,
  FileWithCategory,
} from 'src/app/models/pre-order.model';
import { DynamicParameter } from 'src/app/models/constraint.model';
import {
  VehicleType,
  VehicleProfileTypeEnum,
  OpenVrpRunVehicleEntry,
} from 'src/app/models/vehicle.model';
import {
  DataGroup,
  LocationType,
  Location,
} from 'src/app/models/location.model';

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
      plan: { vrpSolutionLean: null, geoJson: null, vrpStats: null },
    },
    ...overrides,
  } as Experiment;
}

function createCustomer(overrides: Partial<Customer> = {}): Customer {
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

function createDepot(overrides: Partial<Depot> = {}): Depot {
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

function createMyDepot(overrides: Partial<MyDepot> = {}): MyDepot {
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

function createDynamicParameter(
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

function createVehicleType(overrides: Partial<VehicleType> = {}): VehicleType {
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

function createRunEntry(
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

function createDataGroup(overrides: Partial<DataGroup> = {}): DataGroup {
  return {
    verify: { customers: [], type: LocationType.Verify },
    uncertain: { customers: [], type: LocationType.Uncertain },
    unverify: { customers: [], type: LocationType.Unverify },
    edit: { customers: [], type: LocationType.Edit },
    ...overrides,
  } as DataGroup;
}

function createFile(name: string, type: string, content = 'content'): File {
  return new File([content], name, { type });
}

function createFileDescriptorItem(
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

describe('RunComponent', () => {
  let component: RunComponent;
  let fixture: ComponentFixture<RunComponent>;

  let spinnerSpy: jasmine.SpyObj<NgxSpinnerService>;
  let constraintServiceSpy: jasmine.SpyObj<ConstraintService>;
  let experimentServiceSpy: jasmine.SpyObj<ExperimentService>;
  let ngbModalSpy: jasmine.SpyObj<NgbModal>;
  let toastrSpy: jasmine.SpyObj<ToastrService>;
  let preOrderServiceSpy: jasmine.SpyObj<PreOrderService>;
  let cdrDetectChangesSpy: jasmine.Spy;
  let routerSpy: jasmine.SpyObj<Router>;
  let userServiceSpy: jasmine.SpyObj<UserService>;
  let configurationServiceSpy: jasmine.SpyObj<ConfigurationService>;
  let dataServiceSpy: jasmine.SpyObj<DataService>;
  let exportServiceSpy: jasmine.SpyObj<ExportFileService>;
  let vehicleServiceSpy: jasmine.SpyObj<VehicleService>;
  let paramsSubject: Subject<{ [key: string]: string }>;

  beforeEach(async () => {
    spinnerSpy = jasmine.createSpyObj('NgxSpinnerService', ['show', 'hide']);
    constraintServiceSpy = jasmine.createSpyObj('ConstraintService', [
      'getDynamicParameters',
      'updateDynamicParameter',
    ]);
    experimentServiceSpy = jasmine.createSpyObj('ExperimentService', [
      'getExperiment',
      'getMyCompany',
      'getMyDepots',
      'validateExperiment',
      'submitExperiment',
      'replicateExperiment',
    ]);
    ngbModalSpy = jasmine.createSpyObj('NgbModal', ['open']);
    toastrSpy = jasmine.createSpyObj('ToastrService', [
      'success',
      'error',
      'warning',
      'info',
    ]);
    preOrderServiceSpy = jasmine.createSpyObj('PreOrderService', [
      'uploadPreOrder',
    ]);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    userServiceSpy = jasmine.createSpyObj('UserService', [
      'getUserId',
    ]);
    configurationServiceSpy = jasmine.createSpyObj('ConfigurationService', [
      'getDatafromUrl',
    ]);
    dataServiceSpy = jasmine.createSpyObj('DataService', [
      'saveData',
      'clearData',
    ]);
    exportServiceSpy = jasmine.createSpyObj('ExportFileService', [
      'exportMultipleCsv',
    ]);
    vehicleServiceSpy = jasmine.createSpyObj('VehicleService', [
      'getMyVehicleTypes',
      'getMyVehicles',
    ]);
    // The Open VRP vehicle pool is loaded as part of the init flow, so every
    // spec needs this to emit; individual specs override it when the pool's
    // contents matter.
    vehicleServiceSpy.getMyVehicles.and.returnValue(of([]));
    paramsSubject = new Subject<{ [key: string]: string }>();

    await TestBed.configureTestingModule({
      declarations: [RunComponent],
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { en: {} },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
        }),
      ],
      providers: [
        { provide: NgxSpinnerService, useValue: spinnerSpy },
        { provide: ConstraintService, useValue: constraintServiceSpy },
        {
          provide: ActivatedRoute,
          useValue: { params: paramsSubject.asObservable() },
        },
        { provide: ExperimentService, useValue: experimentServiceSpy },
        { provide: NgbModal, useValue: ngbModalSpy },
        { provide: ToastrService, useValue: toastrSpy },
        { provide: PreOrderService, useValue: preOrderServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: UserService, useValue: userServiceSpy },
        { provide: ConfigurationService, useValue: configurationServiceSpy },
        { provide: DataService, useValue: dataServiceSpy },
        { provide: ExportFileService, useValue: exportServiceSpy },
        { provide: VehicleService, useValue: vehicleServiceSpy },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(RunComponent);
    component = fixture.componentInstance;
    // ChangeDetectorRef is a special per-view token that Angular's element
    // injector resolves ahead of any DI `providers` override, so instead of
    // trying to substitute it via TestBed we spy directly on the real
    // instance's detectChanges() and stub it out (its real behavior would
    // render the ~1585-line template, which is out of scope here).
    cdrDetectChangesSpy = spyOn((component as any).cdr, 'detectChanges');
    // We deliberately never call fixture.detectChanges(): RunComponent's
    // ngAfterViewInit() drives a large, deeply-chained init flow (vehicle
    // types -> experiment -> user id -> dynamic params/map/depots), and its
    // ~1585-line template is out of scope per task instructions. Instead we
    // invoke lifecycle hooks and methods directly against the component
    // instance, which never triggers template rendering.
  });

  afterEach(() => {
    document.getElementById('popup')?.remove();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('NgbTimeStringAdapter', () => {
    const adapter = new NgbTimeStringAdapter();

    it('fromModel() parses "HH:mm" and "HH:mm:ss" strings', () => {
      expect(adapter.fromModel('08:30')).toEqual({ hour: 8, minute: 30 } as any);
      expect(adapter.fromModel('08:30:15')).toEqual({
        hour: 8,
        minute: 30,
        second: 15,
      } as any);
    });

    it('fromModel() returns null for null/empty/"null" values', () => {
      expect(adapter.fromModel(null)).toBeNull();
      expect(adapter.fromModel('')).toBeNull();
      expect(adapter.fromModel('null')).toBeNull();
    });

    it('fromModel() defaults unparsable segments to 0', () => {
      expect(adapter.fromModel('abc:def')).toEqual({
        hour: 0,
        minute: 0,
      } as any);
    });

    it('toModel() pads hour/minute and returns null for null input', () => {
      expect(adapter.toModel({ hour: 8, minute: 5, second: 0 })).toBe('08:05');
      expect(adapter.toModel(null)).toBeNull();
    });
  });

  describe('generateUniqueId()', () => {
    it('returns a unique, prefixed id on each call', () => {
      const a = component.generateUniqueId();
      const b = component.generateUniqueId();
      expect(a).not.toBe(b);
      expect(a.startsWith('f-')).toBeTrue();
    });
  });

  describe('requiredFileTypes / isFileTypeRequired / isFileTypeAlreadyAdded', () => {
    beforeEach(() => {
      (component as any).depotInputDataItems = [
        {
          keyName: 'k1',
          displayName: 'Category A',
          columnRequired: [],
          required: true,
        },
        {
          keyName: 'k2',
          displayName: 'Category B',
          columnRequired: [],
          required: false,
        },
      ];
    });

    it('requiredFileTypes returns the display names', () => {
      expect(component.requiredFileTypes).toEqual([
        'Category A',
        'Category B',
      ]);
    });

    it('isFileTypeRequired() reflects the matching item, false when missing', () => {
      expect(component.isFileTypeRequired('Category A')).toBeTrue();
      expect(component.isFileTypeRequired('Category B')).toBeFalse();
      expect(component.isFileTypeRequired('Unknown')).toBeFalse();
    });

    it('isFileTypeAlreadyAdded() checks preOrderFiles by displayName', () => {
      component.preOrderFiles = [
        createFileDescriptorItem('f1', { displayName: 'Category A' }),
      ];
      expect(component.isFileTypeAlreadyAdded('Category A')).toBeTrue();
      expect(component.isFileTypeAlreadyAdded('Category B')).toBeFalse();
    });
  });

  describe('trackByGroup() / trackByParam()', () => {
    it('trackByGroup returns the group key', () => {
      expect(component.trackByGroup(0, { key: 'General', items: [] })).toBe(
        'General'
      );
    });

    it('trackByParam returns the id, or a composite fallback', () => {
      expect(
        component.trackByParam(0, createDynamicParameter({ id: 'p1' }))
      ).toBe('p1');
      expect(
        component.trackByParam(
          2,
          createDynamicParameter({ id: '', depotId: 'd1', keyName: 'k' })
        )
      ).toBe('d1-k-2');
    });
  });

  describe('ngOnInit()', () => {
    it('shows the spinner', () => {
      component.ngOnInit();
      expect(spinnerSpy.show).toHaveBeenCalled();
    });
  });

  describe('ngAfterViewInit()', () => {
    beforeEach(() => {
      // ngAfterViewInit() reads history.state.isCreateMode; jsdom-less Karma
      // starts with history.state === null, so seed it to avoid a TypeError.
      history.replaceState({ isCreateMode: false }, '');
      document.body.insertAdjacentHTML('beforeend', '<div id="popup"></div>');
      vehicleServiceSpy.getMyVehicleTypes.and.returnValue(of([]));
      experimentServiceSpy.getMyCompany.and.returnValue(
        of({ companyName: 'Acme', depotType: 'x' })
      );
      experimentServiceSpy.getMyDepots.and.returnValue(of([]));
    });

    it('loads vehicle types then the experiment, and skips straight to file preview when there is no historical input data', fakeAsync(() => {
      userServiceSpy.getUserId.and.returnValue(of('user-1'));
      constraintServiceSpy.getDynamicParameters.and.returnValue(of([]));
      const experiment = createExperiment({
        triggeredBy: 'user-1',
        status: ExperimentStatus.Initializing,
        inputdata: [],
      });
      experimentServiceSpy.getExperiment.and.returnValue(of(experiment));

      component.ngAfterViewInit();
      tick(100);

      paramsSubject.next({ runId: 'run-1' });
      tick();

      expect(experimentServiceSpy.getExperiment).toHaveBeenCalledWith('run-1');
      expect(component.experiment.runId).toBe('run-1');
      expect(component.isFilePreview).toBeTrue();
      expect(spinnerSpy.hide).toHaveBeenCalled();
    }));

    it('shows a confirmation dialog and navigates away when the experiment is in a terminal status', fakeAsync(() => {
      const experiment = createExperiment({ status: ExperimentStatus.Failed });
      experimentServiceSpy.getExperiment.and.returnValue(of(experiment));
      ngbModalSpy.open.and.returnValue({
        componentInstance: {},
        result: Promise.resolve(true),
      } as unknown as NgbModalRef);

      component.ngAfterViewInit();
      tick(100);

      paramsSubject.next({ runId: 'run-1' });
      tick();

      expect(ngbModalSpy.open).toHaveBeenCalled();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/users/experiments']);
    }));
  });

  describe('isVerified / isUncertain / isUnverified / isEdited', () => {
    beforeEach(() => {
      component.uploadDataGroupCustomers = createDataGroup({
        verify: {
          customers: [createCustomer({ name: 'V1' })],
          type: LocationType.Verify,
        },
        uncertain: {
          customers: [createCustomer({ name: 'U1' })],
          type: LocationType.Uncertain,
        },
        unverify: {
          customers: [createCustomer({ name: 'W1' })],
          type: LocationType.Unverify,
        },
        edit: {
          customers: [createCustomer({ name: 'E1' })],
          type: LocationType.Edit,
        },
      });
    });

    it('classifies orderIds according to the matching bucket', () => {
      expect(component.isVerified('V1')).toBeTrue();
      expect(component.isUncertain('U1')).toBeTrue();
      expect(component.isUnverified('W1')).toBeTrue();
      expect(component.isEdited('E1')).toBeTrue();
      expect(component.isVerified('U1')).toBeFalse();
    });

    it('returns false for every bucket when uploadDataGroupCustomers is unset', () => {
      component.uploadDataGroupCustomers = null;
      expect(component.isVerified('V1')).toBeFalse();
      expect(component.isUncertain('V1')).toBeFalse();
      expect(component.isUnverified('V1')).toBeFalse();
      expect(component.isEdited('V1')).toBeFalse();
    });
  });

  describe('tab navigation', () => {
    it('getNextTab()/getPreviousTab() route around missing vehicle/parameter tabs', () => {
      // No vehicle types, no dynamic parameters -> Orders Data goes straight to Validation
      expect(component.getNextTab(1)).toBe(4);
      expect(component.getPreviousTab(4)).toBe(1);

      component.myVehicleTypes = [createVehicleType()];
      expect(component.getNextTab(1)).toBe(2);
      expect(component.getPreviousTab(4)).toBe(2);

      component.dynamicParametersByCategory = [
        { key: 'General', items: [createDynamicParameter()] },
      ];
      expect(component.getNextTab(2)).toBe(3);
      expect(component.getPreviousTab(3)).toBe(2);
      expect(component.getNextTab(3)).toBe(4);
      expect(component.getNextTab(4)).toBe(4);
      expect(component.getPreviousTab(1)).toBe(1);
    });

    it('navigateToTab() sets activeNavId and triggers change detection', () => {
      component.navigateToTab(3);
      expect(component.activeNavId).toBe(3);
      expect(cdrDetectChangesSpy).toHaveBeenCalled();
    });

    it('navigateToTab(2) refreshes dynamic parameters for the selected depot', () => {
      spyOn(component, 'refreshDynamicParametersForSelectedDepot');
      component.navigateToTab(2);
      expect(
        component.refreshDynamicParametersForSelectedDepot
      ).toHaveBeenCalled();
    });

    it('navigateToNextTab()/navigateToPreviousTab() delegate to getNextTab/getPreviousTab', () => {
      component.activeNavId = 1;
      component.navigateToNextTab();
      expect(component.activeNavId).toBe(4);

      component.navigateToPreviousTab();
      expect(component.activeNavId).toBe(1);
    });
  });

  describe('buildValidateParameterFromDynamic() / buildVehiclesPayload() / normalizeKeyName()', () => {
    it('maps known keyNames to Constraint keys and normalizes unknown ones', () => {
      component.dynamicParametersByCategory = [
        {
          key: 'General',
          items: [
            createDynamicParameter({
              keyName: 'EarlyDeliveryTime',
              valueType: 'time',
              value: '09:00',
            }),
            createDynamicParameter({
              keyName: 'NumberOfVehicleAvailable',
              valueType: 'number',
              value: 5,
            }),
            createDynamicParameter({
              keyName: 'SomeOtherKey',
              valueType: 'text',
              value: 'abc',
            }),
          ],
        },
      ];

      const payload = component.buildValidateParameterFromDynamic();

      expect(payload.earlyDeliveryTime).toBe('09:00');
      expect((payload as any).numberOfVehicleAvailable).toBe(5);
      expect((payload as any).someOtherKey).toBe('abc');
    });

    it('defaults blank/"null" time values to 00:00', () => {
      component.dynamicParametersByCategory = [
        {
          key: 'General',
          items: [
            createDynamicParameter({
              keyName: 'BackToDepotTime',
              valueType: 'time',
              value: 'null',
            }),
          ],
        },
      ];
      expect(
        component.buildValidateParameterFromDynamic().backToDepotTime
      ).toBe('00:00');
    });

    it('buildVehiclesPayload() builds count-mode and license-plate-mode entries', () => {
      component.runVehicleList.push(
        createRunEntry({ vehicleTypeId: 'v1', mode: 'count', count: 3 }),
        createRunEntry({
          vehicleTypeId: 'v2',
          mode: 'license-plate',
          count: 2,
          vehicleIds: ['LP1', 'LP2'],
          licensePlates: ['LP1', 'LP2'],
        })
      );

      expect(component.buildVehiclesPayload()).toEqual([
        { vehicleTypeId: 'v1', numberOfVehiclesAvailable: 3 },
        { vehicleTypeId: 'v2', vehicleId: ['LP1', 'LP2'] },
      ]);
    });

    it('buildVehiclesPayload() aggregates several run-list rows of one type', () => {
      // The run list may hold the same vehicle type more than once, one row per
      // set of routing conditions. The validation contract takes one entry per
      // type, so the rows are summed (and plates de-duplicated) here.
      component.runVehicleList.push(
        createRunEntry({ vehicleTypeId: 'v1', mode: 'count', count: 3 }),
        createRunEntry({
          vehicleTypeId: 'v1',
          mode: 'count',
          count: 2,
          endOfRoute: 'no_return',
        }),
        createRunEntry({
          vehicleTypeId: 'v2',
          mode: 'license-plate',
          count: 1,
          vehicleIds: ['LP1'],
          licensePlates: ['LP1'],
        }),
        createRunEntry({
          vehicleTypeId: 'v2',
          mode: 'license-plate',
          count: 2,
          vehicleIds: ['LP1', 'LP2'],
          licensePlates: ['LP1', 'LP2'],
          endOfRoute: 'no_return',
        })
      );

      expect(component.buildVehiclesPayload()).toEqual([
        { vehicleTypeId: 'v1', numberOfVehiclesAvailable: 5 },
        { vehicleTypeId: 'v2', vehicleId: ['LP1', 'LP2'] },
      ]);
    });

    it('normalizeKeyName() lowercases the first letter and handles null/blank', () => {
      expect((component as any).normalizeKeyName('BackToDepotTime')).toBe(
        'backToDepotTime'
      );
      expect((component as any).normalizeKeyName(null)).toBe('');
      expect((component as any).normalizeKeyName('  ')).toBe('');
    });
  });

  describe('getConstraintKeyForParam()', () => {
    it('maps known PascalCase/camelCase keyNames, else returns null', () => {
      expect(
        component.getConstraintKeyForParam(
          createDynamicParameter({ keyName: 'MaximumTravelDistance' })
        )
      ).toBe('maximumTravelDistance');
      expect(
        component.getConstraintKeyForParam(
          createDynamicParameter({ keyName: 'minimumVehicle' })
        )
      ).toBe('minimumVehicle');
      expect(
        component.getConstraintKeyForParam(
          createDynamicParameter({ keyName: 'unknownKey' })
        )
      ).toBeNull();
    });
  });

  describe('isOriginalExperiment()', () => {
    it('reflects experiment.run', () => {
      component.experiment = createExperiment({ run: Run.Original });
      expect(component.isOriginalExperiment()).toBeTrue();
      component.experiment = createExperiment({ run: Run.Rerun });
      expect(component.isOriginalExperiment()).toBeFalse();
    });
  });

  describe('duplicate-file / warning helpers', () => {
    it('hasDuplicateCategory() flags files sharing a displayName', () => {
      const a = createFileDescriptorItem('a', { displayName: 'Category A' });
      const b = createFileDescriptorItem('b', { displayName: 'Category A' });
      component.preOrderFiles = [a, b];
      expect(component.hasDuplicateCategory(a)).toBeTrue();

      component.preOrderFiles = [a];
      expect(component.hasDuplicateCategory(a)).toBeFalse();
    });

    it('hasDuplicateFileName()/hasDuplicateFileSize() require matching name (and size)', () => {
      const a = createFileDescriptorItem('a', { name: 'same.xlsx', size: 10 });
      const b = createFileDescriptorItem('b', { name: 'same.xlsx', size: 10 });
      const c = createFileDescriptorItem('c', { name: 'same.xlsx', size: 99 });
      component.preOrderFiles = [a, b, c];

      expect(component.hasDuplicateFileName(a)).toBeTrue();
      expect(component.hasDuplicateFileSize(a)).toBeTrue();
      expect(component.hasDuplicateFileSize(c)).toBeFalse();
    });

    it('getFileWarningMessages()/hasFileWarning() report duplicate name/size', () => {
      const a = createFileDescriptorItem('a', { name: 'same.xlsx', size: 10 });
      const b = createFileDescriptorItem('b', { name: 'same.xlsx', size: 10 });
      component.preOrderFiles = [a, b];

      expect(component.hasFileWarning(a)).toBeTrue();
      expect(component.getFileWarningMessages(a).length).toBe(2);
    });

    it('getAllErrorMessages() combines warning and duplicate-category messages', () => {
      const a = createFileDescriptorItem('a', {
        name: 'same.xlsx',
        size: 10,
        displayName: 'Category A',
      });
      const b = createFileDescriptorItem('b', {
        name: 'same.xlsx',
        size: 10,
        displayName: 'Category A',
      });
      component.preOrderFiles = [a, b];

      const message = component.getAllErrorMessages(a);
      expect(message.length).toBeGreaterThan(0);
      expect(message.split(', ').length).toBe(3); // dup name + dup size + dup category
    });

    it('hasAnyDuplicateCategories() reflects whether any file has a duplicate category', () => {
      const a = createFileDescriptorItem('a', { displayName: 'Category A' });
      const b = createFileDescriptorItem('b', { displayName: 'Category A' });
      component.preOrderFiles = [a, b];
      expect(component.hasAnyDuplicateCategories()).toBeTrue();

      component.preOrderFiles = [a];
      expect(component.hasAnyDuplicateCategories()).toBeFalse();
    });
  });

  describe('isFileWithCategory() / findMatchingInputDataItem()', () => {
    it('distinguishes real File objects from plain descriptors', () => {
      expect(
        component.isFileWithCategory(
          createFile('a.xlsx', 'application/vnd.ms-excel')
        )
      ).toBeTrue();
      expect(
        component.isFileWithCategory({
          keyName: 'k1',
          name: 'a.xlsx',
        } as unknown as FileWithCategory)
      ).toBeFalse();
      expect(component.isFileWithCategory(null)).toBeFalse();
    });

    it('findMatchingInputDataItem() matches when all required columns are present', () => {
      (component as any).depotInputDataItems = [
        { keyName: 'k1', displayName: 'Category A', columnRequired: ['COL1', 'COL2'] },
      ];
      expect(
        component.findMatchingInputDataItem(['COL1', 'COL2', 'EXTRA'])?.keyName
      ).toBe('k1');
      expect(component.findMatchingInputDataItem(['COL1'])).toBeNull();
    });
  });

  describe('updateInputDataKeysFromDepot() / updateCanUploadState()', () => {
    it('updateInputDataKeysFromDepot() dedupes by keyName and updates canUpload state', () => {
      const depot = createMyDepot({
        inputdata: [
          {
            companyName: 'Acme',
            depotId: 'depot-1',
            keyName: 'k1',
            displayName: 'Category A',
            columnRequired: ['COL1'],
            fileFormatType: 'xlsx',
            required: true,
            createdAt: '',
            modifiedAt: '',
          },
          {
            companyName: 'Acme',
            depotId: 'depot-1',
            keyName: 'k1',
            displayName: 'Category A (dup)',
            columnRequired: ['COL1'],
            fileFormatType: 'xlsx',
            required: true,
            createdAt: '',
            modifiedAt: '',
          },
        ],
      });

      component.updateInputDataKeysFromDepot(depot);

      expect(component.inputDataKeys.length).toBe(1);
      expect(component.canUpload).toBeFalse(); // no files uploaded yet
    });

    it('updateCanUploadState() requires all required categories to be present, ignores optional ones', () => {
      (component as any).depotInputDataItems = [
        {
          keyName: 'k1',
          displayName: 'Category A',
          columnRequired: [],
          required: true,
        },
        {
          keyName: 'k2',
          displayName: 'Category B',
          columnRequired: [],
          required: false,
        },
      ];
      component.preOrderFiles = [];
      component.updateCanUploadState();
      expect(component.canUpload).toBeFalse();

      component.preOrderFiles = [
        createFileDescriptorItem('f1', { displayName: 'Category A' }),
      ];
      component.updateCanUploadState();
      expect(component.canUpload).toBeTrue();
    });

    it('updateCanUploadState() blocks upload when categories are duplicated', () => {
      (component as any).depotInputDataItems = [
        {
          keyName: 'k1',
          displayName: 'Category A',
          columnRequired: [],
          required: false,
        },
      ];
      component.preOrderFiles = [
        createFileDescriptorItem('a', { displayName: 'Category A' }),
        createFileDescriptorItem('b', { displayName: 'Category A' }),
      ];
      component.updateCanUploadState();
      expect(component.canUpload).toBeFalse();
    });
  });

  describe('getBackendLocaleKey() / getLocalized()', () => {
    it('uses the active language to pick a localized key', () => {
      expect(component.getBackendLocaleKey()).toBe('en_US');
      expect(component.getLocalized({ th_TH: 'ไทย', en_US: 'English' })).toBe(
        'English'
      );
    });

    it('parses JSON-encoded localized text and falls back to the raw string otherwise', () => {
      expect(
        component.getLocalized(
          JSON.stringify({ th_TH: 'ไทย', en_US: 'English' })
        )
      ).toBe('English');
      expect(component.getLocalized('not json')).toBe('not json');
      expect(component.getLocalized(null)).toBe('');
      expect(component.getLocalized(undefined)).toBe('');
    });
  });

  describe('getSelectedDepotObject()', () => {
    it('finds the depot matching selectedDepotIdName', () => {
      const depot = createMyDepot({ depotName: 'Depot X' });
      component.depots = [depot];
      component.selectedDepotIdName = 'Depot X';
      expect(component.getSelectedDepotObject()).toBe(depot);

      component.selectedDepotIdName = null;
      expect(component.getSelectedDepotObject()).toBeUndefined();
    });
  });

  describe('isTimeType() / isNumberType() / hasMeaningfulConstraintsData() / isOverWeightKey() / isOverDistanceKey()', () => {
    it('classifies dynamic parameter value types', () => {
      expect(
        component.isTimeType(createDynamicParameter({ valueType: 'time' }))
      ).toBeTrue();
      expect(
        component.isTimeType(createDynamicParameter({ valueType: 'Duration' }))
      ).toBeTrue();
      expect(
        component.isTimeType(createDynamicParameter({ valueType: 'number' }))
      ).toBeFalse();
      expect(
        component.isNumberType(
          createDynamicParameter({ valueType: 'number-int' })
        )
      ).toBeTrue();
      expect(
        component.isNumberType(createDynamicParameter({ valueType: 'time' }))
      ).toBeFalse();
    });

    it('hasMeaningfulConstraintsData() is true once any constraint value is meaningfully set', () => {
      expect(component.hasMeaningfulConstraintsData()).toBeFalse();
      component.constraintsData = {
        ...component.constraintsData,
        earlyDeliveryTime: '09:00',
      };
      expect(component.hasMeaningfulConstraintsData()).toBeTrue();
    });

    it('hasMeaningfulConstraintsData() is true whenever validateExperiment is set', () => {
      component.validateExperiment = {} as Validate;
      expect(component.hasMeaningfulConstraintsData()).toBeTrue();
    });

    it('isOverWeightKey()/isOverDistanceKey() match the well-known keyNames', () => {
      expect(
        component.isOverWeightKey(
          createDynamicParameter({ keyName: 'VehicleOrderSizeCapacity' })
        )
      ).toBeTrue();
      expect(
        component.isOverDistanceKey(
          createDynamicParameter({ keyName: 'MaximumTravelDistance' })
        )
      ).toBeTrue();
      expect(
        component.isOverWeightKey(createDynamicParameter({ keyName: 'Other' }))
      ).toBeFalse();
    });
  });

  describe('vehicle selection helpers', () => {
    beforeEach(() => {
      component.myVehicleTypes = [
        createVehicleType({
          vehicleTypeId: 'v1',
          name: 'Truck A',
          isVehicleAvailable: true,
        }),
        createVehicleType({
          vehicleTypeId: 'v2',
          name: 'Truck B',
          isVehicleAvailable: false,
        }),
      ];
    });

    it('availableVehicleTypes filters to available vehicles', () => {
      expect(component.availableVehicleTypes.map((v) => v.vehicleTypeId)).toEqual(
        ['v1']
      );
    });

    it('isVehicleSelected() reflects selectedVehicleIds', () => {
      component.selectedVehicleIds = ['v1'];
      expect(component.isVehicleSelected('v1')).toBeTrue();
      expect(component.isVehicleSelected('v2')).toBeFalse();
    });

    it('onVehicleChecked() adds defaults on check and clears state on uncheck', () => {
      component.onVehicleChecked('v1', true);
      expect(component.selectedVehicleIds).toEqual(['v1']);
      expect(component.selectedVehicleCounts['v1']).toBe(1);
      expect(component.vehicleSelectionMode['v1']).toBe('count');
      expect(cdrDetectChangesSpy).toHaveBeenCalled();

      component.onVehicleChecked('v1', false);
      expect(component.selectedVehicleIds).toEqual([]);
      expect(component.selectedVehicleCounts['v1']).toBeUndefined();
      expect(component.vehicleSelectionMode['v1']).toBeUndefined();
    });

    it('getVehicleName() looks up by id, blank when not found', () => {
      expect(component.getVehicleName('v1')).toBe('Truck A');
      expect(component.getVehicleName('missing')).toBe('');
    });

    it('getVehicleCount() defaults to 1 when unset', () => {
      expect(component.getVehicleCount('v1')).toBe(1);
      component.selectedVehicleCounts['v1'] = 4;
      expect(component.getVehicleCount('v1')).toBe(4);
    });

    it('onVehicleCountChange() clamps between min and max', () => {
      component.constraintsData = {
        ...component.constraintsData,
        numberOfVehicleAvailable: 5,
      };
      component.onVehicleCountChange('v1', 100);
      expect(component.selectedVehicleCounts['v1']).toBe(5);

      component.onVehicleCountChange('v1', -3);
      expect(component.selectedVehicleCounts['v1']).toBe(0);
    });

    it('getVehicleMaxCount() falls back to the default when no constraint is set', () => {
      expect(component.getVehicleMaxCount('v1')).toBe(1000);
      component.constraintsData = {
        ...component.constraintsData,
        numberOfVehicleAvailable: 12,
      };
      expect(component.getVehicleMaxCount('v1')).toBe(12);
    });

    it('getVehicleMinCount() is always 0', () => {
      expect(component.getVehicleMinCount()).toBe(0);
    });

    it('getVehicleSelectionMode() defaults to "count"', () => {
      expect(component.getVehicleSelectionMode('v1')).toBe('count');
      component.vehicleSelectionMode['v1'] = 'license-plate';
      expect(component.getVehicleSelectionMode('v1')).toBe('license-plate');
    });

    it('getSelectedLicensePlatesCount() reflects the tracked array length', () => {
      expect(component.getSelectedLicensePlatesCount('v1')).toBe(0);
      component.selectedLicensePlates['v1'] = ['LP1', 'LP2'];
      expect(component.getSelectedLicensePlatesCount('v1')).toBe(2);
    });
  });

  describe('hasDynamicParameters() / hasMyVehicleTypes() / getInvalidVehicleSelections()', () => {
    it('hasDynamicParameters()/hasMyVehicleTypes() reflect populated arrays', () => {
      expect(component.hasDynamicParameters()).toBeFalse();
      expect(component.hasMyVehicleTypes()).toBeFalse();

      component.dynamicParametersByCategory = [
        { key: 'G', items: [createDynamicParameter()] },
      ];
      component.myVehicleTypes = [createVehicleType()];
      expect(component.hasDynamicParameters()).toBeTrue();
      expect(component.hasMyVehicleTypes()).toBeTrue();
    });

    it('getInvalidVehicleSelections() flags license-plate mode vehicles with no plates chosen', () => {
      component.selectedVehicleIds = ['v1', 'v2'];
      component.vehicleSelectionMode = { v1: 'license-plate', v2: 'count' };
      component.selectedVehicleIdsByLicensePlate = {};
      expect(component.getInvalidVehicleSelections()).toEqual(['v1']);

      component.selectedVehicleIdsByLicensePlate = { v1: ['LP1'] };
      expect(component.getInvalidVehicleSelections()).toEqual([]);
    });
  });

  describe('transform warnings', () => {
    it('setTransformWarnings() dedupes details sharing the same input, defaults collapse states to collapsed', () => {
      const warnings: TransformWarning[] = [
        {
          title: 'products',
          detail: [
            { input: 'A', type: 't1' },
            { input: 'A', type: 't1' },
            { input: 'B', type: 't1' },
          ],
        },
      ];
      component.setTransformWarnings(warnings);
      expect(component.transformWarnings[0].detail.length).toBe(2);
      expect(component.transformWarningCollapseStates).toEqual([true]);
    });

    it('toggleTransformWarningCollapse() flips the state at the given index', () => {
      component.transformWarningCollapseStates = [true];
      component.toggleTransformWarningCollapse(0);
      expect(component.transformWarningCollapseStates[0]).toBeFalse();
    });

    it('getWarningTitle() maps known titles, passes through unknown ones', () => {
      expect(component.getWarningTitle('unknown_title')).toBe('unknown_title');
      expect(component.getWarningTitle('products')).not.toBe('');
    });

    it('getWarningTypeLabel() falls back to the unknown-validation-error message', () => {
      const label = component.getWarningTypeLabel('some type');
      expect(label).toBe('validation.unknown_validation_error');
    });
  });

  describe('validation warnings', () => {
    const warning: ValidationWarningItem = {
      errorType: 'missing_product',
      title: 'file.xlsx',
      detail: [
        { input: 'A', type: 't1' },
        { input: 'A', type: 't1' },
      ],
    };

    it('setValidationWarnings() dedupes missing_product details and resets collapse states', () => {
      component.setValidationWarnings([warning]);
      expect(component.validationWarnings[0].detail.length).toBe(1);
      expect(component.validationWarningCollapseStates).toEqual([false]);
    });

    it('getRowsForWarning() delegates to buildTableRows (one row per detail, unlike setValidationWarnings it does not dedupe)', () => {
      expect(component.getRowsForWarning(warning).length).toBe(2);
    });

    it('toggleValidationWarningCollapse() flips the state at the given index', () => {
      component.validationWarningCollapseStates = [false];
      component.toggleValidationWarningCollapse(0);
      expect(component.validationWarningCollapseStates[0]).toBeTrue();
    });
  });

  describe('resetFileInput() / deleteFileInList()', () => {
    it('resetFileInput() clears the input element value', () => {
      const input = document.createElement('input');
      input.value = 'C:\\fakepath\\file.xlsx';
      component.resetFileInput({ target: input } as unknown as Event);
      expect(input.value).toBe('');
    });

    it('deleteFileInList() blocks deletion for non-Original experiments still awaiting upload completion', () => {
      component.experiment = createExperiment({
        run: Run.Rerun,
        status: ExperimentStatus.Succeeded,
      });
      component.preOrderFiles = [createFileDescriptorItem('a')];
      ngbModalSpy.open.and.returnValue({
        componentInstance: {},
      } as unknown as NgbModalRef);

      component.deleteFileInList(0);

      expect(toastrSpy.warning).toHaveBeenCalled();
      expect(ngbModalSpy.open).toHaveBeenCalled();
      expect(component.preOrderFiles.length).toBe(1);
    });

    it('deleteFileInList() removes the file for an Original experiment', fakeAsync(() => {
      component.experiment = createExperiment({ run: Run.Original });
      component.preOrderFiles = [createFileDescriptorItem('a')];
      (component as any).vectorSource = new VectorSource();

      component.deleteFileInList(0);
      tick(1000);

      expect(component.preOrderFiles.length).toBe(0);
      expect(spinnerSpy.show).toHaveBeenCalled();
      expect(spinnerSpy.hide).toHaveBeenCalled();
    }));
  });

  describe('onFileSelected()', () => {
    it('rejects non-excel file types and does not call uploadFile', () => {
      spyOn(component, 'uploadFile');
      const input = document.createElement('input');
      Object.defineProperty(input, 'files', {
        value: [createFile('bad.txt', 'text/plain')],
      });
      ngbModalSpy.open.and.returnValue({
        componentInstance: {},
      } as unknown as NgbModalRef);

      component.onFileSelected({ target: input } as unknown as Event);

      expect(toastrSpy.error).toHaveBeenCalled();
      expect(ngbModalSpy.open).toHaveBeenCalled();
      expect(component.uploadFile).not.toHaveBeenCalled();
    });

    it('warns and uses only the first file when multiple files are selected', () => {
      spyOn(component, 'uploadFile');
      const input = document.createElement('input');
      Object.defineProperty(input, 'files', {
        value: [
          createFile('a.xlsx', 'application/vnd.ms-excel'),
          createFile('b.xlsx', 'application/vnd.ms-excel'),
        ],
      });

      component.onFileSelected({ target: input } as unknown as Event);

      expect(toastrSpy.warning).toHaveBeenCalled();
      expect(component.uploadFile).toHaveBeenCalled();
    });

    it('does nothing when no files are present', () => {
      spyOn(component, 'uploadFile');
      const input = document.createElement('input');
      Object.defineProperty(input, 'files', { value: [] });

      component.onFileSelected({ target: input } as unknown as Event);

      expect(component.uploadFile).not.toHaveBeenCalled();
    });
  });

  describe('uploadFile()', () => {
    it('adds a new file directly when there is no conflicting category', fakeAsync(() => {
      spyOn(component, 'validateSingleFileAgainstDepot').and.returnValue(
        Promise.resolve({
          isValid: true,
          keyName: 'k1',
          displayName: 'Category A',
          columnNames: [],
        })
      );
      const file = createFile('new.xlsx', 'application/vnd.ms-excel');

      component.uploadFile(file);
      tick();

      expect(component.preOrderFiles.length).toBe(1);
      expect(component.preOrderFiles[0].file.displayName).toBe('Category A');
      expect(component.isFilePreview).toBeTrue();
    }));

    it('does nothing when validation against the depot fails', fakeAsync(() => {
      spyOn(component, 'validateSingleFileAgainstDepot').and.returnValue(
        Promise.resolve({ isValid: false })
      );
      const file = createFile('new.xlsx', 'application/vnd.ms-excel');

      component.uploadFile(file);
      tick();

      expect(component.preOrderFiles.length).toBe(0);
    }));

    it('prompts a replace-confirmation dialog when a file of the same category already exists', fakeAsync(() => {
      const existing = createFileDescriptorItem('existing', {
        keyName: 'k1',
        displayName: 'Category A',
      });
      component.preOrderFiles = [existing];
      spyOn(component, 'validateSingleFileAgainstDepot').and.returnValue(
        Promise.resolve({
          isValid: true,
          keyName: 'k1',
          displayName: 'Category A',
          columnNames: [],
        })
      );
      ngbModalSpy.open.and.returnValue({
        componentInstance: {},
        result: Promise.resolve({ replace: true }),
      } as unknown as NgbModalRef);
      const file = createFile('replacement.xlsx', 'application/vnd.ms-excel');

      component.uploadFile(file);
      tick();

      expect(ngbModalSpy.open).toHaveBeenCalled();
      expect(component.preOrderFiles[0].file.name).toBe('replacement.xlsx');
    }));
  });

  describe('handleUploadSubmit()', () => {
    beforeEach(() => {
      component.experiment = createExperiment();
      component.preOrderFiles = [
        {
          id: 'f1',
          file: createFile(
            'a.xlsx',
            'application/vnd.ms-excel'
          ) as FileWithCategory,
        },
      ];
    });

    it('uploads and refreshes the experiment on confirmation', fakeAsync(() => {
      ngbModalSpy.open.and.returnValue({
        componentInstance: {},
        result: Promise.resolve(true),
      } as unknown as NgbModalRef);
      const uploadResponse: UploadPreOrderResponse = {
        name: 'Test Run',
        result: { isSuccesses: true },
      };
      preOrderServiceSpy.uploadPreOrder.and.returnValue(of(uploadResponse));
      experimentServiceSpy.getExperiment.and.returnValue(
        of(createExperiment({ name: 'Test Run' }))
      );
      constraintServiceSpy.getDynamicParameters.and.returnValue(of([]));

      component.handleUploadSubmit();
      tick();

      expect(preOrderServiceSpy.uploadPreOrder).toHaveBeenCalled();
      expect(toastrSpy.success).toHaveBeenCalled();
      expect(component.isFilePreview).toBeFalse();
      expect(spinnerSpy.hide).toHaveBeenCalled();
    }));

    it('hides the spinner and logs when the upload request fails', fakeAsync(() => {
      ngbModalSpy.open.and.returnValue({
        componentInstance: {},
        result: Promise.resolve(true),
      } as unknown as NgbModalRef);
      preOrderServiceSpy.uploadPreOrder.and.returnValue(
        throwError(() => new Error('failed'))
      );

      component.handleUploadSubmit();
      tick();

      expect(spinnerSpy.hide).toHaveBeenCalled();
    }));

    it('does nothing when the confirmation dialog is dismissed', fakeAsync(() => {
      ngbModalSpy.open.and.returnValue({
        componentInstance: {},
        result: Promise.reject('dismissed'),
      } as unknown as NgbModalRef);

      component.handleUploadSubmit();
      tick();

      expect(preOrderServiceSpy.uploadPreOrder).not.toHaveBeenCalled();
    }));
  });

  describe('routePlanning()', () => {
    beforeEach(() => {
      component.experiment = createExperiment();
      ngbModalSpy.open.and.returnValue({
        componentInstance: {},
        result: Promise.resolve(true),
      } as unknown as NgbModalRef);
    });

    it('submits the experiment and navigates to the experiments list on success', fakeAsync(() => {
      experimentServiceSpy.submitExperiment.and.returnValue(
        of({} as Experiment)
      );

      component.routePlanning();
      tick();

      expect(experimentServiceSpy.submitExperiment).toHaveBeenCalledWith(
        'run-1'
      );
      expect(toastrSpy.success).toHaveBeenCalled();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/users/experiments']);
      expect(spinnerSpy.hide).toHaveBeenCalledWith('run');
    }));

    it('shows an error toast when submission fails', fakeAsync(() => {
      experimentServiceSpy.submitExperiment.and.returnValue(
        throwError(() => new Error('failed'))
      );

      component.routePlanning();
      tick();

      expect(toastrSpy.error).toHaveBeenCalled();
      expect(routerSpy.navigate).not.toHaveBeenCalled();
    }));
  });

  describe('fetchDataFromFileUrl() / dataFromFileUrlToJson()', () => {
    it('fetches a blob and parses it as JSON', async () => {
      const blob = new Blob([JSON.stringify({ foo: 'bar' })], {
        type: 'application/json',
      });
      configurationServiceSpy.getDatafromUrl.and.returnValue(of(blob));

      const result = await component.dataFromFileUrlToJson(
        'https://example.com/data.json'
      );

      expect(result).toEqual({ foo: 'bar' });
    });
  });

  describe('groupCustomers() (private)', () => {
    it('buckets customers by replaceType/validationType', () => {
      const verifyCustomer = createCustomer({
        name: 'V1',
        replaceType: ReplaceType.NO_REPLACE,
        validationType: ValidationType.SUBDISTRICT_LEVEL,
      });
      const uncertainCustomer = createCustomer({
        name: 'U1',
        replaceType: ReplaceType.DISTRICT_LEVEL,
      });
      const unverifyCustomer = createCustomer({
        name: 'W1',
        replaceType: ReplaceType.PROVINCE_LEVEL,
      });

      const grouped = (component as any).groupCustomers([
        verifyCustomer,
        uncertainCustomer,
        unverifyCustomer,
      ]);

      expect(grouped.verify.map((c: Customer) => c.name)).toEqual(['V1']);
      expect(grouped.uncertain.map((c: Customer) => c.name)).toEqual(['U1']);
      expect(grouped.unverify.map((c: Customer) => c.name)).toEqual(['W1']);
    });
  });

  describe('groupingCustomer()', () => {
    beforeEach(() => {
      (component as any).vectorSource = new VectorSource();
      (component as any).vectorSourceDepot = new VectorSource();
    });

    it('groups customers, plots depots, and flips into upload mode', () => {
      const customers = [
        createCustomer({
          name: 'V1',
          replaceType: ReplaceType.NO_REPLACE,
          validationType: ValidationType.SUBDISTRICT_LEVEL,
        }),
        createCustomer({ name: 'U1', replaceType: ReplaceType.DISTRICT_LEVEL }),
      ];
      const depots = [createDepot({ name: 'Depot A' })];

      component.groupingCustomer(customers, depots);

      expect(component.countUploadedCustomers).toBe(2);
      expect(component.uploadDataGroupCustomers?.verify.customers.length).toBe(
        1
      );
      expect(
        component.uploadDataGroupCustomers?.uncertain.customers.length
      ).toBe(1);
      expect(component.depots.length).toBe(1);
      expect(component.isUpload).toBeTrue();
      expect(component.isFileSelectionStep).toBeFalse();
    });
  });

  describe('moveCustomerToEdit() / updateCustomerGroup()', () => {
    let uncertainCustomer: Customer;

    beforeEach(() => {
      (component as any).vectorSource = new VectorSource();
      uncertainCustomer = createCustomer({ name: 'U1' });
      component.uploadDataGroupCustomers = createDataGroup({
        uncertain: {
          customers: [uncertainCustomer],
          type: LocationType.Uncertain,
        },
      });
    });

    it('moveCustomerToEdit() relocates the customer into the edit bucket', () => {
      const location: Location = { latitude: 1, longitude: 2 };
      component.moveCustomerToEdit(uncertainCustomer, location);

      expect(
        component.uploadDataGroupCustomers?.uncertain.customers.length
      ).toBe(0);
      expect(
        component.uploadDataGroupCustomers?.edit.customers[0].latitude
      ).toBe(1);
    });

    it('updateCustomerGroup() records updates and moves matching customers to edit', () => {
      component.updateCustomerGroup([
        { nodeId: 'N1', index: 0, name: 'U1', latitude: 5, longitude: 6 },
      ]);

      expect(component.customersLocationUpdated.length).toBe(1);
      expect(component.uploadDataGroupCustomers?.edit.customers.length).toBe(1);
    });

    it('updateCustomerGroup() is a no-op for an empty array', () => {
      component.updateCustomerGroup([]);
      expect(component.customersLocationUpdated.length).toBe(0);
    });
  });

  describe('openCustomerOrderDetails()', () => {
    it('records a location update and persists it when the modal returns a moved location', fakeAsync(() => {
      const customer = createCustomer({ name: 'C1', latitude: 1, longitude: 2 });
      component.experiment = createExperiment();
      component.uploadDataGroupCustomers = createDataGroup({
        uncertain: { customers: [customer], type: LocationType.Uncertain },
      });
      (component as any).vectorSource = new VectorSource();
      ngbModalSpy.open.and.returnValue({
        componentInstance: {},
        result: Promise.resolve({ latitude: 9, longitude: 9 }),
      } as unknown as NgbModalRef);

      component.openCustomerOrderDetails(customer);
      tick();

      expect(component.customersLocationUpdated.length).toBe(1);
      expect(dataServiceSpy.saveData).toHaveBeenCalled();
    }));
  });

  describe('validateExperimentPreOrder()', () => {
    it('blocks submission and jumps to the vehicle tab when no vehicle is selected', () => {
      // the Open VRP run list starts empty — nothing has been added to the run
      component.validateExperimentPreOrder();

      expect(component.vehicleSelectionError).toBeTrue();
      expect(component.activeNavId).toBe(2);
      expect(experimentServiceSpy.validateExperiment).not.toHaveBeenCalled();
    });

    it('validates and updates state on a successful response', fakeAsync(() => {
      component.experiment = createExperiment();
      component.runVehicleList.push(
        createRunEntry({ vehicleTypeId: 'v1', mode: 'count', count: 2 })
      );
      const response: ValidateExperimentResponse = {
        result: { isSuccesses: true, message: 'ok', validate: {} as Validate },
      };
      experimentServiceSpy.validateExperiment.and.returnValue(
        of(response) as any
      );

      component.validateExperimentPreOrder();
      tick();
      // navigateToTab() refreshes the map viewport after the column's 0.3s
      // slide, so that timer has to be drained before fakeAsync() returns.
      tick(350);

      expect(toastrSpy.success).toHaveBeenCalledWith('ok');
      expect(component.haveValidated).toBeTrue();
      expect(component.activeNavId).toBe(4);
      expect(dataServiceSpy.clearData).toHaveBeenCalled();
    }));

    it('records the returned validation warnings on the component', fakeAsync(() => {
      component.experiment = createExperiment();
      component.runVehicleList.push(
        createRunEntry({ vehicleTypeId: 'v1', mode: 'count', count: 2 })
      );
      const response: ValidateExperimentResponse = {
        result: {
          isSuccesses: true,
          message: 'done with warnings',
          validate: {} as Validate,
          isWarning: true,
          warning: [
            {
              errorType: 'missing_product',
              title: 'file.xlsx',
              detail: [{ input: 'A', type: 't1' }],
            },
          ],
        },
      };
      experimentServiceSpy.validateExperiment.and.returnValue(
        of(response) as any
      );

      component.validateExperimentPreOrder();
      tick();
      // navigateToTab() refreshes the map viewport after the column's 0.3s
      // slide, so that timer has to be drained before fakeAsync() returns.
      tick(350);

      expect(component.isValidationWarning).toBeTrue();
      expect(component.validationWarnings.length).toBe(1);
      expect(component.validationWarningCollapseStates).toEqual([false]);
    }));
  });

  describe('exportValidationData()', () => {
    it('exports zero-weight and invalid-coordinate rows as CSV', () => {
      component.experiment = createExperiment();
      component.validateExperiment = {
        filters: {
          constraints: { over_distance: [], over_weight: [] },
          order_data: { invalid_coordinate: [createCustomer()] },
        },
        warning: { zero_weight: [createCustomer()] },
      } as unknown as Validate;

      component.exportValidationData();

      expect(exportServiceSpy.exportMultipleCsv).toHaveBeenCalled();
      const [dataArrays, names] =
        exportServiceSpy.exportMultipleCsv.calls.mostRecent().args;
      expect(dataArrays.length).toBe(2);
      expect(names.length).toBe(2);
    });
  });

  describe('getValidateMessage()', () => {
    it('builds the validateMessage structure from translations', () => {
      component.getValidateMessage();
      expect(
        component.validateMessage.filtersMessage.constraints.overDistance.title
      ).toContain('!');
      expect(
        component.validateMessage.warningMessage.zeroWeight.message
      ).toContain('.');
    });
  });

  describe('getMyDepots()', () => {
    it('loads company + depots and initializes selection state', () => {
      const depot = createMyDepot({ depotName: 'Depot X' });
      experimentServiceSpy.getMyCompany.and.returnValue(
        of({ companyName: 'Acme', depotType: 'multi' })
      );
      experimentServiceSpy.getMyDepots.and.returnValue(of([depot]));

      component.getMyDepots(true);

      expect(component.companyDepotType).toBe('multi');
      expect(component.depots.length).toBe(1);
      expect(component.selectedDepotIdName).toBe('Depot X');
      expect(spinnerSpy.show).toHaveBeenCalled();
      expect(spinnerSpy.hide).toHaveBeenCalled();
    });

    it('shows an error toast and hides the spinner when depots fail to load', () => {
      experimentServiceSpy.getMyCompany.and.returnValue(
        of({ companyName: 'Acme', depotType: 'x' })
      );
      experimentServiceSpy.getMyDepots.and.returnValue(
        throwError(() => new Error('failed'))
      );

      component.getMyDepots(true);

      expect(toastrSpy.error).toHaveBeenCalled();
      expect(spinnerSpy.hide).toHaveBeenCalled();
    });
  });

  describe('onDepotSelectionChange()', () => {
    it('updates depot-scoped state and revalidates uploaded files', async () => {
      const depotA = createMyDepot({ depotName: 'Depot A' });
      const depotB = createMyDepot({
        depotName: 'Depot B',
        inputdata: [
          {
            companyName: 'Acme',
            depotId: 'depot-1',
            keyName: 'k1',
            displayName: 'Category A',
            columnRequired: [],
            fileFormatType: 'xlsx',
            required: false,
            createdAt: '',
            modifiedAt: '',
          },
        ],
      });
      component.depots = [depotA, depotB];
      component.selectedDepotIdName = 'Depot B';
      (component as any).vectorSourceDepot = new VectorSource();

      await component.onDepotSelectionChange();

      expect(component.inputDataKeys).toEqual(['Category A']);
    });

    it('clears input data keys when no depot matches the selection', async () => {
      component.depots = [createMyDepot({ depotName: 'Depot A' })];
      component.selectedDepotIdName = 'Unknown depot';

      await component.onDepotSelectionChange();

      expect(component.inputDataKeys).toEqual([]);
      expect((component as any).depotInputDataItems).toEqual([]);
    });
  });

  describe('validateUploadedFilesAgainstDepot()', () => {
    it('resolves immediately when there are no uploaded files', async () => {
      component.preOrderFiles = [];
      await component.validateUploadedFilesAgainstDepot();
      expect(component.preOrderFiles).toEqual([]);
    });
  });

  describe('getDynamicParameters() / refreshDynamicParametersForSelectedDepot()', () => {
    it('loads dynamic parameters and groups them by category', () => {
      constraintServiceSpy.getDynamicParameters.and.returnValue(
        of([
          createDynamicParameter({
            keyName: 'EarlyDeliveryTime',
            category: { th_TH: '', en_US: 'General' },
          }),
        ])
      );

      component.getDynamicParameters();

      expect(component.allDynamicParameters.length).toBe(1);
      expect(component.dynamicParametersByCategory.length).toBe(1);
      expect(component.dynamicParametersByCategory[0].key).toBe('General');
      expect(cdrDetectChangesSpy).toHaveBeenCalled();
    });

    it('hides the spinner in create mode after loading', () => {
      component.isCreateMode = true;
      constraintServiceSpy.getDynamicParameters.and.returnValue(of([]));

      component.getDynamicParameters();

      expect(spinnerSpy.hide).toHaveBeenCalled();
    });
  });

  describe('transformDynamicParametersToConstraint() / onParamValueChange() / buildDynamicParametersUpdatePayload()', () => {
    it('transforms time/number/text dynamic parameters into a Constraint', () => {
      const constraint = component.transformDynamicParametersToConstraint([
        createDynamicParameter({
          keyName: 'EarlyDeliveryTime',
          valueType: 'time',
          value: '',
          defaultValue: '07:00',
        }),
        createDynamicParameter({
          keyName: 'NumberOfVehicleAvailable',
          valueType: 'number',
          value: 0,
          defaultValue: '3',
        }),
      ]);

      expect(constraint.earlyDeliveryTime).toBe('07:00');
      expect(constraint.numberOfVehicleAvailable).toBe(3);
    });

    it('onParamValueChange() normalizes and forwards to onValueChange for the matching Constraint key', () => {
      const param = createDynamicParameter({
        keyName: 'MaximumTravelDistance',
        valueType: 'number',
      });
      component.onParamValueChange(param, '150');
      expect(param.value).toBe(150);
      expect(component.constraintsData.maximumTravelDistance).toBe(150);
      expect(component.haveUpdateAfterValidated).toBeTrue();
    });

    it('buildDynamicParametersUpdatePayload() collects id/value pairs with a defined id', () => {
      component.dynamicParametersByCategory = [
        {
          key: 'General',
          items: [
            createDynamicParameter({ id: 'p1', value: '09:00' }),
            createDynamicParameter({ id: '', value: '10:00' }),
          ],
        },
      ];

      expect(component.buildDynamicParametersUpdatePayload()).toEqual([
        { id: 'p1', value: '09:00' },
      ]);
    });
  });

  describe('updateDynamicParameters()', () => {
    it('does nothing when there is no payload to send', () => {
      component.dynamicParametersByCategory = [];
      component.updateDynamicParameters();
      expect(constraintServiceSpy.updateDynamicParameter).not.toHaveBeenCalled();
    });

    it('shows a success toast on completion', fakeAsync(() => {
      component.dynamicParametersByCategory = [
        {
          key: 'General',
          items: [createDynamicParameter({ id: 'p1', value: '09:00' })],
        },
      ];
      constraintServiceSpy.updateDynamicParameter.and.returnValue(
        of({ success: true, updatedCount: 1, errors: [], results: [] })
      );

      component.updateDynamicParameters();
      tick();

      expect(toastrSpy.success).toHaveBeenCalled();
      expect(spinnerSpy.hide).toHaveBeenCalledWith('run');
    }));

    it('shows an error toast on failure', fakeAsync(() => {
      component.dynamicParametersByCategory = [
        {
          key: 'General',
          items: [createDynamicParameter({ id: 'p1', value: '09:00' })],
        },
      ];
      constraintServiceSpy.updateDynamicParameter.and.returnValue(
        throwError(() => new Error('failed'))
      );

      component.updateDynamicParameters();
      tick();

      expect(toastrSpy.error).toHaveBeenCalled();
    }));
  });

  describe('showSpinner() / hiddenSpinner()', () => {
    it('show/hide the "run" named spinner', () => {
      component.showSpinner();
      expect(spinnerSpy.show).toHaveBeenCalledWith('run', jasmine.any(Object));
      component.hiddenSpinner();
      expect(spinnerSpy.hide).toHaveBeenCalledWith('run');
    });
  });

  describe('applyFilter()', () => {
    it('sets the datasource filter from the input value and resets pagination', () => {
      const input = document.createElement('input');
      input.value = '  Hello  ';
      component.applyFilter({ target: input } as unknown as Event);
      expect(component.dataSource.filter).toBe('hello');
    });
  });
});
