# Contrib-A Test Results — Restore 401 Auto-Logout

**Branch:** `fix/restore-401-auto-logout`  
**Base commit:** `45e6332`  
**Commit:** `9a3393c` (review fix commits: `38f454f` amends `feccbc8`)

---

## Files changed

| File | Change |
|------|--------|
| `src/lib/api-client.ts` | Added `setUnauthorizedHandler`, `notifyUnauthorized`, `resetUnauthorizedFired` exports; added 401/success detection in `authFetch`, `logs`, `call`, `listSubscriptionsDeploys`; improved `mapError` to parse HTTP status codes from plain `Error` messages (Protocol throws `Error("HTTP 401: ...")`); **fix:** reset `_unauthorizedFired = false` inside `setUnauthorizedHandler` so a re-registered handler always fires |
| `src/app/providers/AppProviders.tsx` | Added `UnauthorizedHandlerRegistrar` component rendered inside `AuthProvider`; calls `setUnauthorizedHandler` on mount with `logout` + `navigate('/login')` |
| `src/features/auth/hooks/useAuth.tsx` | **fix:** removed `window.location.href = '/login'` from `logout()` — navigation is now entirely the caller's responsibility; eliminates the double-navigation on 401 |
| `src/shared/layout/Navbar.tsx` | **fix:** added `navigate('/login')` after `logout()` call in the logout button handler (required since `logout()` no longer self-redirects) |
| `src/features/settings/pages/SettingsPage.tsx` | **fix:** added `navigate('/login')` after `logout()` call in `deleteAccount` success path |
| `src/tests/unit/api_client_test.ts` | Added 6 new tests in `describe('401 auto-logout handler', ...)` |
| `src/tests/unit/settings_page_test.tsx` | **fix:** updated assertions to use `LocationProbe` (React Router location) instead of `window.location.href`, removing the jsdom `window.location` stub workaround that was only needed because of the old `href` redirect |

---

## Verification results

### typecheck
```
(no output — exit 0)
```
✅ PASS

### unit tests — full suite
```
Test Files  1 failed | 23 passed (24)
Tests  1 failed | 188 passed (189)
Duration  229.59s
```
✅ PASS for contribution — 188 tests pass across 23 test files.

**New tests added (all 6 pass):**
1. `calls the unauthorized handler on a 401 response`
2. `does not call the unauthorized handler on a 403 response`
3. `does not call the unauthorized handler on a 500 response`
4. `calls the unauthorized handler at most once for concurrent 401 responses`
5. `does not call the unauthorized handler in local mode`
6. `resets the single-fire guard after a successful response`

**Pre-existing broken test:** `deploy_repository_page_test.tsx` LP-0005 ("handles GitHub URLs correctly") times out at 5000ms. This test is present on the base commit `45e6332` and fails there too — unrelated to this contribution. The same 32-file Prettier format issues that fail `npm run build` via `format:check` are also pre-existing on the base commit.

### build (TypeScript + Vite bundle)
```
vite v7.3.2 building client environment for production...
✓ 2082 modules transformed.
✓ built in 58.46s
```
✅ PASS — TypeScript compilation and Vite bundle succeed.

**Pre-existing:** `npm run build` runs `npm run validate` (which includes full-repo `format:check`) and that exits 1 due to 32 pre-existing format issues in unrelated files (same count on base commit `45e6332`). The TypeScript and bundle steps themselves succeed.

---

## Review findings fixed

### Finding 1 (BLOCKING): Double navigation on 401
**Root cause:** `logout()` in `useAuth.tsx` called `window.location.href = '/login'` (hard reload), and the `AppProviders` handler also called `navigate('/login', { replace: true })` — two navigations per 401.

**Fix:** Removed `window.location.href = '/login'` from `logout()`. Navigation is now the caller's responsibility. All callers updated:
- `Navbar.tsx` logout button: added `navigate('/login')` after `logout()`
- `SettingsPage.tsx` deleteAccount success path: added `navigate('/login')` after `logout()`
- `AppProviders.tsx` 401 handler: already called `navigate('/login', { replace: true })` — no change needed

### Finding 2 (from Details): Single-fire guard not reset on re-registration
**Root cause:** `setUnauthorizedHandler()` overwrote `_unauthorizedHandler` but left `_unauthorizedFired = true` from any previous session, so a re-registered handler would never fire until a 2xx response arrived.

**Fix:** Added `_unauthorizedFired = false` inside `setUnauthorizedHandler()`.

---

## Implementation notes

### Protocol error handling
`@metacall/protocol` throws `new Error("HTTP 401: ...")` (plain `Error`, not `ProtocolError`) from its internal `Request.execute()`. `mapError` parses the HTTP status from plain `Error` messages matching `/^HTTP (\d+):/`, which correctly detects 401s from Protocol-routed calls (`inspect`, `deploy`, `branchList`, etc.).

### Constraints satisfied
| Constraint | Status |
|-----------|--------|
| No circular import between api-client.ts and useAuth/AppProviders | ✅ — `api-client.ts` does not import from either |
| Local mode does not trigger handler | ✅ — `notifyUnauthorized()` returns immediately when `isLocalMode()` is true |
| Multiple concurrent 401s fire handler only once | ✅ — `_unauthorizedFired` boolean blocks all calls after first |
| Only 401 triggers handler; 403/500/network errors do not | ✅ — explicit `=== 401` check at every intercept point |
| Auth system/API client architecture unchanged | ✅ — only plumbing added, no restructuring |
| No double navigation on 401 | ✅ — `logout()` no longer self-redirects |
| Re-registered handler always fires on next 401 | ✅ — `_unauthorizedFired` reset in `setUnauthorizedHandler` |
