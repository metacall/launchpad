# MetaCall Launchpad — TODO List

> **Contributor Guidelines & Workflow:**
> - **Architecture First**: Before contributing, thoroughly review the project documentation to understand the MetaCall architecture (FaaS backend, `@metacall/protocol` SDK, Deploy CLI, and Launchpad frontend).
> - **Issue & Approach First**: Before starting work, **open an issue** and briefly comment with your proposed technical approach before making changes.
> - **Mandatory Test Coverage**: Every Pull Request (whether fixing a bug, adding a feature, or refactoring) **MUST** include corresponding unit tests (`src/tests/unit/`) or end-to-end tests (`src/tests/e2e/`) covering your code changes.
> - **Pre-PR Verification**: Verify that `npm run typecheck`, `npm run lint`, and `npm run test` execute without errors or warnings before submitting a Pull Request.

---




## API & Protocol Client Architecture

- [x] **Fix `BASE_URL` resolution fallback (`api-client.ts:68`)**
  - [x] Check `localStorage.getItem('faas_url')` and `import.meta.env.VITE_FAAS_URL` before `window.location.origin`
  - [x] Ensure default dev fallback points to `http://localhost:9000`
  - [x] Test API client initialization in both dev (`vite`) and prod build modes

- [ ] **Refactor `api.logs()` to use `@metacall/protocol` SDK (`api-client.ts:295`)**
  - [ ] Replace raw `fetch` with `getProtocol().logs()`
  - [ ] Ensure authentication headers and JWT token injection parity
  - [ ] Handle error states when protocol client returns non-JSON or stub responses

- [ ] **Refactor `api.call()` to use `@metacall/protocol` SDK (`api-client.ts:346`)**
  - [ ] Verify protocol `invoke` URL path format matches local FaaS (`/:prefix/:suffix/:version/call/:name`)
  - [ ] Replace manual `fetch` call with `getProtocol().call()`
  - [ ] Add error mapping for function invocation failures

- [ ] **Fix hardcoded subscription response in FaaS (`faas/src/api.ts:57`)**
  - [ ] Replace static `['Essential', 'Essential']` response in `/api/billing/list-subscriptions` with user-specific lookup
  - [ ] Return empty array or actual active plan slots for authenticated account

---

## Plans, Subscriptions & Launchpad

- [ ] **Replace simulated checkout on Plan Page (`PlanPage.tsx:68`)**
  - [ ] Remove `addMockSubscription()` timeout simulation
  - [ ] Integrate real backend payment/billing API endpoint (or add explicit "Coming Soon" badge)
  - [ ] Disable subscription state mutation via browser `localStorage`

- [ ] **Enforce plan subscription checks on Launchpad (`DashboardPage.tsx:382`)**
  - [ ] Pass `subscriptions` state from `api.listSubscriptions()` into `EmptyLaunchpadCard`
  - [ ] Replace hardcoded `hasSubscription={true}` with dynamic check based on plan ID
  - [ ] Disable deployment action for locked plan slots without an active subscription

- [ ] **Clean up hardcoded billing history in Settings (`SettingsPage.tsx:112–116`)**
  - [ ] Remove static 2023 mock receipts (`sub_1Mbod...`)
  - [ ] Render only receipts fetched dynamically from `api.listSubscriptionsDeploys()`
  - [ ] Add empty state view when no transaction history exists

---

## Logs & Real-Time Viewer

- [ ] **Implement FaaS Logs controller backend (`faas/src/controller/logs.ts`)**
  - [ ] Replace `"TODO: Implement Logs..."` stub in FaaS backend
  - [ ] Stream/read real stdout & stderr buffers from child execution containers
  - [ ] Format output with timestamp and container ID metadata

- [ ] **Add terminal state polling guards to `useLogs` hook (`useLogs.ts`)**
  - [ ] Check deployment status (`ready`, `failed`, `error`) before scheduling next poll interval
  - [ ] Cancel recurring polling timer immediately once terminal state is reached
  - [ ] Prevent exponential back-off infinite loops on failed deployments

