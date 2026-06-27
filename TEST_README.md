# Testing Guide

Complete testing setup for MetaCall Dashboard with Vitest (unit) and Playwright (E2E).

## Quick Start

```bash
# Install dependencies
npm install

# Install Playwright browser (Chromium only — sufficient for all tests)
npx playwright install chromium

# Run unit tests (Vitest)
npm run unit

# Run E2E smoke tests only
npm run test:smoke

# Run full E2E suite
npm run test

# Run everything (unit + full E2E)
npm run unit && npm run test
```

## Test Structure

```
src/tests/unit/               # Unit tests (Vitest)
├── api_client_test.ts        # API client error handling
├── button_test.tsx           # Button component variants
├── constants_test.ts         # Shared constants values
├── error_boundary_test.tsx   # Error boundary component
├── not_found_page_test.tsx   # 404 page rendering
├── spinner_test.tsx          # Spinner component
├── use_auth_test.tsx         # useAuth hook
├── utils_test.ts             # Utility functions
└── setup.ts                  # Vitest global setup

tests/                        # E2E tests (Playwright)
├── e2e/
│   ├── smoke/
│   │   ├── auth.smoke.spec.ts         # 4 auth smoke tests
│   │   └── dashboard.smoke.spec.ts    # 5 dashboard smoke tests
│   ├── auth/
│   │   ├── guest-redirect.spec.ts     # Route protection / redirect tests
│   │   └── login.spec.ts             # Login form, auth outcomes
│   ├── dashboard/
│   │   └── dashboard.spec.ts         # Dashboard page & navbar
│   ├── deployments/
│   │   └── deployments.spec.ts       # Deployments list & navigation
│   ├── plans/
│   │   └── plans.spec.ts             # Plan cards & checkout modal
│   └── settings/
│       └── settings.spec.ts          # Settings page & forms
├── pages/                    # Page Object Models (POMs)
│   ├── login.page.ts
│   ├── dashboard.page.ts
│   ├── deployments.page.ts
│   ├── plans.page.ts
│   └── settings.page.ts
├── fixtures/
│   └── auth.fixture.ts       # Authenticated test fixture
├── utils/
│   └── helpers.ts            # Shared test helpers
├── mocks/                    # Mock data (API responses)
├── storage/                  # Persisted auth state (auth.json)
└── global/
    ├── global-setup.ts       # Write mock auth before all tests
    └── global-teardown.ts    # Clean up auth state after all tests
```

## Unit Tests (Vitest)

**What:** Test individual functions and components in isolation  
**Speed:** ~2 seconds  
**When:** During development, before every commit  
**Run:** `npm run unit`

### Commands

```bash
npm run unit              # Run all unit tests (58 tests)
npm run unit:watch        # Watch mode (auto-rerun on change)
npm run unit:ui           # UI dashboard
npm run unit:coverage     # Coverage report
```

## E2E Tests (Playwright)

**What:** Test complete user flows in a real browser  
**Speed:** ~6s (smoke) / ~50s (full suite)  
**When:** Before pushing to GitHub  
**Browser:** Chromium (headless)  
**Run:** `npm run test:smoke` or `npm run test`

### Commands

```bash
npm run test               # Run all 97 E2E tests
npm run test:smoke         # Quick smoke tests (9 tests, ~6s)
npm run test:ui            # Interactive debugger (best for debugging!)
npm run test:debug         # Step-through debug
npm run test:headed        # See browser in action
npm run test:codegen       # Generate test code by recording actions
```

### Tips

- Run `npm run test:smoke` for quick sanity checks during development
- Use `npm run test:ui` for debugging — it shows a full timeline with traces and screenshots
- Check `test-results/` for traces, screenshots, and videos on failures
- Use `page.pause()` inside a test to freeze execution and inspect the page
- Auth state is written by `global-setup.ts` and shared across all tests via `storage/auth.json`
