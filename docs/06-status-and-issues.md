# 06 — Current Status & Known Issues

> **Purpose of this document:** Give the incoming developer or org reviewer an honest, precise picture of what is Partial, what is inPartial, and every known bug or limitation — with enough context to prioritize work.

---

## Feature Completion Matrix

| Feature | Status | Notes |
|---|---|---|
| Login / Signup |  Partial | Works against local FaaS auth endpoints |
| Session persistence |  Partial | Token + email stored in localStorage |
| 401 auto-logout |  Partial | Axios interceptor handles this globally |
| Dashboard overview page |  Partial | Server status, deployment stats |
| Deployment list |  Partial | Polling, status badges, language badges |
| Deploy via ZIP wizard |  Partial | 3-step flow: upload → configure → monitor |
| Deploy from Git repository |  Partial | Branch selection + deploy |
| Deployment detail page |  Partial | Function list, metadata |
| Function invocation tester |  Partial | In-page JSON arg → call → response |
| Deployment deletion |  Partial | With confirmation |
| Logs viewer | Partial | UI Partial, but FaaS logs endpoint is a stub (see Issue #1) |
| Settings page |  Partial | FaaS URL, account settings |
| Plans page | Partial | Plan selection UI (locally mocked) |
| Chat page | Partial | MetaCall support interface |
| Deployment polling | Partial | Auto-refresh every 30s + tab focus resume |
| Post-deploy status monitor | Partial | Polls until ready/error |
| Responsive layout |  Partial | Works on small screens |
| Error boundaries |  Partial | Route-level, with chunk-load recovery |
| Unit tests |  Partial | Framework in place, coverage not Partial |
| E2E tests |  Partial | Auth + smoke flows covered |

---

## Known Issues

### Issue 1 — Logs Endpoint is a Stub (Backend, not Frontend)

**Severity:** Medium  
**Location:** `metacall/faas` — `faas/src/controller/logs.ts`  
**Symptom:** The Logs Viewer page sends `POST /api/deploy/logs` to FaaS. FaaS returns the string `"TODO: Implement Logs..."`. The logs viewer currently displays this placeholder instead of real log output.

**Root cause:** The FaaS backend has not implemented the logs endpoint. The FaaS server already writes output to `faas/logs/app.log` via its logger. The implementation just needs to read and filter that file by deployment suffix.

**Fix location:** `metacall/faas` repository, not in Launchpad.  
**Workaround:** Developers can read `faas/logs/app.log` directly on disk.

---

### Issue 2 — Auth is Intentionally Bypassed on Local FaaS

**Severity:** Low (by design, but needs documentation for new devs)  
**Location:** `metacall/faas` — `faas/src/controller/validate.ts`  
**Symptom:** `GET /validate` always returns `true` regardless of the token. Most protected FaaS endpoints accept any Bearer token.

**Important:** This is intentional for the local development server. It is **not** a security issue in local context. However, a new developer testing with curl may be confused when their manual token-less requests succeed.

**Action for handover:** Document clearly in the project README and Getting Started guide that local FaaS has no real auth enforcement.

---

### Issue 3 — `inspectByName` is a Client-Side Filter, Not a Direct API Call

**Severity:** Low  
**Location:** `src/lib/api-client.ts` — `api.inspectByName()`  
**Symptom:** There is no `GET /api/inspect/:suffix` endpoint on FaaS. `api.inspectByName()` calls `api.inspect()` (which returns all deployments) and then filters client-side.

**Impact:** On the Deployment Detail page and the deployment monitor, every lookup fetches the full list. For local use with a small number of deployments, this is negligible. At scale it would be inefficient.

**Future fix:** FaaS could expose a filtered inspect endpoint. Until then, the client-side filter is the correct approach.

---

### Issue 4 — `loading` is Hardcoded to `false` in AuthProvider

**Severity:** Low  
**Location:** `src/features/auth/hooks/useAuth.tsx` — line 35  
**Code:**
```typescript
const loading = false;
```

**Context:** Auth state is initialized synchronously from localStorage in the `useState` initializer. There is no async auth validation call on startup (unlike apps that verify the token against the server on load). This means `loading` is always `false` — there is no async auth phase to show a spinner for.

**Note:** This is a deliberate simplification. If a future version adds server-side token validation on startup (e.g., calling `GET /validate` before rendering), `loading` would need to become actual state.

---

### Issue 5 — Deployment Detail Route Uses `:id` but FaaS Uses `suffix`

**Severity:** Low (cosmetic inconsistency)  
**Location:** `AppRouter.tsx` — `/deployments/:id` route  
**Context:** The URL parameter is named `:id` but the FaaS API identifies deployments by `suffix`. The detail page extracts the URL param and passes it to `api.inspectByName(suffix)`. It works, but the naming is inconsistent.

---

## Known Backend Bugs (in `metacall/faas`, tracked for awareness)

These are bugs in the FaaS backend that affect Launchpad behavior. They are documented here so the incoming team knows what to expect and where to look.

### Backend Bug A — Logger Color Infinite Loop

**File:** `faas/src/utils/logger.ts` lines 44–58  
**Symptom:** When 17+ simultaneous deployments exist, the FaaS color assignment loop spins forever, freezing the entire FaaS Node.js process.  
**Fix:** Replace the random search loop with round-robin: `colorIndex % ANSICode.length`.

### Backend Bug B — Promise Race on Worker Exit

**File:** `faas/src/utils/deploy.ts` lines 77–92  
**Symptom:** The `proc.on('exit', ...)` handler fires for every process exit including normal ones, calling `deployReject()` on an already-settled Promise. Silently ignored by JS but hides real crash errors.  
**Fix:** Add a `settled` flag — only call `deployReject` if `!settled`.

### Backend Bug C — `--serverUrl` CLI Flag Broken

**Location:** `metacall/deploy` — `deploy/src/index.ts`  
**Symptom:** The `--serverUrl` CLI flag is parsed but applied after the API client is constructed. It has no effect.  
**Workaround:** Use `--dev` flag to target `localhost:9000`.

---

## Open Work Items

These are features or improvements that are not yet done and should be picked up by the incoming team:

| Item | Priority | Description |
|---|---|---|
| Logs endpoint implementation | High | Implement `POST /api/deploy/logs` in `metacall/faas` to read from `faas/logs/app.log` |
| Increase unit test coverage | Medium | Current Vitest tests cover utilities but not hooks or page components |
| Expand E2E test coverage | Medium | Auth + smoke flows exist; deployment create/delete flows need tests |
| Server-side token validation on startup | Low | Call `GET /validate` on app load to verify stored token is still valid |
| Deployment suffix-based API filter | Low | Add `GET /api/inspect/:suffix` to FaaS to avoid full list fetch for detail lookups |
| Mobile layout polish | Low | Layout is responsive but some pages have minor wrapping issues on small screens |

---

*Next: [Testing Guide →](./07-testing.md)*
