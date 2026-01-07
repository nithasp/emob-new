import { Component, Input, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
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
  VehicleProfileTypeEnum,
} from 'src/app/models/vehicle.model';
import { VehicleService } from 'src/app/services/vehicle.service';
import {
  minutesToTimeString,
} from 'src/app/directives/time-string-to-minutes.pipe';
import { VehicleTypeFormControls } from 'src/app/models/forms/vehicle-type-form-control.model';
import {
  compareTimeValidator,
  createTimeRangeValidator,
} from 'src/app/shared/validators/time-range.validator';
import { TranslocoService } from '@jsverse/transloco';
import { VehicleBreak } from 'src/app/models/vehicle.model';

@Component({
  selector: 'app-vehicle-type-dialog',
  templateUrl: './vehicle-type-dialog.component.html',
  styleUrls: ['./vehicle-type-dialog.component.scss'],
})
export class VehicleTypeDialogComponent implements OnInit, OnDestroy {
  @Input() mode: 'create' | 'edit' | 'view' = 'create';
  @Input() vehicleType: VehicleType | null = null;
  @ViewChild('formContainer') formContainer!: ElementRef<HTMLDivElement>;

  formVehicleType!: FormGroup<VehicleTypeFormControls>;
  isEdit: boolean = false;
  isViewMode: boolean = false;
  isLoading: boolean = true;

