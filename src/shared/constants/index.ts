// Centralized constants for the app
export const APP_NAME = 'MetaCall FaaS Dashboard';
export const APP_VERSION = '0.1.0';

export const LS_TOKEN_KEY = 'faas_token' as const;
export const LS_EMAIL_KEY = 'faas_user_email' as const;

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  SIGNUP: '/signup',
  DEPLOYMENTS: '/deployments',
  DEPLOYMENT_DETAIL: (suffix: string) => `/deployments/${suffix}`,
  DEPLOYMENT_LOGS: (suffix: string) => `/deployments/${suffix}/logs`,
  DEPLOY_NEW: '/deploy/new',
  DEPLOY_WIZARD: '/deploy/wizard',
  DEPLOY_REPOSITORY: '/deploy/repository',
  SETTINGS: '/settings',
  PLANS: '/plans',
  CHAT: '/chat',
} as const;

export const API_PATHS = {
  READINESS: '/api/readiness',
  INSPECT: '/api/inspect',
  PACKAGE_CREATE: '/api/package/create',
  DEPLOY_CREATE: '/api/deploy/create',
  DEPLOY_DELETE: '/api/deploy/delete',
  DEPLOY_LOGS: '/api/deploy/logs',
  REPO_BRANCH_LIST: '/api/repository/branchlist',
  REPO_ADD: '/api/repository/add',
  AUTH_LOGIN: '/api/auth/login',
  AUTH_SIGNUP: '/api/auth/signup',
} as const;

export const DEFAULT_PAGE_SIZE = 20;

export const PLAN_NAMES = ['Essential Plan', 'Standard Plan', 'Premium Plan'] as const;
export type PlanName = (typeof PLAN_NAMES)[number];

export const POLL_INTERVAL_MS = 10_000;
export const LOG_POLL_INTERVAL_MS = 3_000;
