import { Injectable, inject } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { firstValueFrom } from 'rxjs';
import { TranslocoService } from '@jsverse/transloco';
import { DialogLicensePlateSelectionComponent } from '@features/configurations/vehicle-management/dialogs/dialog-license-plate-selection/dialog-license-plate-selection.component';
import { VehicleService } from '@features/configurations/services/vehicle.service';
import {
  VehicleBlobData,
  OpenVrpEndOfRoute,
  OpenVrpRunVehicleEntry,
  DEFAULT_MAX_TRIP,
} from '@features/configurations/models/vehicle.model';
import { LoggerService } from '@core/services/logger.service';
import { RunStateService } from './run-state.service';
import { RunUiService } from './run-ui.service';
import { RunParameterService } from './run-parameter.service';
import { RunVehicleService } from './run-vehicle.service';

@Injectable()
export class RunVehicleSelectionService {
  private readonly logger = inject(LoggerService);

  public selectedVehicleIds: string[] = [];
  public selectedVehicleCounts: Record<string, number> = {};
  public vehicleSelectionMode: Record<string, 'count' | 'license-plate'> = {};
  public selectedLicensePlates: Record<string, string[]> = {};
  public selectedVehicleIdsByLicensePlate: Record<string, string[]> = {};
  private readonly defaultVehicleMaxCount = 1000;

  constructor(
    private readonly ngbModal: NgbModal,
    private readonly toastr: ToastrService,
    private readonly transloco: TranslocoService,
    private readonly vehicleService: VehicleService,
    private readonly state: RunStateService,
    private readonly ui: RunUiService,
    private readonly params: RunParameterService,
    private readonly fleet: RunVehicleService,
  ) {}

  async loadVehicleDataFromBlob(
    vehiclesData: VehicleBlobData[],
  ): Promise<void> {
    if (!Array.isArray(vehiclesData)) {
      this.logger.warn('Invalid vehicles data format:', vehiclesData);
      return;
    }

    for (const vehicle of vehiclesData) {
      const vehicleTypeId = vehicle.vehicleTypeId;
      if (!vehicleTypeId) continue;

      // Check if this vehicle type exists in myVehicleTypes
      const vehicleTypeExists = this.fleet.myVehicleTypes.some(
        (v) => v.vehicleTypeId === vehicleTypeId,
      );
      if (!vehicleTypeExists) {
        this.logger.warn(
          `Vehicle type ${vehicleTypeId} not found in myVehicleTypes`,
        );
        continue;
      }

      // Determine selection mode based on data
      const hasCount =
        vehicle.numberOfVehiclesAvailable &&
        vehicle.numberOfVehiclesAvailable > 0;
      const hasSpecificVehicles =
        vehicle.specificVehicleIds &&
        Array.isArray(vehicle.specificVehicleIds) &&
        vehicle.specificVehicleIds.length > 0;

      if (hasCount || hasSpecificVehicles) {
        // Mark vehicle as selected
        if (!this.selectedVehicleIds.includes(vehicleTypeId)) {
          this.selectedVehicleIds.push(vehicleTypeId);
        }

        if (hasSpecificVehicles) {
          // Set to license-plate mode
          this.vehicleSelectionMode[vehicleTypeId] = 'license-plate';

          // Load license plates for these vehicle IDs
          // Pass the numberOfVehiclesAvailable to use for count display
          await this.loadLicensePlatesForVehicleIds(
            vehicleTypeId,
            vehicle.specificVehicleIds!,
            vehicle.numberOfVehiclesAvailable,
          );
        } else if (hasCount) {
          // Set to count mode
          this.vehicleSelectionMode[vehicleTypeId] = 'count';
          this.selectedVehicleCounts[vehicleTypeId] =
            vehicle.numberOfVehiclesAvailable!;
        }
      }
    }

    // Open VRP: mirror historical selections into the run list UI
    this.rebuildRunListFromSelections();

    this.ui.detectChanges();
  }

