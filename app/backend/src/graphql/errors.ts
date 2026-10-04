import { unwrapResolverError } from '@apollo/server/errors';
import { GraphQLError, GraphQLFormattedError } from 'graphql';
import { logger } from '../logger';
import { fromPostgres } from '../middleware/error';
import { PostgresError } from '../types/database.types';
import { ErrorCode } from '../types/error.types';
import { AppError } from '../utils/errors';

const CODES: Partial<Record<ErrorCode, string>> = {
  not_found: 'NOT_FOUND',
  forbidden: 'FORBIDDEN',
  conflict: 'CONFLICT',
  invalid_request: 'BAD_USER_INPUT',
  bad_request: 'BAD_USER_INPUT',
  payload_too_large: 'PAYLOAD_TOO_LARGE',
};

const extensions = (code: string, statusCode: number) => ({
  code,
  statusCode,
  timestamp: new Date().toISOString(),
});

// Parse, validation and variable errors are raised before any resolver runs and describe the
// request; Apollo wraps them around the error graphql-js reported. An error with a path came out
// of a resolver instead and is the server's to explain.
const isRequestError = (error: unknown): boolean =>
  error instanceof GraphQLError &&
  !error.path &&
  (!error.originalError || error.originalError instanceof GraphQLError);

// A rule the caller broke is reported with its own message. Anything else (a database failure, a
// bug) is logged here and answered with a generic message, so SQL, stack traces and internal
// paths never reach a client (OWASP API8)
export function formatError(formatted: GraphQLFormattedError, error: unknown): GraphQLFormattedError {
  const original = unwrapResolverError(error);

  if (original instanceof AppError) {
    return {
      ...formatted,
      message: original.message,
      extensions: extensions(CODES[original.code] ?? 'BAD_USER_INPUT', original.statusCode),
    };
  }

  const database = fromPostgres(original as PostgresError);
  if (database) {
    return {
      ...formatted,
      message: database.message,
      extensions: extensions(CODES[database.code] ?? 'BAD_USER_INPUT', database.statusCode),
    };
  }

  if (isRequestError(original)) {
    const code =
      typeof formatted.extensions?.['code'] === 'string' ? formatted.extensions['code'] : 'BAD_REQUEST';
    return {
      message: formatted.message,
      ...(formatted.locations ? { locations: formatted.locations } : {}),
      extensions: extensions(code, 400),
    };
  }

  logger.error({ err: original, path: formatted.path }, 'graphql request failed');
  return {
    message: 'Internal Server Error',
    ...(formatted.path ? { path: formatted.path } : {}),
    extensions: extensions('INTERNAL_SERVER_ERROR', 500),
  };
}
