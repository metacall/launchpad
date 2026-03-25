import { describe, it, expect } from 'vitest';
import {
  APP_NAME,
  APP_VERSION,
  LS_TOKEN_KEY,
  LS_EMAIL_KEY,
  ROUTES,
  PLAN_NAMES,
  POLL_INTERVAL_MS,
  LOG_POLL_INTERVAL_MS,
} from '@/shared/constants';

describe('constants', () => {
  it('exports APP_NAME', () => {
    expect(APP_NAME).toBe('MetaCall FaaS Dashboard');
  });

  it('exports APP_VERSION', () => {
    expect(APP_VERSION).toBe('0.1.0');
  });

  it('exports local-storage keys', () => {
    expect(LS_TOKEN_KEY).toBe('faas_token');
    expect(LS_EMAIL_KEY).toBe('faas_user_email');
  });

  it('ROUTES.HOME is /', () => {
    expect(ROUTES.HOME).toBe('/');
  });

  it('ROUTES.DEPLOYMENT_DETAIL generates a path', () => {
    expect(ROUTES.DEPLOYMENT_DETAIL('my-fn')).toBe('/deployments/my-fn');
  });

  it('ROUTES.DEPLOYMENT_LOGS generates a path', () => {
    expect(ROUTES.DEPLOYMENT_LOGS('my-fn')).toBe('/deployments/my-fn/logs');
  });

  it('exports three plan names', () => {
    expect(PLAN_NAMES).toHaveLength(3);
  });

  it('exports positive poll intervals', () => {
    expect(POLL_INTERVAL_MS).toBeGreaterThan(0);
    expect(LOG_POLL_INTERVAL_MS).toBeGreaterThan(0);
  });
});