  scrollTimeoutId?: number;

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
        const vehicleTypeData = this.vehicleType;
        const vehicleType = {
          name: vehicleTypeData.name,
          access: vehicleTypeData.access,
          vehicleProfileType: vehicleTypeData.vehicleProfileType,
          unitDistanceCost: vehicleTypeData.unitDistanceCost,
          unitDurationCost: vehicleTypeData.unitDurationCost,
          fixedCost: vehicleTypeData.fixedCost,
          timeWindowEarly: this.formatTimeForDisplay(
            vehicleTypeData.timeWindowEarly
          ),
          timeWindowLate: this.formatTimeForDisplay(
            vehicleTypeData.timeWindowLate
          ),
          maximumWeightCapacity: vehicleTypeData.maximumWeightCapacity,
          maximumVolumeCapacity: (vehicleTypeData as any).maximumVolumeCapacity,
          vehicleGroupId: (vehicleTypeData as any).vehicleGroupId,
          maximumDistance: vehicleTypeData.maximumDistance,
          maximumDuration: vehicleTypeData.maximumDuration,
          dimension: {
            width: vehicleTypeData.dimension?.width,
            height: vehicleTypeData.dimension?.height,
            depth: vehicleTypeData.dimension?.depth,
          },
        };
        this.formVehicleType.patchValue(vehicleType);
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
          (vehicleTypeData as any).allowedBreaks ||
          (vehicleTypeData as any).breaks;
        if (breaksData && Array.isArray(breaksData)) {
          this.breaks.clear();
          this.breakTimeObjects = {};
          breaksData.forEach((breakData: any, index: number) => {
            // Map API field names to form field names
            const mappedBreakData: VehicleBreak = {
              name: breakData.name || '',
              duration: this.formatTimeForDisplay(breakData.duration),
              earliestStart: this.formatTimeForDisplay(
                breakData.timeWindowEarly || breakData.earliestStart
              ),
              latestStart: this.formatTimeForDisplay(
                breakData.timeWindowLate || breakData.latestStart
              ),
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

    const formGroup = this.fb.group(
      {
        name: ['', Validators.required],
        access: [[] as AccessTypeEnum[]],
        maximumWeightCapacity: [
          null as number | null,
          [Validators.required, Validators.min(0)],
        ],
        maximumVolumeCapacity: [null as number | null, Validators.min(0)],
        timeWindowEarly: [''],
        timeWindowLate: [''],
        dimension: this.fb.group({
          width: [
            null as number | null,
            [Validators.required, Validators.min(0)],
          ],
          height: [
            null as number | null,
            [Validators.required, Validators.min(0)],
          ],
          depth: [
            null as number | null,
            [Validators.required, Validators.min(0)],
          ],
        }),
        vehicleProfileType: [null as string | null, Validators.required],
        vehicleGroupId: ['', Validators.required],
        maximumDistance: [null as number | null, Validators.min(0)],
        maximumDuration: [null as number | null, Validators.min(0)],
        unitDistanceCost: [null as number | null, Validators.min(0)],
        unitDurationCost: [null as number | null, Validators.min(0)],
        fixedCost: [null as number | null, Validators.min(0)],
        breaks: this.breaks,
      },
      {
        validators: createTimeRangeValidator({
          startTimeField: 'timeWindowEarly',
          endTimeField: 'timeWindowLate',
          startTimeErrorMessage: this.transloco.translate(
            'form.error.start_time_invalid'
          ),
          endTimeErrorMessage: this.transloco.translate(
            'form.error.end_time_invalid'
          ),
        }),
      }
    );
    this.formVehicleType =
      formGroup as any as FormGroup<VehicleTypeFormControls>;
  }

  save(): void {
    if (this.formVehicleType.invalid) {
      this.formVehicleType.markAllAsTouched();
      // Mark all break controls as touched to show validation errors
      this.breaks.controls.forEach((control) => {
        control.markAsTouched();
      });
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
    let currentValues = [...(accessPoints.value || [])];
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
    const formValue = this.formVehicleType.getRawValue() as any;

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

    const payload: Partial<VehicleType> = {
      name: formValue.name || '',
      access: formValue.access || [],
      vehicleProfileType:
        formValue.vehicleProfileType as VehicleProfileTypeEnum,
      maximumWeightCapacity: Number(formValue.maximumWeightCapacity) || 0,
      timeWindowEarly: formValue.timeWindowEarly || '00:00',
      timeWindowLate: formValue.timeWindowLate || '00:00',
      dimension: {
        width: Number(formValue.dimension?.width) || 0,
        height: Number(formValue.dimension?.height) || 0,
        depth: Number(formValue.dimension?.depth) || 0,
      },
      maximumDistance: formValue.maximumDistance ? Number(formValue.maximumDistance) : undefined,
      maximumDuration: formValue.maximumDuration ? Number(formValue.maximumDuration) : undefined,
      unitDistanceCost: Number(formValue.unitDistanceCost) || 0,
      unitDurationCost: Number(formValue.unitDurationCost) || 0,
      fixedCost: Number(formValue.fixedCost) || 0,
    };

    // Add new fields
    if (formValue.maximumVolumeCapacity !== null && formValue.maximumVolumeCapacity !== undefined) {
      (payload as any).maximumVolumeCapacity = Number(formValue.maximumVolumeCapacity);
    }
    if (formValue.vehicleGroupId) {
      (payload as any).vehicleGroupId = formValue.vehicleGroupId;
    }
    if (allowedBreaks && allowedBreaks.length > 0) {
      (payload as any).allowedBreaks = allowedBreaks;
    }

    // Remove undefined values
    Object.keys(payload).forEach((key) => {
      if (payload[key as keyof typeof payload] === undefined) {
        delete payload[key as keyof typeof payload];
      }
    });

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
    return this.fb.group(
      {
        name: [breakData?.name || '', Validators.required],
        duration: [breakData?.duration || '', Validators.required],
        earliestStart: [breakData?.earliestStart || '', Validators.required],
        latestStart: [breakData?.latestStart || '', Validators.required],
      },
      {
        validators: createTimeRangeValidator({
          startTimeField: 'earliestStart',
          endTimeField: 'latestStart',
          startTimeErrorMessage: this.transloco.translate(
            'form.error.start_time_invalid'
          ),
          endTimeErrorMessage: this.transloco.translate(
            'form.error.end_time_invalid'
          ),
        }),
      }
    );
  }

  addBreak(): void {
    const newIndex = this.breaks.length;
    this.breaks.push(this.createBreakFormGroup());
    this.breakTimeObjects[newIndex] = {
      duration: { hour: 0, minute: 0 },
      earliestStart: { hour: 0, minute: 0 },
      latestStart: { hour: 0, minute: 0 },
    };

    if (this.scrollTimeoutId !== undefined) {
      clearTimeout(this.scrollTimeoutId);
    }

    // Scroll to bottom of form container after DOM updates
    this.scrollTimeoutId = window.setTimeout(() => {
      if (this.formContainer && this.formContainer.nativeElement) {
        this.formContainer.nativeElement.scrollTo({
          top: this.formContainer.nativeElement.scrollHeight,
          behavior: 'smooth'
        });
      }
    }, 100);
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

    const breakControl = this.breaks.at(breakIndex) as FormGroup;
    
    if (event && event.hour !== undefined && event.minute !== undefined) {
      const hour = String(event.hour).padStart(2, '0');
      const minute = String(event.minute).padStart(2, '0');
      breakControl.get(field)?.setValue(`${hour}:${minute}`);
    } else {
      breakControl.get(field)?.setValue('');
    }

    // Trigger validation for time range
    breakControl.updateValueAndValidity();
    // Only mark the field that was changed as touched
    breakControl.get(field)?.markAsTouched();
  }

  getBreakTimeObject(
    breakIndex: number,
    field: 'duration' | 'earliestStart' | 'latestStart'
  ): TimeObject {
    return this.breakTimeObjects[breakIndex]?.[field] || { hour: 0, minute: 0 };
  }

  hasBreakTimeRangeError(breakControl: FormGroup): boolean {
    const earliestStart = breakControl.get('earliestStart');
    const latestStart = breakControl.get('latestStart');
    
    return !!(
      (earliestStart?.hasError('timeRangeInvalid') && earliestStart?.touched) ||
      (latestStart?.hasError('timeRangeInvalid') && latestStart?.touched)
    );
  }

  ngOnDestroy(): void {
    // Clean up timeout to prevent memory leaks
    if (this.scrollTimeoutId !== undefined) {
      clearTimeout(this.scrollTimeoutId);
      this.scrollTimeoutId = undefined;
    }
  }
}
