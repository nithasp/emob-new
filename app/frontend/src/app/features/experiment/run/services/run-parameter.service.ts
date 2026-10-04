import { Injectable, inject } from '@angular/core';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { TranslocoService } from '@jsverse/transloco';
import { LoggerService } from '@core/services/logger.service';
import { ConstraintService } from '../../services/constraint.service';
import {
  Constraint,
  DynamicParameter,
  LocalizedText,
} from '../../models/constraint.model';
import type { TimingAndCapacity } from '../../models/constraint.model';
import { ValidateMessage } from '../../models/validation-message.model';
import { RunStateService } from './run-state.service';
import { RunUiService } from './run-ui.service';

@Injectable()
export class RunParameterService {
  private readonly logger = inject(LoggerService);

  public isValidateShowMessage = {
    OrderData: {
      invalidCoordinate: true,
    },
    parameter: {
      overDistance: true,
      overWeight: true,
    },
    validate: {
      invalidCoordinate: true,
      overDistance: true,
      overWeight: true,
    },
  };
  public validateMessage!: ValidateMessage;
  public constraintsData: Constraint = {
    earlyDeliveryTime: '',
    backToDepotTime: '',
    maximumWorkDuration: '',
    numberOfVehicleAvailable: 0,
    vehicleOrderSizeCapacity: 0,
    maximumTravelDistance: 0,
    serviceDurationTime: '',
    minimumVehicle: 0,
  };
  constraintsFromFileLoaded: boolean = false;
  public allDynamicParameters: DynamicParameter[] = [];
  public dynamicParametersByCategory: Array<{
    key: string;
    items: DynamicParameter[];
  }> = [];

  constructor(
    private readonly spinner: NgxSpinnerService,
    private readonly constraintService: ConstraintService,
    private readonly toastr: ToastrService,
    private readonly transloco: TranslocoService,
    private readonly state: RunStateService,
    private readonly ui: RunUiService,
  ) {}

  getValidateMessage(): void {
    this.transloco
      .selectTranslate('over_distance_warning', {}, 'index')
      .subscribe((translation) => {
        this.validateMessage = {
          filtersMessage: {
            constraints: {
              overDistance: {
                title: `${translation}!`,
                message: `${this.transloco.translate(
                  'over_distance_description',
                  {},
                  'index',
                )}.`,
              },
              overWeight: {
                title: `${this.transloco.translate(
                  'over_weight_warning',
                  {},
                  'index',
                )}!`,
                message: `${this.transloco.translate(
                  'over_weight_description',
                  {},
                  'index',
                )}.`,
              },
            },
            orderData: {
              invalidCoordinate: {
                title: `${this.transloco.translate(
                  'unverify_coordinate_danger',
                  {},
                  'index',
                )}!`,
                message: `${this.transloco.translate(
                  'unverify_coordinate_description',
                  {},
                  'index',
                )}.`,
              },
            },
          },
          warningMessage: {
            zeroWeight: {
              title: `${this.transloco.translate(
                'zero_weight_warning',
                {},
                'index',
              )}!`,
              message: `${this.transloco.translate(
                'zero_weight_description',
                {},
                'index',
              )}.`,
            },
          },
        };
      });
  }

  getDynamicParameters() {
    const selectedDepotIdName =
      this.state.getSelectedDepotObject()?.depotId ||
      this.state.experiment.depots?.[0]?.depotId;
    this.constraintService
      .getDynamicParameters(selectedDepotIdName)
      .subscribe((response: DynamicParameter[]) => {
        this.allDynamicParameters = response || [];
        if (!this.constraintsFromFileLoaded) {
          this.constraintsData =
            this.transformDynamicParametersToConstraint(response);
        }

        if (this.state.isCreateMode) {
          this.spinner.hide();
        }
        this.refreshDynamicParametersForSelectedDepot();
      });
  }

