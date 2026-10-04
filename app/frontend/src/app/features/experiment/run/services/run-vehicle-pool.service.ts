import { Injectable, inject } from '@angular/core';
import { take } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { VehicleService } from '@features/configurations/services/vehicle.service';
import {
  MyVehicles,
  OpenVrpEndOfRoute,
  OpenVrpPoolBuilder,
  OpenVrpRunVehicleEntry,
  OpenVrpSelectionMode,
  DEFAULT_MAX_TRIP,
} from '@features/configurations/models/vehicle.model';
import { LoggerService } from '@core/services/logger.service';
import { addOrMergeRunEntry } from '../utils/vehicle-run-list.utils';
import { RunStateService } from './run-state.service';
import { RunUiService } from './run-ui.service';
import { RunVehicleService } from './run-vehicle.service';

@Injectable()
export class RunVehiclePoolService {
  private readonly logger = inject(LoggerService);

  public poolVehiclesByType: Record<string, MyVehicles[]> = {};
  public poolLoading: boolean = false;
  public openPoolCardTypeId: string | null = null;
  private poolBuilders: Record<string, OpenVrpPoolBuilder> = {};

  constructor(
    private readonly vehicleService: VehicleService,
    private readonly state: RunStateService,
    private readonly ui: RunUiService,
    private readonly fleet: RunVehicleService,
  ) {}

  loadVehiclePool(): void {
    this.poolLoading = true;
    this.vehicleService
      .getMyVehicles()
      .pipe(
        take(1),
        finalize(() => {
          this.poolLoading = false;
          this.ui.detectChanges();
        }),
      )
      .subscribe({
        next: (vehicles: MyVehicles[]) => {
          const grouped: Record<string, MyVehicles[]> = {};
          for (const vehicle of vehicles || []) {
            const vehicleTypeId = vehicle.vehicleType?.vehicleTypeId;
            if (!vehicleTypeId || vehicle.isActive === false) continue;
            if (!grouped[vehicleTypeId]) grouped[vehicleTypeId] = [];
            grouped[vehicleTypeId].push(vehicle);
          }
          this.poolVehiclesByType = grouped;
        },
        error: (error) => {
          this.logger.error('Error loading vehicle pool:', error);
        },
      });
  }

  getPoolVehicles(vehicleTypeId: string): MyVehicles[] {
    return this.poolVehiclesByType[vehicleTypeId] || [];
  }

  isPoolTypeTracked(vehicleTypeId: string): boolean {
    return this.getPoolVehicles(vehicleTypeId).length > 0;
  }

  private usedVehicleIdsInRun(): Set<string> {
    const used = new Set<string>();
    for (const entry of this.fleet.runVehicleList) {
      for (const vehicleId of entry.vehicleIds) {
        used.add(vehicleId);
      }
    }
    return used;
  }

  getPoolAvailableVehicles(vehicleTypeId: string): MyVehicles[] {
    const used = this.usedVehicleIdsInRun();
    return this.getPoolVehicles(vehicleTypeId).filter(
      (vehicle) => !used.has(vehicle.vehicleId),
    );
  }

  toggleMultiTripDemo(): void {
    this.fleet.multiTripDemo = !this.fleet.multiTripDemo;
    this.poolBuilders = {};
    this.openPoolCardTypeId = null;
    for (const entry of this.fleet.runVehicleList) {
      entry.maxTrip = this.fleet.clampMaxTrip(entry.maxTrip);
      entry.loadingDuration =
        entry.maxTrip > DEFAULT_MAX_TRIP
          ? entry.loadingDuration ||
            this.fleet.getVehicleTypeLoadingDuration(entry.vehicleTypeId) ||
            this.fleet.multiTripDefaults.defaultLoadingDuration
          : null;
    }
    this.ui.detectChanges();
  }

  togglePoolCard(vehicleTypeId: string): void {
    this.openPoolCardTypeId =
      this.openPoolCardTypeId === vehicleTypeId ? null : vehicleTypeId;
  }

  getPoolBuilder(vehicleTypeId: string): OpenVrpPoolBuilder {
    const key = `${this.state.scopeDepotId || 'default'}:${vehicleTypeId}`;
    if (!this.poolBuilders[key]) {
      this.poolBuilders[key] = this.createDefaultBuilder(vehicleTypeId);
    }
    const builder = this.poolBuilders[key];
    builder.maxTrip = this.fleet.clampMaxTrip(builder.maxTrip);
    return builder;
  }

