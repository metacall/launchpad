# <img src="./public/logo.svg" alt="MetaCall Logo" height="24" valign="middle" /> MetaCall Launchpad

MetaCall Launchpad is the official web-based interface for managing and deploying polyglot applications to the MetaCall Function-as-a-Service (FaaS) platform. It allows developers to configure environments, inspect active deployments, monitor real-time logs, and invoke polyglot functions directly from the browser.

## Demonstration

A complete walk-through of the primary developer workflow—including deployment management, and real-time polyglot function execution:

<p align="center">
  <video src="https://github.com/user-attachments/assets/123bdb2c-f7a6-4530-a8a0-c0726e29cd68" width="640" controls>
    <a href="https://github.com/user-attachments/assets/123bdb2c-f7a6-4530-a8a0-c0726e29cd68">Watch the Launchpad Demonstration Video</a>
  </video>
</p>

## Key Features

* **Authentication & Access Control**: Secure login, registration, token-based authorization, and protected client-side routing.
* **Polyglot Service Deployment**: Deploy applications directly from ZIP files, remote Git repositories, or pre-configured software templates.
* **Interactive Function Testing**: Inspect deployed endpoints and invoke functions written in different programming languages (JavaScript, Python, Ruby, Go, C#, C/C++, Rust, etc.) in real time.
* **Real-Time Logs**: Stream live stdout and stderr consoles from deployed services for simplified debugging and performance monitoring.
* **Subscription Management**: Review and update subscription tiers, purchase or manage licenses, and checkout billing statements.
* **Settings & Live Support**: Manage API tokens, configure account preferences, and contact the MetaCall support team.

## Getting Started

### Prerequisites

* **Node.js**: Version 20.0.0 or higher
* **npm**: Version 10.0.0 or higher
* **MetaCall FaaS Backend**: A running instance of the MetaCall FaaS server (defaults to `http://localhost:9000`)

### Installation & Run

1. Clone the repository and install dependencies:
   ```bash
   cd Dashboard
   npm install
   ```
2. Configure your environment:
   ```bash
   cp .env.example .env
   ```
   Set `VITE_FAAS_URL` to point to your running FaaS backend.
3. Start the local development server:
   ```bash
   npm run dev
   ```
   By default, the application runs at `http://localhost:5173`.

## Commands Reference

| Command | Description |
|---|---|
| `npm run dev` | Start the local development server |
| `npm run build` | Build the production application bundle |
| `npm run preview` | Preview the local production build |
| `npm run lint` / `lint:fix` | Check and fix ESLint issues |
| `npm run format` / `format:check` | Format files and check formatting with Prettier |
| `npm run unit` | Run unit tests with Vitest |
| `npm run test` | Run full Playwright E2E suite |
| `npm run test:smoke` | Run fast Playwright E2E smoke tests |

For detailed information about tests and E2E setup, refer to the [Testing Guide](TEST_README.md).

## Contributing

1. Fork the repository and create a branch.
2. Ensure linting, type-checking, and unit tests pass before committing.
3. Submit a Pull Request to the main branch.

## Code of Conduct

To ensure a positive and inclusive environment, please review our [Code of Conduct](https://github.com/metacall/.github/blob/master/CODE_OF_CONDUCT.md).

## Community

* **Discussion Forum**: [Join the Conversation](https://github.com/metacall/core/discussions)
* **Twitter**: [Follow Us](https://twitter.com/metacallio)
* **Discord**: [Join our Discord](https://discord.gg/upwP4mwJWa)
* **Telegram**: [Join our Telegram](https://t.me/joinchat/BMSVbBatp0Vi4s5l4VgUgg)
* **Matrix**: [Join our Matrix](https://matrix.to/#/#metacall:matrix.org)

## License

## License

A license has not been specified for this project yet and will be added in a future release.
