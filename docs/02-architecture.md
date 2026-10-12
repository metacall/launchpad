# 02 — Architecture

> **Purpose of this document:** Explain how the codebase is organized, what every file and folder does, how data flows from the browser to the FaaS backend and back, and how the key internal systems work.

---

## High-Level Picture

```
Browser (Launchpad — React SPA)
         │
         │  HTTP via Axios
         │  Authorization: Bearer <token>
         ▼
MetaCall FaaS Server  (localhost:9000)
         │
         │  IPC (stdio / child_process.spawn)
         ▼
MetaCall Core Workers  (metacall binary per deployment)
         │
         │  Language loaders: Python, Node, Ruby, TypeScript, etc.
         ▼
User-deployed polyglot functions
```

Launchpad has **no database, no server, no backend of its own**. It is a pure React SPA. All state lives in the FaaS server.

---

## Tech Stack

| Layer | Library / Tool | Version | Why |
|---|---|---|---|
| UI framework | React | 19 | Concurrent features, stable ecosystem |
| Language | TypeScript | ~5.9 | Type safety across the entire codebase |
| Build tool | Vite | 7 | Fast HMR, ESM-native, simple config |
| Styling | Tailwind CSS | v4 | Utility-first, no runtime overhead |
| Routing | React Router | v7 | Nested routes, layout composition |
| HTTP | Axios | ^1.13 | Interceptors for auth token injection + 401 handling |
| API contract | `@metacall/protocol` | ^0.1.27 | Shared types with metacall/faas and metacall/deploy |
| Icons | Lucide React | ^0.575 | Consistent, tree-shakable icon set |
| ZIP handling | JSZip | ^3.10 | In-browser ZIP creation for package uploads |
| Toasts | Sonner | ^1.7 | Accessible toast notifications |
| Unit tests | Vitest | ^4 | Vite-native, Jest-compatible |
| E2E tests | Playwright | ^1.48 | Cross-browser, reliable, POM support |
| Linter | ESLint (+ TS + React plugins) | ^9 | Catches type and hook errors |
| Formatter | Prettier | ^3.8 | Uniform style, no arguments |

---

## Full Folder Structure