  private createDefaultBuilder(vehicleTypeId: string): OpenVrpPoolBuilder {
    const builder: OpenVrpPoolBuilder = {
      mode: 'count',
      count: 1,
      endOfRoute: 'return',
      chosenVehicleIds: [],
      startDepotId: null,
      endDepotId: null,
      maxTrip: this.fleet.getVehicleTypeMaxTrip(vehicleTypeId),
      loadingDuration: null,
    };
    this.syncBuilderLoadingDuration(vehicleTypeId, builder);
    return builder;
  }

  private resetPoolBuilder(vehicleTypeId: string): void {
    const key = `${this.state.scopeDepotId || 'default'}:${vehicleTypeId}`;
    this.poolBuilders[key] = this.createDefaultBuilder(vehicleTypeId);
  }

  setPoolBuilderMode(vehicleTypeId: string, mode: OpenVrpSelectionMode): void {
    if (mode === 'license-plate' && !this.isPoolTypeTracked(vehicleTypeId)) {
      return;
    }
    this.getPoolBuilder(vehicleTypeId).mode = mode;
  }

  changePoolBuilderCount(vehicleTypeId: string, delta: number): void {
    const builder = this.getPoolBuilder(vehicleTypeId);
    this.setPoolBuilderCount(vehicleTypeId, builder.count + delta);
  }

  setPoolBuilderCount(vehicleTypeId: string, count: number | null): number {
    const builder = this.getPoolBuilder(vehicleTypeId);
    const requested = Number(count);
    builder.count = Number.isFinite(requested)
      ? Math.max(0, Math.trunc(requested))
      : 0;
    return builder.count;
  }

  isPoolPlateChosen(vehicleTypeId: string, vehicleId: string): boolean {
    return this.getPoolBuilder(vehicleTypeId).chosenVehicleIds.includes(
      vehicleId,
    );
  }

  togglePoolPlate(
    vehicleTypeId: string,
    vehicleId: string,
    checked: boolean,
  ): void {
    const builder = this.getPoolBuilder(vehicleTypeId);
    if (checked) {
      if (!builder.chosenVehicleIds.includes(vehicleId)) {
        builder.chosenVehicleIds.push(vehicleId);
      }
    } else {
      builder.chosenVehicleIds = builder.chosenVehicleIds.filter(
        (id) => id !== vehicleId,
      );
    }
  }

  setPoolEndOfRoute(
    vehicleTypeId: string,
    endOfRoute: OpenVrpEndOfRoute,
  ): void {
    this.getPoolBuilder(vehicleTypeId).endOfRoute = endOfRoute;
  }

  onPoolStartDepotChange(vehicleTypeId: string, depotId: string): void {
    this.getPoolBuilder(vehicleTypeId).startDepotId = depotId || null;
  }

  private get defaultBuilderDepotId(): string {
    const scopeDepotId = this.state.scopeDepotId;
    const isListed = this.state.depots.some(
      (depot) => depot.depotId === scopeDepotId,
    );
    return (isListed ? scopeDepotId : this.state.depots[0]?.depotId) || '';
  }

  getBuilderStartDepotId(vehicleTypeId: string): string {
    return (
      this.getPoolBuilder(vehicleTypeId).startDepotId ||
      this.defaultBuilderDepotId
    );
  }

  onPoolEndDepotChange(vehicleTypeId: string, depotId: string): void {
    this.getPoolBuilder(vehicleTypeId).endDepotId = depotId || null;
  }

  getBuilderEndDepotId(vehicleTypeId: string): string {
    return (
      this.getPoolBuilder(vehicleTypeId).endDepotId ||
      this.getBuilderStartDepotId(vehicleTypeId)
    );
  }

  changePoolBuilderMaxTrip(vehicleTypeId: string, delta: number): void {
    const builder = this.getPoolBuilder(vehicleTypeId);
    this.setPoolBuilderMaxTrip(vehicleTypeId, builder.maxTrip + delta);
  }

  setPoolBuilderMaxTrip(
    vehicleTypeId: string,
    maxTrip: number | null,
  ): void {
    const builder = this.getPoolBuilder(vehicleTypeId);
    builder.maxTrip = this.fleet.clampMaxTrip(Number(maxTrip));
    this.syncBuilderLoadingDuration(vehicleTypeId, builder);
  }

  private syncBuilderLoadingDuration(
    vehicleTypeId: string,
    builder: OpenVrpPoolBuilder,
  ): void {
    if (builder.maxTrip <= DEFAULT_MAX_TRIP) {
      builder.loadingDuration = null;
      return;
    }
    if (!builder.loadingDuration) {
      builder.loadingDuration =
        this.fleet.getVehicleTypeLoadingDuration(vehicleTypeId) ||
        this.fleet.multiTripDefaults.defaultLoadingDuration;
    }
  }

