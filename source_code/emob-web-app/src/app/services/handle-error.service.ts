import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import { NgxSpinnerService } from "ngx-spinner";

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlingService {
  constructor(private toastr: ToastrService, private spinner: NgxSpinnerService) {}

  handleError = catchError((error: any): Observable<any> => {
    console.error('Error occurred:', error.message);
    this.toastr.error(error.message, 'Error');
    this.spinner.hide();
    return throwError(() => new Error(error.message));
  });
}
