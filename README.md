# QOL-SIM — Game Review

An AI-powered mayor (akim) simulator for teams, urban analysts, and anyone who wants to explore the consequences of city policy decisions.

With a limited budget, a useful initiative does not necessarily make the whole city better. QOL-SIM lets you choose **exactly five of 14 measures** for five simulated districts of Astana, then reviews the plan like a chess game: it calculates the Astana Quality of Life Score, each decision's contribution, the plan's rank among all valid plans, and the best replacements. An analyst explains the results and trade-offs using the engine's calculations.

![Plan review: score, districts, measure contributions, and recommendations](docs/images/review.png)

No public demo is deployed. Local app: [localhost:5173](http://localhost:5173). [Build story](BUILD_STORY.md), [source dataset](docs/data/astana-dataset.md), [implementation plan](docs/superpowers/plans/2026-09-23-plan-review-simulator.md), [external tools](docs/EXTERNAL_TOOLS.md).

## One-command startup

Requires Docker with Compose v2. From the repository root:

```sh
cp .env.example .env
docker compose up --build --wait --wait-timeout 180
```

Open [localhost:5173](http://localhost:5173). API: [localhost:3000/api/scenario](http://localhost:3000/api/scenario). On startup, the API applies migrations and enumerates the plan space once. PostgreSQL stores the team registry and council session history; scenario data is versioned in code.

**The core flow does not require an AI API key.** With an empty `OPENAI_API_KEY`, the deterministic offline analyst and the full council session still work. If the provider fails, times out, or returns an invalid response, the app uses a template for the affected response and clearly labels its source.

```sh
npm run smoke           # Check the running stack; requires local Node
# Run the same check without local Node:
docker compose exec -T web node scripts/smoke.mjs http://localhost:5173 http://api:3000
docker compose logs -f
docker compose down     # Stop services and preserve PostgreSQL data
```

Compose uses the project name `testing-workspace`, binds ports to localhost, and stores the database in a named volume. This is a development environment with hot reload. Rebuild the containers after changing dependencies or environment variables. The example password is for local development only; changing `.env` does not change the password of an existing database.

For DigitalOcean App Platform, run migrations in a separate pre-deploy Job and set `POSTGRES_CA_CERT` for a verified TLS connection to Managed PostgreSQL. [Setup and commands](docs/DEVELOPMENT.md#digitalocean-app-platform).

## Two-minute demo

The **"how it works"** tutorial appears on the first visit. Complete its seven steps or select **"skip"** to open the plan builder.

1. In the builder, inspect Nura: schools **38**, healthcare **35**, both critically low.
2. Load the **trap plan** and review it: **52.45**, below the do-nothing baseline of **52.56**, despite spending **86**. Safe crossings in Almaty district lower T1 to **38.25** and trigger a new penalty.
3. Load the **strong example**: a school and clinic in Nura, lighting and cameras in Nura, a citywide digital platform, and clean fuel in Saryarka. Budget **95**, Score **56.54**, rank **566 out of 694,395**.
4. Apply the suggested replacement **M5 in Saryarka → M3 in Nura**: Score **57.21**. You can also reveal the global optimum of **57.24**.
5. Read the strengths, risks, consequences, and recommendations. The tool log shows engine calls, their inputs, and their results.
6. Submit the plan to the registry under your team's name. The table keeps each team's best result; the server recalculates the Score and rank.

## "How it works" tutorial

![Onboarding: from a plan to calculations and explanations](docs/images/onboarding.png)

Seven steps explain the budget and measure selection, districts and critical shortfalls, plan rules, implementation lag, the final score, positive and negative examples, and the results screen. You can adjust the lag from 0 to 4: the eight-quarter timeline and the school's illustrative effect update accordingly. The examples let you switch between a school in Nura and crossings in Almaty, while the final step expands definitions of percentile, efficiency, contribution, measure rating, and synergy.

The "back / next" buttons and navigation dots switch between steps. "Skip", ×, Escape, and "build a plan →" close the tutorial. The **[?] how it works** link in the header reopens it at the first step while preserving the current plan. Dismissal is remembered in this browser (`localStorage`); if storage is unavailable, the app keeps working, but the tutorial appears again after a reload. The dialog supports keyboard navigation, returns focus to its trigger button, and adapts to mobile screens.

The tutorial's numbers are examples from the `astana-v1` scenario, not a preliminary calculation of the selected plan. The strong example's gain is shown as **+3.99**, matching the engine and its rounding. The tutorial's lag control does not change the catalog or the plan.

## Mayor's council

From a completed review, select **"bring to council"**, then **"start session"**. Seven fictional participants discuss the plan, propose valid replacements, and vote on the chair's verified recommendation. These are educational characters identified only by their roles; the data is synthetic.

![Council: roundtable and validated statements](docs/images/council.png)

| Participant        | Score component and metric                                            |
| ------------------ | --------------------------------------------------------------------- |
| Transport          | T1, T2 · weight 0.20; weighted contribution to the city average score |
| Environment        | E1, E2 · 0.20; the same contribution metric                           |
| Social services    | S1, S2 · 0.22; the same contribution metric                           |
| Safety             | B1, B2 · 0.18; the same contribution metric                           |
| Municipal services | C1, C2 · 0.20; the same contribution metric                           |
| Ombudsman          | Lowest district score minus the number of critically low values       |
| Finance            | Score gain over the do-nothing baseline per 10 budget units           |
| Chair              | Final Score, validity, and the cost of trade-offs                     |

The five sector contributions add up to the city average score. The engine determines positions, up to three candidates for each participant, replacement impacts, objections, and votes. The LLM writes the dialogue; numbers and IDs are checked against the allowed facts. Validating numeric literals does not establish the semantic truth of arbitrary text: the calculation log is available alongside the dialogue.

```text
Engine briefs → seven parallel statements → validation of each statement
→ proposed amendments → up to two objections → the author's response
→ chair: evaluate_package / get_amendment_impacts, up to four steps
→ verified recommendation only → vote → saved minutes
→ accept an amendment or package → updated plan → new review
```

An invalid ID, unsupported number, malformed JSON, or timeout replaces only the affected statement with a template. If the chair fails, the minutes are assembled from engine-verified options. Without a key, every stage uses templates with the same events. The interface labels the source of the dialogue and minutes; disconnecting the browser does not stop the session on the server.

PostgreSQL stores the original plan, events, and minutes. SSE publishes events after they are saved; reconnection resumes the history from the event ID. Saved sessions can be opened and replayed. After an API restart, an unfinished session is marked as interrupted; completed minutes remain available. The local stack is designed for a single API process.

**One-minute demo:** strong example → council → compare light rail transit (LRT) in Nura and Esil → environmental objection → rejected package costing 104 → vote → accept LRT in Nura → new Score **57.21**. The engine calculates the numbers; mockups are not a source of calculations.

Clarification of the original plan and mockups: replacing **M10@Nura → M14** gives **56.62718 → 56.63**, a gain of **0.08411 → +0.08**. The reference value of 56.64 was inaccurate. The benchmark for LRT in Nura is **57.20556 → 57.21**, a change of **+0.66249 → +0.66**; the vote is **5 in favor / 1 abstention / 1 against**.

### Connecting OpenAI

Add your key to the root `.env` when it is ready:

```dotenv
OPENAI_API_KEY=your_key_from_platform.openai.com
AI_MODEL=gpt-4.1-mini
AI_COUNCIL_MODEL=gpt-4.1-mini
AI_TIMEOUT_MS=25000
AI_COUNCIL_TIMEOUT_MS=12000
```

After changing `.env`, restart the local API or run `docker compose up -d --build api`. An empty `AI_COUNCIL_MODEL` falls back to `AI_MODEL`. Only the server reads the key; there are no `VITE_` variables for it. Availability of the selected model depends on your OpenAI project. The integration is tested with deterministic provider responses and offline mode; calls using a real key have not been verified.

## How results are calculated

The data is **synthetic**, and the map boundaries are **schematic**. The simulator explains the defined model rather than forecasting the real urban economy.

```text
Realized effect = full effect × (8 − lag) / 8
I'[district, indicator] = clip(baseline value + effects + synergies, 0, 100)
D[district] = Σ weight[indicator] × I'[district, indicator]
D_avg = Σ population_share[district] × D[district]
Score = 0.7 × D_avg + 0.3 × min(D) − N_crit
N_crit = number of values strictly below 40
```

The horizon is eight quarters. Synergies are fixed and are not scaled by lag. Unspent budget earns no bonus. The engine retains full precision internally; HTTP responses and the interface round values for display. Ranks use unrounded values, and tied results share a rank.

Rules: exactly five distinct measures, total cost no greater than 100, at most two measures per sector, and a district required for district-level measures but forbidden for citywide measures. M1 and M3 are incompatible regardless of district; M4/M7 and M5/M13 are incompatible within the same district. All five sectors are available, but covering all five is not mandatory: the dataset contains no such constraint.

The Score change is calculated before rounding: for the example, it is **3.98539**, displayed as **+3.99**. Subtracting the already rounded values 56.54 and 52.56 gives 3.98, so the client receives a separate engine-calculated `scoreDelta` field.

**Each move's contribution is its exact Shapley value** across all subsets of the plan. The contributions add up to the Score change from the do-nothing baseline. A move's rating accounts for the best valid single replacement:

| Rating                    | Rule                                                                                                       |
| ------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Blunder (`blunder`)       | Negative contribution                                                                                      |
| Mistake (`mistake`)       | Best replacement gains ≥ 1.0                                                                               |
| Inaccuracy (`inaccuracy`) | Best replacement gains ≥ 0.3                                                                               |
| Good (`good`)             | Best replacement gains > 0.05                                                                              |
| Best (`best`)             | Replacement improves the score by no more than 0.05                                                        |
| Brilliant (`brilliant`)   | Rated `best`, with either removal bringing back a critically low value or the measure activating a synergy |

Efficiency = `(Score − baseline Score) / (optimum − baseline Score) × 100%`; it can be negative for a harmful plan. Percentile reflects the plan's position in the full space of valid plans. The histogram uses the same results with a bin width of 0.25.

## Benchmark checks

`npm test` verifies the source scenario's numbers without network requests or a database:

| Check                               | Result                                               |
| ----------------------------------- | ---------------------------------------------------- |
| Do nothing                          | 52.56, two critically low values in Nura             |
| Strong example                      | 56.54; budget 95; 0 critically low values            |
| Number of valid plans               | 694,395                                              |
| Optimum                             | 57.24; M2, M3@Nura, M8@Nura, M9@Nura, M14; budget 98 |
| Worst valid plan                    | 52.04                                                |
| Plans worse than doing nothing      | 20,003                                               |
| Example's rank                      | 566; percentile 99.9; efficiency about 85%           |
| Example's contributions             | 1.45, 1.40, 0.49, 0.47, 0.17; exact sum 3.98539      |
| Example's best replacement          | M5@Saryarka → M3@Nura; 57.21, gain 0.66              |
| Trap plan                           | 52.45; budget 86; M11@Almaty contribution −0.87      |
| Best plan covering all five sectors | 56.34                                                |

<a id="архитектура"></a>

## Architecture

```text
React / Vite → same-origin /api proxy → NestJS
                                          ├─ SimulationService → pure TypeScript engine
                                          │    ├─ astana-v1 version, rules, Score
                                          │    └─ exhaustive search, Shapley values, replacements, move ratings
                                          ├─ AnalysisService → engine tools → OpenAI
                                          │    └─ offline analyst when the key is missing or an error occurs
                                          ├─ CouncilService → briefs → OpenAI / templates → minutes
                                          │    └─ PostgreSQL jsonb → history / SSE → React
                                          └─ SubmissionsService → TypeORM → PostgreSQL
```

Stack: React 19, Vite 8, NestJS 12, TypeORM 0.3, PostgreSQL 17, TypeScript 5.9, Vitest, ESLint, and Prettier. OpenAI is called through standard server-side `fetch`; visualizations use SVG and CSS.

- `apps/api/src/simulation/engine`: data, validation, scoring formula, exhaustive search, exact contributions, and best replacements. No Nest or database dependency.
- `apps/api/src/simulation`: HTTP parser and service that assembles the Review. Invalid plans do not receive a Score.
- `apps/api/src/analysis`: LLM adapter, bounded tool loop, JSON validation, and offline explanations. The HTTP adapter is isolated in `llm-client.ts`.
- `apps/api/src/submissions`: server-side recalculation of results and plan persistence.
- `apps/api/src/council`: metrics, briefs, amendments, agents, voting, streaming, and session persistence.
- `apps/web/src/features`: builder, review, council, registry, and tutorial (`onboarding`). The browser does not implement the Score formula; the lag control calculates only the tutorial example.
- `apps/*/tests`: behavior tests whose structure mirrors the source files.

The agent uses `evaluate_plan`, `explain_contributions`, `get_rank`, `find_best_swaps`, and `evaluate_alternative`. It is limited to six steps, with an overall timeout of 25 seconds by default. Numbers and valid alternatives come from the tools. The final response is checked for structural validity. An additional check rejects numeric literals absent from the tool results, allowing for rounding. It does not verify whether a number refers to the correct district or claim; this is not full semantic validation. The offline review formats engine results directly.

The registry is public and has no authentication: a team name is a label, not a protected account. Names are compared case-insensitively. Submission history is retained, and the table shows each team's best result; when Scores are equal, the earlier submission wins.

## Challenge requirements

We track the challenge's requirements and supporting evidence in the [version 0.1 plan](docs/compliance/PLAN.md) and the [initial requirements map](docs/compliance/RULES_MAP.md). These are **works in progress**: further detail and final README coverage are still being developed, and full compliance is not yet claimed.

| Requirement / criterion                          | Implementation                                      | Verification                                                            |
| ------------------------------------------------ | --------------------------------------------------- | ----------------------------------------------------------------------- |
| Shared budget and data; criterion 1              | `simulation/engine/scenario.ts`, `/api/scenario`    | `simulation/engine/scoring.test.ts`, `simulation/simulation.test.ts`    |
| Decisions across five sectors                    | Catalog of 14 measures, builder filters             | `simulation/engine/scoring.test.ts`, `features/Builder.test.tsx`        |
| Budget control; criterion 2                      | `validation.ts`, server-side rejection of reviews   | `simulation/engine/scoring.test.ts`, `simulation/simulation.test.ts`    |
| Measures change indicators; criterion 3          | `scoring.ts`, lags and synergies                    | `simulation/engine/scoring.test.ts`                                     |
| Astana Quality of Life Score calculation         | `scoring.ts`, `landscape.ts`                        | `simulation/engine/review.test.ts`, `scripts/smoke.mjs`                 |
| AI analysis and clear trade-offs; criterion 4    | `analysis/analyst-agent.ts`, `offline-analyst.ts`   | `analysis/analyst-agent.test.ts`, `analysis/offline-analyst.test.ts`    |
| Minutes and the cost of trade-offs; criterion 4  | Mayor's council, dissenting opinions, and voting    | `council/agents.test.ts`, `council/domain-numerics.test.ts`             |
| AI recommendations for improvement               | Verified council amendments and packages            | `council/domain.test.ts`, `e2e/council.spec.ts`                         |
| Technical implementation: agents with tools      | Parallel statements, bounded chair agent, saved log | `council/agents.test.ts`, `council/sessions.test.ts`                    |
| Strengths, risks, consequences                   | Structured analyst report                           | `analysis/offline-analyst.test.ts`, `features/Review.test.tsx`          |
| Changing the plan changes the Score; criterion 5 | `swaps.ts`, a new review after replacement          | `simulation/engine/review.test.ts`, `scripts/smoke.mjs`                 |
| Team comparison                                  | PostgreSQL, `submissions.service.ts`                | `submissions/submission.test.ts`                                        |
| Visualization of changes                         | Map, indicator table, histogram                     | `components/Map.test.tsx`, `features/Review.test.tsx`; browser test run |

Backend test paths are relative to `apps/api/tests`; frontend test paths are relative to `apps/web/tests`. Exact commands are in the [developer guide](docs/DEVELOPMENT.md).

## Roadmap

- Unexpected city events and budget reallocation.
- NPC rivals and comparisons of their positions between sessions.
- A quarter-by-quarter tournament and comparisons of decision sequences.
- Verification of every numerical LLM claim against tool results.
- Team authentication, rate limits, and public deployment configuration.

See the [developer guide](docs/DEVELOPMENT.md) for detailed local development commands, environment variables, the HTTP API, and migrations.
