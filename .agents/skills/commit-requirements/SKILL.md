---
name: commit-requirements
description: Use when an agent composes, reviews, or writes a Git commit message in this repository, including normal, amended, merge, squash, revert, and fixup commits.
---

# Commit requirements

Every commit created in this project must follow [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/). Apply this skill automatically before committing, even when the user does not name it. It supplements the repository's `AGENTS.md`; it does not authorize pushing, merging, or rewriting history.

## Message format

Use a header of the form `type(scope)!: description`. The scope and `!` are optional; the colon, one following space, and a meaningful description are required.

Project conventions, in addition to the specification:

- Use one of the lowercase types below.
- Use an optional short, lowercase scope naming the affected area, such as `api`, `expenses`, or `docs`; omit it when no single area fits.
- Write the description in imperative English, with no trailing period. Keep the entire header at most 72 characters.
- Describe the actual change. Avoid vague messages such as `chore: update stuff`.

| Type | Purpose |
| --- | --- |
| `feat` | Add user-visible functionality |
| `fix` | Correct a bug |
| `docs` | Change documentation only, including agent instructions and skills |
| `refactor` | Restructure code without changing behavior |
| `perf` | Improve performance |
| `test` | Add or change tests only |
| `style` | Change formatting without changing behavior |
| `build` | Change build tooling or dependencies |
| `ci` | Change continuous integration configuration |
| `chore` | Other maintenance, including merge bookkeeping |
| `revert` | Undo an earlier commit |

Include tests and documentation for a feature or fix in the same logical commit; select its type by the main behavior change. Separate unrelated changes into their own commits. Do not label a feature or bug fix `chore` merely because it also changes configuration or tests.

## Bodies and breaking changes

Separate the header, optional body, and optional footers with blank lines. Use the body to explain motivation or consequences when the header is insufficient. Reference only real issues or commits, for example `Refs: #123`.

For an incompatible API, data format, configuration, or user workflow change, this project requires **both** `!` immediately before the colon and an uppercase `BREAKING CHANGE:` footer explaining the incompatibility and migration. The specification permits either marker alone; requiring both is a project convention.

```text
feat(api)!: require expense amounts in minor units

Store expense amounts as integers to avoid rounding errors.

BREAKING CHANGE: Replace the amount field with amountMinor. Clients must
convert amounts to the currency's minor units before sending requests.
```

## Generated messages and special operations

- **Amend or squash:** Validate the replacement message against the complete resulting change, including any breaking change. A PR title is not automatically a suitable commit message.
- **Merge:** Replace Git's default header with a compliant one, for example `chore: merge expense import branch`. Choose a more specific type when the merge introduces a distinct feature or fix.
- **Revert:** Use `revert: remove CSV import` and identify the actual reverted commit in the body or a `Refs:` footer. Explain the reason; mark incompatibility when the revert itself breaks consumers.
- **Fixup:** Do not create `fixup!`, `squash!`, or `amend!` headers: those temporary commits violate this project's every-commit rule. Use a normal conventional commit. If an authorized later squash occurs, validate its final message too.

Tool-generated text is a draft. Apply the same rules whether committing through the CLI, an editor, an API, or a hosting UI.

## Before and after every commit

1. Read `git status --short` and `git diff --cached` to identify exactly what will be committed. Inspect the resulting combined change for amend or squash operations. Stage only the intended files or hunks and preserve unrelated work.
2. Complete the checks required by `AGENTS.md`, including the full test suite with 100% line and branch coverage. Find the command in the repository; do not invent one or claim success when no test tooling exists. If a required check cannot run, report that limitation and leave changes uncommitted.
3. Check the proposed message: allowed type, meaningful scope if present, exact `: ` separator, nonempty imperative description, header length, blank lines, and breaking-change markers when applicable. Compare its meaning with the diff, not just its syntax.
4. Correct a noncompliant message before invoking the commit operation. For multiline CLI messages, use a temporary message file with `git commit -F` to preserve newlines and avoid shell interpolation. Do not bypass configured hooks to force a commit through.
5. After a successful commit, inspect `git log -1 --format=%B` and `git status --short`. Verify the recorded message, then report the commit hash and checks actually run. Never silently amend someone else's commit or rewrite published history to repair a message.

## Common mistakes

| Temptation | Required response |
| --- | --- |
| Keep Git's default merge message because it was generated automatically | Replace its header before the merge commit is created |
| Allow a fixup prefix because autosquash will remove it later | Create a conventional commit now; every intermediate commit counts |
| Skip message review because the hackathon deadline is close | Check the message against the staged change before committing |

These files provide agent instructions. They do not install a Git hook or CI check and cannot mechanically prevent an agent or human from ignoring the rules.
