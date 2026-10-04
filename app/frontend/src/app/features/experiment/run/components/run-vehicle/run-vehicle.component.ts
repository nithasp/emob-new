import { Component, TemplateRef, ViewChild } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { TranslocoService } from '@jsverse/transloco';
import { OpenVrpVehiclePreset } from '@features/configurations/models/vehicle.model';
import { RunStateService } from '../../services/run-state.service';
import { RunParameterService } from '../../services/run-parameter.service';
import { RunVehicleService } from '../../services/run-vehicle.service';
import { RunVehiclePoolService } from '../../services/run-vehicle-pool.service';
import { RunVehiclePresetService } from '../../services/run-vehicle-preset.service';
import { RunNavigationService } from '../../services/run-navigation.service';
import { RunValidationService } from '../../services/run-validation.service';

@Component({
  selector: 'app-run-vehicle',
  templateUrl: './run-vehicle.component.html',
  styleUrl: './run-vehicle.component.scss',
})
export class RunVehicleComponent {
  // Open VRP: preset configuration (save/load vehicle run list per depot)
  public presetName: string = '';
  @ViewChild('savePresetModal') savePresetModalTemplate?: TemplateRef<unknown>;

  constructor(
    private readonly ngbModal: NgbModal,
    private readonly toastr: ToastrService,
    private readonly transloco: TranslocoService,
    protected readonly state: RunStateService,
    protected readonly params: RunParameterService,
    protected readonly fleet: RunVehicleService,
    protected readonly pool: RunVehiclePoolService,
    protected readonly presets: RunVehiclePresetService,
    protected readonly navigation: RunNavigationService,
    protected readonly validation: RunValidationService,
  ) {}

  openSavePresetDialog(): void {
    if (!this.fleet.runVehicleList.length) {
      this.toastr.warning(
        this.transloco.translate('no_vehicles_in_run', {}, 'index'),
        this.transloco.translate('save_preset', {}, 'index'),
      );
      return;
    }
    if (!this.savePresetModalTemplate) return;
    this.presetName = '';
    this.ngbModal
      .open(this.savePresetModalTemplate, { centered: true, animation: true })
      .result.then(
        (confirmed: boolean) => {
          if (confirmed) {
            this.presets.savePreset(this.presetName);
          }
        },
        () => {},
      );
  }

  trackPresetById(_index: number, preset: OpenVrpVehiclePreset): string {
    return preset.id;
  }
}
