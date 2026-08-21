import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormArray,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { forkJoin, Subscription } from 'rxjs';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { NgbActiveModal, NgbModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { NgxSpinnerModule, NgxSpinnerService } from 'ngx-spinner';
import { ConfirmationDialogComponent } from 'src/app/index/components/confirmation-dialog/confirmation-dialog.component';
import {
  VehicleType,
  AccessTypeEnum,
  VehicleEnumOption,
  VehicleEnumConfigs,
  TimeObject,
  VehicleProfileTypeEnum,
  VehicleBreak,
  BreakTimeObject,
  Break,
} from 'src/app/models/vehicle.model';
import { VehicleService } from 'src/app/services/vehicle.service';
import { minutesToTimeString } from 'src/app/directives/time-string-to-minutes.pipe';
import {
  ConfigVehicleTypeFormControls,
  BreakFormControls,
} from 'src/app/models/forms/vehicle-type-form-control.model';
import { createTimeRangeValidator } from 'src/app/shared/validators/time-range.validator';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { MaterialModule } from 'src/app/material.module';
import { InputFieldComponent } from 'src/app/shared/components/form/input-field/input-field.component';
import { InputSelectComponent } from 'src/app/shared/components/form/input-select/input-select.component';
import { DynamicPopoverComponent } from 'src/app/shared/components/dynamic-popover/dynamic-popover.component';
import { ActionMode } from 'src/app/models/common.model';
import { LoggerService } from 'src/app/services/logger.service';

@Component({
  selector: 'app-vehicle-type-dialog',
  templateUrl: './vehicle-type-dialog.component.html',
  styleUrls: ['./vehicle-type-dialog.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NgbModule,
    TranslocoModule,
    MaterialModule,
    NgxSpinnerModule,
    InputFieldComponent,
    InputSelectComponent,
    DynamicPopoverComponent,
  ],
})
export class VehicleTypeDialogComponent implements OnInit, OnDestroy {
  private readonly logger = inject(LoggerService);

  @Input() mode: ActionMode = 'create';
  @Input() vehicleType: VehicleType | null = null;
  @ViewChild('formContainer') formContainer!: ElementRef<HTMLDivElement>;

  formVehicleType!: FormGroup<ConfigVehicleTypeFormControls>;
  isEdit: boolean = false;
  isViewMode: boolean = false;
  isLoading: boolean = true;

  private scrollTimeoutId?: number;

  vehicleProfileTypeOptions: VehicleEnumOption[] = [];
  accessPointOptions: VehicleEnumOption[] = [];

  timeWindowEarlyObject: TimeObject = { hour: 0, minute: 0 };
  timeWindowLateObject: TimeObject = { hour: 0, minute: 0 };
  maximumDurationObject: TimeObject = { hour: 0, minute: 0 };

  vehicleSizingType: 'dimension' | 'volume' = 'dimension';
  allowedBreaks!: FormArray<FormGroup<BreakFormControls>>;
  breakTimeObjects: BreakTimeObject[] = [];

  private formValueSubscriptions: Subscription[] = [];
  private readonly stringControlKeys = [
    'name', 'timeWindowEarly', 'timeWindowLate', 'maximumDuration',
    'vehicleProfileType', 'vehicleGroupId', 'zone',
  ] as const;

  constructor(
    private fb: FormBuilder,
    public activeModal: NgbActiveModal,
    private ngbModal: NgbModal,
    private vehicleService: VehicleService,
    private spinner: NgxSpinnerService,
    private transloco: TranslocoService
  ) {}

  ngOnInit(): void {
    this.initializeMode();
    this.initializeForm();
    this.loadEnumValuesAndVehicleTypeData();
  }

  ngOnDestroy(): void {
    if (this.scrollTimeoutId !== undefined) {
      clearTimeout(this.scrollTimeoutId);
      this.scrollTimeoutId = undefined;
    }
    this.formValueSubscriptions.forEach((sub) => sub.unsubscribe());
    this.formValueSubscriptions = [];
  }

  private initializeMode(): void {
    this.isEdit = this.mode === 'edit';
    this.isViewMode = this.mode === 'view';
  }

  private initializeForm(): void {
    this.allowedBreaks = this.fb.array<FormGroup<BreakFormControls>>(
      [],
      Validators.required
    );

    const formGroup = this.fb.group(
      {
        name: [null as string | null, Validators.required],
        access: [[] as AccessTypeEnum[]],
        maximumWeightCapacity: [
          null as number | null,
          [Validators.required, Validators.min(0)],
        ],
        maximumVolumeCapacity: [null as number | null, Validators.min(0)],
        timeWindowEarly: [null as string | null],
        timeWindowLate: [null as string | null],
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
        vehicleGroupId: [null as string | null, Validators.required],
        maximumDistance: [null as number | null, Validators.min(0)],
        maximumDuration: [null as string | null],
        unitDistanceCost: [null as number | null, Validators.min(0)],
        unitDurationCost: [null as number | null, Validators.min(0)],
        fixedCost: [null as number | null, Validators.min(0)],
        maxpallet: [null as number | null, Validators.min(0)],
        zone: [null as string | null],
        allowedBreaks: this.allowedBreaks,
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

    this.formVehicleType = formGroup;
    this.setupNullPreservation();
  }

  private setupNullPreservation(): void {
    this.stringControlKeys.forEach((key) => {
      const control = this.formVehicleType.get(key);
      if (control) {
        const sub = control.valueChanges.subscribe((value) => {
          if (value === '') {
            control.setValue(null, { emitEvent: false });
          }
        });
        this.formValueSubscriptions.push(sub);
      }
    });
  }

  private loadEnumValuesAndVehicleTypeData(): void {
    this.isLoading = true;

    const enumRequests = VehicleEnumConfigs.map((config) =>
      this.vehicleService.getEnumValues(config.type)
    );

    forkJoin(enumRequests)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (responses) => {
          VehicleEnumConfigs.forEach((config, index) => {
            (this as Record<string, unknown>)[config.property] =
              responses[index];
          });

          if ((this.isEdit || this.isViewMode) && this.vehicleType) {
            const data = this.vehicleType;
            this.vehicleSizingType =
              data.maximumVolumeCapacity != null && !data.dimension
                ? 'volume'
                : 'dimension';
            this.onVehicleSizingTypeChange();
            const timeWindowEarly = this.formatTimeForDisplay(
              data.timeWindowEarly ?? data.twEarly
            );
            const timeWindowLate = this.formatTimeForDisplay(
              data.timeWindowLate ?? data.twLate
            );
            const maximumDuration = this.formatTimeForDisplay(data.maximumDuration);
            this.formVehicleType.patchValue({
              name: data.name,
              access: data.access,
              vehicleProfileType: data.vehicleProfileType,
              unitDistanceCost: data.unitDistanceCost,
              unitDurationCost: data.unitDurationCost,
              fixedCost: data.fixedCost,
              timeWindowEarly: timeWindowEarly || data.timeWindowEarly,
              timeWindowLate: timeWindowLate || data.timeWindowLate,
              maximumWeightCapacity: data.maximumWeightCapacity,
              maximumVolumeCapacity: data.maximumVolumeCapacity,
              vehicleGroupId: data.vehicleGroupId,
              maximumDistance: data.maximumDistance,
              maximumDuration: maximumDuration || null,
              dimension: data.dimension ?? undefined,
              maxpallet: data.maxpallet ?? null,
              zone: data.zone ?? null,
            });

            if (timeWindowEarly || data.timeWindowEarly) {
              this.timeWindowEarlyObject = this.parseTimeString(
                timeWindowEarly || data.timeWindowEarly
              );
            }
            if (timeWindowLate || data.timeWindowLate) {
              this.timeWindowLateObject = this.parseTimeString(
                timeWindowLate || data.timeWindowLate
              );
            }
            if (maximumDuration) {
              this.maximumDurationObject = this.parseTimeString(maximumDuration);
            }

            // Angular form can't assign array value to the form array directly,
            // so we need to push it to the form array
            if (data.allowedBreaks && Array.isArray(data.allowedBreaks)) {
              this.allowedBreaks.clear();
              this.breakTimeObjects = [];

              data.allowedBreaks.forEach((breakData: Break) => {
                const mappedBreakData = this.mapBreakDataToForm(breakData);

                // Push the break data to the form array
                this.allowedBreaks.push(
                  this.createBreakFormGroup(mappedBreakData)
                );

                // Assign default time, duration values to ngb-timepicker
                this.breakTimeObjects.push(
                  this.createBreakTimeObjects(mappedBreakData)
                );
              });
            }
          }
          if (this.isViewMode) {
            this.formVehicleType.disable({ emitEvent: false });
          }
        },
        error: (err) => {
          this.logger.error('Error loading enum values:', err);
          VehicleEnumConfigs.forEach((config) => {
            (this as Record<string, unknown>)[config.property] = [];
          });
        },
      });
  }

  private mapBreakDataToForm(breakData: Break): VehicleBreak {
    return {
      name: breakData.name,
      duration: this.formatTimeForDisplay(breakData.duration) || breakData.duration,
      timeWindowEarly: this.formatTimeForDisplay(breakData.timeWindowEarly) || breakData.timeWindowEarly,
      timeWindowLate: this.formatTimeForDisplay(breakData.timeWindowLate) || breakData.timeWindowLate,
    };
  }

  private createBreakTimeObjects(breakData: VehicleBreak) {
    return {
      duration: this.parseTimeString(breakData.duration),
      timeWindowEarly: this.parseTimeString(breakData.timeWindowEarly),
      timeWindowLate: this.parseTimeString(breakData.timeWindowLate),
    };
  }

  private formatTimeForDisplay(
    timeValue: string | number | null | undefined
  ): string {
    if (typeof timeValue === 'string' && timeValue.includes(':')) {
      return timeValue;
    }
    if (typeof timeValue === 'number') {
      return minutesToTimeString(timeValue);
    }
    return '';
  }

  private parseTimeString(timeStr: string | number | null | undefined): TimeObject {
    const str = this.formatTimeForDisplay(timeStr);
    if (!str) {
      return { hour: 0, minute: 0 };
    }
    const parts = str.split(':');
    return {
      hour: parseInt(parts[0]) || 0,
      minute: parseInt(parts[1]) || 0,
    };
  }

  onSubmit(): void {
    if (this.formVehicleType.invalid) {
      this.markFormAsInvalid();
      return;
    }

    const dialogRef = this.ngbModal.open(ConfirmationDialogComponent, {
      centered: true,
      animation: true,
    });

    dialogRef.componentInstance.title = this.transloco.translate(
      this.isEdit
        ? 'vehicleManagement.confirm_update'
        : 'vehicleManagement.confirm_create'
    );
    dialogRef.componentInstance.message = this.transloco.translate(
      this.isEdit
        ? 'vehicleManagement.are_you_sure_update_vehicle_type'
        : 'vehicleManagement.are_you_sure_create_vehicle_type'
    );

    dialogRef.result
      .then((confirmed: boolean) => {
        if (confirmed) {
          this.handleSubmit();
        }
      })
      .catch(() => {});
  }

  onCancel(): void {
    this.activeModal.dismiss();
  }

  private markFormAsInvalid(): void {
    this.formVehicleType.markAllAsTouched();
    this.allowedBreaks.markAsTouched();
    this.allowedBreaks.controls.forEach((control) => control.markAsTouched());

    if (this.allowedBreaks.hasError('required') && this.allowedBreaks.length === 0) {
      this.scrollToBottom();
    }
  }

  onVehicleSizingTypeChange(): void {
    if (this.isViewMode) return;

    const dimensionGroup = this.formVehicleType.controls.dimension;
    const volumeControl = this.formVehicleType.controls.maximumVolumeCapacity;

    if (this.vehicleSizingType === 'dimension') {
      dimensionGroup.enable({ emitEvent: false });
      volumeControl.reset(null, { emitEvent: false });
      volumeControl.disable({ emitEvent: false });
    } else {
      volumeControl.enable({ emitEvent: false });
      dimensionGroup.reset({ width: null, height: null, depth: null }, { emitEvent: false });
      dimensionGroup.disable({ emitEvent: false });
    }
  }

  onAccessPointChangeString(
    event: MatCheckboxChange,
    accessPointKey: string
  ): void {
    const accessPoints = this.formVehicleType.get('access') as FormControl<
      AccessTypeEnum[] | null
    >;
    const currentValues = [...(accessPoints.value || [])];

    if (event.checked) {
      currentValues.push(accessPointKey as AccessTypeEnum);
    } else {
      const index = currentValues.indexOf(accessPointKey as AccessTypeEnum);
      if (index > -1) {
        currentValues.splice(index, 1);
      }
    }
    accessPoints.setValue(currentValues);
  }

  isAccessPointCheckedString(accessPointKey: string): boolean {
    return (
      this.formVehicleType
        .get('access')
        ?.value?.includes(accessPointKey as AccessTypeEnum) ?? false
    );
  }

  private handleSubmit(): void {
    this.spinner.show();
    const payload = this.buildPayload();
    const request$ = this.isEdit
      ? this.vehicleService.updateVehicleType(
          this.vehicleType!.vehicleTypeId,
          payload as VehicleType
        )
      : this.vehicleService.createVehicleType(payload as VehicleType);

    request$.pipe(finalize(() => this.spinner.hide())).subscribe({
      next: (res: VehicleType) => {
        this.activeModal.close({ refresh: true, vehicleType: res });
      },
      error: (err) => {
        this.logger.error(
          `Failed to ${this.isEdit ? 'update' : 'create'} vehicle type:`,
          err
        );
      },
    });
  }

  private buildPayload(): Partial<VehicleType> {
    const formValue = this.formVehicleType.getRawValue();
    const toNum = (v: number | null | undefined): number | null =>
      v != null ? Number(v) : null;
    const omitNull = (obj: Record<string, unknown>): Record<string, unknown> =>
      Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== null && v !== undefined));

    const rawPayload: Record<string, unknown> = {
      name: formValue.name || null,
      access: formValue.access || [],
      vehicleProfileType: formValue.vehicleProfileType as VehicleProfileTypeEnum,
      maximumWeightCapacity: toNum(formValue.maximumWeightCapacity),
      maximumVolumeCapacity: toNum(formValue.maximumVolumeCapacity),
      timeWindowEarly: formValue.timeWindowEarly || null,
      timeWindowLate: formValue.timeWindowLate || null,
      vehicleGroupId: formValue.vehicleGroupId || null,
      maximumDistance: toNum(formValue.maximumDistance),
      maximumDuration: formValue.maximumDuration || null,
      unitDistanceCost: toNum(formValue.unitDistanceCost),
      unitDurationCost: toNum(formValue.unitDurationCost),
      fixedCost: toNum(formValue.fixedCost),
      maxpallet: toNum(formValue.maxpallet),
      zone: formValue.zone || null,
    };

    const dimensionFields = omitNull({
      width: toNum(formValue.dimension?.width),
      height: toNum(formValue.dimension?.height),
      depth: toNum(formValue.dimension?.depth),
    });
    if (Object.keys(dimensionFields).length > 0) {
      rawPayload['dimension'] = dimensionFields;
    }

    if (this.allowedBreaks.length > 0) {
      rawPayload['allowedBreaks'] = this.allowedBreaks.getRawValue().map((breakItem) =>
        omitNull({
          name: breakItem.name || null,
          duration: breakItem.duration || null,
          timeWindowEarly: breakItem.timeWindowEarly || null,
          timeWindowLate: breakItem.timeWindowLate || null,
        })
      );
    }

    return omitNull(rawPayload) as unknown as Partial<VehicleType>;
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

    const timeString = this.convertTimeObjectToString(event);
    this.formVehicleType.controls[key].setValue(timeString);

    this.formVehicleType.updateValueAndValidity();
    this.formVehicleType.controls.timeWindowEarly.markAsTouched();
    this.formVehicleType.controls.timeWindowLate.markAsTouched();
  }

  onMaximumDurationChange(event: TimeObject): void {
    this.maximumDurationObject = event;
    const timeString = this.convertTimeObjectToString(event);
    this.formVehicleType.controls.maximumDuration.setValue(timeString || null);
    this.formVehicleType.controls.maximumDuration.markAsTouched();
  }

  private convertTimeObjectToString(event: TimeObject): string {
    if (event && event.hour !== undefined && event.minute !== undefined) {
      const hour = String(event.hour).padStart(2, '0');
      const minute = String(event.minute).padStart(2, '0');
      return `${hour}:${minute}`;
    }
    return '';
  }

  createBreakFormGroup(breakData?: VehicleBreak): FormGroup<BreakFormControls> {
    const group = this.fb.group<BreakFormControls>(
      {
        name: this.fb.control(breakData?.name ?? null, Validators.required),
        duration: this.fb.control(breakData?.duration ?? null, Validators.required),
        timeWindowEarly: this.fb.control(
          breakData?.timeWindowEarly ?? null,
          Validators.required
        ),
        timeWindowLate: this.fb.control(breakData?.timeWindowLate ?? null, Validators.required),
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
          )
        }),
      }
    );

    ['name', 'duration', 'timeWindowEarly', 'timeWindowLate'].forEach((key) => {
      const control = group.get(key);
      if (control) {
        const sub = control.valueChanges.subscribe((value) => {
          if (value === '') {
            control.setValue(null, { emitEvent: false });
          }
        });
        this.formValueSubscriptions.push(sub);
      }
    });

    return group;
  }

  addBreak(): void {
    this.allowedBreaks.push(this.createBreakFormGroup());
    this.breakTimeObjects.push({
      duration: { hour: 0, minute: 0 },
      timeWindowEarly: { hour: 0, minute: 0 },
      timeWindowLate: { hour: 0, minute: 0 },
    });

    this.scrollToBottom();
  }

  removeBreak(index: number): void {
    this.allowedBreaks.removeAt(index);
    this.breakTimeObjects.splice(index, 1);
  }

  private scrollToBottom(): void {
    if (this.scrollTimeoutId !== undefined) {
      clearTimeout(this.scrollTimeoutId);
    }

    this.scrollTimeoutId = window.setTimeout(() => {
      if (this.formContainer?.nativeElement) {
        this.formContainer.nativeElement.scrollTo({
          top: this.formContainer.nativeElement.scrollHeight,
          behavior: 'smooth',
        });
      }
    }, 100);
  }


  onBreakTimeValueChange(
    breakIndex: number,
    field: 'duration' | 'timeWindowEarly' | 'timeWindowLate',
    event: TimeObject
  ): void {
    this.breakTimeObjects[breakIndex][field] = event;

    const breakControl = this.allowedBreaks.at(breakIndex);
    const timeString = this.convertTimeObjectToString(event);

    breakControl.get(field)?.setValue(timeString);
    breakControl.updateValueAndValidity();
    breakControl.get(field)?.markAsTouched();
  }

  hasBreakTimeRangeError(breakControl: FormGroup<BreakFormControls>): boolean {
    const timeWindowEarly = breakControl.controls.timeWindowEarly;
    const timeWindowLate = breakControl.controls.timeWindowLate;

    return !!(
      (timeWindowEarly?.hasError('timeRangeInvalid') &&
        timeWindowEarly?.touched) ||
      (timeWindowLate?.hasError('timeRangeInvalid') && timeWindowLate?.touched)
    );
  }

  trackByIndex(index: number): number {
    return index;
  }

  getBreakControls(): FormGroup<BreakFormControls>[] {
    return this.allowedBreaks.controls;
  }
}
