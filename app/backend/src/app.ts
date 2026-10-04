import { randomUUID } from 'crypto';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Request, Response } from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { config } from './config';
import { checkDatabase } from './database';
import { logger } from './logger';
import { recordActivity } from './middleware/audit';
import { errorMiddleware, notFoundMiddleware } from './middleware/error';
import { apiLimiter } from './middleware/rateLimit';
import apiRoutes from './routes';
import altairRoutes, { ALTAIR_PATH } from './routes/altair.routes';
import docsRoutes from './routes/docs.routes';

export const API_PREFIX = '/api/v1';
export const HEALTH_PATH = '/healthz';

const MAX_REQUEST_ID_LENGTH = 64;

const app = express();

app.set('trust proxy', config.trustProxy);

app.use(
  pinoHttp({
    logger,
    genReqId: (req, res) => {
      const forwarded = req.headers['x-request-id'];
      const id =
        typeof forwarded === 'string' && forwarded.length > 0 && forwarded.length <= MAX_REQUEST_ID_LENGTH
          ? forwarded
          : randomUUID();
      res.setHeader('X-Request-Id', id);
      return id;
    },
    customLogLevel: (_req, res, err) =>
      err || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
    autoLogging: {
      ignore: (req) => req.url === HEALTH_PATH || (req.url ?? '').startsWith(`${ALTAIR_PATH}/`),
    },
  }),
);

app.use(helmet());
// Content-Disposition is exposed so the web app can read the file name of a download when it is
// served from another origin
app.use(cors({ origin: config.allowedOrigins, credentials: true, exposedHeaders: ['Content-Disposition'] }));
// Bounded body size so a single request can't exhaust memory (OWASP API4); uploads go through the
// multipart parser, which has limits of its own
app.use(express.json({ limit: config.jsonBodyLimit }));
app.use(cookieParser());
app.set('etag', false);

app.get(HEALTH_PATH, async (_req: Request, res: Response) => {
  if (!(await checkDatabase())) {
    res.status(503).json({ status: 'unavailable' });
    return;
  }
  res.json({ status: 'ok' });
});

// Per-IP ceiling on every route (OWASP API4); the auth routes add a tighter one of their own
app.use(apiLimiter);

app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'E-Mobility API is running!',
    graphql: `${API_PREFIX}/graphql`,
    docs: '/docs',
    ...(config.graphql.altairEnabled ? { altair: `${ALTAIR_PATH}/` } : {}),
  });
});

app.use(docsRoutes);
if (config.graphql.altairEnabled) app.use(ALTAIR_PATH, altairRoutes);
app.use(API_PREFIX, recordActivity, apiRoutes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
