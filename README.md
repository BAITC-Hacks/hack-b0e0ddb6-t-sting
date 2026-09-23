# TΞSTING

A TypeScript workspace for the TΞSTING hackathon team, starting with a database-connected API.

The project needs a dependable foundation for building and checking its core flow. The API provides a health endpoint that verifies a real PostgreSQL query, with shared build and test tooling at the repository root.

## Local setup

Use Node.js 24.11 or newer in the 24.x line and npm 10.

```sh
nvm install
nvm use
npm install --global npm@10
npm ci
cp .env.example .env
```

Set the PostgreSQL connection values in `.env` to match a running local database. Then start the API:

```sh
npm run dev:api
curl -i http://localhost:3000/api/health
```

A healthy database returns `200` with `{"status":"ok","database":"up"}`. A failed query returns `503` with `{"status":"error","database":"down"}` and does not expose connection details. Missing required settings and invalid ports fail with a clear startup error.

## Architecture

- `apps/api`: NestJS API, TypeORM database options, environment validation, and health checks.
- `apps/api/tests`: isolated behavior tests with the database mocked at its query boundary.
- Root: npm workspaces, shared strict TypeScript settings, Prettier, and Vitest.

The API serves `GET /api/health`, queries PostgreSQL with `SELECT 1`, and returns the database status. TypeORM never synchronizes the schema automatically. Both the application and migration CLI load the root `.env`.

## Validation

```sh
npm run check
npm test
```

Tests enforce 100% lines, branches, functions, and statements for each application source file. Process bootstrap files are excluded with explanations in `vitest.config.mts`.

```sh
npm run build
npm start -w @app/api
npm run migration:generate -- src/database/migrations/InitialSchema
npm run migration:run
npm run migration:revert
```

Migration generation requires entities and a reachable database; there are no domain entities or migrations yet. Generate migrations only after defining an entity.

## Roadmap

- Add the React web workspace and browser-to-database connection check.
- Add Docker Compose, CI, and a live integration smoke test.

A screenshot and public demo are not available yet.
