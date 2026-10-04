import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { TranslocoService } from '@jsverse/transloco';
import { Subject } from 'rxjs';
import { DialogVehicleTypeComponent } from '@features/configurations/vehicle-management/dialogs/dialog-vehicle-type/dialog-vehicle-type.component';
import {
  VehicleType,
  VehicleValidationInput,
  OpenVrpDepotRunList,
  OpenVrpDepotSummary,
  OpenVrpRunSummaryTotals,
  OpenVrpRunVehicleEntry,
  OpenVrpRunVehicleGroup,
  OpenVrpSummaryView,
  DEFAULT_MAX_TRIP,
} from '@features/configurations/models/vehicle.model';
import { getMultiTripSystemDefaults } from '@features/configurations/utils/multi-trip-fallback.utils';
import {
  buildMockDepotRunLists,
  sumDepotSummaries,
  sumRunEntries,
} from '../utils/multi-depot-summary.utils';
import { groupRunEntriesByVehicleType } from '../utils/vehicle-run-list.utils';
import { RunStateService } from './run-state.service';
import { RunUiService } from './run-ui.service';

const RUN_ENTRY_MERGE_NOTICE_MS = 8000;

const OPEN_VRP_MULTI_TRIP_DEMO = [
  { loadingDuration: '00:30' },
  { loadingDuration: '00:20' },
  { loadingDuration: '00:45' },
];

@Injectable()
export class RunVehicleService {
  public myVehicleTypes: VehicleType[] = [];
  public vehicleSelectionError: boolean = false;
  public runVehicleListByDepot: Record<string, OpenVrpRunVehicleEntry[]> = {};
  private runEntryIdCounter = 1;
  public highlightedRunEntryId: number | null = null;
  private highlightTimer?: ReturnType<typeof setTimeout>;
  public multiTripDemo: boolean = false;
  public multiDepotDemo: boolean = false;
  private mockDepotRunLists: OpenVrpDepotRunList[] | null = null;
  public readonly multiTripDefaults = getMultiTripSystemDefaults();

  readonly runEntryMerged$ = new Subject<number>();

  constructor(
    private readonly ngbModal: NgbModal,
    private readonly toastr: ToastrService,
    private readonly transloco: TranslocoService,
    private readonly state: RunStateService,
    private readonly ui: RunUiService,
  ) {}

  get availableVehicleTypes(): VehicleType[] {
    return this.myVehicleTypes.filter(
      (vehicle) => vehicle.isVehicleAvailable ?? false,
    );
  }

  hasMyVehicleTypes(): boolean {
    return this.myVehicleTypes && this.myVehicleTypes.length > 0;
  }

  getVehicleName(vehicleId: string): string {
    const vehicle = this.myVehicleTypes.find(
      (v) => v.vehicleTypeId === vehicleId,
    );
    return vehicle ? vehicle.name : '';
  }

  openVehicleItemModal(vehicleId: string) {
    const vehicleType = this.myVehicleTypes.find(
      (v) => v.vehicleTypeId === vehicleId,
    );

    if (!vehicleType) {
      this.toastr.warning(
        this.transloco.translate('vehicle_not_found', {}, 'index'),
      );
      return;
    }

    const modalRef = this.ngbModal.open(DialogVehicleTypeComponent, {
      centered: true,
      size: 'lg',
      animation: true,
      backdrop: 'static',
      keyboard: false,
    });
    modalRef.componentInstance.mode = 'view';
    modalRef.componentInstance.vehicleType = vehicleType;
  }

  get runVehicleList(): OpenVrpRunVehicleEntry[] {
    const key = this.state.scopeDepotId || 'default';
    if (!this.runVehicleListByDepot[key]) {
      this.runVehicleListByDepot[key] = [];
    }
    return this.runVehicleListByDepot[key];
  }

  removeRunEntry(entryId: number): void {
    const list = this.runVehicleList;
    const index = list.findIndex((entry) => entry.id === entryId);
    if (index < 0) return;
    list.splice(index, 1);
    this.markVehicleConfigurationChanged();
  }

