# Launchpad — Developer Handover Documentation

> **Launchpad** is the open-source local dashboard for [MetaCall FaaS](https://github.com/metacall/faas).  
> It gives developers a visual interface to deploy, inspect, test, and manage polyglot serverless functions
> running on a local MetaCall FaaS server — replacing the need to use raw `curl` commands or the CLI.

This documentation is written for **incoming developers, org reviewers, and GSoC mentors** taking over the project. It is designed so a new contributor can understand the *why*, the *how*, and the *current state* without needing to ask anyone.

---

## How to Read These Docs

Read them in this order for the fastest ramp-up:

| # | Document | What you will understand |
|---|---|---|
| 1 | [Project Context](./01-project-context.md) | Why this project exists, what problem it solves, where it fits in the MetaCall ecosystem |
| 2 | [Architecture](./02-architecture.md) | How the codebase is structured, every file's purpose, and how data flows |
| 3 | [Getting Started](./03-getting-started.md) | How to run the project locally, step by step |
| 4 | [API Reference](./04-api-reference.md) | Every HTTP endpoint the dashboard talks to, with request/response shapes |
| 5 | [Key Decisions](./05-decisions.md) | Why specific technical choices were made (auth, polling, routing, etc.) |
| 6 | [Current Status & Known Issues](./06-status-and-issues.md) | What is done, what is incomplete, and all known bugs |
| 7 | [Testing Guide](./07-testing.md) | How to run and write unit + E2E tests |
| 8 | [Contributing](./08-contributing.md) | Code standards, branch strategy, PR process |

---

## Repository Layout

```
Metacall_dashboard/
├── Dashboard/        ← Launchpad frontend (React 19 + Vite + TypeScript)
├── nodejs-base-app/  ← Minimal MetaCall FaaS worker example app
├── docs/             ← You are here (developer handover documentation)
└── req_docs/         ← Internal research, proposals, and reference notes
```

---

## Quick Command Reference

```bash
cd Dashboard

npm install           # install dependencies
cp .env.example .env  # configure environment

npm run dev           # start dev server at http://localhost:5173
npm run typecheck     # check TypeScript
npm run lint          # run ESLint
npm run unit          # run Vitest unit tests
npm run test          # run full Playwright E2E suite
npm run test:smoke    # run smoke tests only
npm run build         # production build
```

---

## Who Built This

This project was developed as part of **GSoC 2026** in collaboration with the MetaCall open-source organization.

- **MetaCall FaaS repository:** https://github.com/metacall/faas
- **MetaCall Deploy CLI:** https://github.com/metacall/deploy
- **MetaCall Protocol:** https://github.com/metacall/protocol
- **Production dashboard (closed-source):** https://dashboard.metacall.io
