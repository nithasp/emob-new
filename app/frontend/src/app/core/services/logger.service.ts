/* eslint-disable no-console --
 * This service is the single sanctioned path to the console. Everywhere else
 * the `no-console` rule is an error; here the calls are deliberate and guarded.
 */
import { Injectable } from '@angular/core';
import { environment } from '@env/environment';

/**
 * Logging is on in development only. The nprod (test) and prod environments
 * set `enableLogging: false`, so every method below becomes a no-op there.
 * The flag is separate from `production` because nprod is a non-production
 * build that must still stay silent.
 */
const isLoggingEnabled = (): boolean => environment.enableLogging;

/**
 * Plain-function variants for call sites that have no injector available
 * (bootstrap code, module factories, standalone validator functions).
 * They share the exact same guard as the service methods.
 */
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
