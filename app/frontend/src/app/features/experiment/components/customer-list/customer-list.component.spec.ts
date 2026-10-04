import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import { CustomerListComponent } from './customer-list.component';
import {
  DataGroup,
  Location,
  LocationType,
} from '../../models/location.model';
import {
  Customer,
  GroupedDataPreOrder,
  ReplaceType,
  ValidationType,
} from '../../models/pre-order.model';

function createCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    deliveryWeight: 10,
    index: 0,
    isDepot: false,
    latitude: 13.7,
    longitude: 100.5,
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
    validationType: ValidationType.NON_VALIDATED,
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

function createDataGroup(overrides: Partial<DataGroup> = {}): DataGroup {
  return {
    verify: { customers: [], type: LocationType.Verify },
    uncertain: { customers: [], type: LocationType.Uncertain },
    unverify: { customers: [], type: LocationType.Unverify },
    edit: { customers: [], type: LocationType.Edit },
    ...overrides,
  } as DataGroup;
}

describe('CustomerListComponent', () => {
  let component: CustomerListComponent;
  let fixture: ComponentFixture<CustomerListComponent>;
  let ngbActiveModalSpy: jasmine.SpyObj<NgbActiveModal>;
  let uncertainCustomer: Customer;
  let unverifyCustomer: Customer;

  beforeEach(async () => {
    ngbActiveModalSpy = jasmine.createSpyObj<NgbActiveModal>('NgbActiveModal', [
      'close',
      'dismiss',
    ]);

    await TestBed.configureTestingModule({
      declarations: [CustomerListComponent],
      providers: [{ provide: NgbActiveModal, useValue: ngbActiveModalSpy }],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(CustomerListComponent, { set: { template: '' } })
      .compileComponents();

    fixture = TestBed.createComponent(CustomerListComponent);
    component = fixture.componentInstance;

    uncertainCustomer = createCustomer({
      name: 'CUST-UNCERTAIN',
      nodeId: 'N-UNCERTAIN',
    });
    unverifyCustomer = createCustomer({
      name: 'CUST-UNVERIFY',
      nodeId: 'N-UNVERIFY',
    });

    component.uploadDataGroupCustomers = createDataGroup({
      uncertain: {
        customers: [uncertainCustomer],
        type: LocationType.Uncertain,
      },
      unverify: { customers: [unverifyCustomer], type: LocationType.Unverify },
    });
    component.groupedDataPreOrder = {} as GroupedDataPreOrder;
  });

  function init(): void {
    fixture.detectChanges();
  }

  it('should create', () => {
    init();
    expect(component).toBeTruthy();
  });

  it('ngOnInit() collects uncertain and unverify customers into customersToVerify', () => {
    init();
    expect(component.customersToVerify).toEqual([
      uncertainCustomer,
      unverifyCustomer,
    ]);
  });

  it('ngOnInit() selects the first customer via selectData()', () => {
    init();
    expect(component.customerSelected?.dataCustomer).toBe(uncertainCustomer);
    expect(component.customerSelected?.locationType).toBe(
      LocationType.Uncertain
    );
  });

  describe('isDisabled()', () => {
    it('disables every row except the currently selected index', () => {
      init();
      component.selectedIndex = 1;
      expect(component.isDisabled(0)).toBeTrue();
      expect(component.isDisabled(1)).toBeFalse();
    });
  });

  describe('isUncertain() / isUnverified()', () => {
    it('reports membership based on the source data group', () => {
      init();
      expect(component.isUncertain('CUST-UNCERTAIN')).toBeTrue();
      expect(component.isUncertain('CUST-UNVERIFY')).toBeFalse();
      expect(component.isUnverified('CUST-UNVERIFY')).toBeTrue();
      expect(component.isUnverified('CUST-UNCERTAIN')).toBeFalse();
      expect(component.isUncertain('UNKNOWN')).toBeFalse();
      expect(component.isUnverified('UNKNOWN')).toBeFalse();
    });
  });

  describe('findLocationType()', () => {
    it('classifies a name found in uncertain/unverify/edit, defaulting to Verify', () => {
      init();
      const editCustomer = createCustomer({ name: 'CUST-EDIT' });
      component.uploadDataGroupCustomers.edit.customers.push(editCustomer);

      expect(component.findLocationType('CUST-UNCERTAIN')).toBe(
        LocationType.Uncertain
      );
      expect(component.findLocationType('CUST-UNVERIFY')).toBe(
        LocationType.Unverify
      );
      expect(component.findLocationType('CUST-EDIT')).toBe(LocationType.Edit);
      expect(component.findLocationType('UNKNOWN')).toBe(LocationType.Verify);
    });
  });

  describe('selectData()', () => {
    it('falls back to a synthesized DetailsPreOrder when no grouped entry matches', () => {
      init();
      const selected = component.customerSelected!;
      expect(selected.dataPreOrder.ORDERID_ORG).toBe('N-UNCERTAIN');
      expect(selected.dataPreOrder.CUSTOMER_NAME).toBe('CUST-UNCERTAIN');
      expect(selected.dataPreOrder.ADDRESS).toBe('1 Main St');
    });

    it('prefers the matching grouped pre-order entry when present', () => {
      component.groupedDataPreOrder = {
        'CUST-UNCERTAIN': {
          ORDERID_ORG: 'GROUPED-ID',
          CHANNEL: 'app',
          CUSTOMER_NAME: 'Grouped Name',
          TEL: '0800000000',
          ADDRESS: 'Grouped Address',
          AUMPHER: 'District',
          PROVINCE: 'Province',
          ZIPCODE: 10000,
          details: [],
        },
      } as unknown as GroupedDataPreOrder;

      init();

      const selected = component.customerSelected!;
      expect(selected.dataPreOrder.ORDERID_ORG).toBe('GROUPED-ID');
      expect(selected.dataPreOrder.ADDRESS).toBe('Grouped Address');
    });

    it('derives channel/name/tel from additionalProperties when available', () => {
      component.uploadDataGroupCustomers = createDataGroup({
        uncertain: {
          customers: [
            createCustomer({
              name: 'CUST-CHANNEL',
              nodeId: 'N-CHANNEL',
              additionalProperties: {
                channel: 'app',
                telephone: '0899999999',
              },
            }),
          ],
          type: LocationType.Uncertain,
        },
      });

      init();

      const selected = component.customerSelected!;
      expect(selected.dataPreOrder.CHANNEL).toBe('app');
      expect(selected.dataPreOrder.TEL).toBe('0899999999');
      expect(selected.dataPreOrder.CUSTOMER_NAME).toBe('CUST-CHANNEL');
    });
  });

  describe('selectCustomer()', () => {
    it('selects the matching customer by name and refreshes the details', () => {
      init();
      component.selectCustomer(unverifyCustomer);

      expect(component.selectedIndex).toBe(1);
      expect(component.customerSelected?.dataCustomer).toBe(unverifyCustomer);
    });

    it('falls back to index 0 for an unknown customer', () => {
      init();
      component.selectCustomer(createCustomer({ name: 'GHOST' }));

      expect(component.selectedIndex).toBe(0);
    });
  });

  describe('receiveData()', () => {
    it('adds a new location update and removes the customer from the verify list', () => {
      init();
      const locationUpdated: Location = { latitude: 1, longitude: 2 };

      component.receiveData(locationUpdated, uncertainCustomer);

      expect(component.customersLocationUpdated).toEqual([
        {
          nodeId: 'N-UNCERTAIN',
          index: 0,
          name: 'CUST-UNCERTAIN',
          latitude: 1,
          longitude: 2,
        },
      ]);
      expect(component.customersToVerify).toEqual([unverifyCustomer]);
    });

    it('replaces an existing location update for the same customer', () => {
      init();
      component.receiveData({ latitude: 1, longitude: 2 }, uncertainCustomer);
      component.receiveData({ latitude: 9, longitude: 9 }, uncertainCustomer);

      expect(component.customersLocationUpdated.length).toBe(1);
      expect(component.customersLocationUpdated[0].latitude).toBe(9);
      expect(component.customersLocationUpdated[0].longitude).toBe(9);
    });

    it('resets selectedIndex to 0 once it runs past the remaining customers', () => {
      init();
      component.selectedIndex = 1;

      component.receiveData({ latitude: 1, longitude: 2 }, unverifyCustomer);

      expect(component.selectedIndex).toBe(0);
      expect(component.customersToVerify).toEqual([uncertainCustomer]);
    });
  });

  describe('close()', () => {
    it('closes the active modal with the accumulated location updates', () => {
      init();
      component.receiveData({ latitude: 1, longitude: 2 }, uncertainCustomer);

      component.close();

      expect(ngbActiveModalSpy.close).toHaveBeenCalledWith(
        component.customersLocationUpdated
      );
    });
  });
});
