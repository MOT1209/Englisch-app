import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { logger } from '../utils/logger';

declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

/**
 * Structured access log. Assigns (or honours an inbound) `X-Request-Id`, echoes
 * it back to the caller so errors can be correlated, and writes one JSON line
 * per completed request with method, path, status, duration and caller hints.
 */
export function requestLog(req: Request, res: Response, next: NextFunction): void {
  const inbound = req.headers['x-request-id'];
  req.id = (typeof inbound === 'string' && inbound.length > 0 ? inbound : randomUUID()).slice(0, 128);
  res.setHeader('X-Request-Id', req.id);

  const startedAt = process.hrtime.bigint();
  const { method, originalUrl } = req;

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    const contentLength = res.getHeader('content-length');
    logger.info('request', {
      reqId: req.id,
      method,
      path: originalUrl,
      status: res.statusCode,
      durationMs: Math.round(durationMs * 10) / 10,
      ip: req.ip,
      ua: req.headers['user-agent'],
      bytes: contentLength !== undefined ? Number(contentLength) : undefined,
    });
  });

  next();
}