import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';
import { DataService } from '@shared/services/data.service';
import { ExperimentService } from '../../services/experiment.service';
import { Validate, ValidationWarningItem, ValidateExperimentResponse } from '../../models/experiment.model';
import { RunValidationService } from './run-validation.service';
import { RunStateService } from './run-state.service';
import { RunVehicleService } from './run-vehicle.service';
import { RunNavigationService } from './run-navigation.service';
import { configureRunPage, createExperiment, createRunEntry } from '../testing/run-page.testing';

describe('RunValidationService', () => {
  let state: RunStateService;
  let fleet: RunVehicleService;
  let navigation: RunNavigationService;
  let validation: RunValidationService;
  let experimentServiceSpy: jasmine.SpyObj<ExperimentService>;
  let toastrSpy: jasmine.SpyObj<ToastrService>;
  let dataServiceSpy: jasmine.SpyObj<DataService>;

  beforeEach(async () => {
    ({ experimentServiceSpy, toastrSpy, dataServiceSpy } = await configureRunPage());
    state = TestBed.inject(RunStateService);
    fleet = TestBed.inject(RunVehicleService);
    navigation = TestBed.inject(RunNavigationService);
    validation = TestBed.inject(RunValidationService);
  });

  it('should create', () => {
    expect(validation).toBeTruthy();
  });

  describe('getWarningTypeLabel()', () => {
    it('getWarningTypeLabel() falls back to the unknown-validation-error message', () => {
      const label = validation.getWarningTypeLabel('some type');
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
      validation.setValidationWarnings([warning]);
      expect(validation.validationWarnings[0].detail.length).toBe(1);
      expect(validation.validationWarningCollapseStates).toEqual([false]);
    });

    it('getRowsForWarning() delegates to buildTableRows (one row per detail, unlike setValidationWarnings it does not dedupe)', () => {
      expect(validation.getRowsForWarning(warning).length).toBe(2);
    });

    it('toggleValidationWarningCollapse() flips the state at the given index', () => {
      validation.validationWarningCollapseStates = [false];
      validation.toggleValidationWarningCollapse(0);
      expect(validation.validationWarningCollapseStates[0]).toBeTrue();
    });
  });

  describe('validateExperimentPreOrder()', () => {
    it('blocks submission and jumps to the vehicle tab when no vehicle is selected', () => {
      validation.validateExperimentPreOrder();

      expect(fleet.vehicleSelectionError).toBeTrue();
      expect(navigation.activeNavId).toBe(2);
      expect(experimentServiceSpy.validateExperiment).not.toHaveBeenCalled();
    });

    it('validates and updates state on a successful response', fakeAsync(() => {
      state.experiment = createExperiment();
      fleet.runVehicleList.push(
        createRunEntry({ vehicleTypeId: 'v1', mode: 'count', count: 2 })
      );
      const response: ValidateExperimentResponse = {
        result: { isSuccesses: true, message: 'ok', validate: {} as Validate },
      };
      experimentServiceSpy.validateExperiment.and.returnValue(
        of(response) as any
      );

      validation.validateExperimentPreOrder();
      tick();
      tick(350);

      expect(toastrSpy.success).toHaveBeenCalledWith('ok');
      expect(state.haveValidated).toBeTrue();
      expect(navigation.activeNavId).toBe(4);
      expect(dataServiceSpy.clearData).toHaveBeenCalled();
    }));

    it('records the returned validation warnings on the component', fakeAsync(() => {
      state.experiment = createExperiment();
      fleet.runVehicleList.push(
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

      validation.validateExperimentPreOrder();
      tick();
      tick(350);

      expect(validation.isValidationWarning).toBeTrue();
      expect(validation.validationWarnings.length).toBe(1);
      expect(validation.validationWarningCollapseStates).toEqual([false]);
    }));
  });
});