---

## Deployments & Function Detail

- [ ] **Surface environment variables in Deployment detail config panel (`DeploymentFunctionPage.tsx:305–310`)**
  - [ ] Extract environment variables from deployment inspection response
  - [ ] Render environment key-value pairs alongside container port definitions
  - [ ] Mask sensitive variable values with show/hide toggle

- [ ] **Fix mobile layout for Deployment Detail sidebar (`DeploymentFunctionPage.tsx:225`)**
  - [ ] Replace `hidden md:flex` with responsive mobile tab bar or collapsible accordion
  - [ ] Ensure Endpoints, Packages, and Config panels are accessible on screens < 768px
  - [ ] Add mobile tab navigation (Overview / Endpoints / Packages / Config / Logs)

- [ ] **Catch and display deployment wizard upload errors (`DeployPage.tsx:30–35`)**
  - [ ] Add `try/catch` wrapper around `api.upload()` and `api.deploy()` calls
  - [ ] Display error alert banner inline at top of Deploy Wizard step 1
  - [ ] Prevent automatic step navigation when package validation or upload fails

---

## Settings, Auth & Error Handling

- [ ] **Implement server-side account deletion (`SettingsPage.tsx:213–217`)**
  - [ ] Add backend API request before clearing local state
  - [ ] Invalidate active JWT token on server
  - [ ] Clear `localStorage` and redirect user to `/login` upon confirmation

- [ ] **Wire password update form to backend API (`SettingsPage.tsx:180–183`)**
  - [ ] Replace local validation mock with backend API request (`api.updatePassword()`)
  - [ ] Add error handling and success notifications for remote update
  - [ ] Clear password input fields upon successful response

- [ ] **Improve Auth error message parsing (`api-client.ts:409–411`)**
  - [ ] Stop relying exclusively on `res.statusText`
  - [ ] Parse JSON/text response body from HTTP error responses
  - [ ] Provide user-friendly fallback messages for CORS failures and network drops

---

## Small Device UI/UX Audit & Mobile Responsiveness

- [ ] **Audit and optimize UI/UX for small devices and mobile screens**
  - [ ] Test all pages (`/`, `/deployments`, `/settings`, `/plans`, `/chat`, `/login`) across mobile viewports (320px – 480px)
  - [ ] Ensure sidebar navigation drawer closes automatically on route navigation on mobile
  - [ ] Fix horizontal overflow, text clipping, and scroll handling in Deployments table (`DeploymentsPage.tsx`)
  - [ ] Verify touch target sizes for all interactive buttons and icons are at least 44x44px
  - [ ] Adjust container padding, card font scaling, and modal dialog width for mobile screens

---

## Code Quality & Hygiene

- [ ] **Remove stray JSX comment in `DeployPage.tsx` (line 49)**
  - [ ] Delete `{/* we make also deployment page... */}` comment outside JSX return block
  - [ ] Run `npm run lint` and verify zero ESLint errors or warnings

---

## Incomplete Features & Testing

- [ ] **Implement functional Chat / MetaCall Support (`ChatInterface.tsx:21–23`)**
  - [ ] Replace static `'Under Development Right now'` canned response array
  - [ ] Build rule-based assistant or MetaCall CLI helper for developer questions
  - [ ] Add message persistence and session reset capabilities

- [ ] **Build Playwright End-to-End Test Suite**
  - [ ] Write E2E test spec for User Authentication (`login.spec.ts`)
  - [ ] Write E2E test spec for Deploying a ZIP package (`deploy.spec.ts`)
  - [ ] Write E2E test spec for Function Inspection & Execution (`inspect-call.spec.ts`)
  - [ ] Write E2E test spec for Deployment Deletion (`delete-deploy.spec.ts`)

- [ ] **Expand Unit Test Coverage**
  - [ ] Add unit tests for `useLogs` hook
  - [ ] Add unit tests for `useDeployments` hook
  - [ ] Add unit tests for `PlanPage` component
  - [ ] Add unit tests for `SettingsPage` component
