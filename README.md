# MetaCall FaaS Dashboard

MetaCall FaaS Dashboard is the official web-based administrative console for the MetaCall Function-as-a-Service (FaaS) platform. It provides a comprehensive graphical user interface for developers and system administrators to manage, monitor, and test polyglot deployments seamlessly.

This project is maintained by the MetaCall Organization and integrates directly with the MetaCall FaaS API.

## Demonstration

The video below demonstrates the primary developer workflow, including authentication, deployment management, and real-time polyglot function execution:

<video src="public/MetaCall_Launchpad.mp4" width="100%" controls></video>

## Key Features

* **Authentication and Access Control**: Secure user registration, multi-session management, token-based authorization, and protected client-side routing.
* **Polyglot Service Deployment**: Deploy applications directly from ZIP files, remote Git repositories, or pre-configured software templates.
* **Interactive Function Testing**: Inspect deployed endpoints and invoke functions written in different programming languages (JavaScript, Python, Ruby, Go, C#, C/C++, Rust, etc.) directly from the browser.
* **Real-Time Logs**: Stream live stdout and stderr consoles from deployed services for simplified debugging and performance monitoring.
* **Subscription Management**: Review and update subscription tiers, purchase or manage licenses, and checkout billing statements.
* **Settings Control Panel**: Configure account preferences, manage authentication tokens, and inspect system environments.
* **Team Support**: Integrated support chat panel allowing direct communication with the MetaCall engineering and maintenance team.

## Technology Stack

The dashboard is built using modern, type-safe web technologies:

* **Framework**: React 19 (TypeScript)
* **Build System**: Vite 7
* **Styling**: Tailwind CSS v4 with Lucide React icons
* **Utilities**: JSZip for bundle packing, jsPDF for documentation export
* **Unit Testing**: Vitest
* **End-to-End Testing**: Playwright

## Directory Structure

The project follows a modular, feature-based architecture to ensure clean separation of concerns and maintainability:

```text
Dashboard/
├── src/
│   ├── app/                # App bootstrap, providers, routing, and environment config
│   ├── features/           # Feature-based pages, hooks, and components (auth, deployments, logs, etc.)
│   ├── lib/                # Shared API clients and utility libraries
│   ├── shared/             # Reusable UI components, layout structures, typescript definitions, and constants
│   └── tests/              # Component and hook unit tests (Vitest)
├── tests/                  # End-to-End test suites and environment configuration (Playwright)
│   ├── e2e/                # Test specifications (smoke tests, full-flow auth, deployments)
│   ├── pages/              # Page Object Models (POMs) for robust E2E selectors
│   ├── fixtures/           # Mock data and pre-authenticated test fixtures
│   ├── utils/              # Test-specific helper utilities
│   ├── mocks/              # Local server API mocks
│   ├── storage/            # Persisted state and authentication files
│   └── global/             # Global test execution hooks and setups
├── public/                 # Static assets and media files
└── TEST_README.md          # Dedicated testing guide and local setup details
```

## Getting Started

### Prerequisites

To run the MetaCall FaaS Dashboard locally, ensure you have:

* **Node.js**: Version 20.0.0 or higher
* **npm**: Version 10.0.0 or higher
* **MetaCall FaaS Backend**: A running instance of the MetaCall FaaS server (defaults to `http://localhost:9000`)

### Installation

Clone the repository and install the project dependencies:

```bash
cd Dashboard
npm install
```

### Environment Configuration

Create a local environment file by copying the template:

```bash
cp .env.example .env
```

Configure the environment variables in `.env` as required:

```env
VITE_FAAS_URL=http://localhost:9000
VITE_FAAS_TOKEN=your_auth_token_here
```

*Note: The application manages sessions dynamically via JWTs stored in `localStorage`. The `VITE_FAAS_TOKEN` variable remains available for fallback configurations and automated local test runner verification.*

### Running the Application

Start the local development server:

```bash
npm run dev
```

The application will start, by default, at `http://localhost:5173`.

## Scripts Reference

The following npm scripts are available for development, quality assurance, and deployment preparation:

| Command | Description |
|---|---|
| `npm run dev` | Starts the Vite development server |
| `npm run build` | Builds the production-ready application bundle |
| `npm run preview` | Runs a local server to preview the production build |
| `npm run lint` | Inspects the codebase for style and syntax issues using ESLint |
| `npm run lint:fix` | Automatically repairs linting issues where possible |
| `npm run format` | Formats source files with Prettier |
| `npm run format:check`| Checks if source files conform to Prettier styling |
| `npm run typecheck` | Validates TypeScript compilation without compiling output files |
| `npm run unit` | Runs all unit tests with Vitest |
| `npm run unit:watch` | Runs Vitest in watch mode |
| `npm run unit:coverage`| Generates a test coverage report using Vitest |
| `npm run test` | Runs the full Playwright E2E suite |
| `npm run test:smoke` | Runs quick Playwright smoke tests (~9 tests, ~6s execution) |
| `npm run test:ui` | Opens the interactive Playwright test runner UI |
| `npm run test:debug` | Runs E2E tests in step-through debug mode |

## Testing

For detailed explanations of unit and end-to-end testing, browser installations, and mocking configurations, please refer to the [Testing Guide](TEST_README.md).

## Contributing

As an official MetaCall project, we welcome community contributions. To contribute:

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/amazing-feature`).
3. Ensure all tests and linting checks pass successfully (`npm run typecheck && npm run lint && npm run unit`).
4. Commit your changes and open a Pull Request.

## License

This project is licensed under the Apache License 2.0. See the LICENSE file in the parent repository for more information.
