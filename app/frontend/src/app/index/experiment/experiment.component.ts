import { SelectionModel } from '@angular/cdk/collections';
import {
  AfterViewInit,
  Component,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild, inject,
} from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { NgxSpinnerService } from 'ngx-spinner';
import { Experiment, ExperimentCounts } from 'src/app/models/experiment.model';
import { ConstraintService } from 'src/app/services/constraint.service';
import { ExperimentService } from 'src/app/services/experiment.service';
import { ToastrService } from 'ngx-toastr';
import { UserService } from 'src/app/services/user.service';
import { ConfirmationDialogComponent } from '../components/confirmation-dialog/confirmation-dialog.component';
import { ParametersDialogComponent } from '../components/parameters-dialog/parameters-dialog.component';
import { DynamicParameter } from 'src/app/models/constraint.model';
import { ConsumptionDialogComponent } from '../components/consumption-dialog/consumption-dialog.component';
import { TranslocoService } from '@jsverse/transloco';
import { LoggerService } from 'src/app/services/logger.service';

@Component({
  selector: 'app-experiment',
  templateUrl: './experiment.component.html',
  styleUrl: './experiment.component.scss',
})
export class ExperimentComponent implements AfterViewInit, OnDestroy, OnInit {
  private readonly logger = inject(LoggerService);

  columnsStorageKey = 'experimentDisplayedColumns';
  public displayedColumns = [
    { def: 'select', label: 'select', visible: true },
    { def: 'Name', label: 'name', visible: true },
    { def: 'actions', label: 'actions', visible: true },
    { def: 'DepotName', label: 'depot_name', visible: true },
    { def: 'TimeStamp', label: 'timestamp', visible: true },
    { def: 'TimeStart', label: 'run_start', visible: true },
    { def: 'TimeEnd', label: 'run_end', visible: true },
    { def: 'TimeDuration', label: 'duration', visible: true },
    { def: 'TriggeredBy', label: 'triggered_by', visible: true },
    { def: 'Status', label: 'status', visible: true },
    { def: 'Run', label: 'run', visible: true },
    { def: 'parameter', label: 'parameter', visible: true },
    { def: 'RunId', label: 'run_id', visible: false },
    { def: 'GroupId', label: 'group_id', visible: false },
  ];
  paramsConsumption: ExperimentCounts = {
    countGeocoding: 0,
    countReroute: 0,
  };

