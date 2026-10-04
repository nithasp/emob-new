import { Injectable } from '@angular/core';
import { RunStateService } from './run-state.service';
import { RunUiService } from './run-ui.service';
import { RunMapService } from './run-map.service';
import { RunParameterService } from './run-parameter.service';
import { RunVehicleService } from './run-vehicle.service';

@Injectable()
export class RunNavigationService {
  public activeNavId = 1;
  /** Open VRP: collapse the map column while working on the Vehicle tab. */
  public isMapCollapsed: boolean = false;

  constructor(
    private readonly state: RunStateService,
    private readonly ui: RunUiService,
    private readonly runMap: RunMapService,
    private readonly params: RunParameterService,
    private readonly fleet: RunVehicleService,
  ) {}

  navigateToTab(page: number) {
    // Your logic to navigate to the next tab
    this.activeNavId = page; // Assuming 'tab2' is the id of the next tab

    // Trigger change detection to refresh the table
    this.ui.detectChanges();
    if (page === 2) {
      this.params.refreshDynamicParametersForSelectedDepot();
    }
    // The map column can be collapsed on the vehicle tab, so its geometry
    // may change whenever the active tab changes
    this.refreshMapSize();
  }

  /** The map column is hidden while collapsed on the Vehicle tab. */
  get isMapPaneHidden(): boolean {
    return this.isMapCollapsed && this.activeNavId === 2 && this.state.isUpload;
  }

  toggleMapCollapsed(): void {
    this.isMapCollapsed = !this.isMapCollapsed;
    this.refreshMapSize();
  }

  /** Direct tab clicks; programmatic navigation goes through navigateToTab. */
  onNavTabChange(): void {
    this.refreshMapSize();
  }

  /** OpenLayers must recompute its viewport after layout/visibility changes. */
  private refreshMapSize(): void {
    this.ui.detectChanges();
    this.runMap.refreshSize();
  }

  getNextTab(currentTab: number): number {
    switch (currentTab) {
      case 1: // Orders Data
        if (this.fleet.hasMyVehicleTypes()) return 2;
        if (this.params.hasDynamicParameters()) return 3;
        return 4;
      case 2: // Vehicle
        if (this.params.hasDynamicParameters()) return 3;
        return 4;
      case 3: // Parameters
        return 4;
      case 4: // Validation
        return 4; // Already at the last tab
      default:
        return currentTab;
    }
  }

  getPreviousTab(currentTab: number): number {
    switch (currentTab) {
      case 4: // Validation
        if (this.params.hasDynamicParameters()) return 3;
        if (this.fleet.hasMyVehicleTypes()) return 2;
        return 1;
      case 3: // Parameters
        if (this.fleet.hasMyVehicleTypes()) return 2;
        return 1;
      case 2: // Vehicle
        return 1;
      case 1: // Orders Data
        return 1; // Already at the first tab
      default:
        return currentTab;
    }
  }

  navigateToNextTab(): void {
    const nextTab = this.getNextTab(this.activeNavId);
    this.navigateToTab(nextTab);
  }

  navigateToPreviousTab(): void {
    const prevTab = this.getPreviousTab(this.activeNavId);
    this.navigateToTab(prevTab);
  }
}
