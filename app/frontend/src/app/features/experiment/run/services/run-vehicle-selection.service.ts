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

      const vehicleTypeExists = this.fleet.myVehicleTypes.some(
        (v) => v.vehicleTypeId === vehicleTypeId,
      );
      if (!vehicleTypeExists) {
        this.logger.warn(
          `Vehicle type ${vehicleTypeId} not found in myVehicleTypes`,
        );
        continue;
      }

      const hasCount =
        vehicle.numberOfVehiclesAvailable &&
        vehicle.numberOfVehiclesAvailable > 0;
      const hasSpecificVehicles =
        vehicle.specificVehicleIds &&
        Array.isArray(vehicle.specificVehicleIds) &&
        vehicle.specificVehicleIds.length > 0;

      if (hasCount || hasSpecificVehicles) {
        if (!this.selectedVehicleIds.includes(vehicleTypeId)) {
          this.selectedVehicleIds.push(vehicleTypeId);
        }

        if (hasSpecificVehicles) {
          this.vehicleSelectionMode[vehicleTypeId] = 'license-plate';

          await this.loadLicensePlatesForVehicleIds(
            vehicleTypeId,
            vehicle.specificVehicleIds!,
            vehicle.numberOfVehiclesAvailable,
          );
        } else if (hasCount) {
          this.vehicleSelectionMode[vehicleTypeId] = 'count';
          this.selectedVehicleCounts[vehicleTypeId] =
            vehicle.numberOfVehiclesAvailable!;
        }
      }
    }

    this.rebuildRunListFromSelections();

    this.ui.detectChanges();
  }

  async loadLicensePlatesForVehicleIds(
    vehicleTypeId: string,
    vehicleIds: string[],
    numberOfVehiclesAvailable?: number,
  ): Promise<void> {
    try {
      const vehicles = await firstValueFrom(
        this.vehicleService.getMyVehicles(
          this.state.experiment.depots[0].depotId,
          vehicleTypeId,
        ),
      );

      const selectedVehicles = vehicles.filter((v) =>
        vehicleIds.includes(v.vehicleId),
      );

      const licensePlates = selectedVehicles
        .filter((v) => v.licensePlate)
        .map((v) => v.licensePlate);

      this.selectedLicensePlates[vehicleTypeId] = licensePlates;
      this.selectedVehicleIdsByLicensePlate[vehicleTypeId] = vehicleIds;

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
      this.selectedVehicleIdsByLicensePlate[vehicleTypeId] = vehicleIds;

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

    if (previousMode !== mode) {
      if (mode === 'count') {
        if (
          this.selectedVehicleCounts[vehicleId] == null ||
          this.selectedVehicleCounts[vehicleId] === 0
        ) {
          this.selectedVehicleCounts[vehicleId] = 1;
        }
      } else {
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
