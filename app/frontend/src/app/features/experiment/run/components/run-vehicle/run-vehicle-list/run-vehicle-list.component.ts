import { Component, ElementRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import {
  OpenVrpRunVehicleEntry,
  OpenVrpRunVehicleGroup,
  DEFAULT_MAX_TRIP,
} from '@features/configurations/models/vehicle.model';
import { RunVehicleService } from '../../../services/run-vehicle.service';
import { RunVehiclePoolService } from '../../../services/run-vehicle-pool.service';

@Component({
  selector: 'app-run-vehicle-list',
  templateUrl: './run-vehicle-list.component.html',
  styleUrl: './run-vehicle-list.component.scss',
})
export class RunVehicleListComponent {
  constructor(
    private readonly transloco: TranslocoService,
    private readonly hostRef: ElementRef<HTMLElement>,
    protected readonly fleet: RunVehicleService,
    protected readonly pool: RunVehiclePoolService,
  ) {
    this.fleet.runEntryMerged$
      .pipe(takeUntilDestroyed())
      .subscribe((entryId) => this.scrollRunEntryIntoView(entryId));
  }

  trackRunVehicleGroup(_index: number, group: OpenVrpRunVehicleGroup): string {
    return group.vehicleTypeId;
  }

  trackRunVehicleEntry(_index: number, entry: OpenVrpRunVehicleEntry): number {
    return entry.id;
  }

  getRunEntryDetail(entry: OpenVrpRunVehicleEntry): string {
    if (entry.mode === 'license-plate' && entry.licensePlates.length) {
      return entry.licensePlates.join(', ');
    }
    return `${entry.count} ${this.transloco.translate('vehicles_unit', {}, 'index')}`;
  }

  getRunEntryTrips(entry: OpenVrpRunVehicleEntry): string {
    const maxTrip = entry.maxTrip || DEFAULT_MAX_TRIP;
    if (maxTrip <= DEFAULT_MAX_TRIP) return '';
    const trips = `${maxTrip} ${this.transloco.translate('trips_unit', {}, 'index')}`;
    if (!entry.loadingDuration) return trips;
    return `${trips} · ${this.transloco.translate('reload_at_depot', {}, 'index')} ${entry.loadingDuration}`;
  }

  getRunEntryRoute(entry: OpenVrpRunVehicleEntry): string {
    if (entry.endOfRoute === 'return') {
      return `${entry.startDepotName} → ${entry.endDepotName || entry.startDepotName}`;
    }
    return `${entry.startDepotName} → ${this.transloco.translate('ends_at_last_stop', {}, 'index')}`;
  }

  /**
   * The run list scrolls on its own, so the row that grew can sit below the
   * fold — where neither the highlight nor the changed count would be seen.
   * `nearest` leaves a row that is already visible where it is.
   */
  private scrollRunEntryIntoView(entryId: number): void {
    // after the pending change detection, so the row is laid out with its
    // new count before it is measured
    setTimeout(() => {
      this.hostRef.nativeElement
        .querySelector<HTMLElement>(`[data-run-entry-id="${entryId}"]`)
        ?.scrollIntoView({
          block: 'nearest',
          behavior: this.prefersReducedMotion() ? 'auto' : 'smooth',
        });
    });
  }

  /** Honours the OS "reduce motion" setting for animated feedback. */
  private prefersReducedMotion(): boolean {
    return (
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false
    );
  }
}
