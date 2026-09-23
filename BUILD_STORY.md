# Build Story

Hello, world! We're TΞSTING, and this is the start of our hackathon build story.

## First 30 minutes — Brainstorming and laying the foundation

Everyone activated their accounts, and we uploaded all the briefs. We're now actively brainstorming and laying the foundation for the project: choosing a direction, defining the result we want to deliver, and shaping the experience we want people to have when we present it.

The tension right now is between two cases:

- **Fintech:** we see something solid that we can build and present quickly.
- **Altus AI Innovations special case:** we see an opportunity to create a wow effect through the product experience.

We haven't chosen a direction yet. We're exploring that tradeoff as we shape the result we want to deliver.

## September 23 — A foundation for the first product flow

The repository now has a concrete starting point for either direction. [PR #4](https://github.com/BAITC-Hacks/hack-b0e0ddb6-t-sting/pull/4) brought together a React/Vite client, a NestJS API, and PostgreSQL through TypeORM. The connection page gives us a small first interaction: check the browser-to-API-to-database path, see progress and the result, and retry after a failure. Docker Compose, environment configuration, and migration commands give the team a shared way to run the stack locally.

The scaffold also established how we check our work: unit tests with enforced coverage, type checking, builds, and formatting. GitHub Actions is configured to run those checks plus a Compose smoke test and migration check. This gives us a foundation for adding a product flow, with explicit checks for failures as well as the happy path.

We then tightened the everyday workflow. [PR #5](https://github.com/BAITC-Hacks/hack-b0e0ddb6-t-sting/pull/5) expanded the ignore rules for dependencies, local secrets, generated files, editor metadata, and operating-system artifacts, while keeping environment examples and lockfiles trackable. [PR #8](https://github.com/BAITC-Hacks/hack-b0e0ddb6-t-sting/pull/8) disabled Claude's automatic commit and pull-request attribution text.

To support the product experience work ahead, [PR #9](https://github.com/BAITC-Hacks/hack-b0e0ddb6-t-sting/pull/9) added four Vercel skills covering component composition, React performance, view transitions, and web design guidelines. Their sources and attribution are recorded in [External tools and agent skills](docs/EXTERNAL_TOOLS.md), and the repository now requires identical copies for Codex and Claude. These are development references; importing them does not add those interactions to the app.

At this snapshot of `main` (`0a007ae`), there is still no recorded decision between the fintech and Altus AI Innovations cases. The application remains a connection-check scaffold: product-specific features, authentication, and a public deployment are still ahead of us. The next milestone is to turn the chosen direction into the first complete product flow.

## Around 90 minutes — A direction chosen, work underway

By the end of the first hour, we had committed to the **Akim for 5 hours** track: a city management simulator. The question has shifted from which case to choose to what product we can deliver within the hackathon.

Work is now moving along three parallel paths:

- **Margulan** is leading the search for people we can contact and show our solution to at the end. We're identifying potential contacts; those conversations are still ahead of us.
- **Sayazhan** is setting up and checking the infrastructure while bringing the main user flow to life through UX/UI work.
- **Product logic and research** are focused on defining the simulator's behavior and deciding how to assemble its technical components into a coherent product.

## Entering hour 3 — Completing the core flow and designing agent feedback

The main user flow is in place, following the brief and using concrete data. Our immediate focus is to close the remaining gaps and see the full implementation work end to end. Additional features will build on that complete flow.

In parallel, we're assembling the agent orchestration and the templates that will drive the product's agents. We're designing a feedback loop from the outset: capture simulation outcomes, extract feedback, and use it to inform the next iteration of agent behavior. This learning mechanism is still being designed.

The agent work also includes simulating several akims as NPC players. The aim is to let the human player inspect their decisions within the main flow and use them as a point of comparison.

Outreach has moved from finding contacts to making calls: we've called seven people and are looking for pilot participants who can evaluate the solution during the build window. Their feedback is the next reality check; those evaluations have not happened yet.

## September 23 — Implementing the plan-review simulator

The repository now contains the city simulator flow described in the implementation plan: select five measures, review their effect, apply a better replacement, read an analyst report, and submit the plan to a PostgreSQL leaderboard. The dark monospace interface and schematic district map follow the supplied screen designs. Dataset names and real computed values replace the placeholders in those designs.

We separated the calculation engine from NestJS, the database, and the LLM. Its exhaustive search reproduces all 694,395 legal plans, the example score of 56.54 at rank 566, and the global optimum of 57.24. Exact Shapley contributions explain the nonlinear critical-cell penalties and weakest-district term. A harmful plan scores 52.45, making the cost of a seemingly useful choice visible.

The analyst uses a bounded tool-calling loop with Anthropic and a deterministic fallback that works without credentials. Its journal exposes tool inputs and results. A numerical-literal guard rejects unsupported values but is not a semantic fact checker. Live provider behavior still requires a real API key; provider success and failure paths are covered with test doubles.

Integration testing caught a rounding inconsistency: subtracting two displayed scores gave +3.98, while the exact engine improvement rounds to +3.99. The API now supplies the improvement and optimality gap directly. Browser review also led to a correction of the contribution bars and analyst placement, and a keyboard review found a modal radio-group focus issue, now fixed and verified with real Tab/Shift+Tab navigation. The 320px responsive grid was also corrected after browser testing.

The earlier learning-loop, NPC council, and city-events ideas remain roadmap work, not implemented behavior. The current product's calculations and explanations use the fixed synthetic scenario.
