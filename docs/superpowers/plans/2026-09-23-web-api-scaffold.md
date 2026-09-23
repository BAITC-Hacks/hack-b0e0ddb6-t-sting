# Web and API scaffold implementation plan

**Goal:** Give the TΞSTING team a runnable web/API workspace with a verified browser-to-database connection.

**Architecture:** npm workspaces contain React/Vite in `apps/web` and NestJS/TypeORM in `apps/api`. Vite proxies `/api` to NestJS, whose health endpoint executes `SELECT 1` against PostgreSQL. Configuration is supplied through the root `.env`; schema changes use migrations.

**Constraints:** Node 24, npm 10, strict TypeScript, no domain features, small conventional commits, and 100% meaningful line and branch unit coverage. Keep secrets out of tracked files.

## Step 1 — API and workspace tooling

- [x] Add npm workspaces, shared TypeScript/formatting settings, and Vitest coverage gates.
- [x] Add tests for required settings, invalid/boundary ports, database options, healthy queries, and sanitized database failures; verify failures before adding modules.
- [x] Implement environment helpers, TypeORM configuration, Nest bootstrap, health service, and controller.
- [x] Document setup and API behavior, run tests/typecheck/build, and commit `feat(api): scaffold workspace and database health endpoint`.

## Step 2 — Web application

- [x] Add React/Vite configuration and tests for initial/loading/success/error/retry states.
- [x] Test health requests for valid/malformed payloads, non-200 status, invalid JSON, network failure, and timeout.
- [x] Implement the connection page and same-origin API client; configure the Vite proxy.
- [x] Update setup documentation, run all checks, and commit `feat(web): add connected React application`.

## Step 3 — Development and verification workflow

- [x] Add PostgreSQL/API/web Compose services, a development image, environment examples, and a smoke command.
- [x] Add CI for formatting, typechecking, coverage, builds, and live integration on main and pull requests.
- [x] Run the complete stack, verify direct/proxied health and migration CLI, inspect the browser, and record a screenshot.
- [x] Document commands, architecture, limitations, and verification; run all checks and commit `build: add container workflow and continuous integration`.

## Review focus

- Invalid settings must fail clearly without leaking credentials.
- Database failure must return a safe 503 response.
- Malformed or unavailable API responses must allow a retry in the UI.
- Nondefault ports must work in both native and container development.
- CI and documented setup must exercise the same project commands.

## Verification record

- API foundation: 26 passing unit tests; 100% line and branch coverage; live PostgreSQL health response verified.
- Web application: 43 passing unit tests; desktop and mobile connection, failure, and retry checks passed.
- Review follow-up: seven invalid web-port cases reproduced before applying the shared port validator; the final suite has 52 passing tests and 100% coverage.
- Container workflow: clean dependency install, healthy Compose services, direct and proxied smoke checks, migration CLI, and real database-down 503 response verified.
- Vite 8 builds successfully; its compatibility check warns that the server-side CommonJS helper import needs revisiting if a future major switches to native config loading.
