import { Component, Input, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormArray,
  Validators,
} from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { forkJoin } from 'rxjs';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { NgxSpinnerService } from 'ngx-spinner';
import { ConfirmationDialogComponent } from 'src/app/index/components/confirmation-dialog/confirmation-dialog.component';
import {
  VehicleType,
  AccessTypeEnum,
  VehicleEnumOption,
  VehicleEnumConfigs,
  TimeObject,
} from 'src/app/models/vehicle.model';
import { VehicleService } from 'src/app/services/vehicle.service';
import {
  timeStringToMinutes,
  minutesToTimeString,
} from 'src/app/directives/time-string-to-minutes.pipe';
import { VehicleTypeFormControls } from 'src/app/models/forms/vehicle-type-form-control.model';
import { compareTimeValidator } from 'src/app/shared/validators/time-range.validator';
import { TranslocoService } from '@jsverse/transloco';
import { VehicleBreak } from 'src/app/models/vehicle.model';

@Component({
  selector: 'app-vehicle-type-dialog',
  templateUrl: './vehicle-type-dialog.component.html',
  styleUrls: ['./vehicle-type-dialog.component.scss'],
})
export class VehicleTypeDialogComponent implements OnInit {
  @Input() mode: 'create' | 'edit' | 'view' = 'create';
  @Input() vehicleType: VehicleType | null = null;

  formVehicleType!: FormGroup<VehicleTypeFormControls>;
  isEdit: boolean = false;
  isViewMode: boolean = false;
  isLoading: boolean = true;

  vehicleProfileTypeOptions: VehicleEnumOption[] = [];
  accessPointOptions: VehicleEnumOption[] = [];

  timeWindowEarlyObject: TimeObject = { hour: 0, minute: 0 };
  timeWindowLateObject: TimeObject = { hour: 0, minute: 0 };

  // Allowed Breaks
  breaks!: FormArray;
  breakTimeObjects: {
    [key: number]: {
      duration: TimeObject;
      earliestStart: TimeObject;
      latestStart: TimeObject;
    };
  } = {};

  constructor(
    private fb: FormBuilder,
    public activeModal: NgbActiveModal,
    private ngbModal: NgbModal,
    private vehicleService: VehicleService,
    private spinner: NgxSpinnerService,
    private transloco: TranslocoService
  ) {}

  ngOnInit(): void {
    this.isEdit = this.mode === 'edit';
    this.isViewMode = this.mode === 'view';
    this.initForm();

    this.getEnumValues().then(() => {
      if ((this.isEdit || this.isViewMode) && this.vehicleType) {
        const vehicleType = {
          ...this.vehicleType,
          timeWindowEarly: this.formatTimeForDisplay(
            (this.vehicleType as any).timeWindowEarly
          ),
          timeWindowLate: this.formatTimeForDisplay(
            (this.vehicleType as any).timeWindowLate
          ),
        };
        this.formVehicleType.patchValue(vehicleType as any);
        if (vehicleType.timeWindowEarly) {
          const [hour, minute] = vehicleType.timeWindowEarly
            .split(':')
            .map(Number);
          this.timeWindowEarlyObject = { hour: hour || 0, minute: minute || 0 };
        }
        if (vehicleType.timeWindowLate) {
          const [hour, minute] = vehicleType.timeWindowLate
            .split(':')
            .map(Number);
          this.timeWindowLateObject = { hour: hour || 0, minute: minute || 0 };
        }

        // Load breaks if exists (handle both 'breaks' and 'allowedBreaks' properties)
        const breaksData =
          (this.vehicleType as any).allowedBreaks ||
          (this.vehicleType as any).breaks;
        if (breaksData && Array.isArray(breaksData)) {
          this.breaks.clear();
          this.breakTimeObjects = {};
          breaksData.forEach((breakData: any, index: number) => {
            // Map API field names to form field names
            const mappedBreakData: VehicleBreak = {
              name: breakData.name || '',
              duration: breakData.duration || '',
              earliestStart:
                breakData.timeWindowEarly || breakData.earliestStart || '',
              latestStart:
                breakData.timeWindowLate || breakData.latestStart || '',
            };
            this.breaks.push(this.createBreakFormGroup(mappedBreakData));

            // Initialize time objects for each break
            this.breakTimeObjects[index] = {
              duration: this.parseTimeString(mappedBreakData.duration),
              earliestStart: this.parseTimeString(
                mappedBreakData.earliestStart
              ),
              latestStart: this.parseTimeString(mappedBreakData.latestStart),
            };
          });
        }
      }
      if (this.isViewMode) {
        this.formVehicleType.disable({ emitEvent: false });
      }
    });
  }

  formatTimeForDisplay(timeValue: string | number | null | undefined): string {
    if (typeof timeValue === 'string' && timeValue.includes(':')) {
      return timeValue;
    }
    if (typeof timeValue === 'number') {
      return minutesToTimeString(timeValue);
    }
    return '';
  }

