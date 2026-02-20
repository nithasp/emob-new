import { FormControl, FormGroup, FormArray } from '@angular/forms';
import { AccessTypeEnum } from '../vehicle.model';

export interface BreakFormControls {
  name: FormControl<string | null>;
  duration: FormControl<string | null>;
  timeWindowEarly: FormControl<string | null>;
  timeWindowLate: FormControl<string | null>;
}

interface BaseVehicleTypeFormControls {
  name: FormControl<string | null>;
  access: FormControl<AccessTypeEnum[] | null>;
  dimension: FormGroup<{
    width: FormControl<number | null>;
    height: FormControl<number | null>;
    depth: FormControl<number | null>;
  }>;
  maximumWeightCapacity: FormControl<number | null>;
  maximumVolumeCapacity: FormControl<number | null>;
  timeWindowEarly: FormControl<string | null>;
  timeWindowLate: FormControl<string | null>;
  vehicleProfileType: FormControl<string | null>;
  vehicleGroupId: FormControl<string | null>;
  maximumDistance: FormControl<number | null>;
  maximumDuration: FormControl<number | null>;
  unitDistanceCost: FormControl<number | null>;
  unitDurationCost: FormControl<number | null>;
  fixedCost: FormControl<number | null>;
}

export interface VehicleTypeFormControls extends BaseVehicleTypeFormControls {
  breaks: FormArray<
    FormGroup<{
      name: FormControl<string | null>;
      duration: FormControl<string | null>;
      earliestStart: FormControl<string | null>;
      latestStart: FormControl<string | null>;
    }>
  >;
}

export interface ConfigVehicleTypeFormControls extends BaseVehicleTypeFormControls {
  allowedBreaks: FormArray<FormGroup<BreakFormControls>>;
}
