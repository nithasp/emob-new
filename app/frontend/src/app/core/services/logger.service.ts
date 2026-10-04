/* eslint-disable no-console */
import { Injectable } from '@angular/core';
import { environment } from '@env/environment';

const isLoggingEnabled = (): boolean => environment.enableLogging;

export function logMessage(...args: unknown[]): void {
  if (isLoggingEnabled()) {
    console.log(...args);
  }
}

export function logWarning(...args: unknown[]): void {
  if (isLoggingEnabled()) {
    console.warn(...args);
  }
}

export function logError(...args: unknown[]): void {
  if (isLoggingEnabled()) {
    console.error(...args);
  }
}

@Injectable({
  providedIn: 'root'
})
export class LoggerService {

  log(...args: unknown[]): void {
    logMessage(...args);
  }

  warn(...args: unknown[]): void {
    logWarning(...args);
  }

  error(...args: unknown[]): void {
    logError(...args);
  }
}
