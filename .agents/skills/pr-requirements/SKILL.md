---
name: pr-requirements
description: Use when an agent drafts, creates, or updates a pull request title or description in this repository, including changes in scope, validation results, or review readiness.
---

# Pull request requirements

Write PRs that a reviewer can understand without reading the task conversation. Describe the final change, why it matters, and the evidence supporting it. Use this skill with [branch-requirements](../branch-requirements/SKILL.md) for Git operations and [commit-requirements](../commit-requirements/SKILL.md) for Conventional Commit titles. This skill does not authorize publishing a PR, posting comments, or merging.

## Gather facts before writing

- Verify the intended head repository/branch and base branch. Read the complete diff and commits against that base, not just the most recent commit or conversation summary.
- Inspect the relevant code, documentation, and actual check results. Distinguish checks run locally from CI results. Earlier results do not validate later changes.
- Use the [repository PR template](../../../.github/PULL_REQUEST_TEMPLATE.md). The same structure applies when using an API or CLI that does not load the template automatically.
- When updating an existing PR, read its current title and description. Preserve accurate contributor context and useful links; remove stale scope and superseded validation claims.

## Title

Use `type(scope): imperative description`, with an optional scope and `!` immediately before the colon for a breaking change. Apply the project commit skill's allowed types, 72-character header limit, and no trailing period. Describe the main outcome rather than a branch name, ticket number, or list of files.

Examples: `fix(import): reject empty CSV rows` and `docs: add agent workflow requirements`. Select the type from the final diff. Do not retain a `feat` title after the work has narrowed to a bug fix.

For breaking changes, also include a `BREAKING CHANGE:` paragraph in the PR body explaining incompatibility and migration. Preserve both markers in the eventual squash commit; a PR description alone does not mark other commits as breaking.

## Body structure

Always keep **Summary** and **Validation**. Add the other template sections only when they provide relevant information; delete their headings when unused. Keep small PRs short: one or two summary sentences and concrete validation are sufficient.

| Section | Content |
| --- | --- |
| Summary | Lead with the concrete problem and resulting behavior. For documentation or tooling, name the gap and what the change provides. Include a before/after example when it clarifies behavior. |
| Changes | Use for multiple distinct changes or a design decision the reviewer must assess. Group by purpose, not by file or commit chronology. |
| Validation | Report each actual command or manual check, result, and what it verifies. Identify skipped, unavailable, pending, and failing checks explicitly with their reasons. |
| Screenshots | Include relevant before/after images or a demo for visible UI changes when available. Label them and provide links accessible to the reviewer. If visual verification is missing, state that in Validation. |
| Risks and migration | Describe material compatibility, data, rollout, configuration, or operational concerns and concrete migration/rollback steps when relevant. Put the breaking-change paragraph here. |
| Related issues | Link only verified issues or PRs. Use `Closes #…` only when this PR actually resolves that issue; use `Refs #…` for context. |

### Validation must be evidence-based

- Do not turn a proposed command into a passed check. Include observed outcomes, including failures unrelated to this patch when they remain unresolved.
- Report line and branch coverage separately when measured; the project requires 100% for application code. Never claim 100% from a passing test count, skill validation, or a whitespace check.
- For documentation-only changes in a repository with no application or test tooling, name the documentation checks performed and explicitly state that application tests and coverage are unavailable. Mention an applicable user-approved exception accurately; do not invent or extend one to application changes.
- Keep a PR draft while required checks are failing, pending, unavailable without an applicable approved exception, or implementation is incomplete. State what remains. Passing local checks alone does not prove CI or reviews passed, and readiness does not authorize merging.

## Markdown and writing

- Use the template's level-two headings, blank lines around paragraphs/lists/code fences, and short parallel bullets where useful.
- Put commands, paths, and identifiers in backticks. Use fenced blocks for multiline commands or examples and ordinary Markdown links for resources.
- Upload or link images through the hosting platform or an accessible URL. Local filesystem paths do not make screenshots available to GitHub reviewers.
- Remove template comments and empty optional sections before publishing. Do not publish placeholders, unchecked boilerplate lists, fabricated issue links, debug output, secrets, or raw logs when a concise result explains the evidence.
- Explain meaningful implementation choices and tradeoffs. Avoid praise, generic claims such as “improves quality,” transcript history, and exhaustive file lists.

## Publish and maintain

1. Compare the title and every factual claim with the complete final diff and current validation evidence. Ensure the message represents the whole PR, not only the latest review fix.
2. Follow `branch-requirements` to locate an existing PR and verify head/base before creation or update. Update that PR instead of duplicating it.
3. When publication is authorized, pass the body as structured text. With `gh`, write the exact Markdown to a temporary file outside the repository and use `--body-file`; preserve newlines and literal characters. Do not interpolate a multiline body into a shell command.
4. Read the saved title and body back from the hosting service. Verify headings, newlines, code fences, links, head/base, and draft state. Correct formatting or stale claims before reporting success.
5. After scope or validation changes, revise the title and affected body sections. Follow the branch skill to return and attach the PR URL. Creating or editing this skill alone does not call for a live PR.
