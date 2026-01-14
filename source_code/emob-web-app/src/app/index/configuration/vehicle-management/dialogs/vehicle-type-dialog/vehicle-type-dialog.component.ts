import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
} from '@angular/core';
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
  VehicleBreak,
} from 'src/app/models/vehicle.model';
import { VehicleService } from 'src/app/services/vehicle.service';
import { minutesToTimeString } from 'src/app/directives/time-string-to-minutes.pipe';
import { VehicleTypeFormControls } from 'src/app/models/forms/vehicle-type-form-control.model';
import { createTimeRangeValidator } from 'src/app/shared/validators/time-range.validator';
import { TranslocoService } from '@jsverse/transloco';
import { ActionMode } from 'src/app/models/common.model';

@Component({
  selector: 'app-vehicle-type-dialog',
  templateUrl: './vehicle-type-dialog.component.html',
  styleUrls: ['./vehicle-type-dialog.component.scss'],
})
export class VehicleTypeDialogComponent implements OnInit, OnDestroy {
  @Input() mode: ActionMode = 'create';
  @Input() vehicleType: VehicleType | null = null;
  @ViewChild('formContainer') formContainer!: ElementRef<HTMLDivElement>;

  formVehicleType!: FormGroup<VehicleTypeFormControls>;
  isEdit: boolean = false;
  isViewMode: boolean = false;
  isLoading: boolean = true;

  private scrollTimeoutId?: number;

  vehicleProfileTypeOptions: VehicleEnumOption[] = [];
  accessPointOptions: VehicleEnumOption[] = [];

