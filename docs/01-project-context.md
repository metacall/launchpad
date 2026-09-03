# 01 — Project Context

> **Purpose of this document:** Explain *why* this project exists, what problem it solves, how it fits into the MetaCall ecosystem, and what the production goal looks like.

---

## What is MetaCall?

MetaCall is an **open-source polyglot runtime**. It lets you call Python functions from Node.js, Node.js functions from Python, Ruby from C, TypeScript from Java — all within a single execution environment. The language boundary disappears.

The **FaaS (Function as a Service)** layer takes this further: it wraps any polyglot function in a REST API. You deploy your code to a server, and it becomes callable over HTTP — no language-specific server boilerplate required.

MetaCall's production cloud is at **dashboard.metacall.io**. For local development and testing, the open-source [metacall/faas](https://github.com/metacall/faas) server runs the same API on `localhost:9000`.

---

## Why Launchpad Exists

Before Launchpad, a developer working with local MetaCall FaaS had only two options:

1. Use the `metacall-deploy` CLI — requires knowing exact arguments and flag combinations
2. Use `curl` directly — requires knowing API endpoint structure and auth headers

Neither gives you any **visibility** into what is currently deployed. There is no way to see function signatures, view logs, or test a deployed function interactively without writing manual HTTP requests.

Launchpad solves this by providing a **visual interface** that wraps the exact same API the CLI uses, making the local FaaS server accessible to any developer regardless of their comfort with the terminal.

---

## The MetaCall Ecosystem (Four Repositories)

Understanding Launchpad requires understanding where it sits.

```
metacall/core
    │
    │  C library + 13 language loaders
    │  Installed as the 'metacall' binary
    ▼
metacall/faas                          ← The backend Launchpad talks to
    │
    │  Node.js/Express server (localhost:9000)
    │  Spawns 'metacall' binary workers via IPC
    │  REST API defined by @metacall/protocol
    ▼
@metacall/protocol                     ← Shared npm package
    │
    │  All HTTP API types and endpoint wrappers
    │  Used by BOTH metacall/deploy AND Launchpad
    ▼
metacall/deploy                        ← CLI tool (metacall-deploy)
    │
    │  TypeScript CLI — same API calls as Launchpad
    └─► --dev flag targets localhost:9000
```

**Launchpad is equivalent to `metacall/deploy` in a browser.** They both consume `@metacall/protocol`, they both talk to `metacall/faas`. The difference is interface: CLI vs. visual dashboard.

---

## What Launchpad Does

Launchpad provides these capabilities:

| Capability | Description |
|---|---|
| **Authentication** | Login / signup against local FaaS. Token-based session persisted in localStorage |
| **Dashboard Overview** | Server status, deployment count, and recent deployment activity |
| **Deployments List** | All active deployments with status badges, language badges, and quick actions |
| **Deployment Detail** | Metadata, function list, and inline function invocation tester |
| **Deploy Wizard** | Guided 3-step flow for ZIP-based deployments |
| **Repository Deploy** | Deploy from a public Git repository URL and branch |
| **Logs Viewer** | Fetch and display deployment logs |
| **Settings** | Configure FaaS URL and account preferences |
| **Plans** | Subscription plan selection UI (mocked locally) |
| **Chat** | MetaCall team support channel |

---

## What Launchpad Does NOT Do

Understanding the limits is as important as understanding the features:

- **Does not replace the FaaS backend.** Launchpad is a frontend only. It needs `metacall/faas` running separately.
- **Does not store any data itself.** All deployment state lives in the FaaS server's memory (and its on-disk app directory). If FaaS restarts, it reloads persisted apps automatically, but Launchpad is stateless.
- **Does not work against the production cloud** (`dashboard.metacall.io`) without modification. That API may differ from the local FaaS API.
- **Logs are partially functional.** The FaaS `POST /api/deploy/logs` endpoint is a stub — it returns a TODO response. See [Known Issues](./06-status-and-issues.md).

---

## Project Goal

This project was built as part of a contribution to the MetaCall open-source organization.  

The overall goal is to deliver a **stable, production-quality open-source dashboard** that gives local MetaCall FaaS users the same experience as the closed-source `dashboard.metacall.io`.

Expected outcomes:

1. Web Dashboard UI (Launchpad) — complete developer workflow in a browser
2. All backend tests passing in `metacall/faas`
3. Smoother CLI integration (`metacall-deploy` → local FaaS)
4. Updated documentation with screenshots and troubleshooting guide

**Mentors:** Thomas Rory Gummerson, Jose Antonio Dominguez, Alexandre Gimenez Fernandez, Param Siddharth, Raj Aryan

---

*Next: [Architecture →](./02-architecture.md)*
