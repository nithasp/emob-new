import { ApolloServer, ApolloServerPlugin } from '@apollo/server';
import { ApolloServerPluginLandingPageDisabled } from '@apollo/server/plugin/disabled';
import { expressMiddleware } from '@as-integrations/express5';
import { RequestHandler } from 'express';
import { graphqlUploadExpress } from 'graphql-upload-ts';
import { config } from '../config';
import { logger } from '../logger';
import { auditService } from '../services';
import { AuditAction } from '../types/auditLog.types';
import { GraphQLContext } from '../types/graphql.types';
import { requestSource } from '../utils/request';
import { buildContext } from './context';
import { depthLimit } from './depthLimit';
import { formatError } from './errors';
import { resolvers } from './resolvers';
import { typeDefs } from './typeDefs';

export { GRAPHQL_PATH } from './path';

const MAX_QUERY_DEPTH = 8;

const MUTATION_ACTIONS: Array<[prefix: string, action: AuditAction]> = [
  ['create', 'CREATE'],
  ['delete', 'DELETE'],
  ['softDelete', 'DELETE'],
];

// Every mutation leaves one audit row naming the operation and whether it went through; the
// variables are left out, they can hold whole files
const auditMutations: ApolloServerPlugin<GraphQLContext> = {
  async requestDidStart() {
    return {
      async willSendResponse({ operation, contextValue, errors }) {
        if (operation?.operation !== 'mutation') return;
        const field = operation.selectionSet.selections.find((selection) => selection.kind === 'Field');
        const name = field && 'name' in field ? field.name.value : 'unknown';

        auditService.recordEvent({
          ...requestSource(contextValue.req),
          userId: contextValue.user.id,
          username: contextValue.user.username,
          userRole: contextValue.user.role,
          action: MUTATION_ACTIONS.find(([prefix]) => name.startsWith(prefix))?.[1] ?? 'UPDATE',
          event: `graphql.${name}`.slice(0, 60),
          statusCode: errors?.length ? 400 : 200,
        });
      },
    };
  },
};

const apollo = new ApolloServer<GraphQLContext>({
  typeDefs,
  resolvers,
  formatError,
  introspection: config.graphql.introspection,
  validationRules: [depthLimit(MAX_QUERY_DEPTH)],
  includeStacktraceInErrorResponses: false,
  plugins: [ApolloServerPluginLandingPageDisabled(), auditMutations],
  logger: {
    debug: (message) => logger.debug(message),
    info: (message) => logger.info(message),
    warn: (message) => logger.warn(message),
    error: (message) => logger.error(message),
  },
});

// The app is assembled synchronously (the tests import it), so the server starts in the
// background and the first requests wait for it
apollo.startInBackgroundHandlingStartupErrorsByLoggingAndFailingAllRequests();

export const graphqlServer = apollo;

// Parses the GraphQL multipart request the web app sends for uploads; file count and size are
// bounded before a resolver ever sees the stream (OWASP API4)
export const graphqlUploads: RequestHandler = graphqlUploadExpress({
  maxFileSize: config.upload.maxFileSizeBytes,
  maxFiles: config.upload.maxFiles,
  overrideSendResponse: false,
});

export const graphqlHandler: RequestHandler = expressMiddleware(apollo, {
  context: async ({ req }) => buildContext(req),
});