  getPoolBuilderLoadingDuration(vehicleTypeId: string): string {
    return (
      this.getPoolBuilder(vehicleTypeId).loadingDuration ||
      this.fleet.multiTripDefaults.defaultLoadingDuration
    );
  }

  setPoolBuilderLoadingDuration(
    vehicleTypeId: string,
    loadingDuration: string | null,
  ): void {
    const builder = this.getPoolBuilder(vehicleTypeId);
    builder.loadingDuration =
      loadingDuration || this.fleet.multiTripDefaults.defaultLoadingDuration;
  }

  canAddPoolEntry(vehicleTypeId: string): boolean {
    const builder = this.getPoolBuilder(vehicleTypeId);
    if (builder.mode === 'license-plate') {
      return this.getPoolAvailableVehicles(vehicleTypeId).some((vehicle) =>
        builder.chosenVehicleIds.includes(vehicle.vehicleId),
      );
    }
    return builder.count > 0;
  }

  addPoolEntryToRun(vehicleTypeId: string): void {
    if (!this.canAddPoolEntry(vehicleTypeId)) return;
    const builder = this.getPoolBuilder(vehicleTypeId);
    const startDepotId = this.getBuilderStartDepotId(vehicleTypeId);
    const startDepotName =
      this.state.depots.find((depot) => depot.depotId === startDepotId)
        ?.depotName || this.state.scopeDepotName;
    const returnToDepot = builder.endOfRoute === 'return';
    const endDepotId = returnToDepot
      ? this.getBuilderEndDepotId(vehicleTypeId)
      : null;
    const endDepotName = returnToDepot
      ? this.state.depots.find((depot) => depot.depotId === endDepotId)
          ?.depotName || startDepotName
      : null;

    const maxTrip = this.fleet.clampMaxTrip(builder.maxTrip);
    const baseEntry = {
      id: this.fleet.nextRunEntryId(),
      vehicleTypeId,
      vehicleTypeName: this.fleet.getVehicleName(vehicleTypeId),
      endOfRoute: builder.endOfRoute,
      startDepotId,
      startDepotName,
      endDepotId,
      endDepotName,
      maxTrip,
      loadingDuration:
        maxTrip > DEFAULT_MAX_TRIP
          ? this.getPoolBuilderLoadingDuration(vehicleTypeId)
          : null,
    };

    let entry: OpenVrpRunVehicleEntry;
    if (builder.mode === 'license-plate') {
      const chosenVehicles = this.getPoolAvailableVehicles(
        vehicleTypeId,
      ).filter((vehicle) =>
        builder.chosenVehicleIds.includes(vehicle.vehicleId),
      );
      if (!chosenVehicles.length) return;
      entry = {
        ...baseEntry,
        mode: 'license-plate',
        count: chosenVehicles.length,
        licensePlates: chosenVehicles.map((vehicle) => vehicle.licensePlate),
        vehicleIds: chosenVehicles.map((vehicle) => vehicle.vehicleId),
      };
    } else {
      entry = {
        ...baseEntry,
        mode: 'count',
        count: builder.count,
        licensePlates: [],
        vehicleIds: [],
      };
    }

    const mergedInto = addOrMergeRunEntry(this.fleet.runVehicleList, entry);
    if (mergedInto) {
      this.fleet.notifyRunEntryMerged(mergedInto, entry.count);
    }
    this.resetPoolBuilder(vehicleTypeId);
    this.openPoolCardTypeId = null;
    this.fleet.vehicleSelectionError = false;
    this.fleet.markVehicleConfigurationChanged();
  }

  editRunEntry(entryId: number): void {
    const list = this.fleet.runVehicleList;
    const index = list.findIndex((entry) => entry.id === entryId);
    if (index < 0) return;
    const entry = list[index];
    list.splice(index, 1);
    const key = `${this.state.scopeDepotId || 'default'}:${entry.vehicleTypeId}`;
    this.poolBuilders[key] = {
      mode: entry.mode,
      count: entry.count,
      endOfRoute: entry.endOfRoute,
      chosenVehicleIds:
        entry.mode === 'license-plate' ? [...entry.vehicleIds] : [],
      startDepotId: entry.startDepotId || null,
      endDepotId:
        entry.endDepotId !== entry.startDepotId ? entry.endDepotId : null,
      maxTrip: this.fleet.clampMaxTrip(entry.maxTrip),
      loadingDuration: entry.loadingDuration,
    };
    this.openPoolCardTypeId = entry.vehicleTypeId;
    this.fleet.markVehicleConfigurationChanged();
  }
}
