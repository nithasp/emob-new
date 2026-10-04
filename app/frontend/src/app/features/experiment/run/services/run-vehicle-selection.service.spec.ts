import { TestBed } from '@angular/core/testing';
import { RunVehicleSelectionService } from './run-vehicle-selection.service';
import { RunUiService } from './run-ui.service';
import { RunParameterService } from './run-parameter.service';
import { RunVehicleService } from './run-vehicle.service';
import { configureRunPage, createVehicleType } from '../testing/run-page.testing';

describe('RunVehicleSelectionService', () => {
  let params: RunParameterService;
  let fleet: RunVehicleService;
  let vehicleSelection: RunVehicleSelectionService;
  let detectChangesSpy: jasmine.Spy;

  beforeEach(async () => {
    await configureRunPage();
    params = TestBed.inject(RunParameterService);
    fleet = TestBed.inject(RunVehicleService);
    vehicleSelection = TestBed.inject(RunVehicleSelectionService);
    detectChangesSpy = spyOn(TestBed.inject(RunUiService), 'detectChanges');
  });

  it('should create', () => {
    expect(vehicleSelection).toBeTruthy();
  });

  describe('vehicle selection helpers', () => {
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

    it('isVehicleSelected() reflects selectedVehicleIds', () => {
      vehicleSelection.selectedVehicleIds = ['v1'];
      expect(vehicleSelection.isVehicleSelected('v1')).toBeTrue();
      expect(vehicleSelection.isVehicleSelected('v2')).toBeFalse();
    });

    it('onVehicleChecked() adds defaults on check and clears state on uncheck', () => {
      vehicleSelection.onVehicleChecked('v1', true);
      expect(vehicleSelection.selectedVehicleIds).toEqual(['v1']);
      expect(vehicleSelection.selectedVehicleCounts['v1']).toBe(1);
      expect(vehicleSelection.vehicleSelectionMode['v1']).toBe('count');
      expect(detectChangesSpy).toHaveBeenCalled();

      vehicleSelection.onVehicleChecked('v1', false);
      expect(vehicleSelection.selectedVehicleIds).toEqual([]);
      expect(vehicleSelection.selectedVehicleCounts['v1']).toBeUndefined();
      expect(vehicleSelection.vehicleSelectionMode['v1']).toBeUndefined();
    });

    it('getVehicleCount() defaults to 1 when unset', () => {
      expect(vehicleSelection.getVehicleCount('v1')).toBe(1);
      vehicleSelection.selectedVehicleCounts['v1'] = 4;
      expect(vehicleSelection.getVehicleCount('v1')).toBe(4);
    });

    it('onVehicleCountChange() clamps between min and max', () => {
      params.constraintsData = {
        ...params.constraintsData,
        numberOfVehicleAvailable: 5,
      };
      vehicleSelection.onVehicleCountChange('v1', 100);
      expect(vehicleSelection.selectedVehicleCounts['v1']).toBe(5);

      vehicleSelection.onVehicleCountChange('v1', -3);
      expect(vehicleSelection.selectedVehicleCounts['v1']).toBe(0);
    });

    it('getVehicleMaxCount() falls back to the default when no constraint is set', () => {
      expect(vehicleSelection.getVehicleMaxCount('v1')).toBe(1000);
      params.constraintsData = {
        ...params.constraintsData,
        numberOfVehicleAvailable: 12,
      };
      expect(vehicleSelection.getVehicleMaxCount('v1')).toBe(12);
    });

    it('getVehicleMinCount() is always 0', () => {
      expect(vehicleSelection.getVehicleMinCount()).toBe(0);
    });

    it('getVehicleSelectionMode() defaults to "count"', () => {
      expect(vehicleSelection.getVehicleSelectionMode('v1')).toBe('count');
      vehicleSelection.vehicleSelectionMode['v1'] = 'license-plate';
      expect(vehicleSelection.getVehicleSelectionMode('v1')).toBe('license-plate');
    });

    it('getSelectedLicensePlatesCount() reflects the tracked array length', () => {
      expect(vehicleSelection.getSelectedLicensePlatesCount('v1')).toBe(0);
      vehicleSelection.selectedLicensePlates['v1'] = ['LP1', 'LP2'];
      expect(vehicleSelection.getSelectedLicensePlatesCount('v1')).toBe(2);
    });
  });

  describe('getInvalidVehicleSelections()', () => {
    it('getInvalidVehicleSelections() flags license-plate mode vehicles with no plates chosen', () => {
      vehicleSelection.selectedVehicleIds = ['v1', 'v2'];
      vehicleSelection.vehicleSelectionMode = { v1: 'license-plate', v2: 'count' };
      vehicleSelection.selectedVehicleIdsByLicensePlate = {};
      expect(vehicleSelection.getInvalidVehicleSelections()).toEqual(['v1']);

      vehicleSelection.selectedVehicleIdsByLicensePlate = { v1: ['LP1'] };
      expect(vehicleSelection.getInvalidVehicleSelections()).toEqual([]);
    });
  });
});