  transformDynamicParametersToConstraint(
    dynamicParameters: DynamicParameter[],
  ): Constraint {
    const constraint: Constraint = {
      earlyDeliveryTime: '',
      backToDepotTime: '',
      maximumWorkDuration: '',
      numberOfVehicleAvailable: 0,
      vehicleOrderSizeCapacity: 0,
      maximumTravelDistance: 0,
      serviceDurationTime: '',
      minimumVehicle: 0,
    };

    const chooseTime = (
      value: string | number | null | undefined,
      defaultValue: string | number | null | undefined,
    ): string => {
      const inputValueTrimmed = String(value ?? '').trim();
      const defaultValueTrimmed = String(defaultValue ?? '').trim();
      const isBlank =
        !inputValueTrimmed ||
        inputValueTrimmed.toLowerCase() === 'null' ||
        inputValueTrimmed === '00:00';
      if (isBlank) {
        if (
          !!defaultValueTrimmed &&
          defaultValueTrimmed.toLowerCase() !== 'null'
        )
          return defaultValueTrimmed;
        return '00:00';
      }
      return inputValueTrimmed;
    };
    const chooseNumber = (
      value: string | number | null | undefined,
      defaultValue: string | number | null | undefined,
    ): number => {
      const numericValue = Number(value);
      const defaultNumericValue = Number(defaultValue);
      if (!isNaN(numericValue) && numericValue > 0) return numericValue;
      if (!isNaN(defaultNumericValue) && defaultNumericValue > 0)
        return defaultNumericValue;
      return 0;
    };

    for (const param of dynamicParameters) {
      const key = this.getConstraintKeyForParam(param);
      if (!key) continue;
      const defaultValue = param.defaultValue;
      if (this.isTimeType(param)) {
        (constraint as Record<string, string | number | undefined>)[key] =
          chooseTime(param.value, defaultValue);
      } else if (this.isNumberType(param)) {
        (constraint as Record<string, string | number | undefined>)[key] =
          chooseNumber(param.value, defaultValue);
      } else {
        (constraint as Record<string, string | number | undefined>)[key] =
          (param.value ?? defaultValue ?? '') as string | number;
      }
    }

    return constraint;
  }

  refreshDynamicParametersForSelectedDepot(): void {
    const selectedDepot = this.state.getSelectedDepotObject();
    const base = Array.isArray(this.allDynamicParameters)
      ? this.allDynamicParameters
      : [];

    let scoped = base;
    if (selectedDepot?.depotId) {
      scoped = base.filter(
        (dynamicParameter) =>
          dynamicParameter.depotId === selectedDepot.depotId,
      );
    }
    if (!scoped.length) {
      scoped = base.filter((dynamicParameter) => !dynamicParameter.depotId);
    }
    if (!scoped.length) {
      scoped = base;
    }

    const preferRank = (dynamicParameter: DynamicParameter): number => {
      if (dynamicParameter.depotId === selectedDepot?.depotId) return 0;
      if (!dynamicParameter.depotId) return 1;
      return 2;
    };
    const dedupMap: Record<string, DynamicParameter> = {};
    for (const dynamicParameter of scoped) {
      const keyName = (dynamicParameter.keyName || '').trim();
      if (!keyName) continue;
      const existing = dedupMap[keyName];
      if (!existing) {
        dedupMap[keyName] = dynamicParameter;
      } else {
        if (preferRank(dynamicParameter) < preferRank(existing)) {
          dedupMap[keyName] = dynamicParameter;
        }
      }
    }
    const scopedUnique = Object.values(dedupMap);
    const defaultLocalized: LocalizedText = { th_TH: '', en_US: '' };
    const normalized: DynamicParameter[] = scopedUnique.map(
      (dynamicParameter) => {
        return {
          ...dynamicParameter,
          displayName:
            this.coerceLocalizedText(dynamicParameter.displayName) ??
            defaultLocalized,
          category:
            this.coerceLocalizedText(dynamicParameter.category) ??
            defaultLocalized,
          description:
            this.coerceLocalizedText(dynamicParameter.description) ??
            defaultLocalized,
        };
      },
    );

    const groupsMap: Record<string, DynamicParameter[]> = {};
    for (const dynamicParameter of normalized) {
      const categoryKey = (
        dynamicParameter.category.en_US || 'Generals'
      ).trim();
      if (!groupsMap[categoryKey]) groupsMap[categoryKey] = [];
      groupsMap[categoryKey].push(dynamicParameter);
    }

    const categoryOrderFromParams: string[] = [];
    for (const dynamicParameter of normalized) {
      const categoryKey = (
        dynamicParameter.category.en_US || 'Generals'
      ).trim();
      if (!categoryOrderFromParams.includes(categoryKey))
        categoryOrderFromParams.push(categoryKey);
    }
    const orderedKeys = Object.keys(groupsMap).sort((a, b) => {
      const indexA = categoryOrderFromParams.indexOf(a);
      const indexB = categoryOrderFromParams.indexOf(b);
      if (indexA === -1 && indexB === -1) return a.localeCompare(b);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });

    const useConstraintsValues = this.hasMeaningfulConstraintsData();
    this.dynamicParametersByCategory = orderedKeys.map((categoryKey) => {
      const originalItems = groupsMap[categoryKey];
      const items = useConstraintsValues
        ? originalItems.map((dynamicParameter) => {
            const constraintKey =
              this.getConstraintKeyForParam(dynamicParameter);
            if (!constraintKey) return dynamicParameter;
            const constraintValue = this.constraintsData[constraintKey];
            if (constraintValue === undefined || constraintValue === null) {
              if (this.isTimeType(dynamicParameter)) {
                return { ...dynamicParameter, value: '00:00' };
              }
              return dynamicParameter;
            }
            if (this.isNumberType(dynamicParameter)) {
              return { ...dynamicParameter, value: Number(constraintValue) };
            }
            const trimmedValue = String(constraintValue).trim();
            return {
              ...dynamicParameter,
              value:
                trimmedValue === '' || trimmedValue.toLowerCase() === 'null'
                  ? '00:00'
                  : trimmedValue,
            };
          })
        : originalItems;
      return {
        key: categoryKey,
        items,
      };
    });
    this.ui.detectChanges();
  }

