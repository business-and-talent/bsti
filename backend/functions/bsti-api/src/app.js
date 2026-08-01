import http from 'node:http';

import { getCapabilities } from './capabilities.js';
import { MAX_REQUEST_BYTES } from './submission-contract.js';
import { readJsonBody } from './request-body.js';
import { SubmissionRequestError } from './submission-errors.js';

const BASE_HEADERS = Object.freeze({
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff'
});

function sendJson(response, statusCode, body, additionalHeaders = {}) {
  const payload = JSON.stringify(body);
  response.writeHead(statusCode, {
    ...BASE_HEADERS,
    ...additionalHeaders,
    'Content-Length': Buffer.byteLength(payload)
  });
  response.end(payload);
}

function sendError(response, statusCode, code, message, details) {
  const error = { code, message };
  if (Array.isArray(details) && details.length > 0) {
    error.details = details.slice(0, 32).map(({ path, code: detailCode }) => ({
      path,
      code: detailCode
    }));
  }
  sendJson(response, statusCode, { error });
}

function routePath(request) {
  return new URL(request.url ?? '/', 'http://localhost').pathname;
}

function methodNotAllowed(response, allowedMethod) {
  sendError(response, 405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  response.setHeader?.('Allow', allowedMethod);
}

function sendMethodNotAllowed(response, allowedMethod) {
  sendJson(response, 405, {
    error: {
      code: 'METHOD_NOT_ALLOWED',
      message: 'Method not allowed'
    }
  }, { Allow: allowedMethod });
}

function isJsonContentType(request) {
  const contentType = request.headers['content-type'];
  if (typeof contentType !== 'string') return false;
  return contentType.split(';', 1)[0].trim().toLowerCase() === 'application/json';
}

function sendSubmissionOutcome(response, outcome) {
  if (outcome?.kind === 'created' || outcome?.kind === 'replayed') {
    const replayed = outcome.kind === 'replayed';
    sendJson(response, replayed ? 200 : 201, {
      assessmentId: outcome.assessmentId,
      status: 'submitted',
      submittedAt: outcome.submittedAt,
      replayed
    });
    return;
  }

  if (outcome?.kind === 'conflict') {
    sendError(response, 409, 'SUBMISSION_CONFLICT', 'Assessment submission conflicts with an existing record');
    return;
  }

  if (outcome?.kind === 'invalid') {
    sendError(response, 422, 'INVALID_SUBMISSION', 'Assessment submission is invalid', outcome.issues);
    return;
  }

  if (outcome?.kind === 'unavailable') {
    sendError(response, 503, 'PERSISTENCE_UNAVAILABLE', 'Assessment persistence is unavailable');
    return;
  }

  throw new Error('Unsupported submission service outcome');
}

async function handleRequest(request, response, config, options) {
  const pathname = routePath(request);
  const capabilitiesProvider = options.capabilitiesProvider ?? getCapabilities;
  const submissionService = options.submissionService ?? null;

  if (pathname === '/health') {
    if (request.method !== 'GET') {
      sendMethodNotAllowed(response, 'GET');
      return;
    }
    sendJson(response, 200, {
      status: 'ok',
      service: config.service,
      environment: config.runtimeEnv,
      submissionEnabled: config.submissionEnabled
    });
    return;
  }

  if (pathname === '/v1/capabilities') {
    if (request.method !== 'GET') {
      sendMethodNotAllowed(response, 'GET');
      return;
    }
    sendJson(response, 200, capabilitiesProvider(config));
    return;
  }

  if (pathname === '/v1/assessments') {
    if (request.method !== 'POST') {
      sendMethodNotAllowed(response, 'POST');
      return;
    }

    if (!config.submissionEnabled) {
      request.resume();
      sendError(response, 503, 'SUBMISSION_DISABLED', 'Assessment submission is disabled');
      return;
    }

    if (!isJsonContentType(request)) {
      request.resume();
      sendError(response, 400, 'INVALID_CONTENT_TYPE', 'Content-Type must be application/json');
      return;
    }

    if (!submissionService || typeof submissionService.submit !== 'function') {
      request.resume();
      sendError(response, 503, 'PERSISTENCE_UNAVAILABLE', 'Assessment persistence is unavailable');
      return;
    }

    try {
      const body = await readJsonBody(request, { limitBytes: MAX_REQUEST_BYTES });
      const outcome = await submissionService.submit(body);
      sendSubmissionOutcome(response, outcome);
    } catch (error) {
      if (error instanceof SubmissionRequestError) {
        sendError(response, error.statusCode, error.code, error.message);
        return;
      }
      throw error;
    }
    return;
  }

  request.resume();
  sendError(response, 404, 'NOT_FOUND', 'Route not found');
}

export function createRequestHandler(config, options = {}) {
  const onUnhandledError = options.onUnhandledError ?? (() => {});

  return function requestHandler(request, response) {
    handleRequest(request, response, config, options).catch((error) => {
      onUnhandledError(error);
      if (!response.headersSent) {
        sendError(response, 500, 'INTERNAL_ERROR', 'Internal server error');
      } else {
        response.end();
      }
    });
  };
}

export function createServer(config, options = {}) {
  return http.createServer(createRequestHandler(config, options));
}
