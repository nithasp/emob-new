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


const isIE = window.navigator.userAgent.indexOf("MSIE ") > -1 || window.navigator.userAgent.indexOf("Trident/") > -1;
/**
 * Configuration object to be passed to MSAL instance on creation.
 * For a full list of MSAL.js configuration parameters, visit:
 * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/configuration.md
 */
export const msalConfig: Configuration = {
  auth: {
    clientId: '6fcc6a58-25f8-4a0e-be6c-6e4b34243951', // This is the ONLY mandatory field that you need to supply.
    authority: 'https://testbanpu.ciamlogin.com/', // Replace the placeholder with your tenant subdomain
    knownAuthorities: ['testbanpu.ciamlogin.com'],
    redirectUri: '/', // Points to window.location.origin by default. You must register this URI on Microsoft Entra admin center/App Registration.
    postLogoutRedirectUri: /* The `'/',` in the `postLogoutRedirectUri` field is specifying the URI
    where the user should be redirected after logging out. In this case,
    `'/'` represents the root path of the application, so after logging out,
    the user will be redirected to the root path of the application. */
    '/', // Points to window.location.origin by default.
  },
  cache: {
    cacheLocation: BrowserCacheLocation.LocalStorage, // Configures cache location. "sessionStorage" is more secure, but "localStorage" gives you SSO between tabs.
    storeAuthStateInCookie: isIE, // Set this to "true" if you are having issues on IE11 or Edge. Remove this line to use Angular Universal
    cacheMigrationEnabled: true,
    claimsBasedCachingEnabled:true,
    temporaryCacheLocation: BrowserCacheLocation.SessionStorage
  },
  system: {
    loggerOptions: {
      loggerCallback(logLevel: LogLevel, message: string) {
        console.log(message);
      },
      logLevel: LogLevel.Verbose,
      piiLoggingEnabled: false,
    },
  },
};



/**
 * Scopes you add here will be prompted for user consent during sign-in.
 * By default, MSAL.js will add OIDC scopes (openid, profile, email) to any login request.
 * For more information about OIDC scopes, visit:
 * https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-permissions-and-consent#openid-connect-scopes
 */
export const loginRequest = {
  scopes: [],
};
export const roles = {
  AdminRole: "Admin",
  UserRole: "BRS"
}