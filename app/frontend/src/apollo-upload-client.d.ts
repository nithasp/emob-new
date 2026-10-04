declare module 'apollo-upload-client' {
    import { ApolloLink } from '@apollo/client/core';
    import { HttpOptions } from 'apollo-link-http-common';
  
    export function createUploadLink(options: HttpOptions): ApolloLink;
  }
  