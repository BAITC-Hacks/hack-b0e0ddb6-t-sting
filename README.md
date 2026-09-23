# TΞSTING

A TypeScript workspace for the TΞSTING hackathon team, with a React web app and a database-connected API.

The current app checks the connection from the browser through the API to PostgreSQL. It provides a shared foundation for the team's product work, with loading, success, and retry states.

![Local development workspace](docs/images/workspace.png)

## Outreach for adoption

On September 23, alongside development, we contacted four recipients about expert feedback and potential use of the city management simulator:

- **Asad Bokhari, NU GSPP** — feedback on where our model diverges from practice, drawing on his research into AI, e-government, and smart cities.
- **Didar Yedilkhan, Director of AITU's Smart City Research Center** ([d.yedilkhan@astanait.edu.kz](mailto:d.yedilkhan@astanait.edu.kz)) — an invitation to review the working version and take it forward at the Center, which works on SmartCity models and urban data in Astana.
- **Zhanar Ismailova and GSPP Executive Education** ([zhanar.ismailova@nu.edu.kz](mailto:zhanar.ismailova@nu.edu.kz), [execed.gspp@nu.edu.kz](mailto:execed.gspp@nu.edu.kz)) — a proposal to use the simulator as a training exercise for serving public officials whose work involves allocating budgets.

The simulator is offered free of charge, with no obligations. **No replies had been received by the time of the final presentation.** The outreach is recorded in our [build story](BUILD_STORY.md#september-23--outreach-for-adoption).

## Обращения по внедрению

23 сентября, параллельно с разработкой, мы направили четыре обращения — за экспертной обратной связью и с предложением использовать симулятор управления городом:

- **Асаду Бохари из NU GSPP** — попросили оценить, где наша модель расходится с практикой. Он исследует ИИ, электронное правительство и умные города.
- **Дидару Едилхану, директору НИЦ Smart City в AITU** ([d.yedilkhan@astanait.edu.kz](mailto:d.yedilkhan@astanait.edu.kz)) — предложили посмотреть рабочую версию и передать её Центру, который ведёт проекты по моделям SmartCity и городским данным в Астане.
- **Жанар Исмаиловой и в Executive Education GSPP** ([zhanar.ismailova@nu.edu.kz](mailto:zhanar.ismailova@nu.edu.kz), [execed.gspp@nu.edu.kz](mailto:execed.gspp@nu.edu.kz)) — предложили использовать симулятор как учебное упражнение для действующих госслужащих, которые распределяют бюджет в своей работе.

Передаём симулятор бесплатно, без обязательств. **На момент защиты ответов ещё не было.** Обращения сохранены в [истории проекта](BUILD_STORY.md#september-23--outreach-for-adoption).

## Run locally

Requires Docker with Compose v2. From the repository root:

```sh
cp .env.example .env
# Set your local database password in .env before starting.
docker compose up --build --wait --wait-timeout 180
```

Open [localhost:5173](http://localhost:5173) and select **Check connection**. The API runs at [localhost:3000](http://localhost:3000).

To stop the stack, run `docker compose down`; database data is preserved. This setup uses development servers. No public demo is deployed yet.

For Node development, custom ports, troubleshooting, and database migrations, see the [development guide](docs/DEVELOPMENT.md).

## Check your changes

With Node.js 24.11+ in the 24.x line and npm 10:

```sh
npm ci
npm run check
```

This runs linting, formatting checks, type checking, unit tests with 100% line and branch coverage requirements, and builds. CI also runs Playwright browser tests and checks the running Docker stack.

For browser tests, configure `.env` as described in the [development guide](docs/DEVELOPMENT.md#local-node-development), then run:

```sh
npx playwright install chromium
npm run db:up
npm run test:e2e
```

Playwright starts dedicated API/web servers and requires free ports 3100 and 5174. See [browser testing](docs/DEVELOPMENT.md#browser-end-to-end-tests) for Linux dependencies, test behavior, reports, and service cleanup.

## Stack and structure

React + Vite → NestJS API → TypeORM → PostgreSQL, using TypeScript throughout.

- `apps/web` — web interface.
- `apps/api` — API, database connection, and migration tooling.
- Root — shared npm workspaces, tests, Docker Compose, and CI.

## More

- [Build story](BUILD_STORY.md) — progress, decisions, and the city simulator direction.
- [Development guide](docs/DEVELOPMENT.md) — setup, commands, architecture details, and migrations.
- [External tools and agent skills](docs/EXTERNAL_TOOLS.md) — sources, attribution, and usage.
