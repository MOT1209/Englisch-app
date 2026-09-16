import { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { UnauthorizedError } from '../utils/errors';
import { AppCheckVerifier, requireAppCheck } from './firebaseAppCheck';

let verifier: AppCheckVerifier | null = null;

/**
 * A cached verifier, created only when `FIREBASE_APP_CHECK_PROJECT_NUMBER` is
 * configured. Returns null while App Check has not been wired up yet.
 */
function getVerifier(): AppCheckVerifier | null {
  const projectNumber = env.FIREBASE_APP_CHECK_PROJECT_NUMBER?.trim();
  if (!projectNumber) return null;
  verifier ??= new AppCheckVerifier(projectNumber);
  return verifier;
}

/** Which gate is active: real App Check (recommended) or the shared token fallback. */
export function appAccessMode(): 'app-check' | 'token' {
  return getVerifier() ? 'app-check' : 'token';
}

/**
 * Gate for the AI proxy.
 *
 * When Firebase App Check is configured, callers must present a verified App
 * Check token in `X-Firebase-AppCheck` — the shared `APP_TOKEN` is then no
 * longer accepted at all, so a leaked token helps nothing.
 *
 * Until App Check is configured (`FIREBASE_APP_CHECK_PROJECT_NUMBER` unset),
 * the shared secret remains the gate. That is a hurdle, not a fortress: any
 * secret shipped inside a public APK can be extracted, which is exactly why the
 * per-caller daily cap exists and why App Check is the end state. Requiring a
 * valid key from the preview endpoint in a dev build happens via the App Check
 * debug provider; see the plan for the exact wiring.
 */
export async function requireAppAccess(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const active = getVerifier();
  if (active) {
    await requireAppCheck(active)(req, _res, next);
    return;
  }

  const token = req.headers['x-app-token'];
  if (typeof token !== 'string' || token.length === 0 || token !== env.APP_TOKEN) {
    throw new UnauthorizedError('Missing or invalid app token');
  }
  next();
}