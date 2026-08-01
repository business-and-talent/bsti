import http from 'node:http';

import { getCapabilities } from './capabilities.js';

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

function routePath(request) {
  return new URL(request.url ?? '/', 'http://localhost').pathname;
}

export function createRequestHandler(config, options = {}) {
  const capabilitiesProvider = options.capabilitiesProvider ?? getCapabilities;
  const onUnhandledError = options.onUnhandledError ?? (() => {});

  return function requestHandler(request, response) {
    try {
      if (request.method !== 'GET') {
        sendJson(response, 405, {
          error: {
            code: 'METHOD_NOT_ALLOWED',
            message: 'Method not allowed'
          }
        }, { Allow: 'GET' });
        return;
      }

      const pathname = routePath(request);

      if (pathname === '/health') {
        sendJson(response, 200, {
          status: 'ok',
          service: config.service,
          environment: config.runtimeEnv,
          submissionEnabled: config.submissionEnabled
        });
        return;
      }

      if (pathname === '/v1/capabilities') {
        sendJson(response, 200, capabilitiesProvider());
        return;
      }

      sendJson(response, 404, {
        error: {
          code: 'NOT_FOUND',
          message: 'Route not found'
        }
      });
    } catch (error) {
      onUnhandledError(error);
      if (!response.headersSent) {
        sendJson(response, 500, {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Internal server error'
          }
        });
      } else {
        response.end();
      }
    }
  };
}

export function createServer(config, options = {}) {
  return http.createServer(createRequestHandler(config, options));
}
