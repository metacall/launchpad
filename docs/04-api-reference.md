# 04 — API Reference

Launchpad communicates exclusively with the [MetaCall FaaS](https://github.com/metacall/faas) server via the `@metacall/protocol` package. All endpoints are prefixed with the FaaS base URL (default: `http://localhost:9000`).

---

## Authentication

All protected endpoints require an `Authorization` header:

```
Authorization: Bearer <token>
```

Tokens are obtained from the login/signup flow and stored in `localStorage`.

> **Local behavior:** The local FaaS server does **not** enforce token validation — `GET /validate` always returns `true`. This means any non-empty token works locally.

---

## Endpoints

### Health

#### `GET /api/readiness`

Returns a simple health check.

**Response:** `200 OK`

---

### Authentication

#### `GET /validate`

Validates the current auth token.

**Response:**
```json
true
```

> Always returns `true` on local FaaS. Used by Launchpad to verify the session on startup.

#### `GET /api/account/deploy-enabled`

Checks whether the current account is allowed to deploy.

**Response:**
```json
true
```

---

### Deployments

#### `GET /api/inspect`

Returns all currently active deployments.

**Response:**
```json
[
  {
    "status": "ready",
    "prefix": "hostname",
    "suffix": "my-app",
    "version": "v1",
    "packages": {
      "node": {
        "scripts": ["index.js"],
        "path": "/path/to/app"
      }
    },
    "ports": [3000]
  }
]
```

**Status values:**

| Value | Meaning |
|---|---|
| `create` | Deployment is being initialized |
| `ready` | Deployment is running and callable |
| `error` | Deployment failed |

---

#### `POST /api/package/create`

Uploads a ZIP archive of a function package.

**Content-Type:** `multipart/form-data`

**Fields:**

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique deployment name |
| `jsons` | JSON string | Array of `MetaCallJSON` descriptors |
| `runners` | JSON string | Array of detected runtime IDs |
| `package` | file | The ZIP archive |

**Response:** `201 Created`
```json
{ "id": "my-app" }
```

---

#### `POST /api/deploy/create`

Creates a new deployment from an uploaded package.

**Body:**
```json
{
  "id": "my-app",
  "env": ["KEY=VALUE"],
  "plan": "Essential",
  "type": "Package"
}
```

**Response:** `200 OK`
```json
{
  "prefix": "hostname",
  "suffix": "my-app",
  "version": "v1"
}
```

---

#### `POST /api/deploy/delete`

Stops and removes a deployment.

**Body:**
```json
{ "suffix": "my-app" }
```

**Response:** `200 OK`

---

#### `POST /api/deploy/logs`

Fetches logs for a deployment.

**Body:**
```json
{
  "container": "hostname",
  "type": "Package",
  "suffix": "my-app",
  "prefix": "hostname"
}
```

>  **Known issue:** This endpoint is currently a stub in local FaaS and returns `"TODO: Implement Logs..."`. Log output is written to `faas/logs/app.log` but not yet exposed here.

---

### Repository Deployments

#### `POST /api/repository/branchlist`

Lists branches in a remote Git repository.

**Body:**
```json
{ "url": "https://github.com/user/repo.git" }
```

**Response:**
```json
["main", "develop", "feature/x"]
```

---

#### `POST /api/repository/filelist`

Lists files in a specific branch.

**Body:**
```json
{
  "url": "https://github.com/user/repo.git",
  "branch": "main"
}
```

**Response:**
```json
["index.js", "metacall.json", "package.json"]
```

---

#### `POST /api/repository/add`

Clones a remote repository and registers it as a deployment.

**Body:**
```json
{
  "url": "https://github.com/user/repo.git",
  "branch": "main",
  "jsons": [{ "language_id": "node", "path": ".", "scripts": ["index.js"] }]
}
```

**Response:** `200 OK`

---

### Function Invocation

#### `GET /:prefix/:suffix/:version/call/:fn`

Invokes a deployed function.

**URL Parameters:**

| Param | Example | Description |
|---|---|---|
| `prefix` | `hostname` | Machine hostname (from inspect) |
| `suffix` | `my-app` | Deployment name |
| `version` | `v1` | Always `v1` currently |
| `fn` | `add` | Function name to call |

**Query Params:**

Pass function arguments as query parameters (or as a JSON body for POST).

**Example:**
```
GET /hostname/my-app/v1/call/add?x=2&y=3
```

**Response:**
```json
5
```

> Supports both `GET` and `POST`. Use `POST` with a JSON body for structured arguments.

---

### Billing (Mock Data)

The following routes return hardcoded mock responses on local FaaS. They exist to support plan selection in the UI.

| Route | Mock Response |
|---|---|
| `GET /api/billing/plans` | `["Essential", "Essential"]` |
| `GET /api/billing/current` | `"Essential"` |

>  These are local mocks. Production values differ.

---

## Shared Types (`@metacall/protocol`)

```typescript
type Deployment = {
  status: 'create' | 'ready' | 'error';
  prefix: string;       // machine hostname
  suffix: string;       // deployment name
  version: string;      // always 'v1'
  packages: Record<LanguageId, PackageInfo>;
  ports: number[];
};

type MetaCallJSON = {
  language_id: LanguageId;
  path: string;
  scripts: string[];
};

type LanguageId =
  | 'node' | 'py' | 'rb' | 'ts'
  | 'cs' | 'java' | 'wasm' | 'c'
  | 'rs' | 'cob' | 'lua' | 'jl';
```

---

*Next: [Testing Guide →](./testing.md)*
