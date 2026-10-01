import { FormControl } from '@angular/forms';

export interface VehicleFormControls {
  vehicleType: FormControl<string | null>;
  licensePlate: FormControl<string | null>;
}
