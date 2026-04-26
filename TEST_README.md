# Testing Guide

Complete testing setup for MetaCall Dashboard with Vitest (unit) and Playwright (E2E).

## Quick Start

```bash
# Install
npm install
npx playwright install --with-deps

# Run unit tests (Vitest)
npm run unit

# Run E2E smoke tests (Playwright)
npm run test:smoke

# All tests
npm run unit && npm run test:smoke
```

## Test Structure

```
src/tests/                    # Unit tests (Vitest)
├── button_test.tsx
├── error_boundary_test.tsx
├── spinner_test.tsx
├── utils_test.ts
├── constants_test.ts
├── not_found_page_test.tsx
└── setup.ts

tests/                        # E2E tests (Playwright)
├── e2e/
│   ├── smoke/
│   │   ├── auth.smoke.spec.ts      # 4 auth tests
│   │   └── dashboard.smoke.spec.ts # 5 dashboard tests
│   ├── auth/                        # Phase 2
│   ├── deployments/                 # Phase 3
│   └── logs/                        # Phase 3
├── pages/
│   ├── login.page.ts                # Page Objects
│   └── dashboard.page.ts
├── fixtures/
│   └── auth.fixture.ts              # Test setup
├── utils/
│   └── helpers.ts                   # 6 utilities
├── mocks/                           # mock data + handlers
├── storage/                         # auth/session state
└── global/                          # global setup/teardown hooks
```

## Unit Tests (Vitest)

**What:** Test individual functions and components in isolation
**Speed:** 2-3 seconds
**When:** During development, before every commit
**Run:** `npm run unit`

### Commands

```bash
npm run unit              # Run all unit tests
npm run unit:watch       # Watch mode (auto-rerun on change)
npm run unit:ui          # UI dashboard
npm run unit:coverage    # Coverage report
```


## E2E Tests (Playwright)

**What:** Test complete user flows in real browser
**Speed:** 60 seconds
**When:** Before pushing to GitHub
**Browser:** Chromium (Chrome-based)
**Run:** `npm run test:smoke`

### Commands

```bash
npm run test                   # Run all E2E tests
npm run test:smoke            # Quick smoke tests
npm run test:ui               # Interactive debugger (best for debugging!)
npm run test:debug            # Step-through debug
npm run test:headed           # See browser in action
npm run test:codegen          # Generate test code
```

### Tips

- Use `npm run test:ui` first - most powerful debugging tool
- Check `test-results/` folder for traces, screenshots, videos
- Use `page.pause()` in tests to pause execution
- Use `--headed` to see browser in action

