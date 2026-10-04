import { TestBed } from '@angular/core/testing';
import { RunVehicleService } from './run-vehicle.service';
import { configureRunPage, createVehicleType, createRunEntry } from '../testing/run-page.testing';

describe('RunVehicleService', () => {
  let fleet: RunVehicleService;

  beforeEach(async () => {
    await configureRunPage();
    fleet = TestBed.inject(RunVehicleService);
  });

  it('should create', () => {
    expect(fleet).toBeTruthy();
  });

  describe('buildVehiclesPayload()', () => {
    it('buildVehiclesPayload() builds count-mode and license-plate-mode entries', () => {
      fleet.runVehicleList.push(
        createRunEntry({ vehicleTypeId: 'v1', mode: 'count', count: 3 }),
        createRunEntry({
          vehicleTypeId: 'v2',
          mode: 'license-plate',
          count: 2,
          vehicleIds: ['LP1', 'LP2'],
          licensePlates: ['LP1', 'LP2'],
        })
      );

      expect(fleet.buildVehiclesPayload()).toEqual([
        { vehicleTypeId: 'v1', numberOfVehiclesAvailable: 3 },
        { vehicleTypeId: 'v2', vehicleId: ['LP1', 'LP2'] },
      ]);
    });

    it('buildVehiclesPayload() aggregates several run-list rows of one type', () => {
      fleet.runVehicleList.push(
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

      expect(fleet.buildVehiclesPayload()).toEqual([
        { vehicleTypeId: 'v1', numberOfVehiclesAvailable: 5 },
        { vehicleTypeId: 'v2', vehicleId: ['LP1', 'LP2'] },
      ]);
    });
  });

  describe('availableVehicleTypes() / getVehicleName()', () => {
    beforeEach(() => {
      fleet.myVehicleTypes = [
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
      expect(fleet.availableVehicleTypes.map((v) => v.vehicleTypeId)).toEqual(
        ['v1']
      );
    });

    it('getVehicleName() looks up by id, blank when not found', () => {
      expect(fleet.getVehicleName('v1')).toBe('Truck A');
      expect(fleet.getVehicleName('missing')).toBe('');
    });
  });
});