  markVehicleConfigurationChanged(): void {
    if (this.state.haveValidated) {
      this.state.haveUpdateAfterValidated = true;
    }
    this.ui.detectChanges();
  }

  notifyRunEntryMerged(
    entry: OpenVrpRunVehicleEntry,
    addedCount: number,
  ): void {
    this.toastr.warning(
      this.transloco.translate(
        'run_entry_merged_message',
        { name: entry.vehicleTypeName, added: addedCount, total: entry.count },
        'index',
      ),
      this.transloco.translate('run_entry_merged_title', {}, 'index'),
      { timeOut: RUN_ENTRY_MERGE_NOTICE_MS },
    );
    this.highlightedRunEntryId = entry.id;
    clearTimeout(this.highlightTimer);
    this.highlightTimer = setTimeout(() => {
      this.highlightedRunEntryId = null;
    }, RUN_ENTRY_MERGE_NOTICE_MS);
    this.runEntryMerged$.next(entry.id);
  }

  getSystemMaxTrip(): number {
    return Math.max(this.multiTripDefaults.systemMaxTrip, DEFAULT_MAX_TRIP);
  }

  getVehicleTypeMaxTrip(vehicleTypeId: string): number {
    const vehicleType = this.myVehicleTypes.find(
      (candidate) => candidate.vehicleTypeId === vehicleTypeId,
    );
    const configured = Number(vehicleType?.maxTrip);
    const maxTrip =
      Number.isFinite(configured) && configured >= DEFAULT_MAX_TRIP
        ? Math.trunc(configured)
        : this.multiTripDefaults.defaultMaxTrip;
    return Math.min(
      Math.max(maxTrip, DEFAULT_MAX_TRIP),
      this.getSystemMaxTrip(),
    );
  }

  getVehicleTypeLoadingDuration(vehicleTypeId: string): string | null {
    if (this.multiTripDemo) {
      return this.getDemoMultiTrip(vehicleTypeId).loadingDuration;
    }
    const vehicleType = this.myVehicleTypes.find(
      (candidate) => candidate.vehicleTypeId === vehicleTypeId,
    );
    return vehicleType?.loadingDuration || null;
  }

  isMultiTripAllowed(): boolean {
    return this.getSystemMaxTrip() > DEFAULT_MAX_TRIP;
  }

  clampMaxTrip(maxTrip: number): number {
    const requested = Number(maxTrip);
    if (!Number.isFinite(requested) || requested < DEFAULT_MAX_TRIP) {
      return DEFAULT_MAX_TRIP;
    }
    return Math.min(Math.trunc(requested), this.getSystemMaxTrip());
  }

  private getDemoMultiTrip(vehicleTypeId: string): {
    loadingDuration: string;
  } {
    const index = Math.max(
      0,
      this.myVehicleTypes.findIndex(
        (candidate) => candidate.vehicleTypeId === vehicleTypeId,
      ),
    );
    const preset =
      OPEN_VRP_MULTI_TRIP_DEMO[index % OPEN_VRP_MULTI_TRIP_DEMO.length];
    return preset;
  }

  toggleMultiDepotDemo(): void {
    this.multiDepotDemo = !this.multiDepotDemo;
    this.mockDepotRunLists = null;
    this.ui.detectChanges();
  }

  private ensureMockDepotRunLists(
    usedDepotIds: Set<string>,
  ): OpenVrpDepotRunList[] {
    if (!this.mockDepotRunLists) {
      this.mockDepotRunLists = buildMockDepotRunLists(
        this.state.depots,
        this.myVehicleTypes.map((vehicleType) => ({
          vehicleTypeId: vehicleType.vehicleTypeId || '',
          vehicleTypeName: this.getVehicleName(vehicleType.vehicleTypeId || ''),
        })),
        usedDepotIds,
      );
    }
    return this.mockDepotRunLists;
  }

