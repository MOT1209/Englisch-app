import { NextFunction, Request, Response } from 'express';
import jwt, { JwtPayload as JsonWebTokenPayload } from 'jsonwebtoken';
import { createPublicKey, KeyObject } from 'crypto';
import { UnauthorizedError } from '../utils/errors';

/**
 * Server-side verification of Firebase App Check tokens.
 *
 * App Check issues real JWTs signed by Google's App Check public keys, so the
 * server never ships the shared `X-App-Token` secret that the old gate used
 * (any secret embedded in a public APK can be extracted). Verification is done
 * against Google's published JWKS endpoint, the same key material Firebase's
 * own verification libraries use.
 *
 * Expected claims (per Firebase docs):
 *   - iss: `https://firebaseappcheck.googleapis.com/{projectNumber}`
 *   - aud: the GCP project number
 *   - app_id: the App Check app id (e.g. `1:1234567890:android:abcdef`)
 */

const JWKS_URL = 'https://firebaseappcheck.googleapis.com/v1/jwks';
const JWKS_CACHE_TTL_MS = 60 * 60 * 1000;

export class AppCheckVerifier {
  private cache: { keys: Map<string, KeyObject>; fetchedAt: number } | null = null;

  constructor(
    private readonly projectNumber: string,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly clockToleranceSeconds = 30
  ) {}

  private issuer(): string {
    return `https://firebaseappcheck.googleapis.com/${this.projectNumber}`;
  }

  private async keys(): Promise<Map<string, KeyObject>> {
    const now = Date.now();
    if (this.cache && now - this.cache.fetchedAt < JWKS_CACHE_TTL_MS) {
      return this.cache.keys;
    }

    const response = await this.fetchImpl(JWKS_URL);
    if (!response.ok) {
      throw new UnauthorizedError('App Check key service unavailable');
    }

    const body = (await response.json()) as {
      keys?: Array<{ kid?: string; kty?: string; n?: string; e?: string }>;
    };

    const keys = new Map<string, KeyObject>();
    for (const jwk of body.keys ?? []) {
      if (jwk.kid && jwk.kty === 'RSA' && jwk.n && jwk.e) {
        try {
          keys.set(jwk.kid, createPublicKey({ key: { kty: 'RSA', n: jwk.n, e: jwk.e }, format: 'jwk' }));
        } catch {
          // Malformed key in the set: skip it, a later one may still match.
        }
      }
    }

    this.cache = { keys, fetchedAt: now };
    return keys;
  }

  /** Verifies the token's signature, issuer and audience. Throws UnauthorizedError on any failure. */
  async verify(token: string): Promise<void> {
    const decoded = jwt.decode(token, { complete: true });
    const header = decoded?.header as { kid?: string } | undefined;
    if (!decoded || !header?.kid) {
      throw new UnauthorizedError('Invalid App Check token');
    }

    const keys = await this.keys();
    const key = keys.get(header.kid);
    if (!key) {
      throw new UnauthorizedError('Invalid App Check token');
    }

    try {
      jwt.verify(token, key, {
        algorithms: ['RS256'],
        issuer: this.issuer(),
        audience: this.projectNumber,
        clockTolerance: this.clockToleranceSeconds,
      });
    } catch {
      throw new UnauthorizedError('Invalid App Check token');
    }
  }
}

export type AppCheckRequest = Request & { appCheckClaims?: JsonWebTokenPayload };

/** Express middleware enforcing an `X-Firebase-AppCheck` token on the request. */
export function requireAppCheck(verifier: AppCheckVerifier) {
  return async (req: AppCheckRequest, _res: Response, next: NextFunction): Promise<void> => {
    const token = req.headers['x-firebase-appcheck'];
    if (typeof token !== 'string' || token.length === 0) {
      throw new UnauthorizedError('Missing Firebase App Check token');
    }
    await verifier.verify(token);
    next();
  };
}