import { describe, expect, it } from 'vitest';
import { validateEnv } from './env.validation';

describe('validateEnv', () => {
  it('applies defaults when only DATABASE_URL is provided', () => {
    const env = validateEnv({ DATABASE_URL: 'postgresql://localhost/db' });
    expect(env.API_PORT).toBe(3000);
    expect(env.API_PREFIX).toBe('api/v1');
    expect(env.NODE_ENV).toBe('development');
  });

  it('throws when DATABASE_URL is missing', () => {
    expect(() => validateEnv({})).toThrow(/Invalid environment/);
  });

  it('coerces numeric ports from strings', () => {
    const env = validateEnv({ DATABASE_URL: 'postgresql://x', API_PORT: '4000' });
    expect(env.API_PORT).toBe(4000);
  });
});