  timeWindowEarlyObject: TimeObject = { hour: 0, minute: 0 };
  timeWindowLateObject: TimeObject = { hour: 0, minute: 0 };

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
    this.initializeMode();
    this.initializeForm();
    this.loadEnumValuesAndVehicleTypeData();
  }

  ngOnDestroy(): void {
    if (this.scrollTimeoutId !== undefined) {
      clearTimeout(this.scrollTimeoutId);
      this.scrollTimeoutId = undefined;
    }
  }

  private initializeMode(): void {
    this.isEdit = this.mode === 'edit';
    this.isViewMode = this.mode === 'view';
  }

  private initializeForm(): void {
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

    this.formVehicleType = formGroup;
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
            this.formVehicleType.patchValue({
              name: data.name,
              access: data.access,
              vehicleProfileType: data.vehicleProfileType,
              unitDistanceCost: data.unitDistanceCost,
              unitDurationCost: data.unitDurationCost,
              fixedCost: data.fixedCost,
              timeWindowEarly: this.formatTimeForDisplay(data.timeWindowEarly),
              timeWindowLate: this.formatTimeForDisplay(data.timeWindowLate),
              maximumWeightCapacity: data.maximumWeightCapacity,
              maximumVolumeCapacity: data.maximumVolumeCapacity,
              vehicleGroupId: data.vehicleGroupId,
              maximumDistance: data.maximumDistance,
              maximumDuration: data.maximumDuration,
              dimension: data.dimension,
            });

            if (data.timeWindowEarly) {
              this.timeWindowEarlyObject = this.parseTimeString(
                data.timeWindowEarly
              );
            }
            if (data.timeWindowLate) {
              this.timeWindowLateObject = this.parseTimeString(
                data.timeWindowLate
              );
            }
            this.loadBreaksData();
          }
          if (this.isViewMode) {
            this.formVehicleType.disable({ emitEvent: false });
          }
        },
        error: (err) => {
          console.error('Error loading enum values:', err);
          VehicleEnumConfigs.forEach((config) => {
            (this as Record<string, unknown>)[config.property] = [];
          });
        },
      });
  }

  private loadBreaksData(): void {
    const breaksData = this.vehicleType!.allowedBreaks;

    if (breaksData && Array.isArray(breaksData)) {
      this.breaks.clear();
      this.breakTimeObjects = {};

      breaksData.forEach((breakData: any, index: number) => {
        const mappedBreak = this.mapBreakDataToForm(breakData);
        this.breaks.push(this.createBreakFormGroup(mappedBreak));
        this.breakTimeObjects[index] = this.createBreakTimeObjects(mappedBreak);
      });
    }
  }

  private mapBreakDataToForm(breakData: any): VehicleBreak {
    return {
      name: breakData.name || '',
      duration: this.formatTimeForDisplay(breakData.duration),
      earliestStart: this.formatTimeForDisplay(
        breakData.timeWindowEarly || breakData.earliestStart
      ),
      latestStart: this.formatTimeForDisplay(
        breakData.timeWindowLate || breakData.latestStart
      ),
    };
  }

  private createBreakTimeObjects(breakData: VehicleBreak) {
    return {
      duration: this.parseTimeString(breakData.duration),
      earliestStart: this.parseTimeString(breakData.earliestStart),
      latestStart: this.parseTimeString(breakData.latestStart),
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

  private parseTimeString(timeStr: string): TimeObject {
    if (!timeStr) {
      return { hour: 0, minute: 0 };
    }
    const parts = timeStr.split(':');
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
    this.breaks.controls.forEach((control) => control.markAsTouched());
  }

  onAccessPointChangeString(
    event: MatCheckboxChange,
    accessPointKey: string
  ): void {
    const accessPoints = this.formVehicleType.get('access') as FormControl<
      AccessTypeEnum[] | null
    >;
    let currentValues = [...(accessPoints.value || [])];

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
        console.error(
          `Failed to ${this.isEdit ? 'update' : 'create'} vehicle type:`,
          err
        );
      },
    });
  }

  private buildPayload(): Partial<VehicleType> {
    const formValue = this.formVehicleType.getRawValue();

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
      maximumDistance: formValue.maximumDistance
        ? Number(formValue.maximumDistance)
        : undefined,
      maximumDuration: formValue.maximumDuration
        ? Number(formValue.maximumDuration)
        : undefined,
      unitDistanceCost: Number(formValue.unitDistanceCost) || 0,
      unitDurationCost: Number(formValue.unitDurationCost) || 0,
      fixedCost: Number(formValue.fixedCost) || 0,
    };

    if (
      formValue.maximumVolumeCapacity !== null &&
      formValue.maximumVolumeCapacity !== undefined
    ) {
      payload.maximumVolumeCapacity = Number(formValue.maximumVolumeCapacity);
    }
    if (formValue.vehicleGroupId) {
      payload.vehicleGroupId = formValue.vehicleGroupId;
    }

    const allowedBreaks = this.buildAllowedBreaks();
    if (allowedBreaks.length > 0) {
      payload.allowedBreaks = allowedBreaks;
    }

    return this.removeUndefinedValues(payload);
  }

  private buildAllowedBreaks(): any[] {
    const breaksValue = this.breaks.getRawValue();
    if (!breaksValue || breaksValue.length === 0) {
      return [];
    }

    return breaksValue.map((breakItem: any) => ({
      name: breakItem.name,
      duration: breakItem.duration,
      timeWindowEarly: breakItem.earliestStart,
      timeWindowLate: breakItem.latestStart,
    }));
  }

  private removeUndefinedValues(
    payload: Partial<VehicleType>
  ): Partial<VehicleType> {
    Object.keys(payload).forEach((key) => {
      if (payload[key as keyof typeof payload] === undefined) {
        delete payload[key as keyof typeof payload];
      }
    });
    return payload;
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

  private convertTimeObjectToString(event: TimeObject): string {
    if (event && event.hour !== undefined && event.minute !== undefined) {
      const hour = String(event.hour).padStart(2, '0');
      const minute = String(event.minute).padStart(2, '0');
      return `${hour}:${minute}`;
    }
    return '';
  }
  
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

    this.scrollToBottom();
  }

  removeBreak(index: number): void {
    this.breaks.removeAt(index);
    this.reindexBreakTimeObjects(index);
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

  private reindexBreakTimeObjects(removedIndex: number): void {
    delete this.breakTimeObjects[removedIndex];
    const newTimeObjects: typeof this.breakTimeObjects = {};

    Object.keys(this.breakTimeObjects).forEach((key) => {
      const numKey = parseInt(key);
      if (numKey > removedIndex) {
        newTimeObjects[numKey - 1] = this.breakTimeObjects[numKey];
      } else if (numKey < removedIndex) {
        newTimeObjects[numKey] = this.breakTimeObjects[numKey];
      }
    });

    this.breakTimeObjects = newTimeObjects;
  }

  onBreakTimeValueChange(
    breakIndex: number,
    field: 'duration' | 'earliestStart' | 'latestStart',
    event: TimeObject
  ): void {
    this.initializeBreakTimeObjectIfNeeded(breakIndex);
    this.breakTimeObjects[breakIndex][field] = event;

    const breakControl = this.breaks.at(breakIndex) as FormGroup;
    const timeString = this.convertTimeObjectToString(event);
    breakControl.get(field)?.setValue(timeString);

    breakControl.updateValueAndValidity();
    breakControl.get(field)?.markAsTouched();
  }

  private initializeBreakTimeObjectIfNeeded(breakIndex: number): void {
    if (!this.breakTimeObjects[breakIndex]) {
      this.breakTimeObjects[breakIndex] = {
        duration: { hour: 0, minute: 0 },
        earliestStart: { hour: 0, minute: 0 },
        latestStart: { hour: 0, minute: 0 },
      };
    }
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

  trackByIndex(index: number): number {
    return index;
  }

  getBreakControls(): FormGroup[] {
    return this.breaks.controls as FormGroup[];
  }
}
