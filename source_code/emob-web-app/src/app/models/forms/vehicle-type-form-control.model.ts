import { FormControl, FormGroup } from '@angular/forms';
import { AccessTypeEnum } from '../vehicle.model';

export interface VehicleTypeFormControls {
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
  maximumDistance: FormControl<number | null>;
  maximumDuration: FormControl<number | null>;
  unitDistanceCost: FormControl<number | null>;
  unitDurationCost: FormControl<number | null>;
  fixedCost: FormControl<number | null>;
}