# TΞSTING

A TypeScript workspace for the TΞSTING hackathon team, with a React web application and database-connected API.

The project needs a dependable foundation for building and checking its core flow. A connection page verifies the complete path from the browser through the API to PostgreSQL, with shared build and test tooling at the repository root.

![The workspace with a successful browser-to-database connection](docs/images/workspace.png)

## Quick start with Docker

Requires Docker with Compose v2. Run from the repository root:

```sh
cp .env.example .env
docker compose up --build --wait --wait-timeout 180
```

Open [localhost:5173](http://localhost:5173) and select **Check connection**. The page shows progress, confirms a healthy stack, and lets you retry after a failure. The API listens on [localhost:3000](http://localhost:3000).

The example password is for local development only. Set your own value in `.env` before starting the database. PostgreSQL initializes credentials only on an empty data volume; changing `.env` later does not change an existing database password.

The Compose project is named `testing-workspace`. It binds published ports to localhost, waits for healthy dependencies, and stores PostgreSQL data in a named volume. These containers run development servers with source watching, not production deployment servers.

```sh
docker compose logs -f
docker compose down
```

`down` preserves the database volume. API/web source changes and web public assets are mounted into their containers. Rebuild and recreate containers after dependency, environment, or configuration changes.

## Local Node development

Use Node.js 24.11 or newer in the 24.x line and npm 10. With nvm and Docker installed:

```sh
nvm install
nvm use
npm install --global npm@10
npm ci
cp .env.example .env
npm run db:up
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
npm run check       # Typecheck, coverage tests, builds, formatting
npm test            # Isolated unit tests with enforced coverage
npm run test:watch  # Unit tests while editing
npm run build       # Build both workspaces
npm run format     # Format maintained project files
```

The unit suite has 52 tests and enforces **100% lines, branches, functions, and statements per application file**. Tests cover configuration boundaries, database health/error handling, malformed responses, timeouts, and UI progress/retry behavior. Database queries and browser network requests are mocked at their external boundaries; unit tests need no running services.

Framework bootstrap files are excluded with comments in `vitest.config.mts`. Verify runtime wiring against a running full stack:

```sh
npm run smoke
curl -i http://localhost:3000/api/health
```

For nondefault ports, pass the web URL followed by the API URL:

```sh
npm run smoke -- http://localhost:5174 http://localhost:3001
```

The smoke command checks direct API health, the Vite proxy, page serving, and the favicon. It can also run without host Node when the Compose stack is up:

```sh
docker compose exec -T web node scripts/smoke.mjs http://localhost:5173 http://api:3000
```

CI runs formatting, typechecking, unit coverage, builds, and a real Compose smoke/migration check on pull requests and pushes to `main`.

Additional useful commands:

```sh
npm run dev:api
npm run dev:web
npm run db:down
npm start -w @app/api
npm run preview -w @app/web
```

The last two commands require `npm run build`. Vite preview uses port 4173 and still needs a running API. `db:down` stops PostgreSQL without deleting its data.

## Architecture

```text
Browser / React
   │ GET /api/health (same origin)
   ▼
Vite /api proxy
   ▼
NestJS HealthController → HealthService
   ▼
TypeORM → PostgreSQL SELECT 1
```

- `apps/web/src/App.tsx`: connection page with accessible idle, loading, success, and error states.
- `apps/web/src/api/health.ts`: health request, response validation, and a five-second timeout.
- `apps/api/src/health`: HTTP controller and database health service.
- `apps/api/src/config`: root `.env` loading and required-value/port validation.
- `apps/api/src/database`: TypeORM options and migration CLI data source.
- `apps/*/tests`: behavior tests organized alongside each application's source structure.
- Root: npm workspaces, strict TypeScript, Vitest/V8 coverage, Prettier, Docker Compose, and GitHub Actions.

A healthy database returns `200` with `{"status":"ok","database":"up"}`. A failed query returns `503` with `{"status":"error","database":"down"}` without exposing connection details. Responses use `Cache-Control: no-store`. Missing required settings and invalid API/database/web ports fail with clear startup errors; an unreachable database prevents API startup after Nest's connection retries.

The stack uses React 19, Vite 8, NestJS 12, TypeORM 0.3, PostgreSQL 17, and TypeScript 5.9. The lockfile records exact dependency versions. No domain entities, authentication, or product-specific features are implemented yet.

## Database migrations

Automatic schema synchronization and automatic migration execution are disabled. Both the app and migration CLI load the root `.env`. Define entities under `apps/api/src` as `*.entity.ts`, then generate and inspect migrations:

```sh
npm run migration:generate -- src/database/migrations/InitialSchema
npm run migration:run
npm run migration:revert
```

The generation path is relative to `apps/api`. A running database and a changed entity schema are required for generation. The scaffold starts with no migrations; `migration:run` reports no pending migrations and initializes TypeORM's migration bookkeeping.

For Compose:

```sh
docker compose exec -T api npm run migration:run
```

Generate migration files locally so they stay in the repository. Review generated SQL before applying it to any database with valuable data.

## Roadmap

- Implement the hackathon's first product flow and its data model.
- Add authentication when that flow requires it.
- Add production deployment configuration.

No public demo is deployed yet. The screenshot shows the local development workspace.
