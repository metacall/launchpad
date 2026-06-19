import { Plans } from '@metacall/protocol/plan';

const ACTIVE_PLAN_KEY = 'faas_active_plan';
const DEPLOYMENT_PLAN_KEY = 'faas_deployment_plan_map';

export const FREE_PLAN = 'Free' as const;

export type AppPlan = Plans | typeof FREE_PLAN;

function readJsonMap(key: string): Record<string, string> {
  if (typeof window === 'undefined') return {};

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeJsonMap(key: string, value: Record<string, string>) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function normalizePlan(value?: string | null): AppPlan {
  switch ((value ?? '').trim().toLowerCase()) {
    case 'free':
    case 'free plan':
      return FREE_PLAN;
    case 'premium':
    case 'premium plan':
      return Plans.Premium;
    case 'standard':
    case 'standard plan':
      return Plans.Standard;
    case 'essential':
    case 'essential plan':
      return Plans.Essential;
    default:
      return FREE_PLAN;
  }
}

export function toDeployPlan(plan?: string | null): Plans {
  const normalized = normalizePlan(plan);
  return normalized === FREE_PLAN ? Plans.Essential : normalized;
}

export function getPlanLabel(value?: string | null): string {
  return `${normalizePlan(value)} Plan`;
}

export function readStoredPlan(): AppPlan {
  if (typeof window === 'undefined') return FREE_PLAN;
  return normalizePlan(window.localStorage.getItem(ACTIVE_PLAN_KEY));
}

export function writeStoredPlan(plan: AppPlan) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ACTIVE_PLAN_KEY, plan);
}

export function readDeploymentPlan(suffix?: string | null): AppPlan | null {
  if (!suffix) return null;
  const planMap = readJsonMap(DEPLOYMENT_PLAN_KEY);
  return planMap[suffix] ? normalizePlan(planMap[suffix]) : null;
}

export function writeDeploymentPlan(suffix: string, plan: AppPlan) {
  if (!suffix) return;
  const planMap = readJsonMap(DEPLOYMENT_PLAN_KEY);
  planMap[suffix] = plan;
  writeJsonMap(DEPLOYMENT_PLAN_KEY, planMap);
}

export function resolveDeploymentPlan(
  deployment: { suffix?: string | null; plan?: string | null } | null | undefined,
): AppPlan {
  const fromMetadata = readDeploymentPlan(deployment?.suffix);
  if (fromMetadata) return fromMetadata;
  return normalizePlan(deployment?.plan);
}

export function readMockSubscriptions(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem('faas_mock_subscriptions');
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, number>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function addMockSubscription(plan: string) {
  if (typeof window === 'undefined') return;
  const current = readMockSubscriptions();
  current[plan] = (current[plan] || 0) + 1;
  window.localStorage.setItem('faas_mock_subscriptions', JSON.stringify(current));
}

export function removeMockSubscription(plan: string) {
  if (typeof window === 'undefined') return;
  const current = readMockSubscriptions();
  if (current[plan] > 0) {
    current[plan] -= 1;
    if (current[plan] === 0) {
      delete current[plan];
    }
  }
  window.localStorage.setItem('faas_mock_subscriptions', JSON.stringify(current));
}