  onParamValueChange(
    dynamicParameter: DynamicParameter,
    newValue: string | number | null | undefined,
  ): void {
    const key = this.getConstraintKeyForParam(dynamicParameter);

    if (this.isTimeType(dynamicParameter)) {
      const trimmedTimeValue = String(newValue ?? '').trim();
      const normalized =
        !trimmedTimeValue || trimmedTimeValue.toLowerCase() === 'null'
          ? '00:00'
          : trimmedTimeValue;
      dynamicParameter.value = normalized;
      if (key) this.onValueChange(normalized, key);
      return;
    }

    if (this.isNumberType(dynamicParameter)) {
      const numericValue = Number(newValue);
      const normalized = isNaN(numericValue) ? 0 : numericValue;
      dynamicParameter.value = normalized;
      if (key) this.onValueChange(normalized, key);
      return;
    }

    const trimmedTextValue = String(newValue ?? '').trim();
    dynamicParameter.value = trimmedTextValue;
    if (key) this.onValueChange(trimmedTextValue, key);
  }

  onValueChange<K extends keyof Constraint>(
    newValue: Constraint[K],
    property: K,
  ): void {
    this.updateConstraint(this.constraintsData, property, newValue);
    this.state.haveUpdateAfterValidated = true;
  }

  updateConstraint<K extends keyof Constraint>(
    obj: Constraint,
    key: K,
    value: Constraint[K],
  ): void {
    obj[key] = value;
  }

  buildDynamicParametersUpdatePayload(): Array<{
    id: string;
    value: string | number;
  }> {
    const updates: Array<{ id: string; value: string | number }> = [];
    for (const group of this.dynamicParametersByCategory) {
      for (const dynamicParameter of group.items) {
        if (
          dynamicParameter?.id &&
          dynamicParameter.value !== undefined &&
          dynamicParameter.value !== null
        ) {
          updates.push({
            id: dynamicParameter.id,
            value: dynamicParameter.value,
          });
        }
      }
    }
    return updates;
  }

  updateDynamicParameters(): void {
    const payload = this.buildDynamicParametersUpdatePayload();
    if (!payload.length) return;
    this.ui.showSpinner();
    this.constraintService.updateDynamicParameter(payload).subscribe({
      next: () => {
        this.toastr.success(
          this.transloco.translate('success', {}, 'index'),
          this.transloco.translate('set_default_parameter', {}, 'index'),
        );
      },
      error: (err) => {
        this.logger.error(err);
        this.toastr.error(
          this.transloco.translate('failed', {}, 'index'),
          this.transloco.translate('set_default_parameter_failed', {}, 'index'),
        );
      },
      complete: () => this.ui.hiddenSpinner(),
    });
  }

  buildValidateParameterFromDynamic(): TimingAndCapacity {
    const payload: Record<string, string | number> = {};

    for (const group of this.dynamicParametersByCategory) {
      for (const param of group.items) {
        const mappedKey =
          this.getConstraintKeyForParam(param) ||
          this.normalizeKeyName(param.keyName);
        if (!mappedKey) continue;

        if (this.isNumberType(param)) {
          const numericValue = Number(param.value);
          payload[mappedKey] = isNaN(numericValue) ? 0 : numericValue;
        } else if (this.isTimeType(param)) {
          const s = String(param.value ?? '').trim();
          payload[mappedKey] = !s || s.toLowerCase() === 'null' ? '00:00' : s;
        } else {
          payload[mappedKey] = String(param.value ?? '');
        }
      }
    }

    return payload as TimingAndCapacity;
  }

