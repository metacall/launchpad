# 03 — Getting Started

This guide walks you through running Launchpad — the open-source local dashboard for MetaCall FaaS — from scratch.

---

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Node.js | ≥ 20 | [nodejs.org](https://nodejs.org) |
| npm | ≥ 10 | Bundled with Node |
| MetaCall FaaS | latest | Running on `localhost:9000` |
| MetaCall Core | latest | Required by FaaS to spawn workers |

> **Launchpad is a frontend.** It does not replace the FaaS backend — it talks to it. You need a running FaaS server first.

---

## Backend

Launchpad communicates with the local [metacall/faas](https://github.com/metacall/faas) server over HTTP.

### Start FaaS

```bash
# Clone and start the FaaS backend
git clone https://github.com/metacall/faas.git
cd faas
npm install
npm start
# → Server ready at http://localhost:9000
```

Once the server is up, `GET http://localhost:9000/api/readiness` returns `200 OK`.

---

## Frontend (Launchpad)

### 1. Install dependencies

```bash
cd Dashboard
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
# URL of your local MetaCall FaaS server
VITE_FAAS_URL=http://localhost:9000

# Optional: static API token (used only in dev/testing flows)
VITE_FAAS_TOKEN=any_string_works_locally
```

> **Note:** For normal use, authentication is handled via the login flow. The token in `.env` is only used in specific test/dev scenarios.

### 3. Start the dev server

```bash
npm run dev
```

Launchpad opens at [http://localhost:5173](http://localhost:5173).

---

## First Run

1. Navigate to **http://localhost:5173**
2. You will see the **Login** page
3. Sign up for a local account (local FaaS always returns `true` on auth validation)
4. You are now on the **Dashboard** — the home screen showing deployment stats and server status

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Compile TypeScript and build production bundle |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Auto-fix ESLint violations |
| `npm run format` | Format source files with Prettier |
| `npm run format:check` | Check formatting without writing |
| `npm run typecheck` | Run TypeScript type check without building |
| `npm run unit` | Run Vitest unit tests |
| `npm run unit:watch` | Run Vitest in watch mode |
| `npm run unit:coverage` | Generate test coverage report |
| `npm run test` | Run full Playwright E2E suite |
| `npm run test:smoke` | Run Playwright smoke tests only |

---

## Troubleshooting

### Launchpad shows "Server Unreachable"

- Ensure FaaS is running: `curl http://localhost:9000/api/readiness`
- Check that `VITE_FAAS_URL` matches the actual FaaS port

### Login always fails

- Local FaaS validates any token as `true`. If login fails, verify the FaaS server is running and reachable

### Port conflict

- Vite defaults to `5173`. Run `npm run dev -- --port 3000` to use a different port

---

*Next: [Architecture →](./architecture.md)*
