import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateKeyPairSync, createPublicKey } from 'crypto';
import jwt from 'jsonwebtoken';

const PROJECT_NUMBER = '1234567890';
const KID = 'test-kid-app-access';

interface ExportModules {
  appAccessMode: () => 'app-check' | 'token';
  requireAppAccess: (req: unknown, res: unknown, next: () => void) => Promise<void>;
}

async function loadAppAccess(): Promise<ExportModules> {
  vi.resetModules();
  delete process.env.FIREBASE_APP_CHECK_PROJECT_NUMBER;
  return import('@/middleware/appAccess') as Promise<ExportModules>;
}

function makeRequest(headers: Record<string, unknown>) {
  return { headers };
}

function validAppCheckToken(privateKey: string): string {
  return jwt.sign(
    { app_id: `1:${PROJECT_NUMBER}:android:test` },
    privateKey,
    {
      algorithm: 'RS256',
      keyid: KID,
      issuer: `https://firebaseappcheck.googleapis.com/${PROJECT_NUMBER}`,
      audience: PROJECT_NUMBER,
      expiresIn: '5m',
    }
  );
}

describe('appAccess (token fallback mode)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reports token mode while App Check is not configured', async () => {
    const mod = await loadAppAccess();
    expect(mod.appAccessMode()).toBe('token');
  });

  it('lets a request with the correct X-App-Token through', async () => {
    const mod = await loadAppAccess();
    const next = vi.fn();
    const req = makeRequest({ 'x-app-token': process.env.APP_TOKEN });
    await expect(mod.requireAppAccess(req, {}, next)).resolves.toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('rejects a missing token', async () => {
    const mod = await loadAppAccess();
    const next = vi.fn();
    await expect(mod.requireAppAccess(makeRequest({}), {}, next)).rejects.toMatchObject({
      message: 'Missing or invalid app token',
      statusCode: 401,
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a wrong token', async () => {
    const mod = await loadAppAccess();
    const next = vi.fn();
    await expect(
      mod.requireAppAccess(makeRequest({ 'x-app-token': 'not-the-real-token' }), {}, next)
    ).rejects.toMatchObject({ message: 'Missing or invalid app token', statusCode: 401 });
    expect(next).not.toHaveBeenCalled();
  });
});

describe('appAccess (Firebase App Check mode)', () => {
  const pair = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  const privateKey = pair.privateKey;
  const publicJwk = createPublicKey({ key: pair.publicKey, format: 'pem' }).export({ format: 'jwk' });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.FIREBASE_APP_CHECK_PROJECT_NUMBER;
  });

  async function loadWithAppCheck(): Promise<ExportModules> {
    vi.resetModules();
    process.env.FIREBASE_APP_CHECK_PROJECT_NUMBER = PROJECT_NUMBER;

    return import('@/middleware/appAccess') as Promise<ExportModules>;
  }

  it('reports app-check mode when configured', async () => {
    const mod = await loadWithAppCheck();
    expect(mod.appAccessMode()).toBe('app-check');
  });

  it('rejects the old shared token while App Check is active', async () => {
    // The verifier fetches Google's JWKS; stub it to always fail so any token
    // path is rejected — the point is that APP_TOKEN is no longer accepted.
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }))
    );

    const mod = await loadWithAppCheck();
    const next = vi.fn();
    await expect(
      mod.requireAppAccess(makeRequest({ 'x-app-token': process.env.APP_TOKEN }), {}, next)
    ).rejects.toMatchObject({ message: 'Missing Firebase App Check token', statusCode: 401 });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a request without an App Check token', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }))
    );

    const mod = await loadWithAppCheck();
    const next = vi.fn();
    await expect(mod.requireAppAccess(makeRequest({}), {}, next)).rejects.toMatchObject({
      message: 'Missing Firebase App Check token',
      statusCode: 401,
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('accepts a validly signed App Check token', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          keys: [{ kid: KID, kty: 'RSA', n: publicJwk.n, e: publicJwk.e }],
        }),
      }))
    );

    const mod = await loadWithAppCheck();
    const next = vi.fn();
    const req = makeRequest({ 'x-firebase-appcheck': validAppCheckToken(privateKey) });
    await expect(mod.requireAppAccess(req, {}, next)).resolves.toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
  });
});