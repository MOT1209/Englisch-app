import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { UnauthorizedError } from '../utils/errors';

/**
 * Cheap gate for the AI proxy: the app sends a shared secret in `X-App-Token`.
 *
 * This is a hurdle, not a fortress — any secret shipped inside a public APK can
 * be extracted. The point of moving AI behind this proxy was never to make the
 * endpoint un-guessable; it was to stop bundling the billing-attached Gemini key
 * into the APK. The per-caller daily cap bounds the damage even if the token
 * leaks. Replace with Firebase App Check when the Firebase project is wired up.
 */
export function requireAppAccess(_req: Request, _res: Response, next: NextFunction): void {
  const token = _req.headers['x-app-token'];
  if (typeof token !== 'string' || token.length === 0 || token !== env.APP_TOKEN) {
    throw new UnauthorizedError('Missing or invalid app token');
  }
  next();
}