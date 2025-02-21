import { NgModule } from '@angular/core';
import { ApolloLink, InMemoryCache } from '@apollo/client/core';
import { onError } from "@apollo/client/link/error";
import { ApolloModule, APOLLO_OPTIONS } from 'apollo-angular';
import { HttpLink } from 'apollo-angular/http';
import { removeTypenameFromVariables } from '@apollo/client/link/remove-typename';
import extractFiles from 'extract-files/extractFiles.mjs';
import isExtractableFile from 'extract-files/isExtractableFile.mjs';
import { createUploadLink } from 'apollo-upload-client';


const uri = '/api/v1/graphql'; // Replace with your GraphQL endpoint

const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors)
    graphQLErrors.map(({ message, locations, path }) => {
      console.log(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
      );
      console.error("error", message);
    });
  if (networkError) console.log(`[Network error]: ${networkError}`);
});
const removeTypenameLink = removeTypenameFromVariables();
const uploadLink = createUploadLink({
  uri,
  extractFiles: (body: Record<string, any>) => extractFiles(body, isExtractableFile),
});
  

export function createApollo(httpLink: HttpLink) {
  return {
    link: ApolloLink.from([removeTypenameLink,errorLink,uploadLink,httpLink.create({ uri })]),
    cache: new InMemoryCache({
      typePolicies : {
        User : {
          keyFields: false

        },
      },
    }),
    defaultOptions: {
      watchQuery: {
        errorPolicy: 'all',
      },
      query: {
        errorPolicy: 'all',
      },
      mutate: {
        errorPolicy: 'all',
      },
    },
  };
}

@NgModule({
  imports: [ApolloModule],
  providers: [
    {
      provide: APOLLO_OPTIONS,
      useFactory: createApollo,
      deps: [HttpLink],

    },
  ],
})
export class GraphQLModule {}
