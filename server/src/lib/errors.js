export class HttpError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const badRequest = (msg) => new HttpError(400, msg, 'BAD_REQUEST');
export const notFound = (msg) => new HttpError(404, msg, 'NOT_FOUND');
export const conflict = (msg) => new HttpError(409, msg, 'CONFLICT');
export const upstream = (msg) => new HttpError(502, msg, 'UPSTREAM_FAILED');

// lets route handlers be async without wrapping every one in try/catch
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
