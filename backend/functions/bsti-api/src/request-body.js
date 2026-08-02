import {
  invalidJsonError,
  payloadTooLargeError
} from './submission-errors.js';

export function readJsonBody(request, { limitBytes }) {
  return new Promise((resolve, reject) => {
    const contentLength = request.headers['content-length'];
    if (contentLength !== undefined) {
      const declaredLength = Number(contentLength);
      if (Number.isFinite(declaredLength) && declaredLength > limitBytes) {
        request.resume();
        reject(payloadTooLargeError());
        return;
      }
    }

    const chunks = [];
    let bytes = 0;
    let tooLarge = false;

    request.on('data', (chunk) => {
      bytes += chunk.length;
      if (bytes > limitBytes) {
        tooLarge = true;
        chunks.length = 0;
        return;
      }
      if (!tooLarge) chunks.push(chunk);
    });

    request.on('end', () => {
      if (tooLarge) {
        reject(payloadTooLargeError());
        return;
      }

      try {
        const text = Buffer.concat(chunks).toString('utf8');
        resolve(JSON.parse(text));
      } catch {
        reject(invalidJsonError());
      }
    });

    request.on('error', () => reject(invalidJsonError()));
  });
}
