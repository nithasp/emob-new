import { Injectable } from '@angular/core';
import { Experiment, Run, Validate, MyDepot } from '../../models/experiment.model';

@Injectable()
export class RunStateService {
  public experiment = <Experiment>{};
  isCreateMode: boolean = false;
  public isUpload: boolean = false;
  public isFileSelectionStep: boolean = true;
  isFilePreview: boolean = false;
  public haveUpdateAfterValidated: boolean = false;
  haveValidated = false;
  public validateExperiment: Validate | null = null;
  public depots: MyDepot[] = [];
  public selectedDepotIdName: string | null = null;
  public companyDepotType: string = '';

  public generateUniqueId(): string {
    return 'f-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now();
  }

  isOriginalExperiment(): boolean {
    return this.experiment.run === Run.Original;
  }

  getSelectedDepotObject(): MyDepot | undefined {
    if (!this.selectedDepotIdName) return undefined;
    return this.depots.find(
      (depot) => depot.depotName === this.selectedDepotIdName,
    );
  }

  get scopeDepotId(): string {
    if (!this.isFileSelectionStep && this.experiment?.depots?.length) {
      return this.experiment.depots[0].depotId;
    }
    return this.getSelectedDepotObject()?.depotId || '';
  }

  get scopeDepotName(): string {
    if (!this.isFileSelectionStep && this.experiment?.depots?.length) {
      return this.experiment.depots[0].depotName;
    }
    return this.selectedDepotIdName || '';
  }
}
