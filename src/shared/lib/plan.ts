import { Plans } from '@metacall/protocol/plan';

const ACTIVE_PLAN_KEY = 'faas_active_plan';

export function normalizePlan(value?: string | null): Plans {
  switch ((value ?? '').trim().toLowerCase()) {
    case 'premium':
    case 'premium plan':
      return Plans.Premium;
    case 'standard':
    case 'standard plan':
      return Plans.Standard;
    case 'essential':
    case 'essential plan':
    default:
      return Plans.Essential;
  }
}

export function getPlanLabel(value?: string | null): string {
  return `${normalizePlan(value)} Plan`;
}

export function readStoredPlan(): Plans {
  if (typeof window === 'undefined') return Plans.Essential;
  return normalizePlan(window.localStorage.getItem(ACTIVE_PLAN_KEY));
}

export function writeStoredPlan(plan: Plans) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ACTIVE_PLAN_KEY, plan);
}
