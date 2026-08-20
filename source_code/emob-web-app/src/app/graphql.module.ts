import { inject, NgModule } from '@angular/core';
import { ApolloLink, InMemoryCache } from '@apollo/client/core';
import { onError } from "@apollo/client/link/error";
import { ApolloModule, APOLLO_OPTIONS, provideApollo, Apollo } from 'apollo-angular';
import { HttpLink } from 'apollo-angular/http';
import { removeTypenameFromVariables } from '@apollo/client/link/remove-typename';
import extractFiles from 'extract-files/extractFiles.mjs';
import isExtractableFile from 'extract-files/isExtractableFile.mjs';
import { createUploadLink } from 'apollo-upload-client';

import { loadErrorMessages, loadDevMessages } from "@apollo/client/dev";
import { environment } from 'src/environments/environment';
import { HttpHeaders, provideHttpClient, withFetch, withInterceptorsFromDi } from '@angular/common/http';
import { MsalService } from '@azure/msal-angular';
import { Error } from './models/graphql.model';
import { logError, logMessage } from 'src/app/services/logger.service';

if (!environment.production) {
  // Adds messages only in a dev environment
  loadDevMessages();
  loadErrorMessages();
}

@NgModule({
  imports: [],
  providers: [
    provideHttpClient(withInterceptorsFromDi(), withFetch()),
    { provide: Apollo, useClass: Apollo },
    {
      provide: APOLLO_OPTIONS,
      useFactory: () => {
        const httpLink = inject(HttpLink);
        const httpsUrl = httpLink.create({ 
          uri: environment.graphqlConfig.uri,
          extractFiles: (body: Record<string, any>) => extractFiles(body, isExtractableFile),
          headers: new HttpHeaders({
            'Apollo-Require-Preflight': 'true'
          })

        
        });
        const errorLink = onError(({ graphQLErrors, networkError, response  }) => {
          if (graphQLErrors)
            graphQLErrors.map(({ message, locations, path }) => {
              logMessage(
                `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
              );
              logError("error", message);
            });
          if (networkError) logMessage(`[Network error]: ${networkError}`);
          if (response) {
            logError('Internal Server Error:', response);
            response.errors?.forEach((error) => {
              if (error.message) {
                logError('Internal Server Error:', error.message);
              }
            });
          }
        
        });
        const removeTypenameLink = removeTypenameFromVariables();
        const uploadLink = createUploadLink({
          uri: environment.graphqlConfig.uri,
          extractFiles: (body: Record<string, any>) => extractFiles(body, isExtractableFile),
          headers: {
            'Apollo-Require-Preflight': 'true'
          }
        
        });
        const authLink = httpsUrl.concat(uploadLink)
   
        return {
          link: ApolloLink.from([
            authLink,
            removeTypenameLink,
            errorLink
          ]),
          cache: new InMemoryCache({
            addTypename: false,
            typePolicies : {
              User : {
                keyFields: false
      
              },
            },
          }),
          defaultOptions: {
            watchQuery: {
              errorPolicy: 'none',
            },
            query: {
              errorPolicy: 'none',
            },
            mutate: {
              errorPolicy: 'none',
            },
          },
        };
     },
      deps: [HttpLink],

    }
  ],
})
export class GraphQLModule {}
