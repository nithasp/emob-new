import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgxSpinnerService } from 'ngx-spinner';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { take } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { TranslocoService } from '@jsverse/transloco';
import { ConfigurationService } from '@features/configurations/services/configuration.service';
import { DialogConfirmationComponent } from '@shared/components/dialogs/dialog-confirmation/dialog-confirmation.component';
import { LoggerService } from '@core/services/logger.service';
import { ExperimentService } from '../services/experiment.service';
import { Experiment, DownloadResultFile } from '../models/experiment.model';
import { ResultPlanService } from './services/result-plan.service';
import { ResultMapService } from './services/result-map.service';
import { RESULT_PAGE_PROVIDERS } from './services/result-page.providers';

@Component({
  selector: 'app-result',
  templateUrl: './result.component.html',
  styleUrl: './result.component.scss',
  providers: [...RESULT_PAGE_PROVIDERS],
})
export class ResultComponent implements OnInit {
  private readonly logger = inject(LoggerService);

  constructor(
    private readonly spinner: NgxSpinnerService,
    private readonly ngbModal: NgbModal,
    private readonly route: ActivatedRoute,
    private readonly experimentService: ExperimentService,
    private readonly configurationService: ConfigurationService,
    private readonly toastr: ToastrService,
    private readonly router: Router,
    private readonly transloco: TranslocoService,
    private readonly plan: ResultPlanService,
    private readonly resultMap: ResultMapService,
  ) {
    this.spinner.show();
  }

  ngOnInit(): void {
    this.route.params
      .pipe(take(1))
      .subscribe((params: { [x: string]: string }) => {
        this.experimentService
          .getExperiment(params['experimentId'])
          .subscribe(async (response: Experiment) => {
            this.logger.log(response);
            this.plan.experiment = { ...response };

            try {
              await this.plan.loadPlanData(response);

              this.plan.initRoutingNodes();
              this.plan.buildVrpStatsReport();
              this.plan.buildRouteInfoFromVrpSolution();
              this.resultMap.loadAndProcessGeoJSON();

              this.plan.planLoaded$.next();
            } catch (error) {
              this.logger.error('Failed to load plan data from API:', error);
              this.toastr.error(
                this.transloco.translate('failed_to_load_plan_data', {}, 'index'),
                this.transloco.translate('error', {}, 'index')
              );
            } finally {
              this.spinner.hide();
              this.plan.isLoading = false;
            }
          });
      });
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
    const dialogRef = this.ngbModal.open(DialogConfirmationComponent, {
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

  tryToRerunExperiment() {
    const dialogRef = this.openConfirmDialog(
      this.transloco.translate('rerun_experiment_try', {}, 'index'),
      this.transloco.translate('retry_experiment_confirmation', {}, 'index'),
      this.transloco.translate('retry_experiment_message', {}, 'index')
    );

    dialogRef.result.then((confirmed: boolean) => {
      if (confirmed) {
        this.spinner.show();
        this.experimentService
          .replicateExperiment(this.plan.experiment!.runId)
          .subscribe({
            next: (response) => {
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
            },
            error: (err) => {
              this.logger.error('Failed to replicate experiment', err);
              this.spinner.hide();
              this.toastr.error(
                this.transloco.translate(
                  'failed_to_replicate_experiment',
                  {},
                  'index'
                ),
                this.transloco.translate('replicate_experiment', {}, 'index')
              );
            },
          });
      }
    });
  }

  downloadPlan() {
    this.spinner.show();
    this.experimentService
      .getExperimentResultUrl(this.plan.experiment!.runId)
      .subscribe({
        next: (response: DownloadResultFile) => {
          this.configurationService
            .downloadFile(response.fileUrl.resultFileBlobPathUrl)
            .subscribe({
              next: (resp) => {
                const contentDisposition = resp.headers.get(
                  'Content-Disposition'
                );
                let fileName = 'downloadedFile';
                if (contentDisposition) {
                  const m = /filename="([^"]*)"/.exec(contentDisposition);
                  if (m) fileName = m[1];
                }
                const blob = resp.body;
                if (blob) {
                  const link = document.createElement('a');
                  link.href = window.URL.createObjectURL(blob);
                  link.download = fileName;
                  link.click();
                  window.URL.revokeObjectURL(link.href);
                  this.toastr.success(
                    this.transloco.translate(
                      'success_to_download_plan',
                      {},
                      'index'
                    ),
                    this.transloco.translate('download_plan', {}, 'index')
                  );
                }
                this.spinner.hide();
              },
              error: (err) => {
                this.logger.error('Download failed', err);
                this.spinner.hide();
                this.toastr.error(
                  this.transloco.translate(
                    'failed_to_download_plan',
                    {},
                    'index'
                  ),
                  this.transloco.translate('download_plan', {}, 'index')
                );
              },
            });
        },
        error: (err) => {
          this.logger.error('Could not get download URL', err);
          this.spinner.hide();
          this.toastr.error(
            this.transloco.translate('failed_to_get_download_url', {}, 'index'),
            this.transloco.translate('download_plan', {}, 'index')
          );
        },
      });
  }
}
