import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

dotenv.config({ quiet: true });

const MIN_SECRET_LENGTH = 32;
const DAY_MS = 24 * 60 * 60 * 1000;
const MB = 1024 * 1024;

const secret = z.string().min(MIN_SECRET_LENGTH, `must be at least ${MIN_SECRET_LENGTH} characters`);

const flag = (fallback: boolean) =>
  z
    .enum(['true', 'false', '1', '0'])
    .optional()
    .transform((value) => (value === undefined ? fallback : value === 'true' || value === '1'));

// A value copied over from .env.example unchanged is treated as missing, so a placeholder key can
// never be sent to the storage provider as if it were real
const isPlaceholder = (value: string | undefined): boolean => !value || /^(your[_-]|<|changeme)/i.test(value);

const envSchema = z
  .object({
    ENV: z.enum(['dev', 'test', 'production']).default('dev'),
    NODE_ENV: z.string().optional(),
    PORT: z.coerce.number().int().positive().default(4000),
    ALLOWED_ORIGIN: z.string().default('http://localhost:4200'),
    PUBLIC_BASE_URL: z.string().optional(),
    JSON_BODY_LIMIT: z.string().default('1mb'),
    TRUST_PROXY: z.coerce.number().int().min(0).default(1),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).optional(),

    API_RATE_LIMIT: z.coerce.number().int().positive().default(1000),
    AUTH_RATE_LIMIT: z.coerce.number().int().positive().default(30),

    TOKEN_SECRET: secret,
    ACCESS_TOKEN_EXPIRY: z.string().default('15m'),
    REFRESH_TOKEN_EXPIRY_DAYS: z.coerce.number().int().positive().max(365).default(7),
    REFRESH_COOKIE_SAMESITE: z.enum(['strict', 'lax', 'none']).optional(),

    PASSWORD_PEPPER: secret,
    SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(10),

    AUDIT_LOG_RETENTION_DAYS: z.coerce.number().int().positive().default(90),

    DATABASE_URL: z.string().optional(),
    POSTGRES_HOST: z.string().default('127.0.0.1'),
    POSTGRES_PORT: z.coerce.number().int().positive().default(5433),
    POSTGRES_DB: z.string().default('emob_dev'),
    POSTGRES_TEST_DB: z.string().default('emob_test'),
    POSTGRES_USER: z.string().optional(),
    POSTGRES_PASSWORD: z.string().optional(),
    DATABASE_SSL: z.enum(['off', 'no-verify', 'verify']).optional(),
    DATABASE_SSL_CA: z.string().optional(),

    STORAGE_DRIVER: z.enum(['local', 'r2']).default('local'),
    STORAGE_LOCAL_DIR: z.string().default('storage'),
    R2_ACCOUNT_ID: z.string().optional(),
    R2_ACCESS_KEY_ID: z.string().optional(),
    R2_SECRET_ACCESS_KEY: z.string().optional(),
    R2_BUCKET: z.string().optional(),
    R2_ENDPOINT: z.string().optional(),

    UPLOAD_MAX_FILE_SIZE_MB: z.coerce.number().positive().max(200).default(20),
    UPLOAD_MAX_FILES: z.coerce.number().int().positive().max(50).default(10),

    GRAPHQL_INTROSPECTION: flag(true),
    ALTAIR_ENABLED: flag(true),

    DEMO_LOGIN_ENABLED: flag(true),
    DEMO_USERNAME: z.string().default('demo'),
    DEMO_PASSWORD: z.string().optional(),
    DEMO_COMPANY_NAME: z.string().default('BANPU NEXT'),

    ADMIN_USERNAME: z.string().default('admin'),
    ADMIN_PASSWORD: z.string().optional(),

    SOLVER_QUEUE_DELAY_MS: z.coerce.number().int().min(0).default(4000),
    SOLVER_RUN_DELAY_MS: z.coerce.number().int().min(0).default(8000),
    OSRM_URL: z.string().optional(),
  })
  .refine((env) => env.DATABASE_URL || (env.POSTGRES_USER && env.POSTGRES_PASSWORD), {
    error: 'set DATABASE_URL, or POSTGRES_USER and POSTGRES_PASSWORD',
    path: ['DATABASE_URL'],
  })
  // A browser drops a SameSite=None cookie that is not also Secure, which would leave production
  // with no refresh cookie at all (OWASP API2)
  .refine((env) => env.REFRESH_COOKIE_SAMESITE !== 'none' || env.ENV === 'production', {
    error: "'none' needs the Secure flag, which is only set when ENV=production",
    path: ['REFRESH_COOKIE_SAMESITE'],
  })
  .refine(
    (env) =>
      env.STORAGE_DRIVER !== 'r2' ||
      ![env.R2_ACCOUNT_ID, env.R2_ACCESS_KEY_ID, env.R2_SECRET_ACCESS_KEY, env.R2_BUCKET].some(isPlaceholder),
    {
      error: 'STORAGE_DRIVER=r2 needs R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET',
      path: ['STORAGE_DRIVER'],
    },
  );

