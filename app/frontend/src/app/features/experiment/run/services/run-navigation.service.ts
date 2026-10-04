import { Injectable } from '@angular/core';
import { RunStateService } from './run-state.service';
import { RunUiService } from './run-ui.service';
import { RunMapService } from './run-map.service';
import { RunParameterService } from './run-parameter.service';
import { RunVehicleService } from './run-vehicle.service';

@Injectable()
export class RunNavigationService {
  public activeNavId = 1;
  public isMapCollapsed: boolean = false;

  constructor(
    private readonly state: RunStateService,
    private readonly ui: RunUiService,
    private readonly runMap: RunMapService,
    private readonly params: RunParameterService,
    private readonly fleet: RunVehicleService,
  ) {}

  navigateToTab(page: number) {
    this.activeNavId = page;

    this.ui.detectChanges();
    if (page === 2) {
      this.params.refreshDynamicParametersForSelectedDepot();
    }
    this.refreshMapSize();
  }

  get isMapPaneHidden(): boolean {
    return this.isMapCollapsed && this.activeNavId === 2 && this.state.isUpload;
  }

  toggleMapCollapsed(): void {
    this.isMapCollapsed = !this.isMapCollapsed;
    this.refreshMapSize();
  }

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
      case 1:
        if (this.fleet.hasMyVehicleTypes()) return 2;
        if (this.params.hasDynamicParameters()) return 3;
        return 4;
      case 2:
        if (this.params.hasDynamicParameters()) return 3;
        return 4;
      case 3:
        return 4;
      case 4:
        return 4;
      default:
        return currentTab;
    }
  }

  getPreviousTab(currentTab: number): number {
    switch (currentTab) {
      case 4:
        if (this.params.hasDynamicParameters()) return 3;
        if (this.fleet.hasMyVehicleTypes()) return 2;
        return 1;
      case 3:
        if (this.fleet.hasMyVehicleTypes()) return 2;
        return 1;
      case 2:
        return 1;
      case 1:
        return 1;
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
