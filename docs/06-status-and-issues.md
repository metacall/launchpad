# 06 — Current Status & Known Issues

> **Purpose of this document:** Give an incoming developer or org reviewer an honest, evidence-based picture of what is working, what is partial, every confirmed unresolved bug, and every open work item — with enough context to prioritise work immediately.

---

## A. Audit Metadata

| Field | Value |
|---|---|
| Last verified | 2026-11-12 |
| Repository | metacall/launchpad |
| Branch | `upstream/master` |
| HEAD commit | `45e6332` |
| Scope | All source files in `src/`; GitHub issues #9, #14, #19, #20, #28, #29, #31, #44, #51, #53, #62, #68, #70, #76; PRs #52, #54, #63, #65, #69, #71, #73, #74, #75, #77, #78, #79 |
| Related repositories checked | `metacall/faas` (master), `@metacall/protocol` (npm ^0.1.27), `metacall/deploy` (master) |

---

## B. Feature Completion Matrix

| Feature | Status | Current Implementation | Remaining Gap | Evidence |
|---|---|---|---|---|
| Login / Signup | COMPLETE | `LoginPage.tsx` / `SignupPage.tsx` call `api.login()` / `api.signup()` via `@metacall/protocol`; Turnstile CAPTCHA supported | None in frontend | Source files; `api-client.ts` |
| Session persistence | COMPLETE | `AuthProvider` reads `localStorage` (`faas_token`, `faas_user_email`) synchronously in `useState` initializer | No server-side validation on startup — intentional (see Issue 2) | `useAuth.tsx` |
| Local mode auto-login | COMPLETE | `isLocalMode()` checked in `AuthProvider`; returns `{ email: 'Local mode' }` without credentials; logout hidden in local mode | None | `useAuth.tsx`, `Navbar.tsx`, `runtime.ts` |
| 401 auto-logout | COMPLETE | PR #79: `setUnauthorizedHandler` / `notifyUnauthorized` added to `api-client.ts`; `UnauthorizedHandlerRegistrar` wires logout+navigate in `AppProviders.tsx`; local mode guard; single-fire flag | None — awaiting merge | `api-client.ts`; PR #79 open |
| Dashboard overview | COMPLETE | `DashboardPage` shows plan slots, deployment cards, and a deployments table; `useDeployments` polls every 30 s (3 s while pending deploys exist) | None | `DashboardPage.tsx`, `useDeployments.ts` |
| Error boundaries | COMPLETE | `AppRouter.tsx` wraps all protected routes in `<ErrorBoundary FallbackComponent={RouteErrorFallback}>`; fallback offers a page refresh | None | `AppRouter.tsx` |
| Deployment list | COMPLETE | `DeploymentsPage` renders `DeploymentTable`; polling, status badges, language badges, delete with confirmation, refetch button | None | `DeploymentsPage.tsx`, `DeploymentTable.tsx` |
| ZIP deployment wizard | COMPLETE | `DeployWizardPage` reads ZIP via JSZip, shows file tree with per-file selection, injects `metacall-{i}.json` configs, calls `api.upload()` then `api.deploy()`; plan/subscription validation; slot-occupied guard | None | `DeployWizard/index.tsx` |
| Git repository deployment | COMPLETE | `DeployRepositoryPage` auto-fetches branches from GitHub/GitLab APIs (rate-limit aware), detects languages from `metacall.json`, calls `api.add()` then `api.deploy()`; env vars; plan/subscription validation | None | `DeployRepositoryPage.tsx` |
| Deployment detail page | COMPLETE | `DeploymentFunctionPage` calls `api.inspectByName()`, shows packages, functions count, invocation endpoint, delete action, link to logs | Env vars from inspect response not surfaced in Config panel (issue #53, PR #54 open) | `DeploymentFunctionPage.tsx` |
| Function invocation tester | COMPLETE | `FunctionRow` calls `api.call()` with parsed JSON args; uses `GET` for no-args, `POST` otherwise; shows formatted response or error | None | `FunctionRow.tsx` |
| Deployment deletion | COMPLETE | Calls `api.deployDelete()`; toast on success/failure; confirmation modal | None | `DeploymentsPage.tsx`, `DeploymentFunctionPage.tsx` |
| Deployment polling | COMPLETE | `useDeployments` uses `AbortController`, `visibilitychange` listener, `clearInterval` on unmount; no memory leak | None | `useDeployments.ts` |
| Post-deploy status monitor | COMPLETE | `useDeploymentMonitor` polls `api.inspectByName()` every 1 500 ms; `stopped` flag prevents double-resolve; aborts inflight request on cleanup | None | `useDeploymentMonitor.ts` |
| Logs viewer | PARTIAL | `LogsViewerPage` + `useLogs` calls `POST /api/deploy/logs`; exponential backoff; terminal-state polling stops; ANSI strip; structured log parsing | FaaS `logs.ts` backend is an unimplemented stub — returns `"TODO: Implement Logs..."` | `useLogs.ts`; issue #51 |
| Settings — account details | COMPLETE | Shows email (read-only), masked CLI token with refresh | None | `SettingsPage.tsx` |
| Settings — password change | COMPLETE | Calls `api.changePassword()`; `404` now throws `ApiError` with clear message; network errors propagate via `mapError`; no false success | None — fixed in current master | `api-client.ts`; issue #20 |
| Settings — account deletion | COMPLETE | Calls `api.deleteAccount()` → `DELETE /api/account`; on success calls `logout()` and clears `faas_vat_id` from localStorage | None | `api-client.ts`, `SettingsPage.tsx` |
| Settings — VAT ID | PARTIAL | VAT ID saved to `localStorage` only; not POSTed to any backend API | No server-side VAT storage endpoint exists; localStorage intentional for now | `SettingsPage.tsx` |
| Settings — billing history | PARTIAL | Calls `api.listSubscriptionsDeploys()`; renders billing table; PDF invoice download via `downloadInvoicePDF` | Local FaaS returns mock billing data; amounts always `€0.00` | `SettingsPage.tsx`, `api-client.ts` |
| Settings — subscription cancellation | PARTIAL | Cancel button calls `handleCancelSubscription` which only re-fetches data — no actual cancellation API call; shows false-success toast | PR #75 (open) will remove this no-op | `SettingsPage.tsx` lines ~213–226; PR #75 |
| Settings — FaaS URL override | PARTIAL | `getBaseUrl()` reads `localStorage[LS_FAAS_URL_KEY]` but no UI writes it | PR #77 (open) adds the URL input card | `api-client.ts`; issue #76; PR #77 |
| Plans / billing page | PARTIAL | Shows plan cards with correct pricing and features | All plan buttons are `disabled` with label "Coming Soon"; no Stripe or checkout integration | `PlanPage.tsx` |
| Chat page | PARTIAL | Chat UI renders correctly; messages send and receive; typing indicator works | Responses are canned: `cannedFollowUps = ['Under Development Right now']`; no rule-based assistant | `ChatInterface.tsx`; issue #70; PR #71 declined |
| Responsive layout / touch targets | COMPLETE | PR #69 merged; Navbar mobile hamburger `w-11 h-11`; mobile menu items `min-h-11`; Deployments table hides columns on small screens; `AppShell` uses `overflow-x-hidden` | Deployment detail sidebar still uses `hidden md:flex` — config/endpoint panels inaccessible on mobile (PR #54 open) | `Navbar.tsx`, `AppShell.tsx`; PR #69 |
| Unit tests | COMPLETE | 25+ test files in `src/tests/unit/`; covers hooks, pages, components, API client, router | None — framework fully in place with broad coverage | `src/tests/unit/` |
| E2E tests | PARTIAL | Playwright specs in `tests/e2e/`: auth, dashboard, deployments, plans, settings, smoke | No log viewer E2E spec; logs directory has only `.gitkeep` | `tests/e2e/`; issue #70 |

---

## C. Known Issues (confirmed, unresolved)

### Issue 1 — Logs Endpoint is a Stub (Backend)

**Severity:** High
**Repository / file:** `metacall/faas` — `src/controller/logs.ts`
**Current behaviour:** Every call to `POST /api/deploy/logs` returns the literal string `"TODO: Implement Logs..."`. The FaaS logger writes output to `faas/logs/app.log` via `appendFileSync`, but the endpoint does not read that file.
**Expected behaviour:** The endpoint should read (and optionally stream) log lines from `faas/logs/app.log`, filter by deployment suffix, and return them.
**Root cause:** The function body has never been implemented beyond a placeholder response.
**Issue / PR links:** [#51](https://github.com/metacall/launchpad/issues/51), [#19](https://github.com/metacall/launchpad/issues/19)
**Maintainer decision:** Deferred to `metacall/faas`; frontend implementation (polling, backoff, terminal-state guards) was completed by PR [#52](https://github.com/metacall/launchpad/pull/52).
**Recommended next action:** Implement `faas/src/controller/logs.ts` to read `faas/logs/app.log` and filter by `req.body.suffix`. See issue #51 for acceptance criteria.

---

### Issue 2 — `loading` Hardcoded to `false` in AuthProvider (No Startup Token Validation)

**Severity:** Low
**Repository / file:** `src/features/auth/hooks/useAuth.tsx`
**Current behaviour:** Auth state is resolved synchronously from `localStorage`. No async call to `GET /validate` on startup. `loading` is always `false`. PRs [#74](https://github.com/metacall/launchpad/pull/74) and [#75](https://github.com/metacall/launchpad/pull/75) are open and propose adding startup session validation — their code is not yet in master.
**Root cause:** Intentional simplification — session is trusted from localStorage until a 401 from an API call.
**Issue / PR links:** PRs [#74](https://github.com/metacall/launchpad/pull/74) and [#75](https://github.com/metacall/launchpad/pull/75) open/unmerged.
**Recommended next action:** Merge PR #74 or #75 when ready.

---

### Issue 3 — `inspectByName` Has No Server-Side Filter Endpoint

**Severity:** Low
**Repository / file:** `src/lib/api-client.ts` — `api.inspectByName()`
**Current behaviour:** Calls `getProtocol().inspectByName(suffix)` from `@metacall/protocol`, which filters the full `GET /api/inspect` list client-side. No `/api/inspect/:suffix` endpoint exists in FaaS.
**Impact:** Each detail page load fetches the full deployment list. For local use this is negligible; at scale it is wasteful.
**Recommended next action:** Add `GET /api/inspect/:suffix` to `metacall/faas` and update `@metacall/protocol`. Low priority.

---

### Issue 4 — Subscription Cancellation is a UI No-Op

**Severity:** Medium
**Repository / file:** `src/features/settings/pages/SettingsPage.tsx` — `handleCancelSubscription()`
**Current behaviour:** Clicking "Cancel Subscription" shows a confirmation dialog, re-fetches the same data, then shows a success toast — no cancellation API call is made.
**Root cause:** No cancellation endpoint exists in local FaaS or in `@metacall/protocol`.
**Issue / PR links:** PR [#75](https://github.com/metacall/launchpad/pull/75) (open) will remove this no-op.
**Recommended next action:** Merge PR #75.

---

### Issue 5 — Deployment Detail Sidebar Inaccessible on Mobile

**Severity:** Medium
**Repository / file:** `src/features/deployments/pages/DeploymentFunctionPage.tsx`
**Current behaviour:** The config/endpoint sidebar uses `hidden md:flex` — entirely invisible on mobile viewports.
**Issue / PR links:** Issue [#53](https://github.com/metacall/launchpad/issues/53), PR [#54](https://github.com/metacall/launchpad/pull/54) open.
**Recommended next action:** Merge PR #54.

---

### Issue 6 — Auth is Intentionally Bypassed on Local FaaS

**Severity:** Low (by design)
**Repository / file:** `metacall/faas` — `src/controller/validate.ts`
**Current behaviour:** `GET /validate` always returns `{ status: 'success', data: true }` regardless of the token. This is intentional for local development.
**Root cause:** Intentional design — local FaaS is not a multi-tenant service.
**Recommended next action:** Document for new contributors. No code change needed.

---

## D. Known Backend Bugs

### Bug A — Logger Color Infinite Loop (metacall/faas)

**Status:** FIXED
**Previous claim:** A random search loop could spin forever with 17+ deployments.
**Actual code (master):** Color assignment uses `const colorCode = ANSICode[colorIndex++ % ANSICode.length]` — correct round-robin pattern.
**Action:** No action needed.

---

### Bug B — Promise Race on Worker Exit (metacall/faas `src/utils/deploy.ts`)

**Status:** CONFIRMED UNRESOLVED
**Symptom:** The `proc.on('exit', ...)` handler calls `deployReject(...)` unconditionally. If the worker process exits during an in-flight function call, the caller's promise never resolves. The `TODO` comment in the source acknowledges this.
**Recommended fix:** Add `let settled = false` before the promise constructor; set `settled = true` inside `deployResolve`; guard `deployReject` in `proc.on('exit', ...)` with `if (!settled)`.

---

### Bug C — `--serverUrl` CLI Flag Timing (metacall/deploy `src/index.ts`)

**Status:** CONFIRMED UNRESOLVED
**Symptom:** The `--serverUrl` flag is applied to `config.baseURL` **after** `API(config.token, config.baseURL)` is already constructed. The override has no effect.
**Workaround:** Use `--dev` to target `localhost:9000`.
**Recommended fix:** Move the `config.baseURL = args['serverUrl']` override above the `API()` constructor call, or pass the resolved URL inline: `API(config.token, args['serverUrl'] ?? ...)`.

---

## E. Open Work Items

| Work Item | Priority | Status | Repository | Related Issue / PR | Blocker or Next Action |
|---|---|---|---|---|---|
| Implement `POST /api/deploy/logs` backend endpoint | High | OPEN | `metacall/faas` | [#51](https://github.com/metacall/launchpad/issues/51) | Implement in `faas/src/controller/logs.ts`; read `faas/logs/app.log` by suffix |
| Merge PR #74/#75 — startup auth session validation + account hardening | Medium | OPEN (PRs awaiting review) | `metacall/launchpad` | [#74](https://github.com/metacall/launchpad/pull/74), [#75](https://github.com/metacall/launchpad/pull/75) | Maintainer review and merge |
| Merge PR #77 — FaaS URL field in Settings | Medium | OPEN (PR awaiting review) | `metacall/launchpad` | [#76](https://github.com/metacall/launchpad/issues/76), [#77](https://github.com/metacall/launchpad/pull/77) | Maintainer review and merge |
| Merge PR #79 — 401 auto-logout | Medium | OPEN (PR awaiting review) | `metacall/launchpad` | [#9](https://github.com/metacall/launchpad/issues/9), [#79](https://github.com/metacall/launchpad/pull/79) | Maintainer review and merge |
| Merge PR #78 — route param rename `:id` → `:suffix` | Low | OPEN (PR awaiting review) | `metacall/launchpad` | [#78](https://github.com/metacall/launchpad/pull/78) | Maintainer review and merge |
| Merge PR #54 — deployment detail mobile nav + upload error handling | Medium | OPEN (PR awaiting review) | `metacall/launchpad` | [#53](https://github.com/metacall/launchpad/issues/53), [#54](https://github.com/metacall/launchpad/pull/54) | Maintainer review and merge |
| Fix Promise race on worker exit | Low | OPEN | `metacall/faas` | — | Add `settled` flag in `faas/src/utils/deploy.ts` |
| Fix `--serverUrl` CLI flag timing | Low | OPEN | `metacall/deploy` | [#19](https://github.com/metacall/launchpad/issues/19) | Move override above `API()` constructor |
| Add `@metacall/launchpad` CLI wrapper package | Medium | OPEN | `metacall/launchpad` | [#44](https://github.com/metacall/launchpad/issues/44), [#28](https://github.com/metacall/launchpad/issues/28) | Needs npm org publish access from maintainers |
| Logs E2E spec (`tests/e2e/logs/`) | Low | BLOCKED | `metacall/launchpad` | [#51](https://github.com/metacall/launchpad/issues/51) | Blocked on FaaS logs endpoint implementation |

**Items confirmed CLOSED from prior document version:**
- "Increase unit test coverage" — 25+ Vitest unit test files now cover hooks, pages, and components. **CLOSED.**
- "Mobile layout polish" — PR #69 merged; touch targets and responsive columns in place. **CLOSED.**
- "Remove Axios" — Completed; confirmed in issue [#9](https://github.com/metacall/launchpad/issues/9). **CLOSED.**
- "Logger color infinite loop (Bug A)" — Fixed with round-robin counter in faas master. **CLOSED.**
- "Password change false-success bug" — `404` now throws `ApiError`; network errors propagate via `mapError`. **CLOSED.**
- "useLogs terminal-state polling" — Fixed by PR [#52](https://github.com/metacall/launchpad/pull/52). **CLOSED.**

---

## F. Maintainer Decisions and Constraints

**Local mode auto-login is by design.**
When `runtime.ts` returns `mode: 'local'`, `AuthProvider` skips login entirely and treats the user as signed in with `'Local mode'`. The Navbar hides the Logout button in this mode. Intentional product decision — no `GET /validate` on startup because there are no accounts in local mode. See issues [#28](https://github.com/metacall/launchpad/issues/28) and [#31](https://github.com/metacall/launchpad/issues/31).

**`VITE_AUTH_URL` is intentionally absent from `.env.example`.**
PR [#63](https://github.com/metacall/launchpad/pull/63) was explicitly closed by maintainer `codxbrexx` with the comment: *"Since VITE_AUTH_URL is already handled with a default fallback to the dev server proxy, adding it to .env.example is not necessary for the current setup."* Do not reopen without new justification.

**Chat assistant is explicitly deferred.**
PR [#71](https://github.com/metacall/launchpad/pull/71) was closed by the maintainer as outside the current project scope. Do not reimplement chat until the maintainer changes this decision.

**Billing is mock-only on local FaaS.**
`GET /api/billing/plans` and `GET /api/billing/current` return hardcoded arrays. The Plans page shows real prices but all buttons are "Coming Soon". Intentional for local development — see issue [#20](https://github.com/metacall/launchpad/issues/20).

**VAT ID stored in `localStorage` only.**
No backend endpoint for VAT storage exists. The UI stores the value locally for display purposes only. Known gap, not a bug.

**`@metacall/protocol` as single API contract.**
Per issue [#19](https://github.com/metacall/launchpad/issues/19), all four repositories should use `@metacall/protocol` as the sole source of type definitions. Duplicate types in `metacall/deploy` and `metacall/faas` are deferred technical debt.

**`@metacall/launchpad` CLI wrapper requires npm org access.**
Issues [#28](https://github.com/metacall/launchpad/issues/28) and [#44](https://github.com/metacall/launchpad/issues/44) describe packaging the dashboard as `@metacall/launchpad`. The runtime config endpoint (`/__launchpad/config`) infrastructure is already implemented in `src/app/config/runtime.ts`; only the wrapper package publish access is missing (needs `@viferga`).

---

## G. Contribution Opportunities

The following tasks are independent, well-scoped, and not currently covered by an open PR. Ranked by priority and feasibility.

**1. Implement FaaS logs endpoint (`metacall/faas`) — High priority, complex (different repo)**
Implement `faas/src/controller/logs.ts` to read from `faas/logs/app.log`, filter lines by the requested `suffix`, and return them. See issue [#51](https://github.com/metacall/launchpad/issues/51) for full acceptance criteria. Highest-value unblocked backend task — it unblocks the entire logs viewer frontend.

**2. Fix Promise race on worker exit (`metacall/faas`) — Low priority, medium**
In `metacall/faas/src/utils/deploy.ts`, add a `settled` boolean; guard `deployReject` in `proc.on('exit')` with `if (!settled) { settled = true; deployReject(...); }`.

**3. Fix `--serverUrl` CLI flag timing (`metacall/deploy`) — Low priority, easy (different repo)**
In `metacall/deploy/src/index.ts`, move the `config.baseURL = args['serverUrl']` assignment above the `API()` constructor call.

**4. Add `@metacall/launchpad` CLI wrapper package — Medium priority, requires coordination**
The `cli/` directory structure exists; needs npm org publish access from `@viferga`. Contact maintainer before starting — see issue [#44](https://github.com/metacall/launchpad/issues/44).

**5. Add `/api/inspect/:suffix` to FaaS — Low priority, requires Protocol coordination**
Eliminates the client-side filter in `api.inspectByName()`. Requires a matching change in `@metacall/protocol` and `metacall/faas`. Discuss with maintainers before implementing — see issue [#19](https://github.com/metacall/launchpad/issues/19).

---

*Next: [Testing Guide →](./07-testing.md)*
