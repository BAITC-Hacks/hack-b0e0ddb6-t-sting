# Builder 2 runtime handoff

The optional integration embeds Builder 2 in the existing Nest/Express process. It adds no server and leaves the current scenario, review, council and frontend routes intact. Until the domain handoff is complete, keep `GAME_RUNTIME_MODULE` empty in production.

## Local wiring

Use Node 24. Builder 2's separate checkout must expose `createGameMiddleware` from `src/server/host.js`: this is provided by runtime version `0.1.1`, source commit `fed578f14f4ab895a4f355e0924cc15cecd4d45a` in the Builder 2 repository (the original `e14a6aa` alone does not include that export). The `npm pack` archive contains runtime source and acceptance commands, with no credentials, fixtures or nested repositories. The source checkout remains necessary for its unit tests. Configure the API process with absolute paths:

```sh
GAME_RUNTIME_MODULE=/absolute/path/to/builder2/src/server/host.js
DOMAIN_MODULE=/absolute/path/to/builder1/entry.js
DOMAIN_INDEX_PATH=/absolute/path/to/comparison-index.json
REFERENCE_WRAPPER_ADAPTER=/absolute/path/to/designated-wrapper/adapter.js
```

The runtime is mounted before Nest's body parser. It owns only `GET /api/game/model` and `POST /api/game/{review,analyze,apply}`, with a 32 KiB JSON limit. Other routes continue through the host. A configured runtime that cannot load aborts startup with `GAME_RUNTIME_UNAVAILABLE`; an absent domain produces a 503 response from the game routes. No test fixture is used in production.

The runtime module must be included in the deployed filesystem before setting its path. The current Docker image does not copy the separate Builder 2 checkout. Do not point a deployment at a developer's local path.

## Required handoff before activation

- Builder 1: contract version `1`; `getModel`, `evaluateScenario`, `buildGameReview`, `checkCandidate`, `inspect`, `prepareIndex`; exact rational values; versioned identities; and a validated, offline-prepared index loaded by the domain worker.
- Reference wrapper: confirm the designated implementation and adapt its actual API. The existing `OpenAiLlmClient` is not implicitly treated as that designation. It currently returns neutral blocks rather than the runtime's `{output, observedModelId}` result.
- Frontend: connect the actual plan owner to Builder 2's revision/CAS store and renderer only after domain acceptance passes. A second plan owner or automatic Apply must not be introduced.

The existing QOL-SIM `astana-v1` engine is not silently adapted: it uses `yesil`, floating-point results, a different review object and startup enumeration. Renaming fields cannot establish the required identities, exact arithmetic or index guarantees.

Run Builder 2's `npm test`, `npm run test:coverage`, `npm run test:domain`, and `npm run smoke:live` in its own checkout. Run this repository's `npm run check` and browser/smoke checks against the mounted host. Controlled fixtures prove wiring only; they are not domain acceptance or live AI evidence.
