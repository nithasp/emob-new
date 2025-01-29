import { NgModule } from '@angular/core';
import { ApolloLink, InMemoryCache } from '@apollo/client/core';
import { onError } from "@apollo/client/link/error";
import { ApolloModule, APOLLO_OPTIONS } from 'apollo-angular';
import { HttpLink } from 'apollo-angular/http';
import { removeTypenameFromVariables } from '@apollo/client/link/remove-typename';
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

export function createApollo(httpLink: HttpLink) {
  return {
    link: ApolloLink.from([removeTypenameLink,errorLink,httpLink.create({ uri })]),
    cache: new InMemoryCache({
      typePolicies : {
        User : {
          keyFields: false
        }
      },
    })
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
