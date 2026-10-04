import { Provider } from '@angular/core';
import { RunStateService } from './run-state.service';
import { RunUiService } from './run-ui.service';
import { RunMapService } from './run-map.service';
import { RunParameterService } from './run-parameter.service';
import { RunVehicleService } from './run-vehicle.service';
import { RunVehiclePoolService } from './run-vehicle-pool.service';
import { RunVehicleSelectionService } from './run-vehicle-selection.service';
import { RunVehiclePresetService } from './run-vehicle-preset.service';
import { RunUploadFileService } from './run-upload-file.service';
import { RunFileColumnService } from './run-file-column.service';
import { RunFileIntakeService } from './run-file-intake.service';
import { RunOrderDataService } from './run-order-data.service';
import { RunNavigationService } from './run-navigation.service';
import { RunValidationService } from './run-validation.service';

// One instance of each per run page: the tabs are created and destroyed as the planner
// moves between them, so everything that has to survive a tab switch lives here.
export const RUN_PAGE_PROVIDERS: Provider[] = [
  RunStateService,
  RunUiService,
  RunMapService,
  RunParameterService,
  RunVehicleService,
  RunVehiclePoolService,
  RunVehicleSelectionService,
  RunVehiclePresetService,
  RunUploadFileService,
  RunFileColumnService,
  RunFileIntakeService,
  RunOrderDataService,
  RunNavigationService,
  RunValidationService,
];