// An unset or unusable value stops the process here rather than falling back to a default that
// would weaken authentication or the database connection (OWASP API8)
function readEnv(): z.infer<typeof envSchema> {
  const present = Object.fromEntries(
    Object.entries(process.env).filter(([, value]) => value !== undefined && value !== ''),
  );

  const parsed = envSchema.safeParse(present);
  if (!parsed.success) {
    const problems = parsed.error.issues.map(
      (issue) => `  ${issue.path.join('.') || 'env'}: ${issue.message}`,
    );
    throw new Error(`[config] The environment is not usable:\n${problems.join('\n')}`);
  }
  return parsed.data;
}

const env = readEnv();

const sslMode = env.DATABASE_SSL ?? (env.DATABASE_URL ? 'verify' : 'off');

// The frontend and the API are served from different sites in production, so a Strict cookie is
// never attached to the refresh call and the session cannot be renewed; None keeps it cross-site
// while Secure and the /auth path stop it travelling anywhere else (OWASP API2)
const refreshCookieSameSite = env.REFRESH_COOKIE_SAMESITE ?? (env.ENV === 'production' ? 'none' : 'strict');

export const config = {
  env: env.ENV,
  isProduction: env.ENV === 'production',
  isTest: env.ENV === 'test',
  port: env.PORT,
  allowedOrigins: env.ALLOWED_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  publicBaseUrl: (env.PUBLIC_BASE_URL ?? '').replace(/\/+$/, ''),
  jsonBodyLimit: env.JSON_BODY_LIMIT,
  trustProxy: env.TRUST_PROXY,
  logLevel: env.LOG_LEVEL ?? (env.ENV === 'test' ? 'silent' : 'info'),
  prettyLogs: env.ENV === 'dev' && env.NODE_ENV !== 'production',

  apiRateLimit: env.API_RATE_LIMIT,
  authRateLimit: env.AUTH_RATE_LIMIT,

  tokenSecret: env.TOKEN_SECRET,
  accessTokenExpiry: env.ACCESS_TOKEN_EXPIRY,
  refreshTokenExpiryMs: env.REFRESH_TOKEN_EXPIRY_DAYS * DAY_MS,

  passwordPepper: env.PASSWORD_PEPPER,
  saltRounds: env.SALT_ROUNDS,

  auditLogRetentionDays: env.AUDIT_LOG_RETENTION_DAYS,

  database: {
    url: env.DATABASE_URL,
    host: env.POSTGRES_HOST,
    port: env.POSTGRES_PORT,
    name: env.ENV === 'test' ? env.POSTGRES_TEST_DB : env.POSTGRES_DB,
    user: env.POSTGRES_USER,
    password: env.POSTGRES_PASSWORD,
    sslMode,
    sslCa: env.DATABASE_SSL_CA,
  },

  // The browser keeps the refresh token in a cookie JavaScript cannot read, so an XSS bug in the
  // frontend cannot steal a session; it is sent only to the auth routes (OWASP API2)
  refreshCookie: {
    name: 'refreshToken',
    path: '/api/v1/auth',
    sameSite: refreshCookieSameSite,
    httpOnly: true,
    secure: env.ENV === 'production',
    maxAgeMs: env.REFRESH_TOKEN_EXPIRY_DAYS * DAY_MS,
  },

  storage: {
    driver: env.ENV === 'test' ? ('local' as const) : env.STORAGE_DRIVER,
    localDir: path.resolve(
      env.ENV === 'test' ? path.join(env.STORAGE_LOCAL_DIR, 'test') : env.STORAGE_LOCAL_DIR,
    ),
    r2: {
      accountId: env.R2_ACCOUNT_ID,
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      bucket: env.R2_BUCKET,
      endpoint: env.R2_ENDPOINT,
    },
  },

  upload: {
    maxFileSizeBytes: Math.floor(env.UPLOAD_MAX_FILE_SIZE_MB * MB),
    maxFiles: env.UPLOAD_MAX_FILES,
  },

  graphql: {
    introspection: env.GRAPHQL_INTROSPECTION,
    altairEnabled: env.ALTAIR_ENABLED,
  },

  demo: {
    loginEnabled: env.DEMO_LOGIN_ENABLED,
    username: env.DEMO_USERNAME,
    password: env.DEMO_PASSWORD,
    companyName: env.DEMO_COMPANY_NAME,
  },

  adminSeed: {
    username: env.ADMIN_USERNAME,
    password: env.ADMIN_PASSWORD,
  },

  solver: {
    queueDelayMs: env.ENV === 'test' ? 0 : env.SOLVER_QUEUE_DELAY_MS,
    runDelayMs: env.ENV === 'test' ? 0 : env.SOLVER_RUN_DELAY_MS,
    osrmUrl: (env.OSRM_URL ?? '').replace(/\/+$/, ''),
  },
};
