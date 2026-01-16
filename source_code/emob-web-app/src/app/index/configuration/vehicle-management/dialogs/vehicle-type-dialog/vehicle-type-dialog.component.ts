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
  BreakTimeObject,
  Break,
} from 'src/app/models/vehicle.model';
import { VehicleService } from 'src/app/services/vehicle.service';
import {
  VehicleTypeFormControls,
  BreakFormControls,
} from 'src/app/models/forms/vehicle-type-form-control.model';
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

  allowedBreaks!: FormArray<FormGroup<BreakFormControls>>;
  breakTimeObjects: BreakTimeObject[] = [];

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
    this.allowedBreaks = this.fb.array<FormGroup<BreakFormControls>>(
      [],
      Validators.required
    );

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
              timeWindowEarly: data.timeWindowEarly,
              timeWindowLate: data.timeWindowLate,
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
          console.error('Error loading enum values:', err);
          VehicleEnumConfigs.forEach((config) => {
            (this as Record<string, unknown>)[config.property] = [];
          });
        },
      });
  }

  private mapBreakDataToForm(breakData: Break): VehicleBreak {
    return {
      name: breakData.name,
      duration: breakData.duration,
      timeWindowEarly: breakData.timeWindowEarly,
      timeWindowLate: breakData.timeWindowLate,
    };
  }

  private createBreakTimeObjects(breakData: VehicleBreak) {
    return {
      duration: this.parseTimeString(breakData.duration),
      timeWindowEarly: this.parseTimeString(breakData.timeWindowEarly),
      timeWindowLate: this.parseTimeString(breakData.timeWindowLate),
    };
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
    this.allowedBreaks.markAsTouched();
    this.allowedBreaks.controls.forEach((control) => control.markAsTouched());

    // Scroll to bottom if there's an error with allowed breaks
    if (this.allowedBreaks.hasError('required') && this.allowedBreaks.length === 0) {
      this.scrollToBottom();
    }
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
      maximumVolumeCapacity: Number(formValue.maximumVolumeCapacity) || 0,
      maximumWeightCapacity: Number(formValue.maximumWeightCapacity) || 0,
      timeWindowEarly: formValue.timeWindowEarly || '00:00',
      timeWindowLate: formValue.timeWindowLate || '00:00',
      dimension: {
        width: Number(formValue.dimension?.width) || 0,
        height: Number(formValue.dimension?.height) || 0,
        depth: Number(formValue.dimension?.depth) || 0,
      },
      vehicleGroupId: formValue.vehicleGroupId || '',
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

    if (this.allowedBreaks.length > 0) {
      payload.allowedBreaks = this.allowedBreaks.getRawValue().map((breakItem) => ({
        name: breakItem.name || '',
        duration: breakItem.duration || '00:00',
        timeWindowEarly: breakItem.timeWindowEarly || '00:00',
        timeWindowLate: breakItem.timeWindowLate || '00:00',
      }));
    }

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

  createBreakFormGroup(breakData?: VehicleBreak): FormGroup<BreakFormControls> {
    return this.fb.group<BreakFormControls>(
      {
        name: this.fb.control(breakData?.name || '', Validators.required),
        duration: this.fb.control(breakData?.duration || '', Validators.required),
        timeWindowEarly: this.fb.control(
          breakData?.timeWindowEarly || '',
          Validators.required
        ),
        timeWindowLate: this.fb.control(breakData?.timeWindowLate || '', Validators.required),
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
