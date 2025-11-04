import { FormControl } from '@angular/forms';
import { AccessTypeEnum } from '../vehicle.model';

export interface VehicleTypeFormControls {
  name: FormControl<string | null>;
  access: FormControl<AccessTypeEnum[] | null>;
  capacity: FormControl<number | null>;
  twEarly: FormControl<string | null>;
  twLate: FormControl<string | null>;
  width: FormControl<number | null>;
  height: FormControl<number | null>;
  length: FormControl<number | null>;
  vehicleProfileType: FormControl<string | null>;
  maxDistance: FormControl<number | null>;
  maxDuration: FormControl<number | null>;
  unitDistanceCost: FormControl<number | null>;
  unitDurationCost: FormControl<number | null>;
  fixedCost: FormControl<number | null>;
}