  initForm(): void {
    this.breaks = this.fb.array([]);

    this.formVehicleType = this.fb.group(
      {
        name: ['', Validators.required],
        access: [[]],
        dimension: this.fb.group({
          width: [null, [Validators.required, Validators.min(0)]],
          height: [null, [Validators.required, Validators.min(0)]],
          depth: [null, [Validators.required, Validators.min(0)]],
        }),
        maximumWeightCapacity: [null, [Validators.required, Validators.min(0)]],
        maximumVolumeCapacity: [null, Validators.min(0)],
        timeWindowEarly: [''],
        timeWindowLate: [''],
        vehicleProfileType: [null, Validators.required],
        vehicleGroupId: ['', Validators.required],
        maximumDistance: [null, Validators.min(0)],
        maximumDuration: [null, Validators.min(0)],
        unitDistanceCost: [null, Validators.min(0)],
        unitDurationCost: [null, Validators.min(0)],
        fixedCost: [null, Validators.min(0)],
        breaks: this.breaks,
      },
      {
        validators: compareTimeValidator(
          this.transloco.translate('form.error.start_time_invalid'),
          this.transloco.translate('form.error.end_time_invalid')
        ),
      }
    ) as any;
  }

  save(): void {
    if (this.formVehicleType.invalid) {
      this.formVehicleType.markAllAsTouched();
      return;
    }
    this.openDialogConfirm();
  }

  cancel(): void {
    this.activeModal.dismiss();
  }

  onAccessPointChange(
    event: MatCheckboxChange,
    accessPoint: AccessTypeEnum
  ): void {
    const accessPoints = this.formVehicleType.get('access') as FormControl<
      AccessTypeEnum[] | null
    >;
    let currentValues = accessPoints.value || [];
    if (event.checked) {
      currentValues.push(accessPoint);
    } else {
      const index = currentValues.indexOf(accessPoint);
      if (index > -1) {
        currentValues.splice(index, 1);
      }
    }
    accessPoints.setValue(currentValues);
  }

  isAccessPointChecked(accessPoint: AccessTypeEnum): boolean {
    return (
      this.formVehicleType.get('access')?.value?.includes(accessPoint) ?? false
    );
  }

  isAccessPointCheckedString(accessPointKey: string): boolean {
    return this.isAccessPointChecked(accessPointKey as AccessTypeEnum);
  }

  onAccessPointChangeString(
    event: MatCheckboxChange,
    accessPointKey: string
  ): void {
    this.onAccessPointChange(event, accessPointKey as AccessTypeEnum);
  }

  openDialogConfirm(): void {
    const dialogRef = this.ngbModal.open(ConfirmationDialogComponent, {
      centered: true,
      animation: true,
    });
    const action = this.isEdit ? 'update' : 'create';
    dialogRef.componentInstance.title = this.isEdit
      ? this.transloco.translate('vehicleManagement.confirm_update')
      : this.transloco.translate('vehicleManagement.confirm_create');
    dialogRef.componentInstance.message = this.isEdit
      ? this.transloco.translate(
          'vehicleManagement.are_you_sure_update_vehicle_type'
        )
      : this.transloco.translate(
          'vehicleManagement.are_you_sure_create_vehicle_type'
        );
    dialogRef.result.then((confirmed: boolean) => {
      if (confirmed) {
        this.handleSubmit();
      }
    });
  }

  handleSubmit(): void {
    this.spinner.show();
    const formValue = this.formVehicleType.getRawValue();
    const timeWindowEarlyMinutes = timeStringToMinutes(
      (formValue as any).timeWindowEarly
    );
    const timeWindowLateMinutes = timeStringToMinutes(
      (formValue as any).timeWindowLate
    );

    // Map breaks form data to API format (allowedBreaks)
    let allowedBreaks: any[] | undefined;
    const breaksValue = this.breaks.getRawValue();
    if (breaksValue && breaksValue.length > 0) {
      allowedBreaks = breaksValue.map((breakItem: any) => ({
        name: breakItem.name,
        duration: breakItem.duration,
        timeWindowEarly: breakItem.earliestStart,
        timeWindowLate: breakItem.latestStart,
      }));
    }

    const payload: Partial<VehicleType> = Object.entries({
      ...formValue,
      timeWindowEarly: timeWindowEarlyMinutes,
      timeWindowLate: timeWindowLateMinutes,
      allowedBreaks: allowedBreaks,
      breaks: undefined, // Remove the breaks field, use allowedBreaks instead
    }).reduce((acc: Record<string, unknown>, [key, value]) => {
      if (
        value !== null &&
        value !== '' &&
        value !== undefined &&
        key !== 'breaks'
      ) {
        acc[key] =
          typeof value === 'string' &&
          !isNaN(Number(value)) &&
          key !== 'name' &&
          key !== 'vehicleProfileType'
            ? Number(value)
            : value;
      }
      return acc;
    }, {});

    const request$ = this.isEdit
      ? this.vehicleService.updateVehicleType(
          this.vehicleType!.vehicleTypeId,
          payload as VehicleType
        )
      : this.vehicleService.createVehicleType(payload as VehicleType);
    request$.pipe(finalize(() => this.spinner.hide())).subscribe({
      next: (res) => {
        this.activeModal.close({ refresh: true, vehicleType: res });
      },
      error: (err) => {
        console.error(
          `Failed to ${this.isEdit ? 'update' : 'create'} vehicle type:`,
          err
        );
      },
    });
  }