  private normalizeKeyName(rawKey: string | null | undefined): string {
    const trimmedKey = String(rawKey ?? '').trim();
    if (!trimmedKey) return '';
    return trimmedKey.charAt(0).toLowerCase() + trimmedKey.slice(1);
  }

  getBackendLocaleKey(): keyof LocalizedText {
    const active = this.transloco.getActiveLang();
    return active?.toLowerCase().startsWith('th') ? 'th_TH' : 'en_US';
  }

  getLocalized(text?: LocalizedText | string | null): string {
    if (!text) return '';
    const key = this.getBackendLocaleKey();
    if (typeof text === 'string') {
      try {
        const parsed = JSON.parse(text) as LocalizedText;
        return parsed[key] ?? '';
      } catch {
        return text;
      }
    }
    return text[key] ?? '';
  }

  coerceLocalizedText(
    value: LocalizedText | string | null | undefined,
  ): LocalizedText | null {
    if (!value) return null;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value) as LocalizedText;
      } catch {
        return { th_TH: value, en_US: value } as LocalizedText;
      }
    }
    return value as LocalizedText;
  }

  isTimeType(dynamicParameter: DynamicParameter): boolean {
    const normalizedValueType = (
      dynamicParameter.valueType || ''
    ).toLowerCase();
    return (
      normalizedValueType === 'time' || normalizedValueType.includes('duration')
    );
  }

  isNumberType(dynamicParameter: DynamicParameter): boolean {
    const normalizedValueType = (
      dynamicParameter.valueType || ''
    ).toLowerCase();
    return normalizedValueType.startsWith('number');
  }

  hasMeaningfulConstraintsData(): boolean {
    const c = this.constraintsData || ({} as Constraint);
    const hasTime =
      (c.earlyDeliveryTime && c.earlyDeliveryTime !== '00:00') ||
      (c.backToDepotTime && c.backToDepotTime !== '00:00') ||
      (c.maximumWorkDuration && c.maximumWorkDuration !== '00:00') ||
      (c.serviceDurationTime && c.serviceDurationTime !== '00:00');
    const hasNumber =
      (Number(c.numberOfVehicleAvailable) || 0) > 0 ||
      (Number(c.vehicleOrderSizeCapacity) || 0) > 0 ||
      (Number(c.maximumTravelDistance) || 0) > 0 ||
      (Number(c.minimumVehicle) || 0) > 0;
    return !!this.state.validateExperiment || hasTime || hasNumber;
  }

  getConstraintKeyForParam(
    dynamicParameter: DynamicParameter,
  ): keyof Constraint | null {
    const keyName = (dynamicParameter.keyName || '').trim();
    switch (keyName) {
      case 'EarlyDeliveryTime':
      case 'earlyDeliveryTime':
        return 'earlyDeliveryTime';
      case 'BackToDepotTime':
      case 'backToDepotTime':
        return 'backToDepotTime';
      case 'MaximumWorkDuration':
      case 'maximumWorkDuration':
        return 'maximumWorkDuration';
      case 'NumberOfVehicleAvailable':
      case 'numberOfVehicleAvailable':
        return 'numberOfVehicleAvailable';
      case 'VehicleOrderSizeCapacity':
      case 'vehicleOrderSizeCapacity':
        return 'vehicleOrderSizeCapacity';
      case 'MaximumTravelDistance':
      case 'maximumTravelDistance':
        return 'maximumTravelDistance';
      case 'ServiceDurationTime':
      case 'serviceDurationTime':
        return 'serviceDurationTime';
      case 'MinimumVehicle':
      case 'minimumVehicle':
        return 'minimumVehicle';
      default:
        return null;
    }
  }

  isOverWeightKey(dynamicParameter: DynamicParameter): boolean {
    return dynamicParameter.keyName === 'VehicleOrderSizeCapacity';
  }

  isOverDistanceKey(dynamicParameter: DynamicParameter): boolean {
    return dynamicParameter.keyName === 'MaximumTravelDistance';
  }

  hasDynamicParameters(): boolean {
    return (
      this.dynamicParametersByCategory &&
      this.dynamicParametersByCategory.length > 0
    );
  }

  showAllValidateMessages(): void {
    this.isValidateShowMessage = {
      OrderData: {
        invalidCoordinate: true,
      },
      parameter: {
        overDistance: true,
        overWeight: true,
      },
      validate: {
        invalidCoordinate: true,
        overDistance: true,
        overWeight: true,
      },
    };
  }
}
