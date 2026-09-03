# 08 — Contributing

Thank you for contributing to Launchpad. This guide covers everything you need to get your changes merged cleanly.

---

## Before You Start

1. Read [Getting Started](./getting-started.md) to ensure you can run the project locally
2. Read [Architecture](./architecture.md) to understand where code belongs
3. Check the open issues on GitHub before starting work on a large feature

---

## Branch Strategy

| Branch | Purpose |
|---|---|
| `main` | Stable, always deployable |
| `redesign` | Active development branch for Launchpad |
| `feat/<name>` | New features |
| `fix/<name>` | Bug fixes |
| `docs/<name>` | Documentation changes |
| `chore/<name>` | Tooling, dependency updates, config |

### Workflow

```bash
# Start from the active development branch
git checkout redesign
git pull origin redesign

# Create your feature branch
git checkout -b feat/deployment-filter

# Work, commit, push
git push origin feat/deployment-filter

# Open a PR targeting redesign (not main)
```

---

## Commit Style

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short description>
```

**Types:**

| Type | Use for |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no logic change |
| `refactor` | Code change with no feature or bug |
| `test` | Adding or updating tests |
| `chore` | Build, tooling, dependencies |

**Examples:**

```
feat(deployments): add filter by runtime language
fix(auth): redirect to login on token expiry
docs(contributing): add branch strategy section
test(e2e): add smoke test for deployment wizard
```

---

## Code Standards

### TypeScript

- Prefer explicit types over `any`
- Use `interface` for object shapes, `type` for unions and aliases
- Export types from `index.ts` files where appropriate

### React

- Use functional components only
- Keep components small and focused — one clear responsibility
- Extract repeated logic into custom hooks in the nearest `hooks/` directory
- Use `data-testid` attributes on key interactive elements

### File Placement

| What | Where |
|---|---|
| Feature-specific component | `src/features/<feature>/components/` |
| Reusable UI primitive | `src/shared/ui/` |
| Reusable hook | `src/shared/hooks/` or `src/features/<feature>/hooks/` |
| API call | `src/features/<feature>/services/` |
| Shared type | `src/shared/types/` |
| Global constant | `src/shared/constants/` |

### Naming

| Item | Convention | Example |
|---|---|---|
| Component | PascalCase | `DeploymentCard.tsx` |
| Hook | camelCase prefixed `use` | `useDeployments.ts` |
| Service file | camelCase | `deployments.api.ts` |
| Type file | camelCase | `deployment.types.ts` |
| Test file | Same name + `.test` | `DeploymentCard.test.tsx` |

---

## Linting and Formatting

Run before every commit:

```bash
npm run lint
npm run format:check
npm run typecheck
```

Auto-fix:

```bash
npm run lint:fix
npm run format
```

The project uses:
- **ESLint** with `typescript-eslint`, `react-hooks`, `react-refresh` plugins
- **Prettier** for formatting (config in `.prettierrc`)
- **TypeScript strict mode** (see `tsconfig.app.json`)

---

## Pull Request Checklist

Before opening a PR, confirm:

- [ ] Code follows the architecture conventions
- [ ] No TypeScript errors (`npm run typecheck`)
- [ ] No lint errors (`npm run lint`)
- [ ] Code is formatted (`npm run format:check`)
- [ ] Unit tests pass (`npm run unit`)
- [ ] Smoke tests pass (`npm run test:smoke`)
- [ ] New interactive elements have `data-testid` attributes
- [ ] PR targets the correct branch (`redesign`, not `main`)
- [ ] PR description explains **what** changed and **why**

---

## Reporting Issues

When filing a bug report, include:

1. Steps to reproduce
2. Expected behavior
3. Actual behavior
4. Browser and OS
5. FaaS version (output of `npm list` in the `faas/` directory)
6. Relevant console errors or screenshots

---

*Next: [Environment Variables →](./environment.md)*
