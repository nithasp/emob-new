import { FormControl } from '@angular/forms';

export interface VehicleFormControls {
  vehicleType: FormControl<string | null>;
  startDepot: FormControl<string | null>;
  endDepot: FormControl<string | null>;
  licensePlate: FormControl<string | null>;
}