import { Request } from 'express';
import { GraphQLError } from 'graphql';
import { GraphQLContext } from '../types/graphql.types';

// The endpoint sits behind the same authentication middleware as the REST routes, so a request
// reaches this point with its account already loaded; the check is a second line of defence
export function buildContext(req: Request): GraphQLContext {
  if (!req.currentUser) {
    throw new GraphQLError('Access denied. No token provided.', {
      extensions: { code: 'UNAUTHENTICATED', http: { status: 401 } },
    });
  }
  return { user: req.currentUser, req };
}