  async loadLicensePlatesForVehicleIds(
    vehicleTypeId: string,
    vehicleIds: string[],
    numberOfVehiclesAvailable?: number,
  ): Promise<void> {
    try {
      // Fetch all vehicles for this vehicle type
      const vehicles = await firstValueFrom(
        this.vehicleService.getMyVehicles(
          this.state.experiment.depots[0].depotId,
          vehicleTypeId,
        ),
      );

      // Filter to only the specific vehicle IDs
      const selectedVehicles = vehicles.filter((v) =>
        vehicleIds.includes(v.vehicleId),
      );

      // Extract license plates
      const licensePlates = selectedVehicles
        .filter((v) => v.licensePlate)
        .map((v) => v.licensePlate);

      // Update the component state
      this.selectedLicensePlates[vehicleTypeId] = licensePlates;
      this.selectedVehicleIdsByLicensePlate[vehicleTypeId] = vehicleIds;

      // Use numberOfVehiclesAvailable from blob if provided
      // If it's 0 or not provided, default to 1
      if (
        numberOfVehiclesAvailable !== undefined &&
        numberOfVehiclesAvailable !== null
      ) {
        this.selectedVehicleCounts[vehicleTypeId] =
          numberOfVehiclesAvailable || 1;
      } else {
        this.selectedVehicleCounts[vehicleTypeId] = licensePlates.length || 1;
      }
    } catch (error) {
      this.logger.error(
        `Error loading license plates for vehicle type ${vehicleTypeId}:`,
        error,
      );
      // Fallback: just store the vehicle IDs
      this.selectedVehicleIdsByLicensePlate[vehicleTypeId] = vehicleIds;

      // Use numberOfVehiclesAvailable if provided, otherwise default to 1
      if (
        numberOfVehiclesAvailable !== undefined &&
        numberOfVehiclesAvailable !== null
      ) {
        this.selectedVehicleCounts[vehicleTypeId] =
          numberOfVehiclesAvailable || 1;
      } else {
        this.selectedVehicleCounts[vehicleTypeId] = vehicleIds.length || 1;
      }
    }
  }

  /**
   * Rebuild the run list UI from the legacy selection structures that are
   * populated when a historical experiment is reloaded from blob storage.
   */
  private rebuildRunListFromSelections(): void {
    const depotId =
      this.state.experiment?.depots?.[0]?.depotId || this.state.scopeDepotId || 'default';
    const depotName =
      this.state.experiment?.depots?.[0]?.depotName || this.state.scopeDepotName;
    const list: OpenVrpRunVehicleEntry[] = [];

    for (const vehicleTypeId of this.selectedVehicleIds) {
      const mode = this.getVehicleSelectionMode(vehicleTypeId);
      const baseEntry = {
        id: this.fleet.nextRunEntryId(),
        vehicleTypeId,
        vehicleTypeName: this.fleet.getVehicleName(vehicleTypeId),
        endOfRoute: 'return' as OpenVrpEndOfRoute,
        startDepotId: depotId,
        startDepotName: depotName,
        endDepotId: depotId,
        endDepotName: depotName,
        // the blob carries no trip count yet, so a restored group falls back
        // to the vehicle type's own trips
        maxTrip: this.fleet.getVehicleTypeMaxTrip(vehicleTypeId),
        loadingDuration:
          this.fleet.getVehicleTypeMaxTrip(vehicleTypeId) > DEFAULT_MAX_TRIP
            ? this.fleet.getVehicleTypeLoadingDuration(vehicleTypeId) ||
              this.fleet.multiTripDefaults.defaultLoadingDuration
            : null,
      };
      if (mode === 'license-plate') {
        const vehicleIds =
          this.selectedVehicleIdsByLicensePlate[vehicleTypeId] || [];
        if (!vehicleIds.length) continue;
        list.push({
          ...baseEntry,
          mode: 'license-plate',
          count: vehicleIds.length,
          licensePlates: [
            ...(this.selectedLicensePlates[vehicleTypeId] || []),
          ],
          vehicleIds: [...vehicleIds],
        });
      } else {
        const count = this.getVehicleCount(vehicleTypeId);
        if (count <= 0) continue;
        list.push({
          ...baseEntry,
          mode: 'count',
          count,
          licensePlates: [],
          vehicleIds: [],
        });
      }
    }

    this.fleet.runVehicleListByDepot[depotId] = list;
  }

  isVehicleSelected(vehicleId: string): boolean {
    return this.selectedVehicleIds.includes(vehicleId);
  }

  onVehicleChecked(vehicleId: string, checked: boolean): void {
    if (checked) {
      this.fleet.vehicleSelectionError = false;
      if (!this.selectedVehicleIds.includes(vehicleId)) {
        this.selectedVehicleIds = [...this.selectedVehicleIds, vehicleId];
        if (this.selectedVehicleCounts[vehicleId] == null) {
          this.selectedVehicleCounts[vehicleId] = 1;
        }
        if (this.vehicleSelectionMode[vehicleId] == null) {
          this.vehicleSelectionMode[vehicleId] = 'count';
        }
      }
    } else {
      this.selectedVehicleIds = this.selectedVehicleIds.filter(
        (id) => id !== vehicleId,
      );
      if (this.selectedVehicleCounts[vehicleId] != null) {
        delete this.selectedVehicleCounts[vehicleId];
      }
      if (this.vehicleSelectionMode[vehicleId] != null) {
        delete this.vehicleSelectionMode[vehicleId];
      }
      // Clear selected license plates when vehicle is unchecked
      if (this.selectedLicensePlates[vehicleId] != null) {
        delete this.selectedLicensePlates[vehicleId];
      }
      if (this.selectedVehicleIdsByLicensePlate[vehicleId] != null) {
        delete this.selectedVehicleIdsByLicensePlate[vehicleId];
      }
    }
    this.ui.detectChanges();
  }