  dataSource = new MatTableDataSource<Experiment>([]);
  selection = new SelectionModel<Experiment>(false);
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  pollingTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly experimentService: ExperimentService,
    private readonly constraintService: ConstraintService,
    private readonly spinner: NgxSpinnerService,
    private readonly router: Router,
    private readonly ngbModal: NgbModal,
    private readonly toastr: ToastrService,
    private readonly userService: UserService,
    private readonly transloco: TranslocoService
  ) {}

  ngOnInit(): void {
    this.loadDisplayedColumns();
    this.loadData();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;

    if (!document.hidden) {
      this.startPolling();
    }
  }

  ngOnDestroy(): void {
    this.stopPolling();
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

  @HostListener('document:visibilitychange')
  onVisibilityChange() {
    if (document.hidden) {
      this.stopPolling();
    } else {
      this.startPolling();
    }
  }

  startPolling() {
    this.stopPolling();
    this.pollingTimer = setInterval(() => this.loadData(), 45000);
  }

  stopPolling() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
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
      this.transloco.translate('create_experiment_confirmation', {}, 'index'),
      '',
      this.transloco.translate('create_experiment_message', {}, 'index'),
      this.transloco.translate('confirm'),
      false
    );
    openConfirmDialog.result.then((confirmed) => {
      if (confirmed) {
        this.spinner.show();
        this.experimentService.createExperiment().subscribe((response) => {
          this.toastr.info(
            this.transloco.translate('create_experiment', {}, 'index'),
            response.runId
          );
          this.router.navigate(['/users/run', response.runId], {
            state: { isCreateMode: true },
          });
        });
      }
    });
  }

  getParameter(runId: string) {
    this.showSpinner();
    this.constraintService.getDynamicParameter(runId).subscribe(
      (response: DynamicParameter[]) => {
        this.hiddenSpinner();
        this.openParametersDialog(response);
      },
      () => {
        this.hiddenSpinner();
        this.toastr.error(
          this.transloco.translate('error_loading_parameters', {}, 'index'),
          this.transloco.translate('error', {}, 'index')
        );
      }
    );
  }

  getConsumption(experiment: Experiment) {
    this.showSpinner();
    this.paramsConsumption.countGeocoding = experiment.countGeocoding
      ? experiment.countGeocoding
      : 0;
    this.paramsConsumption.countReroute = experiment.countReroute
      ? experiment.countReroute
      : 0;
    this.openConsumptionDialog('');
    this.hiddenSpinner();
  }
  openParametersDialog(dynamicParameters: DynamicParameter[]) {
    const focusedElement = document.activeElement as HTMLElement;
    if (focusedElement) {
      focusedElement.blur();
    }

    const dialogRef = this.ngbModal.open(ParametersDialogComponent, {
      centered: true,
      animation: true,
      size: 'lg',
    });
    dialogRef.componentInstance.dynamicParameters = dynamicParameters;
    dialogRef.result.catch(() => {});
  }

  openConsumptionDialog(size: string) {
    const focusedElement = document.activeElement as HTMLElement;
    if (focusedElement) {
      focusedElement.blur();
    }

    const dialogRef = this.ngbModal.open(ConsumptionDialogComponent, {
      centered: true,
      animation: true,
      size: size,
    });
    dialogRef.componentInstance.paramsConsumption = this.paramsConsumption;
    dialogRef.result.catch(() => {});
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
      this.transloco.translate('retry_experiment', {}, 'index'),
      this.transloco.translate('retry_experiment_confirmation', {}, 'index'),
      this.transloco.translate('retry_experiment_message', {}, 'index')
    );
    dialogRef.result.then((confirmed: boolean) => {
      if (confirmed) {
        this.spinner.show();
        this.experimentService
          .rerunExperiment(experiment.runId)
          .subscribe((response) => {
            this.spinner.hide();
            this.toastr.success(
              response.message,
              this.transloco.translate('rerun_experiment', {}, 'index')
            );
          });
      }
    });
  }
  tryToRerunExperiment(experiment: Experiment) {
    const dialogRef = this.openConfirmDialog(
      this.transloco.translate('rerun_experiment_try', {}, 'index'),
      this.transloco.translate('rerun_experiment_confirmation', {}, 'index'),
      this.transloco.translate('rerun_experiment_message', {}, 'index')
    );
    dialogRef.result.then((confirmed: boolean) => {
      if (confirmed) {
        this.spinner.show();
        this.experimentService
          .replicateExperiment(experiment.runId)
          .subscribe((response) => {
            this.spinner.hide();
            this.toastr.success(
              this.transloco.translate(
                'success_to_replicate_experiment',
                {},
                'index'
              ),
              this.transloco.translate('replicate_experiment', {}, 'index')
            );
            this.router.navigate(['/users/run', response.runId]);
          });
      }
    });
  }

  cancelExperiment(experiment: Experiment) {
    const dialogRef = this.openConfirmDialog(
      this.transloco.translate('cancel_experiment', {}, 'index'),
      this.transloco.translate('cancel_experiment_confirmation', {}, 'index'),
      this.transloco.translate('cancel_experiment_message', {}, 'index')
    );
    dialogRef.result.then((confirmed: boolean) => {
      if (confirmed) {
        this.spinner.show();
        this.experimentService
          .cancelExperiment(experiment.runId)
          .subscribe((response) => {
            this.spinner.hide();
            this.toastr.info(
              response.message,
              this.transloco.translate('cancel_experiment', {}, 'index')
            );
          });
      }
    });
  }

  selectExperiment(experiment: Experiment) {
    this.spinner.show();
    this.logger.log('select experiment', experiment);
    if (experiment.status === 'Initializing') {
      this.userService.getUserId().subscribe((userId) => {
        this.spinner.hide();
        this.logger.log('compare user id', userId, experiment.triggeredBy);
        if (userId === experiment.triggeredBy) {
          this.router.navigate(['/users/run', experiment.runId]);
          this.toastr.info(
            this.transloco.translate('opening_experiment', {}, 'index'),
            experiment.name
          );
        } else {
          this.openConfirmDialog(
            this.transloco.translate('cannot_open_experiment', {}, 'index'),
            this.transloco.translate(
              'cannot_open_experiment_not_creator',
              {},
              'index'
            ),
            '',
            this.transloco.translate('acknowledge', {}, 'index')
          );
          this.toastr.warning(
            this.transloco.translate('cannot_open_experiment', {}, 'index'),
            this.transloco.translate(
              'cannot_open_experiment_not_creator',
              {},
              'index'
            )
          );
        }
      });
    } else if (experiment.status === 'Succeeded') {
      this.router.navigate(['/users/result', experiment.runId]);
    } else {
      this.toastr.warning(
        this.transloco.translate('cannot_open_experiment', {}, 'index'),
        this.transloco.translate(
          'cannot_open_experiment_not_succeeded',
          {},
          'index'
        )
      );
      this.openConfirmDialog(
        this.transloco.translate('cannot_open_experiment', {}, 'index'),
        this.transloco.translate(
          'cannot_open_experiment_not_succeeded',
          {},
          'index'
        ),
        '',
        this.transloco.translate('acknowledge', {}, 'index')
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
      fullScreen: true,
    });
  }

  hiddenSpinner() {
    this.spinner.hide('experiment');
  }

  loadDisplayedColumns(): void {
    const savedColumns = localStorage.getItem(this.columnsStorageKey);
    if (savedColumns) {
      const visibleDefs: string[] = JSON.parse(savedColumns);
      this.displayedColumns.forEach((col) => {
        col.visible = visibleDefs.includes(col.def);
      });
    }
  }

  saveDisplayedColumns(): void {
    const visibleDefs = this.displayedColumns
      .filter((c) => c.visible)
      .map((c) => c.def);
    localStorage.setItem(this.columnsStorageKey, JSON.stringify(visibleDefs));
  }
}
