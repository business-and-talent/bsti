export class SubmissionRequestError extends Error {
  constructor(code, message, statusCode) {
    super(message);
    this.name = 'SubmissionRequestError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export function invalidJsonError() {
  return new SubmissionRequestError('INVALID_JSON', 'Request body must be valid JSON', 400);
}

export function payloadTooLargeError() {
  return new SubmissionRequestError('PAYLOAD_TOO_LARGE', 'Request body is too large', 413);
}
