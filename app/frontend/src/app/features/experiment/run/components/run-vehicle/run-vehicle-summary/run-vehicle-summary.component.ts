import { Component } from '@angular/core';
import { NgbTooltip } from '@ng-bootstrap/ng-bootstrap';
import { OpenVrpDepotSummary } from '@features/configurations/models/vehicle.model';
import { RunVehicleService } from '../../../services/run-vehicle.service';

@Component({
  selector: 'app-run-vehicle-summary',
  templateUrl: './run-vehicle-summary.component.html',
  styleUrl: './run-vehicle-summary.component.scss',
})
export class RunVehicleSummaryComponent {
  constructor(protected readonly fleet: RunVehicleService) {}

  trackDepotSummary(_index: number, summary: OpenVrpDepotSummary): string {
    return summary.depotId;
  }

  /**
   * Shows the full depot name only when the column was too narrow to fit it.
   * Measuring on hover rather than through a binding keeps it honest: the text
   * is laid out by then, and no layout is read on every change detection.
   */
  openTooltipIfTruncated(tooltip: NgbTooltip, element: HTMLElement): void {
    if (element.scrollWidth > element.clientWidth) {
      tooltip.open();
    }
  }
}