```
Dashboard/
├── src/
│   ├── main.tsx                    # App entry point — mounts <App /> into DOM
│   ├── App.tsx                     # Root component — wraps AppProviders + AppRouter
│   ├── App.css                     # Global base styles
│   │
│   ├── app/                        # App-level bootstrap only (no business logic here)
│   │   ├── config/
│   │   │   └── env.ts              # Type-safe env config object (VITE_* vars)
│   │   ├── providers/
│   │   │   └── AppProviders.tsx    # BrowserRouter + AuthProvider wrapper
│   │   └── router/
│   │       └── AppRouter.tsx       # All route definitions, guards, lazy loading
│   │
│   ├── features/                   # Feature-first business logic
│   │   ├── auth/                   # Login, signup, session
│   │   │   ├── components/         # LoginForm, SignupForm UI components
│   │   │   ├── hooks/
│   │   │   │   └── useAuth.tsx     # AuthContext + AuthProvider + useAuth hook
│   │   │   ├── pages/
│   │   │   │   ├── LoginPage.tsx
│   │   │   │   └── SignupPage.tsx
│   │   │   ├── services/           # (empty — auth calls live in api-client.ts)
│   │   │   └── types/              # Auth-specific TypeScript types
│   │   │
│   │   ├── dashboard/              # Home overview page
│   │   │   └── pages/
│   │   │       └── DashboardPage.tsx
│   │   │
│   │   ├── deployments/            # Core feature: deploy, inspect, delete, test
│   │   │   ├── components/
│   │   │   │   └── DeployWizard.tsx  # 3-step ZIP deploy wizard
│   │   │   ├── hooks/
│   │   │   │   ├── useDeployments.ts         # Polling hook for /api/inspect
│   │   │   │   └── useDeploymentMonitor.ts   # Post-deploy status polling
│   │   │   ├── pages/
│   │   │   │   ├── DeploymentsPage.tsx       # Deployment list
│   │   │   │   ├── DeployPage.tsx            # Deploy hub (choose ZIP or repo)
│   │   │   │   ├── DeployRepositoryPage.tsx  # Git repo deploy flow
│   │   │   │   └── DeploymentFunctionPage.tsx # Deployment detail + function tester
│   │   │   ├── services/           # (empty — calls go through api-client.ts)
│   │   │   └── types/              # Deployment-specific types
│   │   │
│   │   ├── logs/
│   │   │   └── pages/
│   │   │       └── LogsViewerPage.tsx  # Fetches and displays deployment logs
│   │   │
│   │   ├── settings/
│   │   │   └── pages/
│   │   │       └── SettingsPage.tsx
│   │   │
│   │   ├── plan/
│   │   │   └── pages/
│   │   │       └── PlanPage.tsx        # Subscription plan UI
│   │   │
│   │   ├── chat/
│   │   │   └── pages/
│   │   │       └── ChatPage.tsx        # MetaCall support chat
│   │   │
│   │   └── errors/
│   │       └── pages/
│   │           └── NotFoundPage.tsx
│   │
│   ├── lib/                        # Infrastructure / integrations
│   │   ├── api-client.ts           # Axios instance + all API method definitions
│   │   ├── utils.ts                # Pure utility functions (cn, formatDate, timeAgo, etc.)
│   │   └── api/                    # (directory reserved, currently empty)
│   │
│   ├── shared/                     # Reusable across all features
│   │   ├── constants/              # App-wide constants
│   │   ├── errors/                 # Shared error types / utilities
│   │   ├── layout/
│   │   │   └── AppShell.tsx        # Persistent layout: Sidebar + Navbar + main content
│   │   ├── lib/                    # Shared pure helpers
│   │   ├── styles/                 # Tailwind customizations, global tokens
│   │   ├── types/                  # Shared TypeScript types (Deployment, Plans, etc.)
│   │   └── ui/                     # Design-system primitives
│   │       ├── LoadingState.tsx     # Spinner and skeleton components
│   │       ├── ProgressBar.tsx      # Deployment progress with status values
│   │       └── ...                 # Buttons, badges, modals, etc.
│   │
│   ├── assets/                     # Images, logos, SVGs
│   ├── styles/                     # Global CSS entry point
│   └── tests/                      # Vitest unit tests
│
├── tests/                          # Playwright E2E tests
│   ├── e2e/
│   │   ├── auth/                   # Login, signup, logout specs
│   │   ├── deployments/            # Deploy, inspect, delete specs
│   │   ├── logs/                   # Log viewer specs
│   │   └── smoke/                  # Quick sanity checks
│   ├── pages/                      # Page Object Models
│   ├── fixtures/                   # Shared Playwright fixtures
│   ├── mocks/                      # API mock data
│   ├── utils/                      # Test helper functions
│   ├── storage/                    # Saved auth state (auth.json)
│   └── global/                     # globalSetup.ts / globalTeardown.ts
│
├── public/                         # Static files (favicon, etc.)
├── .env.example                    # Required environment variables template
├── vite.config.ts                  # Vite build + dev proxy config
├── playwright.config.ts            # Playwright test configuration
├── eslint.config.js                # ESLint rules
├── .prettierrc                     # Prettier formatting rules
├── tsconfig.json                   # TypeScript root config
├── tsconfig.app.json               # App-specific TS settings (strict mode)
└── tsconfig.node.json              # Node-specific TS settings (vite.config)
```

---

## Application Bootstrap

The app mounts in this order:

```
index.html
  └─► src/main.tsx
        └─► <App />  (App.tsx)
              └─► <AppProviders>            # BrowserRouter + AuthProvider
                    └─► <AppRouter />       # All routes defined here
                          ├─► <GuestRoute>  # Redirects logged-in users away from /login
                          └─► <ProtectedRoute>  # Redirects unauthenticated users to /login
                                └─► <AppLayout>  # AppShell Navbar
                                      └─► <Suspense> + lazy-loaded page component
```

---

## Authentication System

Auth is managed entirely in `src/features/auth/hooks/useAuth.tsx`.

### How it works

```
User opens app
  → AuthProvider reads localStorage
    → 'faas_token' + 'faas_user_email' both present?
      → Set user = { email } immediately (no network call)
    → Either missing?
      → user = null → ProtectedRoute redirects to /login

User submits Login form
  → POST /api/auth/login { email, password }
  ← { token }
  → localStorage.setItem('faas_token', token)
  → localStorage.setItem('faas_user_email', email)
  → setUser({ email })
  → React Router navigates to /

User logs out
  → localStorage.removeItem('faas_token')
  → localStorage.removeItem('faas_user_email')
  → setUser(null)
  → window.location.href = '/login'
```

### 401 Handling

The Axios response interceptor in `src/lib/api-client.ts` intercepts every 401 response. If the user is not already on `/login` or `/signup`, it:

1. Removes the token from localStorage
2. Redirects to `/login` via `window.location.href`

