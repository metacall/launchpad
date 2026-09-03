# 05 — Key Technical Decisions

> **Purpose of this document:** Explain *why* specific technical choices were made. A new developer should understand the reasoning before they decide to change anything.

---

## Auth: Context + localStorage (not Redux or cookies)

**Decision:** Authentication state is managed using a single React Context (`AuthContext`) with `localStorage` for persistence. No external state library (Redux, Zustand) is used for auth.

**Why:**
- The auth state needed here is minimal: `{ user: { email } | null, loading, login, signup, logout }`. This does not justify a full state management library.
- `localStorage` is appropriate for a local development tool. This is not a production banking app — the threat model for a local FaaS dashboard running on `localhost` does not require `HttpOnly` cookies.
- The Axios 401 interceptor handles token expiry centrally, so no component needs to manage session refresh logic.

**Trade-off:** If the FaaS server is rebuilt in future to support refresh tokens or server-side sessions, the `AuthProvider` and Axios interceptor are the only two files that need to change.

---

## API Layer: Single `api` Object (not per-feature service files)

**Decision:** All HTTP calls are defined as methods on a single `api` object in `src/lib/api-client.ts`.

**Why:**
- The project talks to a single backend (`metacall/faas`). There is no multi-service architecture.
- Keeping all API calls in one place makes it trivial to understand the full API surface of the app.
- The `@metacall/protocol` package already provides typed responses — wrapping each method per feature would add abstraction with no benefit.

**Trade-off:** For a significantly larger app with many backend services, the per-feature service pattern (`features/auth/services/auth.api.ts`) would be better. If Launchpad grows to talk to multiple backends (e.g., a dedicated auth service), this should be refactored.

---

## Routing: React Router v7 with Nested Layouts

**Decision:** All routes use React Router v7's nested `<Route>` pattern. Protected routes are implemented as layout-route guards (`<ProtectedRoute />`, `<GuestRoute />`), not higher-order components.

**Why:**
- The layout-route guard pattern is idiomatic with React Router v6+/v7. It avoids wrapping individual route components and instead uses `<Outlet />` composition.
- This makes the route tree in `AppRouter.tsx` readable as a single source of truth — the nesting itself communicates the auth and layout requirements.
- `<AppLayout>` (Navbar + Sidebar) is applied once as a layout route, so it renders consistently for all protected pages without being imported on every page.

**Trade-off:** Developers unfamiliar with the `<Outlet />` pattern may find it confusing initially. The router file in `AppRouter.tsx` is the single place to look.

---

## Code Splitting: All Pages Lazy-Loaded

**Decision:** Every page component is loaded via `React.lazy()` and wrapped in `<Suspense>`.

**Why:**
- Reduces the initial JS bundle. A user opening the login page does not download the DeployWizard or LogsViewer code.
- Vite supports dynamic imports natively with zero extra configuration.
- An `<ErrorBoundary>` wraps the Suspense to catch chunk-load failures (e.g., after a new build where the chunk hash changed).

**Implementation:** `AppRouter.tsx` — all lazy imports are at the top. The `<RouteErrorFallback>` component shows a "Refresh Page" button when a chunk fails to load.

---

## Deployment Polling: AbortController + visibilitychange

**Decision:** `useDeployments` polls every 30 seconds using `setInterval`, but also re-fetches immediately when the user returns to the tab (`document.visibilitychange`). In-flight requests are cancelled on unmount using `AbortController`.

**Why:**
- Polling is the simplest approach for a local dev tool. WebSockets would require FaaS backend changes.
- Without `visibilitychange`, a user who switches away and returns would wait up to 30 seconds to see updated state.
- Without `AbortController`, requests from unmounted components would call `setState` and produce React warnings.

**Where it lives:** `src/features/deployments/hooks/useDeployments.ts`

---

## Post-Deploy Monitoring: 1.5s Tight Poll

**Decision:** After submitting a deployment, `useDeploymentMonitor` polls `GET /api/inspect` every 1.5 seconds until the deployment reaches `'ready'` or `'error'`.

**Why:**
- MetaCall FaaS worker startup is fast for small apps. 1.5 seconds gives near-instant feedback without hammering the server.
- The monitor stops itself (`stopped = true`) as soon as a terminal state is reached.
- A separate monitor hook avoids coupling deployment submission logic with the list polling hook.

**Where it lives:** `src/features/deployments/hooks/useDeploymentMonitor.ts`

---

## No Server-Side Rendering

**Decision:** Launchpad is a pure client-side SPA. There is no SSR (Next.js, Remix, etc.).

**Why:**
- The entire audience is local developers with `localhost` access. SEO and public indexing are irrelevant.
- SSR would require a Node.js server to be deployed alongside the dashboard — adding operational complexity for a local dev tool.
- Vite + React (CSR) gives excellent DX with HMR and zero-config TypeScript.

---

## Tailwind CSS v4

**Decision:** Tailwind CSS v4 (not v3) is used.

**Why:**
- v4 is the current Tailwind major version at the time of development.
- v4 uses CSS-first configuration (no `tailwind.config.js`) and integrates with Vite via `@tailwindcss/vite` plugin.

**Important for new developers:** Tailwind v4 configuration syntax differs from v3. If you look up Tailwind docs, make sure you are on the v4 documentation.

---

*Next: [Current Status & Known Issues →](./06-status-and-issues.md)*
