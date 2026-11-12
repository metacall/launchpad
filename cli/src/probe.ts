/**
 * probe.ts
 *
 * Checks once at startup whether FaaS answers, so a FaaS that isn't running is
 * reported in the terminal and not only as errors in the dashboard.
 */

import { requestFaas } from './proxy';

/** Whether FaaS answers its readiness route in time. Never rejects. */
export function isFaasReady(target: URL, timeoutMs = 2000): Promise<boolean> {
  return new Promise(resolve => {
    const req = requestFaas(
      target,
      { method: 'GET', path: '/api/readiness', timeout: timeoutMs },
      res => {
        res.resume();
        resolve(res.statusCode === 200);
      },
    );
    req.on('timeout', () => req.destroy());
    req.on('error', () => resolve(false));
    req.end();
  });
}
