import { Injectable, ChangeDetectorRef } from '@angular/core';
import { NgxSpinnerService } from 'ngx-spinner';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { DialogConfirmationComponent } from '@shared/components/dialogs/dialog-confirmation/dialog-confirmation.component';
import { DialogDetailsComponent } from '@shared/components/dialogs/dialog-details/dialog-details.component';

@Injectable()
export class RunUiService {
  private view?: ChangeDetectorRef;

  constructor(
    private readonly spinner: NgxSpinnerService,
    private readonly ngbModal: NgbModal,
  ) {}

  attachView(view: ChangeDetectorRef): void {
    this.view = view;
  }

  // The page services change state the page template renders; they refresh it through the page's own view
  detectChanges(): void {
    this.view?.detectChanges();
  }

  showSpinner() {
    this.spinner.show('run', {
      type: 'ball-beat',
      size: 'medium',
      bdColor: 'rgba(255,255,255, .8)',
      color: 'black',
      fullScreen: true,
    });
  }

  hiddenSpinner() {
    this.spinner.hide('run');
  }

  openConfirmDialog(
    title: string,
    message: string,
    question: string,
    acceptButton: string = 'Confirm',
    disableCancelButton: boolean = true,
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

  showInvalidModal(title: string, message: string | string[]): void {
    const focusedElement = document.activeElement as HTMLElement;
    if (focusedElement) {
      focusedElement.blur();
    }
    const dialogRef = this.ngbModal.open(DialogDetailsComponent, {
      centered: true,
      animation: true,
      windowClass: 'custom-model',
    });
    dialogRef.componentInstance.message = message;
    dialogRef.componentInstance.title = title;
  }
}
