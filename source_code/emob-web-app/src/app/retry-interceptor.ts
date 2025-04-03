import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { retryWhen, delay, take, catchError, tap } from 'rxjs/operators';

@Injectable()
export class RetryInterceptor implements HttpInterceptor {
  private readonly retryCount = 3;
  private readonly retryDelay = 1000; // 1 second delay between retries

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(request).pipe(
      catchError(error => {
        if (error.status >= 500) { // Retry only on server errors
          return throwError(error);
        }
        return throwError(error);
      }),
      retryWhen(errors => errors.pipe(
        tap(error => console.log(`Retrying request due to: ${error.message}`)),
        delay(this.retryDelay),
        take(this.retryCount)
      ))
    );
  }
}
