import { Component, inject } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslocoService } from '@jsverse/transloco';
import { DialogConfirmationComponent } from '@shared/components/dialogs/dialog-confirmation/dialog-confirmation.component';
import { LoggerService } from '@core/services/logger.service';
import { DynamicParameter } from '../../../models/constraint.model';
import { RunStateService } from '../../services/run-state.service';
import { RunParameterService } from '../../services/run-parameter.service';
import { RunNavigationService } from '../../services/run-navigation.service';
import { RunValidationService } from '../../services/run-validation.service';

@Component({
  selector: 'app-run-parameter',
  templateUrl: './run-parameter.component.html',
  styleUrl: './run-parameter.component.scss',
})
export class RunParameterComponent {
  private readonly logger = inject(LoggerService);

  constructor(
    private readonly ngbModal: NgbModal,
    private readonly transloco: TranslocoService,
    protected readonly state: RunStateService,
    protected readonly params: RunParameterService,
    protected readonly navigation: RunNavigationService,
    protected readonly validation: RunValidationService,
  ) {}

  // trackBy helpers to keep accordion stable across change detection/language swaps
  trackByGroup(
    index: number,
    group: { key: string; items: DynamicParameter[] },
  ): string {
    return group.key;
  }

  trackByParam(index: number, p: DynamicParameter): string {
    return p.id || `${p.depotId}-${p.keyName}-${index}`;
  }

  setParameterDefault() {
    const focusedElement = document.activeElement as HTMLElement;
    if (focusedElement) {
      focusedElement.blur();
    }
    const dialogRef = this.ngbModal.open(DialogConfirmationComponent, {
      centered: true,
      animation: true,
    });
    dialogRef.componentInstance.title = this.transloco.translate(
      'update_parameter_confirmation',
      {},
      'index',
    );
    dialogRef.componentInstance.question = `${this.transloco.translate(
      'confirm_to_set_default_parameter',
      {},
      'index',
    )} ?`;
    dialogRef.componentInstance.message = `${this.transloco.translate(
      'to_set_a_default_parameter_you_can_use_it_to_submit_an_experiment_in_the_future',
      {},
      'index',
    )}.`;

    dialogRef.result
      .then((confirmed: boolean) => {
        if (confirmed) {
          this.params.updateDynamicParameters();
        }
      })
      .catch((error) => {
        this.logger.error('Dialog was dismissed:', error);
      });
  }
}