  get runListTotals(): OpenVrpRunSummaryTotals {
    return sumRunEntries(this.runVehicleList);
  }

  get runVehicleGroups(): OpenVrpRunVehicleGroup[] {
    return groupRunEntriesByVehicleType(this.runVehicleList);
  }

  get runListOutOfScopeStartCount(): number {
    const scopeDepotId = this.state.scopeDepotId;
    if (!scopeDepotId) return 0;
    return this.runVehicleList
      .filter(
        (entry) => !!entry.startDepotId && entry.startDepotId !== scopeDepotId,
      )
      .reduce((sum, entry) => sum + entry.count, 0);
  }

  get summaryView(): OpenVrpSummaryView {
    const depots = this.depotSummaries;
    return {
      depots,
      grandTotals: sumDepotSummaries(depots),
      isMultiDepot: depots.length > 1,
    };
  }

  private get depotSummaries(): OpenVrpDepotSummary[] {
    const summaries: OpenVrpDepotSummary[] = [];
    const used = new Set<string>();

    const scopeDepotId = this.state.scopeDepotId || 'default';
    summaries.push({
      depotId: scopeDepotId,
      depotName: this.state.scopeDepotName,
      isMock: false,
      totals: sumRunEntries(this.runVehicleListByDepot[scopeDepotId]),
    });
    used.add(scopeDepotId);

    for (const depot of this.state.depots) {
      if (!depot?.depotId || used.has(depot.depotId)) continue;
      const entries = this.runVehicleListByDepot[depot.depotId];
      if (!entries?.length) continue;
      used.add(depot.depotId);
      summaries.push({
        depotId: depot.depotId,
        depotName: depot.depotName,
        isMock: false,
        totals: sumRunEntries(entries),
      });
    }

    if (this.multiDepotDemo) {
      for (const mockDepot of this.ensureMockDepotRunLists(used)) {
        summaries.push({
          depotId: mockDepot.depotId,
          depotName: mockDepot.depotName,
          isMock: true,
          totals: sumRunEntries(mockDepot.entries),
        });
      }
    }

    return summaries;
  }

  // Build vehicles payload for validation from the Open VRP run list.
  // The current GraphQL input (ExperimentInputValidation.vehicles) accepts one
  // entry per vehicle type with either a count or specific vehicle ids, so run
  // list entries are aggregated per vehicleTypeId here. The per-entry routing
  // conditions (end-of-route / start / end depot) stay in the run list and the
  // saved presets, ready to be attached once the backend contract supports them.
  buildVehiclesPayload(): VehicleValidationInput[] {
    const aggregatedByType: Record<
      string,
      { vehicleIds: string[]; countTotal: number }
    > = {};

    for (const entry of this.runVehicleList) {
      if (!aggregatedByType[entry.vehicleTypeId]) {
        aggregatedByType[entry.vehicleTypeId] = {
          vehicleIds: [],
          countTotal: 0,
        };
      }
      const aggregated = aggregatedByType[entry.vehicleTypeId];
      if (entry.mode === 'license-plate') {
        for (const vehicleId of entry.vehicleIds) {
          if (!aggregated.vehicleIds.includes(vehicleId)) {
            aggregated.vehicleIds.push(vehicleId);
          }
        }
      } else {
        aggregated.countTotal += entry.count;
      }
    }

    const vehiclesPayload: VehicleValidationInput[] = [];
    for (const vehicleTypeId of Object.keys(aggregatedByType)) {
      const aggregated = aggregatedByType[vehicleTypeId];
      const vehicleItem: VehicleValidationInput = { vehicleTypeId };
      if (aggregated.vehicleIds.length > 0) {
        vehicleItem.vehicleId = aggregated.vehicleIds;
      }
      if (aggregated.countTotal > 0) {
        vehicleItem.numberOfVehiclesAvailable = aggregated.countTotal;
      }
      vehiclesPayload.push(vehicleItem);
    }

    return vehiclesPayload;
  }

  nextRunEntryId(): number {
    return this.runEntryIdCounter++;
  }
}
