import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import { NgxSpinnerService } from "ngx-spinner";
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ErrorDialogComponent } from '../index/components/error-dialog/error-dialog.component';

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlingService {
  constructor(private toastr: ToastrService, private spinner: NgxSpinnerService, private ngbModal: NgbModal,) {}

  handleError = catchError((error: any): Observable<any> => {
    console.error('Error occurred:', error.message);
    this.toastr.error(error.message, 'Error');
    this.showInvalidModal('Error', error.message);
    this.spinner.hide();
    
    return throwError(() => new Error(error.message));
  });

  showInvalidModal(title: string = '', message: string | string[] = ''): void {
      const focusedElement = document.activeElement as HTMLElement;
      if (focusedElement) {
        focusedElement.blur();
      }
      const dialogRef = this.ngbModal.open(ErrorDialogComponent, {
        centered: true,
        animation: true,
        windowClass: 'custom-model',
      });
      dialogRef.componentInstance.title = title;
      dialogRef.componentInstance.message = message;
    }
}
