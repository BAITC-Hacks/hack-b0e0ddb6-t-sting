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
