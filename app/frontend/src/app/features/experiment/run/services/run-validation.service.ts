import { Injectable, inject } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { finalize } from 'rxjs/operators';
import { TranslocoService } from '@jsverse/transloco';
import { DataService } from '@shared/services/data.service';
import { LoggerService } from '@core/services/logger.service';
import { Constraint } from '../../models/constraint.model';
import { ValidationWarningItem, ValidateExperimentResponse } from '../../models/experiment.model';
import { ExperimentService } from '../../services/experiment.service';
import { ValidationTableRow } from '../../models/validation-table.model';
import {
  buildTableRows,
  createCachedValidationMessageFn,
  deduplicateByInput,
} from '../utils/validation-table.utils';
import { RunStateService } from './run-state.service';
import { RunUiService } from './run-ui.service';
import { RunParameterService } from './run-parameter.service';
import { RunVehicleService } from './run-vehicle.service';
import { RunOrderDataService } from './run-order-data.service';
import { RunNavigationService } from './run-navigation.service';

@Injectable()
export class RunValidationService {
  private readonly logger = inject(LoggerService);

  validationWarnings: ValidationWarningItem[] = [];
  validationWarningCollapseStates: boolean[] = [];
  isValidationWarning: boolean = false;
  validationErrors: ValidationWarningItem[] = [];
  validationErrorCollapseStates: boolean[] = [];
  isValidationError: boolean = false;
  private cachedGetValidationMessage!: ReturnType<
    typeof createCachedValidationMessageFn
  >;

  constructor(
    private readonly experimentService: ExperimentService,
    private readonly toastr: ToastrService,
    private readonly dataService: DataService,
    private readonly transloco: TranslocoService,
    private readonly state: RunStateService,
    private readonly ui: RunUiService,
    private readonly params: RunParameterService,
    private readonly fleet: RunVehicleService,
    private readonly orders: RunOrderDataService,
    private readonly navigation: RunNavigationService,
  ) {}

  validateExperimentPreOrder() {
    // Open VRP: at least one vehicle group must be added to the run list
    if (this.fleet.runVehicleList.length === 0) {
      this.fleet.vehicleSelectionError = true;
      this.navigation.navigateToTab(2);
      return;
    }
    this.fleet.vehicleSelectionError = false;

    const parameterPayload = this.params.buildValidateParameterFromDynamic();
    const vehiclesPayload = this.fleet.buildVehiclesPayload();

    // proceed with validation using constructed parameterPayload
    if (
      (parameterPayload.earlyDeliveryTime || '') >
      (parameterPayload.backToDepotTime || '')
    ) {
      this.ui.showInvalidModal(
        'INVALID : Early Delivery Time',
        'Early Delivery Time must be less than Back to Depot Time',
      );
      return;
    }

    this.ui.showSpinner();
    this.experimentService
      .validateExperiment(
        this.state.experiment.runId,
        parameterPayload as Constraint,
        this.orders.customersLocationUpdated,
        vehiclesPayload,
      )
      .pipe(
        finalize(() => {
          this.ui.hiddenSpinner();
        }),
      )
      .subscribe({
        next: (result: ValidateExperimentResponse) => {
          this.logger.log('validateExperiment result', result);
          const validateResult = result.result;
          const errors = validateResult?.error || [];
          const warnings = validateResult?.warning || [];
          // Error case: backend explicitly returns isSuccesses=false, or sends an error[] payload
          const hasError =
            validateResult?.isSuccesses === false || errors.length > 0;
          // Warning case: backend flags isWarning=true and there is no blocking error
          const hasWarning =
            !hasError && (validateResult?.isWarning === true || warnings.length > 0);

          if (validateResult?.message) {
            if (hasError) {
              this.toastr.error(validateResult.message);
            } else {
              this.toastr.success(validateResult.message);
            }
          }
          this.state.haveUpdateAfterValidated = false;
          // Sync constraints with the payload used for validation so UI reflects latest
          const mergedConstraint: Constraint = {
            ...this.params.constraintsData,
            ...(parameterPayload as Partial<Constraint>),
          };
          this.params.constraintsData = mergedConstraint;
          this.state.validateExperiment = validateResult?.validate || null;
          this.dataService.clearData(this.state.experiment.runId);
          // Rebuild dynamic parameters so values reflect constraintsData when validated
          this.params.refreshDynamicParametersForSelectedDepot();
          this.navigation.navigateToTab(4); // Always navigate to validation tab after validation
          // Mark validation as completed and show corresponding messages (success path)
          this.state.haveValidated = true;

          this.isValidationWarning = hasWarning;
          if (hasWarning) {
            this.setValidationWarnings(warnings);
          } else {
            this.setValidationWarnings([]);
          }

          this.isValidationError = hasError;
          if (hasError) {
            this.setValidationErrors(errors);
          } else {
            this.setValidationErrors([]);
          }

          this.params.showAllValidateMessages();
        },
        error: (err) => {
          this.logger.error(err);
        },
      });
  }

  getWarningTypeLabel(errorType: string): string {
    const normalizedKey = (errorType || '')
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, '_');
    const scopedKey = `validation.${normalizedKey}`;
    const translated = this.transloco.translate(scopedKey, { errorType });
    if (!translated || translated === scopedKey) {
      return this.transloco.translate('validation.unknown_validation_error', {
        errorType,
      });
    }
    return translated;
  }

  getValidationMessage(
    type: string,
    params: Record<string, unknown>,
  ): string {
    return this.cachedGetValidationMessage(type, params);
  }

  setValidationWarnings(warnings: ValidationWarningItem[]) {
    this.resetMessageCache();
    const safeWarnings = (warnings || []).map((warning) =>
      warning.errorType === 'missing_product'
        ? { ...warning, detail: deduplicateByInput(warning.detail) }
        : warning,
    );
    this.validationWarnings = safeWarnings;
    this.validationWarningCollapseStates = safeWarnings.map(() => false);
  }

  getRowsForWarning(warning: ValidationWarningItem): ValidationTableRow[] {
    return buildTableRows([warning]);
  }

  toggleValidationWarningCollapse(index: number) {
    this.validationWarningCollapseStates[index] =
      !this.validationWarningCollapseStates[index];
  }

  setValidationErrors(errors: ValidationWarningItem[]) {
    this.resetMessageCache();
    const safeErrors = errors || [];
    this.validationErrors = safeErrors;
    this.validationErrorCollapseStates = safeErrors.map(() => false);
  }

  getRowsForError(error: ValidationWarningItem): ValidationTableRow[] {
    return buildTableRows([error]);
  }

  toggleValidationErrorCollapse(index: number) {
    this.validationErrorCollapseStates[index] =
      !this.validationErrorCollapseStates[index];
  }

  /** Messages are cached per language, so the cache starts over whenever the language or the list changes. */
  resetMessageCache(): void {
    this.cachedGetValidationMessage = createCachedValidationMessageFn(
      this.transloco,
    );
  }
}
