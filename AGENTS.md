# Repository Guidelines

## Project Structure & Module Organization

ElectricShop has three independently installed npm packages:

- `BE/`: Express/TypeScript API. Source modules live in `src/`, SQL in `database/`, and operational scripts in `scripts/`.
- `FE/admin/`: React/Vite administration app. API clients live in `src/api/`; UI and session logic occupy adjacent directories.
- `FE/Mobile/`: React Native/Expo app. Routes live in `app/`, UI in `components/`, API clients in `services/`, and assets in `assets/`.

Tests live in each package's `tests/`.

## Build, Test, and Development Commands

Run `npm ci` inside each package before development; there is no root package script.

| Directory | Command | Purpose |
| --- | --- | --- |
| `BE` | `npm run dev` | Start the API with watch mode, normally on port 3000. |
| `BE` | `npm run build` / `npm test` | Compile TypeScript / compile and run Node tests. |
| `FE/admin` | `npm run dev` / `npm run build` | Start Vite / type-check and build production assets. |
| `FE/admin` | `npm run test:e2e` | Run Playwright; starts Vite on port 5175 and uses Chrome. |
| `FE/Mobile` | `npm start` | Start Expo; use `npm run android`, `ios`, or `web` for platform launch. |
| `FE/Mobile` | `npm test` / `npm run typecheck` / `npm run lint` | Run Node tests, TypeScript checks, and Expo ESLint. |

## Coding Style & Naming Conventions

Match nearby TypeScript: two-space indentation, single quotes, and semicolons. Use PascalCase for React components, camelCase for functions, and descriptive module suffixes such as `auth.api.ts` and `auth.routes.ts`. Preserve existing Vietnamese API/database field names. Backend ESM imports use `.js` extensions. Mobile uses Expo's ESLint configuration; no shared formatter is configured.

## Testing Guidelines

Backend and mobile use `node:test` with `*.test.mjs`; admin uses Playwright with `*.spec.ts`. Add regression coverage for changed behavior. No numeric coverage threshold is configured. MySQL integration tests require database credentials and opt-in flags: in PowerShell, set `$env:AUTH_INTEGRATION='1'` and/or `$env:CHECKOUT_INTEGRATION='1'` before `npm test` in `BE`. Use a local test database account with database creation privileges.

## Commit & Pull Request Guidelines

History uses short, free-form summaries and merge commits; Conventional Commits are not established. Use imperative subjects, such as `Fix voucher validation during checkout`. PRs should explain behavior changes, link relevant issues, list validation commands/results, and include screenshots for UI changes. Document schema or configuration changes explicitly.

## Security & Configuration

Copy each package's `.env.example` to `.env` and configure local values. Keep secrets, generated builds, and dependencies out of commits. Review migrations and seeds before modifying shared data.

