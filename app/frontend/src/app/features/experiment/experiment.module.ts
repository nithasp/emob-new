import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { TRANSLOCO_SCOPE } from '@jsverse/transloco';
import { SharedModule } from '@shared/shared.module';

import { ExperimentRoutingModule } from './experiment-routing.module';
import { CustomerDetailsComponent } from './components/customer-details/customer-details.component';
import { CustomerListComponent } from './components/customer-list/customer-list.component';
import { DialogMarkLocationComponent } from './components/dialogs/dialog-mark-location/dialog-mark-location.component';
import { DialogVerifyLocationComponent } from './components/dialogs/dialog-verify-location/dialog-verify-location.component';
import { ExperimentListComponent } from './experiment-list/experiment-list.component';
import { DialogConsumptionComponent } from './experiment-list/dialogs/dialog-consumption/dialog-consumption.component';
import { DialogParametersComponent } from './experiment-list/dialogs/dialog-parameters/dialog-parameters.component';
import { ResultComponent } from './result/result.component';
import { ResultDashboardComponent } from './result/components/result-dashboard/result-dashboard.component';
import { ResultFilterComponent } from './result/components/result-filter/result-filter.component';
import { ResultInformationComponent } from './result/components/result-information/result-information.component';
import { ResultMapComponent } from './result/components/result-map/result-map.component';
import { ResultRouteTableComponent } from './result/components/result-route-table/result-route-table.component';
import { DialogMapDetailsComponent } from './result/dialogs/dialog-map-details/dialog-map-details.component';
import { RunComponent } from './run/run.component';
import { RunMapComponent } from './run/components/run-map/run-map.component';
import { RunOrderDataComponent } from './run/components/run-order-data/run-order-data.component';
import { RunParameterComponent } from './run/components/run-parameter/run-parameter.component';
import { RunUploadFileComponent } from './run/components/run-upload-file/run-upload-file.component';
import { RunValidationComponent } from './run/components/run-validation/run-validation.component';
import { RunVehicleComponent } from './run/components/run-vehicle/run-vehicle.component';
import { RunVehicleListComponent } from './run/components/run-vehicle/run-vehicle-list/run-vehicle-list.component';
import { RunVehiclePoolComponent } from './run/components/run-vehicle/run-vehicle-pool/run-vehicle-pool.component';
import { RunVehicleSummaryComponent } from './run/components/run-vehicle/run-vehicle-summary/run-vehicle-summary.component';
import { DialogConfirmationDepotUploadFileComponent } from './run/dialogs/dialog-confirmation-depot-upload-file/dialog-confirmation-depot-upload-file.component';
import { DialogTransformValidationComponent } from './run/dialogs/dialog-transform-validation/dialog-transform-validation.component';

@NgModule({
  declarations: [
    ExperimentListComponent,
    DialogConsumptionComponent,
    DialogParametersComponent,
    RunComponent,
    RunUploadFileComponent,
    RunOrderDataComponent,
    RunMapComponent,
    RunVehicleComponent,
    RunVehiclePoolComponent,
    RunVehicleListComponent,
    RunVehicleSummaryComponent,
    RunParameterComponent,
    RunValidationComponent,
    DialogConfirmationDepotUploadFileComponent,
    DialogTransformValidationComponent,
    ResultComponent,
    ResultInformationComponent,
    ResultDashboardComponent,
    ResultFilterComponent,
    ResultRouteTableComponent,
    ResultMapComponent,
    DialogMapDetailsComponent,
    CustomerDetailsComponent,
    CustomerListComponent,
    DialogMarkLocationComponent,
    DialogVerifyLocationComponent,
  ],
  imports: [SharedModule, ExperimentRoutingModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [{ provide: TRANSLOCO_SCOPE, useValue: 'index' }],
})
export class ExperimentModule {}
