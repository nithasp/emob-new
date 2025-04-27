import { SelectionModel } from '@angular/cdk/collections';
import {
  AfterViewInit,
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { NgxSpinnerService } from 'ngx-spinner';
import { Experiment } from 'src/app/models/experiment.model';
import { ConstraintService } from 'src/app/services/constraint.service';
import { ExperimentService } from 'src/app/services/experiment.service';
import { DetailsDialogComponent } from '../components/details-dialog/details-dialog.component';
import { ToastrService } from 'ngx-toastr';
import { UserMSGraphService } from 'src/app/services/user.service';
import { ConfirmationDialogComponent } from '../components/confirmation-dialog/confirmation-dialog.component';
import { distinctUntilChanged } from 'rxjs';
import { ParametersDialogComponent } from '../components/parameters-dialog/parameters-dialog.component';
import { Constraint } from 'src/app/models/constraint.model';

@Component({
  selector: 'app-experiment',
  templateUrl: './experiment.component.html',
  styleUrl: './experiment.component.scss',
})
export class ExperimentComponent implements AfterViewInit, OnDestroy, OnInit {
  public displayedColumns = [
    {
      def: 'select',
      label: 'select',
      visible: true,
    },
    {
      def: 'Name',
      label: 'Name',
      visible: true,
    },
    {
      def: 'actions',
      label: 'Actions',
      visible: true,
    },
    {
      def: 'TimeStamp',
      label: 'TimeStamp',
      visible: true,
    },
    {
      def: 'TimeStart',
      label: 'Run Start',
      visible: true,
    },
    {
      def: 'TimeEnd',
      label: 'Run End',
      visible: true,
    },
    {
      def: 'TimeDuration',
      label: 'Duration',
      visible: true,
    },
    {
      def: 'TriggeredBy',
      label: 'Triggered By',
      visible: true,
    },
    {
      def: 'Status',
      label: 'Status',
      visible: true,
    },
    {
      def: 'Run',
      label: 'Run',
      visible: true,
    },
    {
      def: 'parameter',
      label: 'Parameter',
      visible: true,
    },
    {
      def: 'RunId',
      label: 'Run ID',
      visible: false,
    },
    {
      def: 'GroupId',
      label: 'Group ID',
      visible: false,
    },
  ];
  paramsVehicle: Constraint = {
    availableCar: 0,
    limitVehicleCapacity: 0,
    deliveryTime: '',
    backToDepotTime: '',
    maxTravelDistance: 0,
    MaxWorkDuration: 0,
    earlyDeliveryTime: '',
    maximumWorkDuration: '',
    numberOfVehicleAvailable: 0,
    vehicleOrderSizeCapacity: 0,
    maximumTravelDistance: 0,
    serviceDurationTime: ''
  };

  interval: any;
  dataSource = new MatTableDataSource<Experiment>([]);
  selection = new SelectionModel<Experiment>(false);
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  constructor(
    private readonly experimentService: ExperimentService,
    private readonly constraintService: ConstraintService,
    private readonly spinner: NgxSpinnerService,
    private readonly router: Router,
    private readonly ngbModal: NgbModal,
    private readonly toastr: ToastrService,
    private readonly userMsGraphService: UserMSGraphService
  ) {}
  ngOnInit(): void {
    this.spinner.show();
    this.loadData();
    this.spinner.hide();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.interval = setInterval(() => {
      this.loadData();
    }, 45000); // 30 seconds
  }

  loadData(): void {
    this.showSpinner();
    this.experimentService.getExperiments().subscribe({
      next: (response) => {
        this.dataSource.data = response;
        this.dataSource.paginator = this.paginator;

        this.hiddenSpinner();
      },
      error: () => {
        this.hiddenSpinner();
      },
    });
  }
  ngOnDestroy(): void {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  toggleSelection(row: any) {
    this.selection.clear(); // Clear previous selections
    this.selection.toggle(row); // Select the new row
  }

  /** The label for the checkbox on the passed row */
  checkboxLabel(row: Experiment): string {
    return `${this.selection.isSelected(row) ? 'deselect' : 'select'} row `;
  }

  getDisplayedColumns(): string[] {
    return this.displayedColumns.filter((cd) => cd.visible).map((cd) => cd.def);
  }

  isSelectedStatusValue(status: string): boolean {
    return this.selection.selected.length > 0
      ? this.selection.selected[0].status === status
      : false;
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  createNewExperiment() {
    const openConfirmDialog = this.openConfirmDialog(
      'Create Experiment Confirmation',
      '',
      'Do you want to create a new experiment?',
      'Confirm',
      false
    );
    openConfirmDialog.result.then((confirmed) => {
      if (confirmed) {
        this.spinner.show();
        this.experimentService.createExperiment().subscribe((response) => {
          this.toastr.info('create experiment', response.runId);
          this.router.navigate(['/users/run', response.runId]);
        });
      }
    });
  }

  getParameter(runId: string) {
    this.showSpinner();

    this.constraintService.getParameter(runId).subscribe((response) => {
      this.paramsVehicle = response;
      this.hiddenSpinner();
      this.openDetails('Parameters', this.objectToStringArray(response), 'lg');
    });
  }

  getConsumption(experiment: Experiment) {
    this.showSpinner();
    this.openDetails(
      'Consumptions',
      this.objectToStringArray({
        countGeocoding: experiment.countGeocoding
          ? experiment.countGeocoding
          : 0,
        countReroute: experiment.countReroute ? experiment.countReroute : 0,
      }),
      ''
    );
    this.hiddenSpinner();
  }
  objectToStringArray(value: any): string[] {
    if (!value || typeof value !== 'object') {
      return [];
    }

    return Object.entries(value).map(([key, val]) => `${key}: ${val}`);
  }

  objectToStringWithNewlines(obj: { [key: string]: any }): string {
    return Object.entries(obj)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
  }

  openDetails(title: string, message: string | string[], size: string) {
    const focusedElement = document.activeElement as HTMLElement;
    if (focusedElement) {
      focusedElement.blur();
    }

    console.log(`alertInvalidation: title = ${title}, message = ${message}`);

    if(title === 'Parameters') {
      const dialogRef = this.ngbModal.open(ParametersDialogComponent, {
        centered: true,
        animation: true,
        size: size,
      });
      dialogRef.componentInstance.paramsVehicle = this.paramsVehicle;
      dialogRef.result.then((confirmed: boolean) => {
        console.log(`alertInvalidation: confirmed = ${confirmed}`);
        if (confirmed) {
          console.log('confirmed');
        }
      });
    }



  }
  openConfirmDialog(
    title: string,
    message: string,
    question: string,
    acceptButton: string = 'Confirm',
    disableCancelButton: boolean = true
  ) {
    const focusedElement = document.activeElement as HTMLElement;
    if (focusedElement) {
      focusedElement.blur();
    }
    const dialogRef = this.ngbModal.open(ConfirmationDialogComponent, {
      centered: true,
      animation: true,
    });
    dialogRef.componentInstance.title = title;
    dialogRef.componentInstance.question = question;
    dialogRef.componentInstance.message = message;
    dialogRef.componentInstance.acceptButton = acceptButton;
    dialogRef.componentInstance.disableCancelButton = disableCancelButton;

    return dialogRef;
  }

  retryExperiment(experiment: Experiment) {
    const dialogRef = this.openConfirmDialog(
      'Retry experiment',
      'Confirm to retry experiment',
      'Are you sure to retry experiment ?'
    );
    dialogRef.result.then((confirmed: boolean) => {
      if (confirmed) {
        this.spinner.show();
        this.experimentService
          .rerunExperiment(experiment.runId)
          .subscribe((response) => {
            this.spinner.hide();
            this.toastr.success(response.message, 'Rerun Experiment');
          });
      }
    });
  }
  tryToRerunExperiment(experiment: Experiment) {
    const dialogRef = this.openConfirmDialog(
      'Try to Rerun experiment',
      'Confirm to try to Rerun experiment',
      'Are you sure to try to rerun experiment ?'
    );
    dialogRef.result.then((confirmed: boolean) => {
      if (confirmed) {
        this.spinner.show();
        this.experimentService
          .replicateExperiment(experiment.runId)
          .subscribe((response) => {
            this.spinner.hide();
            this.toastr.success(
              'Success to replicate experiment',
              'Replicate Experiment'
            );
            this.router.navigate(['/users/run', response.runId]);
          });
      }
    });
  }

  cancelExperiment(experiment: Experiment) {
    const dialogRef = this.openConfirmDialog(
      'Cancel experiment',
      'Confirm to cancel experiment',
      'Are you sure to cancel experiment ?'
    );
    dialogRef.result.then((confirmed: boolean) => {
      if (confirmed) {
        this.spinner.show();
        this.experimentService
          .cancelExperiment(experiment.runId)
          .subscribe((response) => {
            this.spinner.hide();
            this.toastr.info(response.message, 'Cancel Experiment');
          });
      }
    });
  }
  selectExperiment(experiment: Experiment) {
    this.spinner.show();
    console.log('select experiment', experiment);
    if (experiment.status === 'Initializing') {
      this.userMsGraphService.getUserId().subscribe((userId) => {
        this.spinner.hide();
        console.log('compare user id', userId, experiment.triggeredBy);
        if (userId === experiment.triggeredBy) {
          console.log('open run experiment');
          this.router.navigate(['/users/run', experiment.runId]);
          this.toastr.info('opening experiment', experiment.name);
        } else {
          this.openConfirmDialog(
            'cannot open Experiment',
            'You cannot open an experiment that you did not create',
            ' ',
            'Acknowledge'
          );
          this.toastr.warning(
            'cannot open Experiment',
            'You cannot open an experiment that you did not create'
          );
        }
      });
    } else if (experiment.status === 'Succeeded') {
      console.log('open result experiment');
      this.router.navigate(['/users/result', experiment.runId]);
    } else {
      this.toastr.warning(
        'cannot open Experiment',
        'You cannot open an experiment that is not succeeded'
      );
      this.openConfirmDialog(
        'cannot open Experiment',
        'You cannot open an experiment that is not succeeded',
        '',
        'Acknowledge'
      );
    }
    this.spinner.hide();
  }

  showSpinner() {
    this.spinner.show('experiment', {
      type: 'ball-beat',
      size: 'medium',
      bdColor: 'rgba(255,255,255, .9)',
      color: 'black',
      fullScreen: false,
    });
  }
  hiddenSpinner() {
    console.log('hidden spinner');
    setTimeout(() => {
      this.spinner.hide('experiment');
    }, 500);
  }
}
