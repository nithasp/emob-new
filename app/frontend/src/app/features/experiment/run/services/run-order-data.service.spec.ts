import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { DataService } from '@shared/services/data.service';
import { Customer, ReplaceType, ValidationType } from '../../models/pre-order.model';
import { LocationType, Location } from '../../models/location.model';
import { RunOrderDataService } from './run-order-data.service';
import { RunStateService } from './run-state.service';
import {
  configureRunPage,
  createExperiment,
  createCustomer,
  createDepot,
  createDataGroup,
} from '../testing/run-page.testing';

describe('RunOrderDataService', () => {
  let state: RunStateService;
  let orders: RunOrderDataService;
  let ngbModalSpy: jasmine.SpyObj<NgbModal>;
  let dataServiceSpy: jasmine.SpyObj<DataService>;

  beforeEach(async () => {
    ({ ngbModalSpy, dataServiceSpy } = await configureRunPage());
    state = TestBed.inject(RunStateService);
    orders = TestBed.inject(RunOrderDataService);
  });

  it('should create', () => {
    expect(orders).toBeTruthy();
  });

  describe('isVerified / isUncertain / isUnverified / isEdited', () => {
    beforeEach(() => {
      orders.uploadDataGroupCustomers = createDataGroup({
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
      expect(orders.isVerified('V1')).toBeTrue();
      expect(orders.isUncertain('U1')).toBeTrue();
      expect(orders.isUnverified('W1')).toBeTrue();
      expect(orders.isEdited('E1')).toBeTrue();
      expect(orders.isVerified('U1')).toBeFalse();
    });

    it('returns false for every bucket when uploadDataGroupCustomers is unset', () => {
      orders.uploadDataGroupCustomers = null;
      expect(orders.isVerified('V1')).toBeFalse();
      expect(orders.isUncertain('V1')).toBeFalse();
      expect(orders.isUnverified('V1')).toBeFalse();
      expect(orders.isEdited('V1')).toBeFalse();
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

      const grouped = (orders as any).groupCustomers([
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

      orders.groupingCustomer(customers, depots);

      expect(orders.countUploadedCustomers).toBe(2);
      expect(orders.uploadDataGroupCustomers?.verify.customers.length).toBe(
        1
      );
      expect(
        orders.uploadDataGroupCustomers?.uncertain.customers.length
      ).toBe(1);
      expect(state.depots.length).toBe(1);
      expect(state.isUpload).toBeTrue();
      expect(state.isFileSelectionStep).toBeFalse();
    });
  });

  describe('moveCustomerToEdit() / updateCustomerGroup()', () => {
    let uncertainCustomer: Customer;

    beforeEach(() => {
      uncertainCustomer = createCustomer({ name: 'U1' });
      orders.uploadDataGroupCustomers = createDataGroup({
        uncertain: {
          customers: [uncertainCustomer],
          type: LocationType.Uncertain,
        },
      });
    });

    it('moveCustomerToEdit() relocates the customer into the edit bucket', () => {
      const location: Location = { latitude: 1, longitude: 2 };
      orders.moveCustomerToEdit(uncertainCustomer, location);

      expect(
        orders.uploadDataGroupCustomers?.uncertain.customers.length
      ).toBe(0);
      expect(
        orders.uploadDataGroupCustomers?.edit.customers[0].latitude
      ).toBe(1);
    });

    it('updateCustomerGroup() records updates and moves matching customers to edit', () => {
      orders.updateCustomerGroup([
        { nodeId: 'N1', index: 0, name: 'U1', latitude: 5, longitude: 6 },
      ]);

      expect(orders.customersLocationUpdated.length).toBe(1);
      expect(orders.uploadDataGroupCustomers?.edit.customers.length).toBe(1);
    });

    it('updateCustomerGroup() is a no-op for an empty array', () => {
      orders.updateCustomerGroup([]);
      expect(orders.customersLocationUpdated.length).toBe(0);
    });
  });

  describe('openCustomerOrderDetails()', () => {
    it('records a location update and persists it when the modal returns a moved location', fakeAsync(() => {
      const customer = createCustomer({ name: 'C1', latitude: 1, longitude: 2 });
      state.experiment = createExperiment();
      orders.uploadDataGroupCustomers = createDataGroup({
        uncertain: { customers: [customer], type: LocationType.Uncertain },
      });
      ngbModalSpy.open.and.returnValue({
        componentInstance: {},
        result: Promise.resolve({ latitude: 9, longitude: 9 }),
      } as unknown as NgbModalRef);

      orders.openCustomerOrderDetails(customer);
      tick();

      expect(orders.customersLocationUpdated.length).toBe(1);
      expect(dataServiceSpy.saveData).toHaveBeenCalled();
    }));
  });
});
