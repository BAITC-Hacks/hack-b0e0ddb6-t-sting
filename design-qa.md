# Design and interaction verification

final result: passed

Reference: supplied `Design-selection.pdf` and the HTML screens in `qol-sim-screens`, especially C2, C4, R2, R3 and M2. Implementation: local Docker stack at `http://localhost:5173`.

## Matched views

- Desktop: 1440 × 1080 CSS pixels, device scale factor 1, sample-plan review after calculation. Compared the source R2 HTML and live implementation in one combined image, then inspected the implementation at its original resolution.
- Mobile: 390 × 844 and 320 × 720 CSS pixels. Reviewed builder and harmful-plan results, including the complete scrolled page.
- Evidence retained: [desktop review](docs/images/review.png), [mobile review](docs/images/review-mobile.png). The supplied PDF and HTML remain the external visual references.

## Corrections verified

- Moved the analyst into the right review column and compacted contribution rows; its heading and summary are visible beside the district map.
- Added contribution bars. The strongest replacement stays visible; additional valid replacements are available in the expandable list.
- Changed mobile grid sizing so the indicator tables scroll inside their container instead of widening the page. Document width checks pass at 390px and 320px.
- Fixed modal tab stops for radio groups and disabled inputs. Real Chrome Tab/Shift+Tab navigation remains inside district and busy submission dialogs; Escape closes the dialog.
- Used the engine's exact `scoreDelta` rather than subtracting rounded display values. The sample improvement consistently displays +3.99.

## Fidelity surfaces

| Surface    | Result                                                                                                      |
| ---------- | ----------------------------------------------------------------------------------------------------------- |
| Typography | Fira Code and monospace fallback, restrained headings, prominent score, compact numeric rows                |
| Spacing    | Source two-column map/review structure, sparse header, 64px desktop gutter, stacked mobile flow             |
| Colors     | Source dark background and muted text; red critical indicators, green improvements, amber inaccuracies      |
| Assets     | Supplied schematic SVG geometry and river retained; native SVG charts display computed data                 |
| Content    | Real scenario names, population shares and calculations replace design placeholders and mislabeled measures |

The product contains more report text and a full indicator table than the condensed artboard. Those sections continue below the initial viewport. Russian number formatting uses commas; metric precision comes from the engine. The decorative replacement arrow is represented by the explicit replacement control and confirmation dialog. These are intentional adaptations to the complete working flow.

## Runtime verification

Verified in Chrome: scenario loading, example/trap selection, review scores 56.54 and 52.45, replacement to 57.21, optimum dialog 57.24, offline analyst, persisted leaderboard result at rank 3, and navigation after saving. No relevant browser console errors or runtime overlays occurred in the final flow. Smoke checks also cover the API proxy, PostgreSQL, invalid-plan rejection and computed ranking.

The committed Playwright suite passes all nine Chromium tests, including the full review/save/reload flow, mobile widths, keyboard focus, and injected service failures. `npm run check` passes with 263 unit tests and 100% line and branch coverage. An isolated Docker stack started against an empty database, applied the migration automatically, and passed the full smoke command; its temporary volume was removed afterward.

Live LLM-provider access was not exercised without a real API key. Provider tool calls, timeout, malformed replies and fallback are covered by deterministic unit tests. The numerical-literal guard is not a semantic fact checker.
