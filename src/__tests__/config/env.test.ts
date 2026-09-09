import { afterEach, describe, expect, it, vi } from 'vitest';

const genericMessage = 'Invalid application configuration.';

const validEnv = {
  VITE_FIREBASE_API_KEY: 'test-api-key',
  VITE_FIREBASE_AUTH_DOMAIN: 'test-project.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'test-project',
  VITE_FIREBASE_STORAGE_BUCKET: 'test-project.appspot.com',
  VITE_FIREBASE_MESSAGING_SENDER_ID: '1234567890',
  VITE_FIREBASE_APP_ID: '1:1234567890:web:abcdef',
  VITE_USE_FIRESTORE_EMULATOR: 'true',
} as const;

function stubValidEnv(): void {
  for (const [key, value] of Object.entries(validEnv)) {
    vi.stubEnv(key, value);
  }
}

async function loadValidEnvironment() {
  stubValidEnv();
  vi.resetModules();

  return import('../../config/env');
}

async function loadWithOverride(key: keyof typeof validEnv, value: string): Promise<Error> {
  stubValidEnv();
  vi.stubEnv(key, value);
  vi.resetModules();

  try {
    await import('../../config/env');
  } catch (error: unknown) {
    if (error instanceof Error) {
      return error;
    }

    throw new Error('Environment validation threw a non-Error value.');
  }

  throw new Error('Environment validation unexpectedly succeeded.');
}

function expectGenericError(error: Error, suppliedValue: string): void {
  expect(error.name).toBe('Error');
  expect(error.message).toBe(genericMessage);
  expect(error).not.toHaveProperty('code');
  expect(error).not.toHaveProperty('input');

  const renderedError = `${error.name}: ${error.message}\n${error.stack ?? ''}`;
  if (suppliedValue.length > 0) {
    expect(renderedError).not.toContain(suppliedValue);
  }
}

describe('Firebase environment validation', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('returns validated public configuration', async () => {
    const { env } = await loadValidEnvironment();

    expect(env).toEqual(validEnv);
  });

  it('returns only the generic error when a required Firebase value is missing', async () => {
    const error = await loadWithOverride('VITE_FIREBASE_API_KEY', '');

    expectGenericError(error, '');
  });

  it.each(['maybe', 'TRUE', ''])(
    'returns only the generic error for an invalid emulator flag %s',
    async (value) => {
      const error = await loadWithOverride('VITE_USE_FIRESTORE_EMULATOR', value);

      expectGenericError(error, value);
    },
  );
});