This covers expired tokens, revoked sessions, and server restarts that clear tokens.

### Important: Local FaaS Auth Behavior

The local `metacall/faas` server does **not validate tokens**. `GET /validate` always returns `true`. However, the login/signup endpoints **do** check credentials (the FaaS has its own user store). This means:

- A user must still sign up and log in — they cannot just make up a token
- Once logged in, the token is stored in localStorage and sent on every request
- The FaaS will accept any Bearer token for most endpoints (except login/signup)

---

## Routing System

All routes are defined in `src/app/router/AppRouter.tsx`. Route components are **lazy-loaded** using `React.lazy()` to reduce initial bundle size.

### Route Guard Pattern

Two route guards are implemented as layout components:

**`<GuestRoute />`** — wraps `/login` and `/signup`. If the user is already logged in, redirects to the page they were trying to reach (stored in `location.state.from`), or `/` by default.

**`<ProtectedRoute />`** — wraps all authenticated routes. If user is null, redirects to `/login` with the current `location` in state so the user is returned after login.

### Full Route Table

| Path | Component | Guard | Description |
|---|---|---|---|
| `/login` | `LoginPage` | Guest only | Login form |
| `/signup` | `SignupPage` | Guest only | Registration form |
| `/` | `DashboardPage` | Auth required | Overview: stats, server status |
| `/deployments` | `DeploymentsPage` | Auth required | Full deployments list |
| `/deployments/new` | `DeployHubPage` | Auth required | Choose ZIP or repo deploy |
| `/deployments/new/wizard` | `DeployWizardPage` | Auth required | 3-step ZIP upload wizard |
| `/deployments/new/repository` | `DeployRepositoryPage` | Auth required | Git repo deploy |
| `/deployments/:id` | `DeploymentFunctionPage` | Auth required | Detail + function tester |
| `/deployments/:id/logs` | `LogsViewerPage` | Auth required | Log viewer |
| `/settings` | `SettingsPage` | Auth required | User preferences |
| `/plans` | `PlanPage` | Auth required | Subscription plans |
| `/chat` | `ChatPage` | Auth required | MetaCall support |
| `*` | `NotFoundPage` | Auth required | 404 fallback |

---

## API Layer

### How API calls work

All HTTP communication lives in **`src/lib/api-client.ts`**. It exposes a single `api` object with typed methods.

```typescript
// How a component makes an API call:
const deployments = await api.inspect();

// What happens internally:
// 1. Axios sends GET /api/inspect with Authorization: Bearer <token>
// 2. Vite proxy forwards to http://localhost:9000/api/inspect (dev only)
// 3. FaaS returns Deployment[]
// 4. Axios interceptor checks for 401 — handles session expiry if needed
// 5. Typed response is returned to the caller
```

### Vite Proxy

In development, `vite.config.ts` proxies `/api` and function call paths to the FaaS server. This avoids CORS issues:

```typescript
// vite.config.ts (simplified)
proxy: {
  '/api': 'http://localhost:9000',
  '/:prefix/:suffix': 'http://localhost:9000',
}
```

In production builds, `VITE_FAAS_URL` is embedded at build time and used as the `baseURL` for Axios directly.

### Polling Pattern

The `useDeployments` hook polls `GET /api/inspect` every 30 seconds. It uses:

- `AbortController` to cancel in-flight requests on component unmount
- `document.visibilitychange` event to resume polling immediately when the user returns to the tab (instead of waiting for the next interval)
- A `tick` state integer as the `useEffect` dependency to trigger re-fetches imperatively via `refetch()`

---

## Deployment Monitor

After a new deployment is submitted, `useDeploymentMonitor` polls `GET /api/inspect` every ~1.5 seconds, looking for the deployed suffix to appear with `status: 'ready'` (or `'error'`). It calls `onReady` or `onFailed` callbacks accordingly.

This gives the wizard its "building → ready" progress feedback.

---

## Design System

| Token | Value | Usage |
|---|---|---|
| Primary (Cyan) | `#05b2d1` | Buttons, links, active states |
| Secondary (Purple) | `#7b2fff` | Accents, highlights |
| Background | `#0d1117` | Page background |
| Surface | `#161b22` | Cards, panels |
| Border | `#30363d` | Dividers, input borders |
| Font (UI) | Inter | All interface text |
| Font (Code / Logs) | JetBrains Mono | Log viewer, code blocks |

Design tokens are defined in `src/shared/styles/` and applied via Tailwind CSS v4 utilities.

---

*Next: [Getting Started →](./03-getting-started.md)*
