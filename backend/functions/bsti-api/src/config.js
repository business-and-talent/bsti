const SERVICE_NAME = 'bsti-api';
const DEFAULT_RUNTIME_ENV = 'development';
const DEFAULT_API_VERSION = 'v1';
const DEFAULT_PORT = 9000;
const DEFAULT_DB_PORT = 3306;
const DEFAULT_DB_CONNECTION_LIMIT = 4;
const ALLOWED_RUNTIME_ENVS = new Set(['development', 'production']);

export class ConfigError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ConfigError';
    this.code = code;
  }
}

function readString(env, key, fallback) {
  const value = env[key];
  return value === undefined ? fallback : String(value).trim();
}

function parseRuntimeEnv(env) {
  const runtimeEnv = readString(env, 'BSTI_RUNTIME_ENV', DEFAULT_RUNTIME_ENV);
  if (!ALLOWED_RUNTIME_ENVS.has(runtimeEnv)) {
    throw new ConfigError('INVALID_RUNTIME_ENV', 'Unsupported runtime environment');
  }
  return runtimeEnv;
}

function parseSubmissionEnabled(env) {
  const value = readString(env, 'BSTI_SUBMISSION_ENABLED', 'false').toLowerCase();
  if (value !== 'true' && value !== 'false') {
    throw new ConfigError('INVALID_SUBMISSION_FLAG', 'Submission flag must be true or false');
  }
  return value === 'true';
}

function parseApiVersion(env) {
  const apiVersion = readString(env, 'BSTI_API_VERSION', DEFAULT_API_VERSION);
  if (apiVersion !== DEFAULT_API_VERSION) {
    throw new ConfigError('INVALID_API_VERSION', 'Unsupported API version');
  }
  return apiVersion;
}

function parseInteger(env, key, fallback, minimum, maximum, code, message) {
  const raw = readString(env, key, String(fallback));
  if (!/^\d+$/.test(raw)) {
    throw new ConfigError(code, message);
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new ConfigError(code, message);
  }
  return value;
}

function parsePort(env) {
  return parseInteger(
    env,
    'PORT',
    DEFAULT_PORT,
    1,
    65535,
    'INVALID_PORT',
    'Port must be an integer from 1 through 65535'
  );
}

function requiredDatabaseString(env, key, code) {
  const value = readString(env, key, '');
  if (!value) {
    throw new ConfigError(code, 'Required database configuration is missing');
  }
  return value;
}

function parseDatabase(env) {
  return Object.freeze({
    host: requiredDatabaseString(env, 'BSTI_DB_HOST', 'MISSING_DB_HOST'),
    port: parseInteger(
      env,
      'BSTI_DB_PORT',
      DEFAULT_DB_PORT,
      1,
      65535,
      'INVALID_DB_PORT',
      'Database port must be an integer from 1 through 65535'
    ),
    name: requiredDatabaseString(env, 'BSTI_DB_NAME', 'MISSING_DB_NAME'),
    user: requiredDatabaseString(env, 'BSTI_DB_USER', 'MISSING_DB_USER'),
    password: requiredDatabaseString(env, 'BSTI_DB_PASSWORD', 'MISSING_DB_PASSWORD'),
    connectionLimit: parseInteger(
      env,
      'BSTI_DB_CONNECTION_LIMIT',
      DEFAULT_DB_CONNECTION_LIMIT,
      1,
      20,
      'INVALID_DB_CONNECTION_LIMIT',
      'Database connection limit must be an integer from 1 through 20'
    )
  });
}

export function loadConfig(env = process.env) {
  const submissionEnabled = parseSubmissionEnabled(env);
  const config = {
    service: SERVICE_NAME,
    runtimeEnv: parseRuntimeEnv(env),
    submissionEnabled,
    apiVersion: parseApiVersion(env),
    port: parsePort(env)
  };

  if (submissionEnabled) {
    config.database = parseDatabase(env);
  }

  return Object.freeze(config);
}
