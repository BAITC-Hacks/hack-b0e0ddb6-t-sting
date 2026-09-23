# Development guide

[Back to README](../README.md)

## Quick start with Docker

Requires Docker with Compose v2. Run from the repository root:

```sh
cp .env.example .env
docker compose up --build --wait --wait-timeout 180
```

Open [localhost:5173](http://localhost:5173) and select **пример плана**, then **разобрать партию**. The result shows Score 56.54, exact contributions, ranking, suggested replacements, and an analyst explanation. The header connection indicator checks API/database health and supports retry. The API listens on [localhost:3000](http://localhost:3000).

The example password is for local development only. Set your own value in `.env` before starting the database. PostgreSQL initializes credentials only on an empty data volume; changing `.env` later does not change an existing database password.

The Compose project is named `testing-workspace`. It binds published ports to localhost, waits for healthy dependencies, and stores PostgreSQL data in a named volume. These containers run development servers with source watching, not production deployment servers.

```sh
docker compose logs -f
docker compose down
```

`down` preserves the database volume. API/web source changes and web public assets are mounted into their containers. Rebuild and recreate containers after dependency, environment, or configuration changes. If a watcher retains stale CSS or an old API process, restart the affected service with `docker compose restart web` or `docker compose restart api`.

## Local Node development

Use Node.js 24.11 or newer in the 24.x line and npm 10. With nvm and Docker installed:

```sh
nvm install
nvm use
npm install --global npm@10
npm ci
cp .env.example .env
npm run db:up
npm run migration:run
npm run dev
```

If you already started the whole Compose stack, run `docker compose stop api web` before `npm run dev` to release the web/API ports. To use an existing PostgreSQL server, configure `.env` and omit `npm run db:up`.

| Variable            | Purpose                              | Default example          |
| ------------------- | ------------------------------------ | ------------------------ |
| `POSTGRES_USER`     | Database user                        | `app`                    |
| `POSTGRES_PASSWORD` | Local database password              | `local-development-only` |
| `POSTGRES_DB`       | Database name                        | `app`                    |
| `POSTGRES_HOST`     | Database host for the local API      | `localhost`              |
| `POSTGRES_PORT`     | Database port published on localhost | `5432`                   |
| `API_PORT`          | API port published on localhost      | `3000`                   |
| `WEB_PORT`          | Vite port published on localhost     | `5173`                   |
| `API_PROXY_TARGET`  | Server-side Vite proxy destination   | `http://localhost:3000`  |

If a port is occupied, change it in `.env`. For local Node development, update `API_PROXY_TARGET` when changing `API_PORT`. Inside Compose, API/database service names and internal ports are configured automatically. Never prefix database credentials with `VITE_`; that prefix exposes values to browser code.

## Commands and validation

```sh
npm run check        # Lint, formatting, typecheck, coverage tests, builds
npm run lint         # Check application, test, script, and config code
npm run lint:fix     # Apply safe ESLint fixes; report remaining issues
npm run format:check # Check maintained project file formatting
npm test             # Isolated unit tests with enforced coverage
npm run test:watch   # Unit tests while editing
npm run build        # Build both workspaces
npm run format       # Format maintained project files
```

ESLint uses the recommended JavaScript, TypeScript, and React Hooks rules. Prettier owns formatting, with `eslint-config-prettier` disabling conflicting lint rules. Lint warnings fail checks. Run `npm run lint:fix` and `npm run format` to apply fixes, then `npm run check` before opening a pull request.

Generated dependencies, builds, and coverage output are ignored. Both tools leave `.agents/` and `.claude/` untouched to preserve vendored skill contents; Prettier also preserves `AGENTS.md` and `CLAUDE.md`. Validate skill synchronization with `diff -qr .agents/skills .claude/skills`.

The unit suite enforces **100% lines, branches, functions, and statements per application file**. Tests cover exact scoring, all 694,395 legal plans, Shapley contributions, replacement analysis, bounded AI tool calls and offline recovery, council metrics/voting and durable replay, persistent submissions, configuration, and interactive UI states. Database queries and browser network requests are mocked at their external boundaries; unit tests need no running services.

Framework bootstrap files are excluded with comments in `vitest.config.mts`. Verify runtime wiring against a running full stack:

```sh
npm run smoke
curl -i http://localhost:3000/api/health
```

For nondefault ports, pass the web URL followed by the API URL:

```sh
npm run smoke -- http://localhost:5174 http://localhost:3001
```

The smoke command checks health, the Vite proxy, page serving, the scenario, validation, the exact sample result and ranking, best replacement, invalid-plan rejection, analyst response, leaderboard availability, and the complete council SSE/persistence/replay/apply flow. Offline checks also assert the rejected 104-cost package and 5/1/1 vote. It can run without host Node when the Compose stack is up:

```sh
docker compose exec -T web node scripts/smoke.mjs http://localhost:5173 http://api:3000
```

CI runs linting, formatting, typechecking, unit coverage, builds, Playwright browser tests, and a real Compose smoke/migration check on pull requests and pushes to `main`.

Additional useful commands:

```sh
npm run dev:api
npm run dev:web
npm run db:down
npm start -w @app/api
npm run preview -w @app/web
```

The last two commands require `npm run build`. Vite preview uses port 4173 and still needs a running API. `db:down` stops PostgreSQL without deleting its data.

## Browser end-to-end tests

Playwright covers the real browser → Vite proxy → NestJS → PostgreSQL connection and recovery from HTTP, payload, and network faults. Simulator checks exercise sample → replacement → optimum → analyst → persistent leaderboard, invalid and harmful plans at 390px/320px, keyboard focus containment, and scenario loading recovery. The council check runs an offline meeting, verifies the rejected over-budget package and votes, reloads the saved session, applies its recommendation and opens the recording again.

The persistence test saves a result under `E2E — тестовая команда`; repeated runs preserve its best score and add submission history. Use a disposable test database. The API startup applies committed migrations before tests begin. Browser tests force an empty OpenAI key for deterministic offline analysis; they never contact the AI provider.
After the local Node setup above (`npm ci` and a configured `.env`), run:

```sh
npx playwright install chromium
npm run db:up
npm run test:e2e
```

On Linux, install browser system dependencies with `npx playwright install --with-deps chromium`. An existing PostgreSQL server configured in `.env` also works; omit `db:up` in that case. Use a local/test database. The tests require a healthy database and fail at startup if the API cannot connect.

Playwright builds, migrates, and starts its own API on **127.0.0.1:3100** and a Vite server on **127.0.0.1:5174**, then stops them when the run ends. Both ports must be free: existing servers are deliberately never reused, so tests cannot silently target another checkout. The API reads database settings from the root `.env` (exported variables take precedence); test server ports and the proxy target override development settings. PostgreSQL stays running until you stop it with `npm run db:down`.

```sh
npm run test:e2e -- --headed       # Watch Chromium
npm run test:e2e:ui                # Interactive test runner
npm run test:e2e:report            # Open the last HTML report
npm run test:e2e -- --repeat-each=3 # Check repeatability
```

Tests use isolated browser contexts, accessible role locators, and condition-based assertions rather than fixed sleeps. Retries are disabled so failures remain visible. Chromium is the supported browser target; Firefox and WebKit are not covered. `npm test` and `npm run check` remain service-free unit/static checks; run `npm run test:e2e` separately for browser verification. Both the Playwright config and tests are included in `npm run typecheck`.

The CI `e2e` job starts a separate PostgreSQL Compose project, installs Chromium with its system dependencies, runs the same command, and always tears down its test database volume. It uploads the HTML report plus failure screenshots/traces for seven days. Locally these generated files are gitignored under `playwright-report/` and `test-results/`; a failed test's trace can be opened from the HTML report.

## Architecture

See the [product architecture and requirement mapping](../README.md#архитектура). The browser calls same-origin `/api` endpoints through Vite; NestJS hosts the pure simulation engine, optional OpenAI analyst, and TypeORM submissions service. PostgreSQL stores submitted plans and council sessions (original plan, events and protocol in jsonb). Scenario data and the exact landscape are versioned/computed in code, not seeded into the database.

`GET /api/health` returns `200` with `{"status":"ok","database":"up"}` when PostgreSQL responds. A failed query returns `503` with `{"status":"error","database":"down"}` without exposing connection details. Responses use `Cache-Control: no-store`. Missing required settings and invalid ports fail with clear startup errors; an unreachable database prevents API startup after Nest's connection retries.

The stack uses React 19, Vite 8, NestJS 12, TypeORM 0.3, PostgreSQL 17, TypeScript 5.9, and native server-side fetch for OpenAI. The lockfile records exact versions. The registry is open: team names are labels, not authenticated identities.

## Optional AI configuration

| Variable                | Purpose / example                                             |
| ----------------------- | ------------------------------------------------------------- |
| `OPENAI_API_KEY`        | Empty selects offline analyst and council; server-only secret |
| `AI_MODEL`              | Optional override; default `gpt-4.1-mini`                     |
| `AI_COUNCIL_MODEL`      | Optional member model; defaults to `AI_MODEL`                 |
| `AI_COUNCIL_TIMEOUT_MS` | Per-member deadline; default and maximum `12000` milliseconds |
| `AI_TIMEOUT_MS`         | Overall analyst deadline; default `25000` milliseconds        |

All variables are documented in `.env.example`. The main flow works without a key. Provider failures, malformed output, unsupported numbers, and timeouts fall back to an explicitly labelled offline report. Unit tests fake the provider at the HTTP boundary; the live OpenAI path has not been verified with an actual key.

## Database migrations

Council routes:

- `POST /api/council/sessions` accepts `{ "plan": [...] }`, validates through the simulation engine, stores a session and returns `{ "sessionId": "uuid" }`. Shape and rule violations return 422.
- `GET /api/council/sessions/:id` returns the original plan, ordered events, protocol, status and creation time. Unknown or malformed IDs return 404; unavailable storage returns 503.
- `GET /api/council/sessions/:id/events` returns SSE. `data` contains the shared `CouncilEvent`; `id` is its one-based position. New subscribers receive the full history. `Last-Event-ID` or `?after=N` resumes after an offset.

Events are persisted before broadcast; concurrent deputies are serialized at the storage boundary. The API uses one process per local stack. Completed sessions replay from PostgreSQL after restart. Unfinished sessions are marked failed on retrieval, preserving their prior events. There is no distributed worker or authentication; session UUIDs are local demonstration references.

The client applies the engine-generated amendment or protocol plan and starts a fresh review. It never computes simulation numbers. Council unit tests use real engine calculations, fake OpenAI HTTP responses, fake storage and fake EventSource; browser/integration checks exercise the live proxy and database.

TypeORM automatic schema synchronization and implicit migration execution are disabled. Compose and Playwright explicitly run `migration:run` before starting the API; local Node development requires the same command. Both the app and migration CLI load the root `.env`. Define entities under `apps/api/src` as `*.entity.ts`, then generate and inspect migrations:

```sh
npm run migration:generate -- src/database/migrations/InitialSchema
npm run migration:run
npm run migration:revert
```

The generation path is relative to `apps/api`. A running database and a changed entity schema are required for generation. The committed first migration creates the `submissions` table. Re-running migrations is safe when none are pending. Reverting this migration drops submitted plans, so only run `migration:revert` on disposable data or after a backup.

For Compose:

```sh
docker compose exec -T api npm run migration:run
```

Generate migration files locally so they stay in the repository. Review generated SQL before applying it to any database with valuable data.

## DigitalOcean App Platform

Use a Job from the same repository and branch as the API, with source directory `/` (the npm workspace root), trigger **Before every deploy**, and build command `npm run build -w @app/api`. Set its run command to:

```sh
npx --no-install typeorm migration:run -d apps/api/dist/database/data-source.js
```

This uses compiled migrations and does not need `ts-node`, which is a development dependency. Keep the API run command as `npm run start -w @app/api`. A failed pre-deploy job blocks the deployment.

Set these runtime variables on **both the API and the migration job**. Replace `db` with the attached database component's name:

| Variable            | App Platform value |
| ------------------- | ------------------ |
| `POSTGRES_HOST`     | `${db.HOSTNAME}`   |
| `POSTGRES_PORT`     | `${db.PORT}`       |
| `POSTGRES_USER`     | `${db.USERNAME}`   |
| `POSTGRES_PASSWORD` | `${db.PASSWORD}`   |
| `POSTGRES_DB`       | `${db.DATABASE}`   |
| `POSTGRES_CA_CERT`  | `${db.CA_CERT}`    |

The shared TypeORM configuration enables TLS and verifies the server certificate when `POSTGRES_CA_CERT` is nonblank. Supply the PEM certificate contents, not a file path; real newlines and literal `\n` separators are supported. If the database is not attached to the app, download its CA certificate from the database connection details and paste its contents into this variable. Database credentials remain in App Platform settings, never in source control.

`SELF_SIGNED_CERT_IN_CHAIN` means TLS certificate verification failed. Check that `POSTGRES_CA_CERT` contains the CA for the database you connect to, then rebuild and redeploy the API and job so the compiled configuration and runtime variable are both updated. Adding only `DATABASE_URL` or `CA_CERT` does not configure this app. Keep certificate verification enabled; the CA establishes trust for this connection.

Leave `POSTGRES_CA_CERT` empty for local development. When absent or blank, the app preserves the PostgreSQL driver's TLS defaults, including any existing `PGSSLMODE` setting. Automatic schema synchronization and startup migrations remain disabled.

References: [DigitalOcean jobs](https://docs.digitalocean.com/products/app-platform/how-to/manage-jobs/), [database environment bindings](https://docs.digitalocean.com/products/app-platform/how-to/use-environment-variables/), and [node-postgres TLS](https://node-postgres.com/features/ssl).

## HTTP API

Все POST принимают JSON. Тело плана: `{"plan":[{"measureId":"M7","districtId":"nura"}, ...]}`. Для городской меры поле `districtId` отсутствует.

| Метод и путь               | Результат                                                                 |
| -------------------------- | ------------------------------------------------------------------------- |
| `GET /api/health`          | Статус API и PostgreSQL                                                   |
| `GET /api/scenario`        | Версия, районы, показатели, 14 мер, правила, исходное состояние, примеры  |
| `POST /api/plans/validate` | Стоимость, остаток, направления и нарушения; без Score                    |
| `POST /api/plans/review`   | Score, районы, ранг, вклады, замены, оптимум и гистограмма                |
| `POST /api/plans/analysis` | Объяснение с источником `llm` или `offline` и журналом инструментов       |
| `POST /api/submissions`    | `{teamName, plan}` → сохранённый результат; клиентский Score игнорируется |
| `GET /api/submissions`     | Лучший результат каждой команды, сортировка по Score                      |

Некорректное тело запроса → `400`; нарушение правил плана при разборе → `422`; ошибка базы при работе с реестром → `503` с сообщением для повторной попытки. Клиент различает загрузку, пустые данные, ошибки и повторную отправку. Изменение плана запускает новую серверную валидацию.
