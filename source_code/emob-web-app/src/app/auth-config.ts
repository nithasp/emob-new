/**
 * This file contains authentication parameters. Contents of this file
 * is roughly the same across other MSAL.js libraries. These parameters
 * are used to initialize Angular and MSAL Angular configurations in
 * in app.module.ts file.
 */

import {
  LogLevel,
  Configuration,
  BrowserCacheLocation,
} from '@azure/msal-browser';
import { environment } from 'src/environments/environment';


const isIE = window.navigator.userAgent.indexOf("MSIE ") > -1 || window.navigator.userAgent.indexOf("Trident/") > -1;
export const msalConfig: Configuration = {
  auth: {
    clientId: environment.msalConfig.auth.clientId, // This is the ONLY mandatory field that you need to supply.
    authority: environment.msalConfig.auth.authority,
    knownAuthorities: environment.msalConfig.auth.knownAuthorities,
    redirectUri: '/',
    postLogoutRedirectUri: '/',
  },
  cache: {

    cacheLocation: BrowserCacheLocation.SessionStorage, // Configures cache location. "sessionStorage" is more secure, but "localStorage" gives you SSO between tabs.
    storeAuthStateInCookie: isIE, // Set this to "true" if you are having issues on IE11 or Edge. Remove this line to use Angular Universal
    cacheMigrationEnabled: true,
    claimsBasedCachingEnabled:true,
    temporaryCacheLocation: BrowserCacheLocation.SessionStorage
  },
  system: {
    loggerOptions: {
      loggerCallback(logLevel: LogLevel, message: string) {
        console.log(logLevel,message);
      },
      logLevel: LogLevel.Warning,
      piiLoggingEnabled: true,
    },
  },
};