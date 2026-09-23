# External tools and agent skills

This repository vendors four agent skills from [Vercel Labs' agent-skills](https://github.com/vercel-labs/agent-skills). They provide development guidance in `.agents/skills`, alongside this repository's branch, commit, and pull request requirements.

## Source and inventory

All four directories are unmodified copies of upstream revision [`063bee94c3f4df8453406c830b0a7df0f2860278`](https://github.com/vercel-labs/agent-skills/commit/063bee94c3f4df8453406c830b0a7df0f2860278), imported on 2026-09-23. The directory names are preserved; the skill names below come from upstream `SKILL.md` metadata.

| Local directory                                                             | Skill name                      | Purpose                                            | Files | Pinned upstream source                                                                                                            |
| --------------------------------------------------------------------------- | ------------------------------- | -------------------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------- |
| [composition-patterns](../.agents/skills/composition-patterns/SKILL.md)     | `vercel-composition-patterns`   | React component composition and state ownership    | 14    | [Source](https://github.com/vercel-labs/agent-skills/tree/063bee94c3f4df8453406c830b0a7df0f2860278/skills/composition-patterns)   |
| [react-best-practices](../.agents/skills/react-best-practices/SKILL.md)     | `vercel-react-best-practices`   | React and Next.js performance guidance             | 76    | [Source](https://github.com/vercel-labs/agent-skills/tree/063bee94c3f4df8453406c830b0a7df0f2860278/skills/react-best-practices)   |
| [react-view-transitions](../.agents/skills/react-view-transitions/SKILL.md) | `vercel-react-view-transitions` | React view transition patterns and accessibility   | 9     | [Source](https://github.com/vercel-labs/agent-skills/tree/063bee94c3f4df8453406c830b0a7df0f2860278/skills/react-view-transitions) |
| [web-design-guidelines](../.agents/skills/web-design-guidelines/SKILL.md)   | `web-design-guidelines`         | UI reviews using Vercel's Web Interface Guidelines | 1     | [Source](https://github.com/vercel-labs/agent-skills/tree/063bee94c3f4df8453406c830b0a7df0f2860278/skills/web-design-guidelines)  |

The 100 files include every file in those four upstream directories: skill entry points, compiled `AGENTS.md` guides, READMEs, metadata, rules, templates, and reference documents where provided. No other upstream skills or archive bundles are included.

## Attribution and licensing

The skills identify their author as `vercel`; the performance guide's README also credits [@shuding](https://x.com/shuding) at [Vercel](https://vercel.com). All upstream attribution and metadata remain intact.

The pinned [upstream README's License section](https://github.com/vercel-labs/agent-skills/blob/063bee94c3f4df8453406c830b0a7df0f2860278/README.md#license) states:

> MIT

The composition, React best practices, and view transitions manifests also declare `license: MIT`. The web design manifest has no separate license field; the repository-level declaration is recorded here. That upstream revision contains no standalone license file or copyright notice to copy. No replacement notice or copyright holder has been invented.

## Usage and boundaries

Agents that discover project skills in `.agents/skills` can load the appropriate `SKILL.md`; other tools can read those files directly. Apply guidance that fits the project's installed stack and follow the repository's `AGENTS.md` and workflow requirements.

These are reference documents, not application dependencies. Their examples do not enable Next.js or experimental React APIs in this project. The upstream performance README describes upstream authoring commands such as `pnpm build`; those are not commands for this npm workspace. The compiled guides are already included.

The web design skill instructs agents to fetch [the current Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md) from the separate [web-interface-guidelines repository](https://github.com/vercel-labs/web-interface-guidelines) before reviews. Those remote rules are not vendored or pinned by this import and require network access when the skill is used.

## Verification and updates

At import, the complete relative file lists and every file's Git blob hash were compared against the upstream Git tree at the pinned revision. All 100 files matched. The existing `.prettierignore` excludes `.agents`, preserving upstream formatting and compiled documents unchanged, including documents longer than the project's usual authored-file guideline.

For updates, choose a new explicit upstream commit and replace only these four directories, including their supporting files. Preserve any new attribution and license files, compare the complete file lists and contents with that revision, and update the revision, date, and inventory above. Do not regenerate or reformat the vendored guides locally. Run `npm run check` before committing; application coverage requirements remain unchanged.
