# MetaCall FaaS Dashboard

A React dashboard for working with a local MetaCall FaaS server.

It already covers the main developer flow: sign in, inspect deployments, deploy from a ZIP or repository, open logs, test exposed functions, and manage a few local account settings. Some parts are production-ready in shape, while others are still demo or local-only.

## Preview

**Login**  
<img width="1919" height="934" alt="Login preview" src="https://github.com/user-attachments/assets/099ce821-7d31-4f41-a283-a27a95097df7" />

**Signup**  
<img width="1919" height="934" alt="Signup preview" src="https://github.com/user-attachments/assets/943ce8be-c98b-417c-85cf-4ff53a523377" />

**Dashboard**  
<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/125aaf75-9b26-4031-86d4-1bac29a74906" />

**New Deploy Page**  
<img width="1919" height="934" alt="New deploy preview" src="https://github.com/user-attachments/assets/a8779ae6-5dc9-4a05-888d-0c0eeeda8e07" />

**Small Screen**  
<img width="1919" height="934" alt="Mobile preview" src="https://github.com/user-attachments/assets/570e8f6f-82d5-4b90-8dd6-b8543815deda" />

**WiZard Edit**  
<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/39491a6f-58ed-4f0c-8da8-046df4b0b173" />

**subscription plans**
<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/0381fc5b-cf3e-4ab4-8343-9e15d2322625" />

**metacall team supports**
<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/bfbd2673-2128-4cc4-8459-a962bf0d991d" />

**settings **
<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/cfb78590-03bd-42f2-9e73-d94c17863cc2" />



## Stack

- React
- TypeScript
- Vite
- Tailwind CSS v4
- React Router
- JSZip
- Vitest
- Playwright

## Project Layout

```text
Dashboard/
├── src/
│   ├── app/                # app bootstrap, providers, router, env config
│   ├── features/           # feature-first pages, hooks, and components
│   ├── lib/                # API utilities
│   ├── shared/             # layout, UI, types, constants, errors
│   └── tests/              # unit tests
├── tests/                  # Playwright E2E + shared testing modules
│   ├── e2e/                # test specs (auth, deployments, logs, smoke)
│   ├── pages/              # page objects
│   ├── fixtures/           # shared fixtures
│   ├── utils/              # test utilities
│   ├── mocks/              # API mocks and mock data
│   ├── storage/            # storage state files
│   └── global/             # global setup/teardown
├── public/                 # static files
└── TEST_README.md          # extra testing notes
```

## Getting Started

### Prerequisites

- Node.js  > 20
- npm > 10
- A running MetaCall FaaS backend, usually at `http://localhost:9000`

### Install

```bash
cd Dashboard
npm install
```

### Environment

Create a local env file from the example:

```bash
cp .env.example .env
```

Example:

```env
VITE_FAAS_URL=http://localhost:9000
VITE_FAAS_TOKEN=faas_token
```

Notes:

- The app currently authenticates normal sessions through login/signup and stores the token in `localStorage`.
- `VITE_FAAS_TOKEN` still exists in config, but it is not the main auth path for the current client flow.

### Run the app

```bash
npm run dev
```

The Vite app starts at `http://localhost:5173` by default.

## Scripts

```bash
npm run dev
npm run build
npm run preview
npm run lint
npm run lint:fix
npm run format
npm run format:check
npm run typecheck
npm run unit
npm run unit:watch
npm run unit:coverage
npm run test
npm run test:smoke
```

## Testing

- `npm run unit` runs the Vitest suite
- `npm run test:smoke` runs the Playwright smoke tests
- `npm run test` runs the full Playwright suite

Playwright uses its own local dev server on port `5173`.

## Notes

- The repo currently contains local build and test artifacts such as `dist/`, `playwright-report/`, and `test-results/`. They should stay ignored and out of commits.

## License

No license file is included yet.
