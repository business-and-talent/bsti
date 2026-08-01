const SERVICE_NAME = 'bsti-api';
const DEFAULT_RUNTIME_ENV = 'development';
const DEFAULT_API_VERSION = 'v1';
const DEFAULT_PORT = 9000;
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
  if (value === 'true') {
    throw new ConfigError('SUBMISSION_DISABLED', 'Assessment submission is disabled');
  }
  return false;
}

function parseApiVersion(env) {
  const apiVersion = readString(env, 'BSTI_API_VERSION', DEFAULT_API_VERSION);
  if (apiVersion !== DEFAULT_API_VERSION) {
    throw new ConfigError('INVALID_API_VERSION', 'Unsupported API version');
  }
  return apiVersion;
}

function parsePort(env) {
  const rawPort = readString(env, 'PORT', String(DEFAULT_PORT));
  if (!/^\d+$/.test(rawPort)) {
    throw new ConfigError('INVALID_PORT', 'Port must be an integer from 1 through 65535');
  }

  const port = Number(rawPort);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
    throw new ConfigError('INVALID_PORT', 'Port must be an integer from 1 through 65535');
  }
  return port;
}

export function loadConfig(env = process.env) {
  return Object.freeze({
    service: SERVICE_NAME,
    runtimeEnv: parseRuntimeEnv(env),
    submissionEnabled: parseSubmissionEnabled(env),
    apiVersion: parseApiVersion(env),
    port: parsePort(env)
  });
}
