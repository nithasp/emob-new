import { TestBed } from '@angular/core/testing';
import { RunNavigationService } from './run-navigation.service';
import { RunUiService } from './run-ui.service';
import { RunParameterService } from './run-parameter.service';
import { RunVehicleService } from './run-vehicle.service';
import { configureRunPage, createDynamicParameter, createVehicleType } from '../testing/run-page.testing';

describe('RunNavigationService', () => {
  let params: RunParameterService;
  let fleet: RunVehicleService;
  let navigation: RunNavigationService;
  let detectChangesSpy: jasmine.Spy;

  beforeEach(async () => {
    await configureRunPage();
    params = TestBed.inject(RunParameterService);
    fleet = TestBed.inject(RunVehicleService);
    navigation = TestBed.inject(RunNavigationService);
    detectChangesSpy = spyOn(TestBed.inject(RunUiService), 'detectChanges');
  });

  it('should create', () => {
    expect(navigation).toBeTruthy();
  });

  describe('tab navigation', () => {
    it('getNextTab()/getPreviousTab() route around missing vehicle/parameter tabs', () => {
      // No vehicle types, no dynamic parameters -> Orders Data goes straight to Validation
      expect(navigation.getNextTab(1)).toBe(4);
      expect(navigation.getPreviousTab(4)).toBe(1);

      fleet.myVehicleTypes = [createVehicleType()];
      expect(navigation.getNextTab(1)).toBe(2);
      expect(navigation.getPreviousTab(4)).toBe(2);

      params.dynamicParametersByCategory = [
        { key: 'General', items: [createDynamicParameter()] },
      ];
      expect(navigation.getNextTab(2)).toBe(3);
      expect(navigation.getPreviousTab(3)).toBe(2);
      expect(navigation.getNextTab(3)).toBe(4);
      expect(navigation.getNextTab(4)).toBe(4);
      expect(navigation.getPreviousTab(1)).toBe(1);
    });

    it('navigateToTab() sets activeNavId and triggers change detection', () => {
      navigation.navigateToTab(3);
      expect(navigation.activeNavId).toBe(3);
      expect(detectChangesSpy).toHaveBeenCalled();
    });

    it('navigateToTab(2) refreshes dynamic parameters for the selected depot', () => {
      spyOn(params, 'refreshDynamicParametersForSelectedDepot');
      navigation.navigateToTab(2);
      expect(
        params.refreshDynamicParametersForSelectedDepot
      ).toHaveBeenCalled();
    });

    it('navigateToNextTab()/navigateToPreviousTab() delegate to getNextTab/getPreviousTab', () => {
      navigation.activeNavId = 1;
      navigation.navigateToNextTab();
      expect(navigation.activeNavId).toBe(4);

      navigation.navigateToPreviousTab();
      expect(navigation.activeNavId).toBe(1);
    });
  });
});
