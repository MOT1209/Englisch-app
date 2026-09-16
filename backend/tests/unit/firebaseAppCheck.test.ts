import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateKeyPairSync, createPublicKey } from 'crypto';
import jwt from 'jsonwebtoken';

import { AppCheckVerifier, requireAppCheck } from '@/middleware/firebaseAppCheck';

const PROJECT_NUMBER = '1234567890';
const ISSUER = `https://firebaseappcheck.googleapis.com/${PROJECT_NUMBER}`;
const KID = 'test-kid-1';

interface Jwk { kty: string; n: string; e: string }

let privateKey: string;
let publicJwk: Jwk;

beforeAll(() => {
  const { privateKey: priv, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  privateKey = priv;
  publicJwk = createPublicKey({ key: publicKey, format: 'pem' }).export({ format: 'jwk' }) as Jwk;
});

function signToken(overrides: { issuer?: string; audience?: string } = {}): string {
  return jwt.sign(
    { app_id: `1:${PROJECT_NUMBER}:android:test` },
    privateKey,
    {
      algorithm: 'RS256',
      keyid: KID,
      issuer: overrides.issuer ?? ISSUER,
      audience: overrides.audience ?? PROJECT_NUMBER,
      expiresIn: '5m',
    }
  );
}

function jwksResponse(): { ok: boolean; json: () => Promise<unknown> } {
  return {
    ok: true,
    json: async () => ({ keys: [{ kid: KID, kty: 'RSA', n: publicJwk.n, e: publicJwk.e }] }),
  };
}

/** Response shape accepted by `AppCheckVerifier`'s `fetch` implementation. */
function fetchStub(handler: () => { ok: boolean; json: () => Promise<unknown> } | Error = jwksResponse) {
  return vi.fn(async () => {
    const value = handler();
    if (value instanceof Error) throw value;
    return value;
  });
}

describe('AppCheckVerifier', () => {
  it('accepts a validly signed token', async () => {
    const fetch = fetchStub();
    const verifier = new AppCheckVerifier(PROJECT_NUMBER, fetch as unknown as typeof fetch);
    await expect(verifier.verify(signToken())).resolves.toBeUndefined();
  });

  it('caches the JWKS between verifications', async () => {
    const fetch = fetchStub();
    const verifier = new AppCheckVerifier(PROJECT_NUMBER, fetch as unknown as typeof fetch);
    await verifier.verify(signToken());
    await verifier.verify(signToken());
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('rejects a token whose signature was tampered with', async () => {
    const verifier = new AppCheckVerifier(PROJECT_NUMBER, fetchStub() as unknown as typeof fetch);
    const token = signToken();
    const tampered = token.slice(0, -2) + (token.endsWith('aa') ? 'bb' : 'aa');
    await expect(verifier.verify(tampered)).rejects.toMatchObject({ statusCode: 401 });
  });

  it('rejects a token with the wrong issuer', async () => {
    const verifier = new AppCheckVerifier(PROJECT_NUMBER, fetchStub() as unknown as typeof fetch);
    await expect(
      verifier.verify(signToken({ issuer: 'https://evil.example' }))
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it('rejects a token with the wrong audience', async () => {
    const verifier = new AppCheckVerifier(PROJECT_NUMBER, fetchStub() as unknown as typeof fetch);
    await expect(verifier.verify(signToken({ audience: '9999999999' }))).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it('rejects a token signed by a key not in the set', async () => {
    const fetch = fetchStub();
    const verifier = new AppCheckVerifier(PROJECT_NUMBER, fetch as unknown as typeof fetch);
    const token = jwt.sign({ app_id: 'x' }, privateKey, {
      algorithm: 'RS256',
      keyid: 'unknown-kid',
      issuer: ISSUER,
      audience: PROJECT_NUMBER,
      expiresIn: '5m',
    });
    await expect(verifier.verify(token)).rejects.toMatchObject({ statusCode: 401 });
  });

  it('rejects a token when the JWKS endpoint fails', async () => {
    const fetch = fetchStub(() => ({ ok: false, json: async () => ({}) }));
    const verifier = new AppCheckVerifier(PROJECT_NUMBER, fetch as unknown as typeof fetch);
    await expect(verifier.verify(signToken())).rejects.toMatchObject({ statusCode: 401 });
  });
});

describe('requireAppCheck middleware', () => {
  let verifier: AppCheckVerifier;

  beforeEach(() => {
    verifier = new AppCheckVerifier(PROJECT_NUMBER, fetchStub() as unknown as typeof fetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function install(header: Record<string, string>) {
    const req = { headers: header };
    const next = vi.fn();
    return { req, next };
  }

  it('calls next with a valid token', async () => {
    const { req, next } = install({ 'x-firebase-appcheck': signToken() });
    const middleware = requireAppCheck(verifier);
    await middleware(req as never, {} as never, next as never);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('rejects a request without a token', async () => {
    const { req, next } = install({});
    const middleware = requireAppCheck(verifier);
    await expect(middleware(req as never, {} as never, next as never)).rejects.toMatchObject({
      message: 'Missing Firebase App Check token',
      statusCode: 401,
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects an invalid token', async () => {
    const { req, next } = install({ 'x-firebase-appcheck': 'not-a-real-token' });
    const middleware = requireAppCheck(verifier);
    await expect(middleware(req as never, {} as never, next as never)).rejects.toMatchObject({
      statusCode: 401,
    });
    expect(next).not.toHaveBeenCalled();
  });
});