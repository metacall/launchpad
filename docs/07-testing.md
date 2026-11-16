# 07 — Testing Guide

Launchpad has two layers of testing:

| Layer | Tool | Command |
|---|---|---|
| Unit tests | [Vitest](https://vitest.dev/) | `npm run unit` |
| End-to-end tests | [Playwright](https://playwright.dev/) | `npm run test` |

---

## Unit Tests (Vitest)

### Location

Unit tests live alongside the source code in `src/tests/`. They cover utilities, hooks, and isolated components.

### Running

```bash
# Run once
npm run unit

# Watch mode (re-runs on file change)
npm run unit:watch

# Coverage report
npm run unit:coverage
```

Coverage output is written to `coverage/` (not committed).

### Writing a Unit Test

Create a `.test.ts` or `.test.tsx` file next to the code it tests:

```typescript
// src/tests/example.test.ts
import { describe, it, expect } from 'vitest';
import { formatStatus } from '../shared/utils/formatStatus';

describe('formatStatus', () => {
  it('returns "Ready" for status "ready"', () => {
    expect(formatStatus('ready')).toBe('Ready');
  });

  it('returns "Building" for status "create"', () => {
    expect(formatStatus('create')).toBe('Building');
  });
});
```

### Configuration

Vitest is configured inside `vite.config.ts`. The test environment is `jsdom` (simulates a browser DOM).

---

## E2E Tests (Playwright)

### Location

```
tests/
├── e2e/                   # Test specs
│   ├── auth/              # Login, signup, logout flows
│   ├── deployments/       # Deploy, inspect, delete flows
│   ├── logs/              # Log viewer
│   └── smoke/             # Quick sanity checks
├── pages/                 # Page object models (POM)
├── fixtures/              # Shared test fixtures
├── mocks/                 # API mock data
├── utils/                 # Helper functions
├── storage/               # Auth state snapshots for reuse
└── global/                # globalSetup.ts / globalTeardown.ts
```

### Running

```bash
# Full E2E suite (requires FaaS running on localhost:9000)
npm run test

# Smoke tests only
npm run test:smoke

# Interactive Playwright UI
npm run test:ui

# Debug mode (step through tests)
npm run test:debug

# Headed mode (watch browser run)
npm run test:headed
```

### Prerequisites

The Playwright suite expects:
- Launchpad dev server running on port `5173`
- MetaCall FaaS running on port `9000`

Playwright **auto-starts** the Vite dev server for you (configured in `playwright.config.ts`).

### Page Object Model

Tests use the Page Object Model pattern. Each logical page has a corresponding class in `tests/pages/`.

```typescript
// tests/pages/LoginPage.ts
import { Page } from '@playwright/test';

export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.page.fill('[data-testid="email"]', email);
    await this.page.fill('[data-testid="password"]', password);
    await this.page.click('[data-testid="submit"]');
  }
}
```

### Writing an E2E Test

```typescript
// tests/e2e/auth/login.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';

test('user can log in with valid credentials', async ({ page }) => {
  const login = new LoginPage(page);
  await login.goto();
  await login.login('user@example.com', 'password123');
  await expect(page).toHaveURL('/');
});
```

### Reusing Auth State

To skip logging in before every test, save a logged-in browser state and reuse it:

```typescript
// tests/global/globalSetup.ts
// Logs in once and saves the storage state to tests/storage/auth.json
```

Then reference it in `playwright.config.ts`:

```typescript
use: {
  storageState: 'tests/storage/auth.json',
}
```

### Configuration

See `playwright.config.ts` in the `Dashboard/` root for:
- Base URL
- Browser targets (Chromium by default)
- Dev server auto-start settings
- Retry counts and timeouts

---

## Test Data IDs

Launchpad uses `data-testid` attributes on interactive elements so tests are not coupled to CSS classes or text content. When adding new UI, include a `data-testid` on key elements:

```tsx
<button data-testid="deploy-submit">Deploy</button>
<input data-testid="deployment-name" />
```

---

## CI Considerations

- Unit tests: run on every push, no external dependencies
- E2E tests: require a running FaaS instance — best run in a pre-configured CI environment with a FaaS container

---

*Next: [Contributing →](./08-contributing.md)*
