import { describe, expect, it } from 'vitest';
import { validateEnv } from './env.validation';

const REQUIRED = {
  DATABASE_URL: 'postgresql://localhost/db',
  JWT_ACCESS_SECRET: 'a'.repeat(16),
  JWT_REFRESH_SECRET: 'b'.repeat(16),
};

describe('validateEnv', () => {
  it('applies defaults when only required vars are provided', () => {
    const env = validateEnv(REQUIRED);
    expect(env.API_PORT).toBe(3000);
    expect(env.API_PREFIX).toBe('api/v1');
    expect(env.NODE_ENV).toBe('development');
    expect(env.ADMIN_EMAIL).toBe('admin@accentrax.local');
  });

  it('throws when DATABASE_URL is missing', () => {
    expect(() =>
      validateEnv({ JWT_ACCESS_SECRET: REQUIRED.JWT_ACCESS_SECRET, JWT_REFRESH_SECRET: REQUIRED.JWT_REFRESH_SECRET }),
    ).toThrow(/Invalid environment/);
  });

  it('throws when JWT secrets are missing or too short', () => {
    expect(() => validateEnv({ DATABASE_URL: REQUIRED.DATABASE_URL })).toThrow(
      /Invalid environment/,
    );
    expect(() =>
      validateEnv({ ...REQUIRED, JWT_ACCESS_SECRET: 'short' }),
    ).toThrow(/Invalid environment/);
  });

  it('coerces numeric ports from strings', () => {
    const env = validateEnv({ ...REQUIRED, API_PORT: '4000' });
    expect(env.API_PORT).toBe(4000);
  });
});
