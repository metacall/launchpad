# MetaCall FaaS Dashboard - TODO

## Snapshot

The dashboard already has a solid frontend base:

- Auth screens, protected routes, and the main app shell are in place.
- Dashboard, deployments list, deployment function, logs but now working , settings ui only, plans ui only, and chat routes all exist.
- ZIP deploy and repository deploy flows are wired to backend calls.
- Unit tests and Playwright smoke tests are set up.


## Highest Priority

- [ ] Align the auth story. The app stores auth in `localStorage`, while `VITE_FAAS_TOKEN` still appears in config and docs. Pick one clear development and runtime strategy.
- [ ] Clean up the API layer. `src/lib/api/index.ts` points to a missing `./client`, while the app actually imports `@/lib/api-client` everywhere.
- [ ] Make the README match reality. Keep setup, scripts, and feature status synced with the actual codebase.

## Product Gaps

- [ ] Finish the plan and billing flow. `PlanPage` is still a UI-only checkout experience with no real payment or subscription integration.
- [ ] Replace the simulated support chat with a real backend or assistant integration.
- [ ] Turn local-only settings actions into real account actions, especially password update, billing history, and account deletion.
- [ ] Add a clear success state after deployment so users know when a deploy is queued, building, ready, or failed.

## Deployment Flow Improvements

- [ ] Validate ZIP contents more clearly before deploy and surface better errors when `metacall.json` or generated config is wrong.
- [ ] Improve repository deployment feedback for invalid URLs, empty branches, rate limits, and provider-specific failures.
- [ ] Expose more deployment metadata in the detail page, especially environment variables, status history, and richer runtime info.
- [ ] Revisit the plan-to-launchpad logic on the dashboard so plan cards, free tier behavior, and deployment states feel consistent.

## Ui Standardize 

- [ ] Remove dead comments, rough edges, and placeholder copy across the UI.
- [ ] Tighten mobile behavior on deployment and settings screens.
- [ ] Standardize loading, empty, and error states so they feel like one product.
- [ ] Add lightweight toast or banner feedback for save, deploy, delete, and retry actions.

## Testing

- [ ] Expand unit coverage beyond shared UI primitives into auth, deploy, logs, and route guards.
- [ ] Grow Playwright coverage from smoke tests into real user journeys: login, deploy, inspect, delete, and settings.
- [ ] Add a stable mock strategy for backend-dependent UI flows so tests do not rely on a live FaaS server for basic confidence.

## Repo Hygiene

- [ ] Keep generated artifacts out of commits. `dist/`, `playwright-report/`, and `test-results/` should stay local-only.
- [ ] Add a short contributor workflow for install, run, unit tests, and smoke tests.
- [ ] Normalize naming and structure in docs so `Dashboard/` paths, scripts, and env usage are easy to follow.

## Local Triad / Launchpad Support

Part of the `metacall/faas` + `metacall/deploy` + `metacall/launchpad` local packaging
effort. Details: https://github.com/metacall/launchpad/issues/28

- [ ] Add a `main.tsx` bootstrap step that fetches `/__launchpad/config` before the
      app renders.
- [ ] Build the FaaS URL resolution chain: launchpad config → `localStorage['faas_url']`
      → `VITE_FAAS_URL` → same-origin (current behavior last, not first).
- [ ] If the `/__launchpad/config` fetch 404s or errors, fall through silently to
      today's behavior — no console errors, no broken render.
- [ ] Seed `localStorage['faas_token'] = 'local'` when runtime config says
      `mode: 'local'`, before the router mounts.
- [ ] Make sure the local-mode token seed only ever runs once and never overwrites a
      real token a user already logged in with.
- [ ] Skip the `/login` redirect in `AppRouter.tsx` when running in local mode.
- [ ] Add a "Local mode — no account" empty state on the Settings page.
- [ ] Hide or disable the billing/CLI-token panels on the Settings page in local mode.
- [ ] Add a small "FaaS URL" override field in Settings that writes to
      `localStorage['faas_url']`, for when a user runs FaaS on a non-default port.
- [ ] Confirm hosted `dashboard.metacall.io` build is byte-identical when the config
      probe 404s (no regression for production).
