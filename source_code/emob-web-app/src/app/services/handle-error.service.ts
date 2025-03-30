import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlingService {
  constructor(private toastr: ToastrService) {}

  handleError = catchError((error: any): Observable<any> => {
    console.error('Error occurred:', error.message);
    this.toastr.error(error.message, 'Error');
    return throwError(() => new Error(error.message));
  });
}
