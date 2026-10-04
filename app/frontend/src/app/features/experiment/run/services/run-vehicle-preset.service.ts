import { Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { TranslocoService } from '@jsverse/transloco';
import { OpenVrpVehiclePreset, DEFAULT_MAX_TRIP } from '@features/configurations/models/vehicle.model';
import { addOrMergeRunEntry } from '../utils/vehicle-run-list.utils';
import { RunStateService } from './run-state.service';
import { RunUiService } from './run-ui.service';
import { RunVehicleService } from './run-vehicle.service';
import { RunVehiclePoolService } from './run-vehicle-pool.service';

@Injectable()
export class RunVehiclePresetService {
  private readonly openVrpPresetStorageKey = 'openVrpVehiclePresets';
  private presetsVersion = 0;
  private presetsCacheKey: string | null = null;
  private presetsCache: OpenVrpVehiclePreset[] = [];

  constructor(
    private readonly toastr: ToastrService,
    private readonly transloco: TranslocoService,
    private readonly state: RunStateService,
    private readonly ui: RunUiService,
    private readonly fleet: RunVehicleService,
    private readonly pool: RunVehiclePoolService,
  ) {}

  /**
   * Memoised so the getter returns the *same* array instance between change
   * detection runs. Re-parsing storage on every run handed `*ngFor` brand new
   * objects each time, which made Angular destroy and re-create every preset
   * row — a row destroyed between mousedown and mouseup never emits `click`.
   * The cache is invalidated by `writeAllPresets()` and by a depot change.
   */
  get currentDepotPresets(): OpenVrpVehiclePreset[] {
    const depotId = this.state.scopeDepotId;
    const cacheKey = `${this.presetsVersion}|${depotId}`;
    if (cacheKey !== this.presetsCacheKey) {
      this.presetsCacheKey = cacheKey;
      this.presetsCache = depotId
        ? this.readAllPresets().filter((preset) => preset.depotId === depotId)
        : [];
    }
    return this.presetsCache;
  }

  savePreset(presetName: string): void {
    const name = (presetName || '').trim();
    if (!name) return;
    const preset: OpenVrpVehiclePreset = {
      id: this.state.generateUniqueId(),
      name,
      depotId: this.state.scopeDepotId,
      depotName: this.state.scopeDepotName,
      createdAt: new Date().toISOString(),
      entries: this.fleet.runVehicleList.map(({ id: _id, ...savedEntry }) => ({
        ...savedEntry,
        licensePlates: [...savedEntry.licensePlates],
        vehicleIds: [...savedEntry.vehicleIds],
      })),
    };
    const presets = this.readAllPresets();
    presets.push(preset);
    this.writeAllPresets(presets);
    this.toastr.success(
      name,
      this.transloco.translate('preset_saved', {}, 'index'),
    );
  }

  loadPreset(preset: OpenVrpVehiclePreset): void {
    const key = this.state.scopeDepotId || 'default';
    this.fleet.runVehicleListByDepot[key] = [];
    let adjusted = false;

    for (const savedEntry of preset.entries) {
      const vehicleTypeName = this.fleet.getVehicleName(savedEntry.vehicleTypeId);
      if (!vehicleTypeName) {
        adjusted = true;
        continue;
      }
      const maxTrip = this.fleet.clampMaxTrip(
        savedEntry.maxTrip ?? this.fleet.getVehicleTypeMaxTrip(savedEntry.vehicleTypeId),
      );
      if (savedEntry.maxTrip != null && maxTrip !== savedEntry.maxTrip) {
        adjusted = true;
      }
      const loadingDuration =
        maxTrip > DEFAULT_MAX_TRIP
          ? savedEntry.loadingDuration ||
            this.fleet.getVehicleTypeLoadingDuration(savedEntry.vehicleTypeId) ||
            this.fleet.multiTripDefaults.defaultLoadingDuration
          : null;
      if (savedEntry.mode === 'license-plate') {
        const chosenVehicles = this.pool.getPoolAvailableVehicles(
          savedEntry.vehicleTypeId,
        ).filter((vehicle) =>
          savedEntry.vehicleIds.includes(vehicle.vehicleId),
        );
        if (chosenVehicles.length !== savedEntry.vehicleIds.length) {
          adjusted = true;
        }
        if (!chosenVehicles.length) continue;
        addOrMergeRunEntry(this.fleet.runVehicleList, {
          ...savedEntry,
          id: this.fleet.nextRunEntryId(),
          vehicleTypeName,
          count: chosenVehicles.length,
          licensePlates: chosenVehicles.map(
            (vehicle) => vehicle.licensePlate,
          ),
          vehicleIds: chosenVehicles.map((vehicle) => vehicle.vehicleId),
          maxTrip,
          loadingDuration,
        });
      } else {
        if (savedEntry.count <= 0) continue;
        addOrMergeRunEntry(this.fleet.runVehicleList, {
          ...savedEntry,
          id: this.fleet.nextRunEntryId(),
          vehicleTypeName,
          count: savedEntry.count,
          licensePlates: [],
          vehicleIds: [],
          maxTrip,
          loadingDuration,
        });
      }
    }

    this.pool.openPoolCardTypeId = null;
    this.fleet.vehicleSelectionError = false;
    this.fleet.markVehicleConfigurationChanged();

    if (adjusted) {
      this.toastr.warning(
        this.transloco.translate(
          'preset_loaded_with_adjustments',
          {},
          'index',
        ),
        preset.name,
      );
    } else {
      this.toastr.success(
        preset.name,
        this.transloco.translate('preset_loaded', {}, 'index'),
      );
    }
  }

  deletePreset(preset: OpenVrpVehiclePreset, event: Event): void {
    event.stopPropagation();
    const presets = this.readAllPresets().filter(
      (existing) => existing.id !== preset.id,
    );
    this.writeAllPresets(presets);
    this.toastr.info(
      preset.name,
      this.transloco.translate('preset_deleted', {}, 'index'),
    );
    this.ui.detectChanges();
  }

  private readAllPresets(): OpenVrpVehiclePreset[] {
    try {
      const raw = localStorage.getItem(this.openVrpPresetStorageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private writeAllPresets(presets: OpenVrpVehiclePreset[]): void {
    localStorage.setItem(
      this.openVrpPresetStorageKey,
      JSON.stringify(presets),
    );
    this.presetsVersion++;
  }
}
