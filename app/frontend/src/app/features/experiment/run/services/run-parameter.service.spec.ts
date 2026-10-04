import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { of, throwError } from 'rxjs';
import { ConstraintService } from '../../services/constraint.service';
import { Validate } from '../../models/experiment.model';
import { RunParameterService } from './run-parameter.service';
import { RunStateService } from './run-state.service';
import { RunUiService } from './run-ui.service';
import { RunVehicleService } from './run-vehicle.service';
import { configureRunPage, createDynamicParameter, createVehicleType } from '../testing/run-page.testing';

describe('RunParameterService', () => {
  let state: RunStateService;
  let params: RunParameterService;
  let fleet: RunVehicleService;
  let spinnerSpy: jasmine.SpyObj<NgxSpinnerService>;
  let constraintServiceSpy: jasmine.SpyObj<ConstraintService>;
  let toastrSpy: jasmine.SpyObj<ToastrService>;
  let detectChangesSpy: jasmine.Spy;

  beforeEach(async () => {
    ({ spinnerSpy, constraintServiceSpy, toastrSpy } = await configureRunPage());
    state = TestBed.inject(RunStateService);
    params = TestBed.inject(RunParameterService);
    fleet = TestBed.inject(RunVehicleService);
    detectChangesSpy = spyOn(TestBed.inject(RunUiService), 'detectChanges');
  });

  it('should create', () => {
    expect(params).toBeTruthy();
  });

  describe('buildValidateParameterFromDynamic() / buildVehiclesPayload() / normalizeKeyName()', () => {
    it('maps known keyNames to Constraint keys and normalizes unknown ones', () => {
      params.dynamicParametersByCategory = [
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

      const payload = params.buildValidateParameterFromDynamic();

      expect(payload.earlyDeliveryTime).toBe('09:00');
      expect((payload as any).numberOfVehicleAvailable).toBe(5);
      expect((payload as any).someOtherKey).toBe('abc');
    });

    it('defaults blank/"null" time values to 00:00', () => {
      params.dynamicParametersByCategory = [
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
        params.buildValidateParameterFromDynamic().backToDepotTime
      ).toBe('00:00');
    });

    it('normalizeKeyName() lowercases the first letter and handles null/blank', () => {
      expect((params as any).normalizeKeyName('BackToDepotTime')).toBe(
        'backToDepotTime'
      );
      expect((params as any).normalizeKeyName(null)).toBe('');
      expect((params as any).normalizeKeyName('  ')).toBe('');
    });
  });

  describe('getConstraintKeyForParam()', () => {
    it('maps known PascalCase/camelCase keyNames, else returns null', () => {
      expect(
        params.getConstraintKeyForParam(
          createDynamicParameter({ keyName: 'MaximumTravelDistance' })
        )
      ).toBe('maximumTravelDistance');
      expect(
        params.getConstraintKeyForParam(
          createDynamicParameter({ keyName: 'minimumVehicle' })
        )
      ).toBe('minimumVehicle');
      expect(
        params.getConstraintKeyForParam(
          createDynamicParameter({ keyName: 'unknownKey' })
        )
      ).toBeNull();
    });
  });

  describe('getBackendLocaleKey() / getLocalized()', () => {
    it('uses the active language to pick a localized key', () => {
      expect(params.getBackendLocaleKey()).toBe('en_US');
      expect(params.getLocalized({ th_TH: 'ไทย', en_US: 'English' })).toBe(
        'English'
      );
    });

    it('parses JSON-encoded localized text and falls back to the raw string otherwise', () => {
      expect(
        params.getLocalized(
          JSON.stringify({ th_TH: 'ไทย', en_US: 'English' })
        )
      ).toBe('English');
      expect(params.getLocalized('not json')).toBe('not json');
      expect(params.getLocalized(null)).toBe('');
      expect(params.getLocalized(undefined)).toBe('');
    });
  });

  describe('isTimeType() / isNumberType() / hasMeaningfulConstraintsData() / isOverWeightKey() / isOverDistanceKey()', () => {
    it('classifies dynamic parameter value types', () => {
      expect(
        params.isTimeType(createDynamicParameter({ valueType: 'time' }))
      ).toBeTrue();
      expect(
        params.isTimeType(createDynamicParameter({ valueType: 'Duration' }))
      ).toBeTrue();
      expect(
        params.isTimeType(createDynamicParameter({ valueType: 'number' }))
      ).toBeFalse();
      expect(
        params.isNumberType(
          createDynamicParameter({ valueType: 'number-int' })
        )
      ).toBeTrue();
      expect(
        params.isNumberType(createDynamicParameter({ valueType: 'time' }))
      ).toBeFalse();
    });

    it('hasMeaningfulConstraintsData() is true once any constraint value is meaningfully set', () => {
      expect(params.hasMeaningfulConstraintsData()).toBeFalse();
      params.constraintsData = {
        ...params.constraintsData,
        earlyDeliveryTime: '09:00',
      };
      expect(params.hasMeaningfulConstraintsData()).toBeTrue();
    });

    it('hasMeaningfulConstraintsData() is true whenever validateExperiment is set', () => {
      state.validateExperiment = {} as Validate;
      expect(params.hasMeaningfulConstraintsData()).toBeTrue();
    });

    it('isOverWeightKey()/isOverDistanceKey() match the well-known keyNames', () => {
      expect(
        params.isOverWeightKey(
          createDynamicParameter({ keyName: 'VehicleOrderSizeCapacity' })
        )
      ).toBeTrue();
      expect(
        params.isOverDistanceKey(
          createDynamicParameter({ keyName: 'MaximumTravelDistance' })
        )
      ).toBeTrue();
      expect(
        params.isOverWeightKey(createDynamicParameter({ keyName: 'Other' }))
      ).toBeFalse();
    });
  });

  describe('hasDynamicParameters() / hasMyVehicleTypes() / getInvalidVehicleSelections()', () => {
    it('hasDynamicParameters()/hasMyVehicleTypes() reflect populated arrays', () => {
      expect(params.hasDynamicParameters()).toBeFalse();
      expect(fleet.hasMyVehicleTypes()).toBeFalse();

      params.dynamicParametersByCategory = [
        { key: 'G', items: [createDynamicParameter()] },
      ];
      fleet.myVehicleTypes = [createVehicleType()];
      expect(params.hasDynamicParameters()).toBeTrue();
      expect(fleet.hasMyVehicleTypes()).toBeTrue();
    });
  });

  describe('getValidateMessage()', () => {
    it('builds the validateMessage structure from translations', () => {
      params.getValidateMessage();
      expect(
        params.validateMessage.filtersMessage.constraints.overDistance.title
      ).toContain('!');
      expect(
        params.validateMessage.warningMessage.zeroWeight.message
      ).toContain('.');
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

      params.getDynamicParameters();

      expect(params.allDynamicParameters.length).toBe(1);
      expect(params.dynamicParametersByCategory.length).toBe(1);
      expect(params.dynamicParametersByCategory[0].key).toBe('General');
      expect(detectChangesSpy).toHaveBeenCalled();
    });

    it('hides the spinner in create mode after loading', () => {
      state.isCreateMode = true;
      constraintServiceSpy.getDynamicParameters.and.returnValue(of([]));

      params.getDynamicParameters();

      expect(spinnerSpy.hide).toHaveBeenCalled();
    });
  });

  describe('transformDynamicParametersToConstraint() / onParamValueChange() / buildDynamicParametersUpdatePayload()', () => {
    it('transforms time/number/text dynamic parameters into a Constraint', () => {
      const constraint = params.transformDynamicParametersToConstraint([
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
      params.onParamValueChange(param, '150');
      expect(param.value).toBe(150);
      expect(params.constraintsData.maximumTravelDistance).toBe(150);
      expect(state.haveUpdateAfterValidated).toBeTrue();
    });

    it('buildDynamicParametersUpdatePayload() collects id/value pairs with a defined id', () => {
      params.dynamicParametersByCategory = [
        {
          key: 'General',
          items: [
            createDynamicParameter({ id: 'p1', value: '09:00' }),
            createDynamicParameter({ id: '', value: '10:00' }),
          ],
        },
      ];

      expect(params.buildDynamicParametersUpdatePayload()).toEqual([
        { id: 'p1', value: '09:00' },
      ]);
    });
  });

  describe('updateDynamicParameters()', () => {
    it('does nothing when there is no payload to send', () => {
      params.dynamicParametersByCategory = [];
      params.updateDynamicParameters();
      expect(constraintServiceSpy.updateDynamicParameter).not.toHaveBeenCalled();
    });

    it('shows a success toast on completion', fakeAsync(() => {
      params.dynamicParametersByCategory = [
        {
          key: 'General',
          items: [createDynamicParameter({ id: 'p1', value: '09:00' })],
        },
      ];
      constraintServiceSpy.updateDynamicParameter.and.returnValue(
        of({ success: true, updatedCount: 1, errors: [], results: [] })
      );

      params.updateDynamicParameters();
      tick();

      expect(toastrSpy.success).toHaveBeenCalled();
      expect(spinnerSpy.hide).toHaveBeenCalledWith('run');
    }));

    it('shows an error toast on failure', fakeAsync(() => {
      params.dynamicParametersByCategory = [
        {
          key: 'General',
          items: [createDynamicParameter({ id: 'p1', value: '09:00' })],
        },
      ];
      constraintServiceSpy.updateDynamicParameter.and.returnValue(
        throwError(() => new Error('failed'))
      );

      params.updateDynamicParameters();
      tick();

      expect(toastrSpy.error).toHaveBeenCalled();
    }));
  });
});