  getVehicleCount(vehicleId: string): number {
    const value = this.selectedVehicleCounts[vehicleId];
    return typeof value === 'number' && !isNaN(value) ? value : 1;
  }

  onVehicleCountChange(vehicleId: string, value: number): void {
    const normalized = Number(value);
    const min = this.getVehicleMinCount();
    const max = this.getVehicleMaxCount(vehicleId);
    let clamped = isNaN(normalized) ? min : Math.trunc(normalized);
    if (clamped < min) {
      clamped = min;
    } else if (clamped > max) {
      clamped = max;
    }

    this.selectedVehicleCounts[vehicleId] = clamped;
    this.ui.detectChanges();
  }

  // The limit is a per-experiment constraint that applies to every vehicle, so the id is not read yet.
  getVehicleMaxCount(_vehicleId: string): number {
    const maxByConstraint = Number(
      this.params.constraintsData?.numberOfVehicleAvailable,
    );
    if (!isNaN(maxByConstraint) && maxByConstraint > 0) {
      return maxByConstraint;
    }
    return this.defaultVehicleMaxCount;
  }

  getVehicleMinCount(): number {
    return 0;
  }

  getVehicleSelectionMode(vehicleId: string): 'count' | 'license-plate' {
    return this.vehicleSelectionMode[vehicleId] || 'count';
  }

  onVehicleSelectionModeChange(
    vehicleId: string,
    mode: 'count' | 'license-plate',
  ): void {
    const previousMode = this.vehicleSelectionMode[vehicleId];
    this.vehicleSelectionMode[vehicleId] = mode;

    // Only update mode, preserve existing count values
    if (previousMode !== mode) {
      if (mode === 'count') {
        // Switching to count mode - keep existing count, ensure it has a minimum value of 1
        if (
          this.selectedVehicleCounts[vehicleId] == null ||
          this.selectedVehicleCounts[vehicleId] === 0
        ) {
          this.selectedVehicleCounts[vehicleId] = 1;
        }
        // Note: We don't delete selectedLicensePlates or selectedVehicleIdsByLicensePlate
        // so user can switch back without losing their selection
      } else {
        // Switching to license-plate mode - preserve existing count value
        // Count will only update when user actually selects/deselects license plates
        if (
          this.selectedVehicleCounts[vehicleId] == null ||
          this.selectedVehicleCounts[vehicleId] === 0
        ) {
          this.selectedVehicleCounts[vehicleId] = 1;
        }
      }
    }

    this.ui.detectChanges();
  }

  openLicensePlateSelectionDialog(event: Event, vehicleId: string): void {
    // Prevent the radio button from being triggered
    event.stopPropagation();

    const vehicleType = this.fleet.myVehicleTypes.find(
      (v) => v.vehicleTypeId === vehicleId,
    );

    if (!vehicleType) {
      this.toastr.warning(
        this.transloco.translate('vehicle_not_found', {}, 'index'),
      );
      return;
    }

    // Get the depot ID from the selected depot or experiment depots
    const depotId =
      this.state.getSelectedDepotObject()?.depotId ||
      this.state.experiment.depots?.[0]?.depotId;

    const modalRef = this.ngbModal.open(DialogLicensePlateSelectionComponent, {
      centered: true,
      size: 'lg',
      animation: true,
    });

    modalRef.componentInstance.vehicleType = vehicleType;
    modalRef.componentInstance.vehicleId = vehicleId;
    modalRef.componentInstance.depotId = depotId;
    modalRef.componentInstance.preSelectedLicensePlates =
      this.selectedLicensePlates[vehicleId] || [];

    modalRef.result.then(
      (result) => {
        if (result) {
          // Store the selected license plates for this vehicle type
          this.selectedLicensePlates[vehicleId] = result.selectedLicensePlates;
          this.selectedVehicleIdsByLicensePlate[vehicleId] =
            result.selectedVehicleIds;
          this.ui.detectChanges();
        }
      },
      () => {},
    );
  }

  getSelectedLicensePlatesCount(vehicleId: string): number {
    return this.selectedLicensePlates[vehicleId]?.length || 0;
  }

  // Check if any selected vehicle in 'license-plate' mode has no vehicle IDs selected
  getInvalidVehicleSelections(): string[] {
    const invalidVehicles: string[] = [];

    for (const vehicleTypeId of this.selectedVehicleIds) {
      const mode = this.getVehicleSelectionMode(vehicleTypeId);

      if (mode === 'license-plate') {
        const vehicleIds = this.selectedVehicleIdsByLicensePlate[vehicleTypeId];
        if (!vehicleIds || vehicleIds.length === 0) {
          invalidVehicles.push(vehicleTypeId);
        }
      }
    }

    return invalidVehicles;
  }
}