  onTimeValueChange(
    key: 'timeWindowEarly' | 'timeWindowLate',
    event: TimeObject
  ): void {
    if (key === 'timeWindowEarly') {
      this.timeWindowEarlyObject = event;
    } else {
      this.timeWindowLateObject = event;
    }
    if (event && event.hour !== undefined && event.minute !== undefined) {
      const hour = String(event.hour).padStart(2, '0');
      const minute = String(event.minute).padStart(2, '0');
      (this.formVehicleType.controls as any)[key].setValue(`${hour}:${minute}`);
    } else {
      (this.formVehicleType.controls as any)[key].setValue('');
    }

    this.formVehicleType.updateValueAndValidity();
    (this.formVehicleType.controls as any).timeWindowEarly.markAsTouched();
    (this.formVehicleType.controls as any).timeWindowLate.markAsTouched();
  }

  getEnumValues(): Promise<void> {
    this.isLoading = true;

    const enumRequests = VehicleEnumConfigs.map((config) =>
      this.vehicleService.getEnumValues(config.type)
    );

    return new Promise((resolve) => {
      forkJoin(enumRequests)
        .pipe(
          finalize(() => {
            this.isLoading = false;
            resolve();
          })
        )
        .subscribe({
          next: (responses) => {
            VehicleEnumConfigs.forEach((config, index) => {
              (this as Record<string, unknown>)[config.property] =
                responses[index];
            });
          },
          error: (err) => {
            console.error('Error loading enum values:', err);

            VehicleEnumConfigs.forEach((config) => {
              (this as Record<string, unknown>)[config.property] = [];
            });
          },
        });
    });
  }

  // Allowed Breaks Methods
  createBreakFormGroup(breakData?: VehicleBreak): FormGroup {
    return this.fb.group({
      name: [breakData?.name || '', Validators.required],
      duration: [breakData?.duration || '', Validators.required],
      earliestStart: [breakData?.earliestStart || '', Validators.required],
      latestStart: [breakData?.latestStart || '', Validators.required],
    });
  }

  addBreak(): void {
    const newIndex = this.breaks.length;
    this.breaks.push(this.createBreakFormGroup());

    // Initialize time objects for the new break
    this.breakTimeObjects[newIndex] = {
      duration: { hour: 0, minute: 0 },
      earliestStart: { hour: 0, minute: 0 },
      latestStart: { hour: 0, minute: 0 },
    };
  }

  removeBreak(index: number): void {
    this.breaks.removeAt(index);

    // Remove time object and re-index
    delete this.breakTimeObjects[index];
    const newTimeObjects: typeof this.breakTimeObjects = {};
    Object.keys(this.breakTimeObjects).forEach((key) => {
      const numKey = parseInt(key);
      if (numKey > index) {
        newTimeObjects[numKey - 1] = this.breakTimeObjects[numKey];
      } else if (numKey < index) {
        newTimeObjects[numKey] = this.breakTimeObjects[numKey];
      }
    });
    this.breakTimeObjects = newTimeObjects;
  }

  trackByIndex(index: number): number {
    return index;
  }

  getBreakControls(): FormGroup[] {
    return this.breaks.controls as FormGroup[];
  }

  parseTimeString(timeStr: string): TimeObject {
    if (!timeStr) {
      return { hour: 0, minute: 0 };
    }
    const parts = timeStr.split(':');
    return {
      hour: parseInt(parts[0]) || 0,
      minute: parseInt(parts[1]) || 0,
    };
  }

  onBreakTimeValueChange(
    breakIndex: number,
    field: 'duration' | 'earliestStart' | 'latestStart',
    event: TimeObject
  ): void {
    if (!this.breakTimeObjects[breakIndex]) {
      this.breakTimeObjects[breakIndex] = {
        duration: { hour: 0, minute: 0 },
        earliestStart: { hour: 0, minute: 0 },
        latestStart: { hour: 0, minute: 0 },
      };
    }

    this.breakTimeObjects[breakIndex][field] = event;

    if (event && event.hour !== undefined && event.minute !== undefined) {
      const hour = String(event.hour).padStart(2, '0');
      const minute = String(event.minute).padStart(2, '0');
      const breakControl = this.breaks.at(breakIndex) as FormGroup;
      breakControl.get(field)?.setValue(`${hour}:${minute}`);
    } else {
      const breakControl = this.breaks.at(breakIndex) as FormGroup;
      breakControl.get(field)?.setValue('');
    }
  }

  getBreakTimeObject(
    breakIndex: number,
    field: 'duration' | 'earliestStart' | 'latestStart'
  ): TimeObject {
    return this.breakTimeObjects[breakIndex]?.[field] || { hour: 0, minute: 0 };
  }
}
