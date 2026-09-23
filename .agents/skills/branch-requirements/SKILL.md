---
name: branch-requirements
description: Use when an agent starts a feature, fix, or maintenance task in this repository, creates or switches branches, pushes changes, or creates, reviews, updates, or merges a pull request.
---

# Branch requirements

Use a separate branch for every new task. This repository's integration branch is `main`; changes reach it through pull requests. Apply this skill automatically alongside `AGENTS.md` and the [commit-requirements skill](../commit-requirements/SKILL.md).

## Branch naming

Name new task branches `<type>/<short-description>`. Choose the type by the main purpose of the task, using the same types as `commit-requirements`: `feat`, `fix`, `docs`, `refactor`, `perf`, `test`, `style`, `build`, `ci`, `chore`, or `revert`.

Use a short, meaningful description in lowercase kebab-case: words or numbers separated by single hyphens, with no spaces, underscores, or extra slashes. Examples: `feat/expense-import`, `fix/empty-input`, `docs/agent-workflows`, and `chore/update-dependencies`. Do not add an agent-name prefix. Check that the name is unused before creating the branch; do not overwrite an existing branch.

## Start or continue work

1. Inspect `git status --short --branch`, `git branch --show-current`, `git branch -vv`, and `git remote -v`. Identify the task, existing changes, current branch, remotes, and upstream before changing Git state. An empty current branch means detached HEAD: create a task branch before editing or committing.
2. For a new feature, fix, or maintenance task, create a new `<type>/<short-description>` branch from the latest fetched `origin/main` after verifying that `origin` is the intended repository. Use a user-specified task branch name when provided; never use `main` as a task branch. Fetching updates remote-tracking refs without changing local main.
3. For continued work on the same task or an existing open PR, use its existing head branch. Do not create another branch or duplicate PR for each review fix. After a PR is merged or closed, new work starts on a fresh branch from main.
4. Preserve uncommitted work. Changes belonging to the current task may be carried onto its new branch when safe. Use a separate worktree for unrelated work instead of mixing changes. Do not discard, reset, or automatically stash someone else's work. Do not branch a new feature from another feature's unmerged commits unless the user requested a stacked PR.
5. If fetching is unavailable, local preparation can continue from a verified local main reference; report that its freshness is unverified. Verify the remote base before publishing a PR. If the intended base, ownership, or safe handling of existing changes cannot be established, resolve that uncertainty before the affected Git operation.

For a clean checkout with a verified `origin` and an unused branch name:

```sh
git fetch origin
git switch -c feat/expense-import origin/main
```

Never commit directly on local `main`. Make small, logical commits on the task branch using `commit-requirements`, including its required tests and coverage checks.

## Push only to the task branch

Before every push, verify both the current branch and the **destination ref**. Being on a feature branch does not make `HEAD:main` safe.

- Never push to remote `main`, delete it, or force-update it. Apply the same protection to a renamed default/integration branch such as `master` when repository metadata identifies one.
- Use an explicit verified remote and source/destination refspec. Do not use bare `git push`, `--all`, `--mirror`, or rely on an upstream that might point to main.
- For the example branch above, publish with `git push --set-upstream origin HEAD:refs/heads/feat/expense-import` only after confirming that HEAD is that task branch. Subsequent pushes also use an explicit destination.
- If the upstream incorrectly points to `origin/main`, push explicitly to the task branch and set the correct upstream. Do not push to the incorrect upstream first.
- On rejection, fetch and inspect the remote changes. Preserve shared history and push normally after integration. Do not force-push or rewrite a shared PR branch as a shortcut.

Use authorization already established by the task for publishing. Creating this skill or merely reviewing a PR does not authorize pushing, posting review comments, merging, or enabling auto-merge.

## Create or update a pull request

1. Verify the target repository and base (`main` for normal work), plus the head repository and task branch. For a fork PR, the head belongs to the fork; do not assume `origin` owns it. Use another feature branch as the base only for a user-requested stacked PR.
2. Inspect the complete proposed change against the base, for example `git diff origin/main...HEAD` and `git log origin/main..HEAD` for a normal origin-based PR. Remove accidental unrelated commits from the proposal without discarding someone else's work. Resolve conflicts and run the repository's required checks on the resulting code.
3. Search for an existing open PR with the same head repository, head branch, and base. Update that PR instead of creating a duplicate. A merged or closed PR is not an active target for new work.
4. When publication is in scope, push the task branch and create the PR with explicit head and base. Follow [pr-requirements](../pr-requirements/SKILL.md) and the repository PR template for its title, description, evidence, and readiness. Use a draft when work or required checks remain incomplete; do not claim missing checks passed.
5. Return the PR URL. In Codex, attach any created PR or existing PR being worked on using the available artifact tool. Keep follow-up commits and review fixes on that PR's head branch.

## Work on an incoming PR

- **Review requested:** Inspect the specified PR, its head/base, diff, tests, and checks. Report findings. Reviewing alone does not authorize changing its code, pushing, merging, or publishing comments.
- **Fixes requested:** Check out the verified PR head or use an isolated worktree. Confirm access to the actual head repository, make focused fixes, rerun checks, and push to the same head branch when publication is in scope. If access is missing, provide the prepared patch or branch and report the limitation; do not push it to main.
- **Conflicts with main:** Fetch the latest base and merge it into the PR head branch to preserve shared history, resolve conflicts, rerun checks, and push normally. Apply `commit-requirements` to the merge commit. Do not resolve the problem by merging the task branch into local main and pushing main.
- **Ready to merge:** Green checks do not authorize merging. Merge only when requested, after required checks and reviews pass and conflicts are resolved. Use the hosting platform's PR merge operation and repository-approved merge method; keep the resulting commit message conventional. Do not bypass protections or substitute a local push to main.
- **After merge:** Fetch the updated main. Start subsequent tasks on new branches. Delete a task branch only when cleanup is authorized and its work is confirmed merged; never delete another contributor's branch as incidental cleanup.

## Final verification

Before reporting completion, verify the current branch, working-tree status, actual push destination if published, and PR head/base/state if applicable. Report checks run and any remaining local-only work. A rejected push, missing permission, or failed check is a limitation to report, not a reason to push to main.

This skill provides agent instructions. Server-side branch protection must be configured separately to mechanically reject direct pushes; this skill does not install or change repository protections.
