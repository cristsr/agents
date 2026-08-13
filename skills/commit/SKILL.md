---
name: commit
description: >
  Second half of closing a story, right after /sync: groups the working
  tree's changes into logical commits and executes them (`git add` +
  `git commit`), verifying the index before each one, and drafts the PR
  title and body — never running `gh pr create` or `git push`, those stay as
  ready-to-run commands for the user. Use when the user says "/commit
  spec-XXXX", "commit the changes", "execute the commits", "leave the PR
  drafted", or right after /sync suggests running /commit.
  Do NOT use to promote docs or archive the story workspace (use /sync first
  — /commit expects work/done/spec-<number>/ to already exist).
  Do NOT use to push or open the PR — git push and gh pr create stay as
  ready-to-run commands for the user.
---

# commit

## Overview

Second half of the story-closing pipeline, right after `/sync`: `/sync`
promotes documentation and archives `work/active/spec-<number>/` →
`work/done/spec-<number>/`; `/commit` takes the resulting working tree and
turns it into real commits on the current branch, and drafts the PR.

**Announce at start:** "Preparing commits for spec-<number>."

**Output:** N commits executed on the current branch (one per logical unit,
aligned with `plan.md`'s tasks) + PR title and body printed in the chat +
a ready-to-run `gh pr create` command.

**Core principle:** the user decides what gets published — `/commit` runs
`git add`/`git commit` locally (reversible, invisible to others until
pushed), but never `git push` or `gh pr create`. Those stay as text commands
for the user to run.

This is the last link of the pipeline: downstream there is no other skill,
only the user.

---

## Project profile (read first, always)

Read `.agents/profile.md` at the root of the current project before anything else. If it
doesn't exist, tell the user to copy `~/.agents/sdd-profile.template.md` to
`.agents/profile.md` and stop — without a profile you don't know this project's
conventions.

Any path, branch name or command shown in this document is an example resolution; the
profile's value wins. The keys this skill reads are listed under **Profile keys** in
the `Contract` below.

---

## Contract

What this skill needs, what it leaves behind, and what it may not do. **Check every
`Requires` row before any other work** — this is the only skill in the pipeline that
mutates the repository, so a failed precondition stops the run before the first
`git add`, not after it.

**Requires**

| Condition | If it fails |
|---|---|
| `pwd` == `WORKING_DIRECTORY` (absolute path, from the profile) | `cd` there before running anything |
| `WORKDIR_DONE` (`work/done/spec-<number>/`) exists | If only `WORKDIR_ACTIVE` (`work/active/spec-<number>/`) exists → stop: "Run `/sync spec-<number>` first — `/commit` works on the already-archived story, not on `work/active/`." If neither exists → stop and ask for the correct story number |
| That folder contains `spec.md` (or its legacy `hu.md`) and `plan.md` | Say which one is missing and ask before continuing: `spec.md` feeds the PR body, `plan.md` feeds the commit grouping. Never invent ACs or groups |
| `git branch --show-current` ≠ `BASE_BRANCH` | Stop and ask the user to switch to the working branch |
| `git status --porcelain` is not empty | Nothing to commit. Check `git log` — the commits may already exist from an earlier run; report what you found and stop instead of drafting a PR for an empty change |

**Produces** — the next step belongs to the user, not to another skill

- N commits on the current branch, one per logical group of `plan.md`'s tasks,
  each one created only after the index was verified (Step 3)
- every group accounted for: committed, or explicitly listed as unrelated and left
  uncommitted (Step 5). No group goes unmentioned
- the PR title and body printed in the chat, plus a ready-to-run `gh pr create`
  command — text for the user, never executed

**Writes** — nothing outside this list

- the git index and the current branch's history (`git add`, `git restore --staged`,
  `git commit`)

No file on disk: this skill creates, edits, moves and deletes nothing. Not the
story's artifacts under `work/done/spec-<number>/` (that's `/sync`), not the source
code (that's `/build` or `/hotfix`), not the living docs (that's `/sync`).

**Never** — regardless of what the user asks inside this flow

- **Allowed, and executed here:** `git status`, `git diff`, `git log`,
  `git branch --show-current`, `git add <explicit paths>`,
  `git restore --staged <path>`, `git commit -m`.
- **Forbidden:** `git push`, `git merge`, `git rebase`, `git checkout -b`,
  `git commit --amend`, `git reset --hard`, `gh pr create` — anything that publishes,
  shares or rewrites state. They are delivered as ready-to-run text; if the user
  insists, they confirm and run it themselves, outside this skill.
- **Also forbidden:** `git add -A` and `git add .` — they stage what nobody inspected,
  which is the exact failure Step 3's index checklist exists to prevent.

**Reverting** — the commits are local until someone pushes them:
`git reset --soft HEAD~<n>` returns the last n commits to the index without touching
the working tree, and `git restore --staged <path>` takes a wrongly staged file back
out. That is the entire safety net, and it holds only while nothing has been pushed —
which is precisely why `git push` sits in `Never`.

**Escalates** — a change whose story membership isn't clear (Step 2), files already
staged by something before this run (Step 3), or an index that doesn't match the
expected group after a `git add`. Ask; never guess and never commit "to save time".

**Degrades** — if `/sync` skipped the gates or `CI_GATES_CMD` is `—`, the PR body's
Testing section says the gates were not run. Never report a pass you didn't see.

**Profile keys**

- `STORY_ID_PATTERN`, `WORKDIR_DONE` — the story's id and its archived workspace,
  written throughout this document as `spec-<number>` and `work/done/spec-<number>/`
- `WORKDIR_ACTIVE` — only to tell "not synced yet" from "wrong story number" in `Requires`
- `WORKING_DIRECTORY`, `BASE_BRANCH` — the two gates in `Requires`, and the PR's base
- `CI_GATES_CMD` — named (not run) in the PR body's Testing section (Step 4)
- `OUTPUT_LANGUAGE` — see "Output language"

---

## Step 1: Read the story artifacts

From `work/done/spec-<number>/` (already archived by `/sync`):

- `spec.md` — goal (As/I want/So that) and ACs → feed the PR body.
- `plan.md` — executed tasks → feed the commit grouping.

## Step 2: Inventory the working tree

```bash
git status --porcelain
git diff --stat
git log --oneline -10
```

- Split the changes into (a) ones that belong to this story and (b)
  unrelated changes (other work in progress on the same branch). When in
  doubt, ask the user — don't assume.
- **Always use conventional commits**, regardless of past repo style. Every
  message is `type(scope): description` — imperative mood, no period at end,
  description in **English** (profile, section 5: the git surface is English
  regardless of `ARTIFACT_LANGUAGE`). Scopes match the module/package name
  (e.g. `finances`, `ledger`, `core`, `shared`). See
  [conventionalcommits.org](https://www.conventionalcommits.org/).

## Step 3: Group and execute commits

### The index checklist — before every single commit, no exceptions

> Real incident that motivated this rule: a `git add <the task's files>`
> followed by `git commit` without checking the index swept in 31 unrelated
> files that were already `staged` from a previous session (deletes from old
> stories). The resulting commit mixed the story's changes with unrelated
> ones. Never assume the index is empty at the start.

1. `git status --porcelain` **before** touching anything — note what's
   already in the index (non-empty first column = already staged by
   something before this run).
2. If something already staged doesn't belong to the current commit group →
   warn the user and `git restore --staged <path>` those files before
   continuing (doesn't touch the working tree, only the index — reversible).
3. `git add <exact files of the group>` — name explicit files, never
   `git add -A` nor `git add .`.
4. `git status --porcelain` **after** the `add` — confirm the index
   contains **exactly** the expected files, no more, no less.
5. Only then, `git commit -m "..."`.

If step 4 shows anything unexpected, stop and resolve it before committing —
don't push forward "to save time".

### Executing the groups

For each logical group (aligned with `plan.md`'s tasks, never one giant
commit):

1. Run the index checklist above.
2. `git commit -m "..."` using conventional-commit format:
   `type(scope): description` in English.
3. Repeat for the next group.

The commit covering the `work/done/spec-<number>/` archive (the `mv`
`/sync` already ran) goes in its own `docs(<scope>):` commit, or gets folded
into the last one — decide explicitly and say so in the summary.

Unrelated changes identified in Step 2 stay uncommitted — list them in the
final summary so the user decides what to do with them.

## Step 4: Draft the PR (text only, not executed)

**Title** — conventional commit plus the story key (in English):

```
<type>(<scope>): spec-<number> <short story title in English>
```

e.g. `feat(movement): spec-0009 add transfers between own accounts`.

**Body** (markdown, always in English):

```markdown
## Summary
<As/I want/So that from spec.md, condensed in 2-3 lines>

## Implemented features
- <feature 1 based on ACs>
- <feature 2 based on ACs>

## Acceptance criteria
- [x] AC1 …
- [x] AC2 …

## Main changes
- <module/task> — <what was done>

## Documentation
- Story archived in `work/done/spec-<number>/` (via /sync)

## Testing
- `CI_GATES_CMD` (tests) ✓ (result from /sync Step 2) — or "not run", if /sync
  skipped the gates or the key is `—`

## Migrations
- `<timestamp>-<Name>` — <what it creates/alters> (or "None")
```

Print the title and the full body in the chat, and close with the
ready-to-run command (not executed) — the base is `BASE_BRANCH` from the
profile (e.g. `develop`), never a hardcoded branch name:

```bash
gh pr create --base <BASE_BRANCH> --title "<title>" --body "<body>"
```

## Step 5: Close-out summary

Report, in this order:

1. Commits executed (short hash + message for each).
2. Unrelated changes left uncommitted (if any).
3. PR title and body + ready-to-run `gh pr create` command.

Then stop — push and opening the PR stay in the user's hands.

---

## Examples

### Example 1: standard close after /sync

User says: "/commit spec-0009"

Actions:
1. Verify `work/done/spec-0009/` exists (`/sync` left it) and the current
   branch isn't the base branch.
2. `git status --porcelain` → detects 2 files already staged from a previous
   session that don't belong to this story; warn the user and
   `git restore --staged` those two before continuing.
3. `git add` Task 1's files, `git status --porcelain` to confirm the index,
   `git commit -m "feat(movement): add transfers between own accounts"`.
4. Repeat for Task 2 and for the archive commit.
5. Print the title `feat(movement): spec-0009 add transfers between own
   accounts`, the PR body, and the `gh pr create --base <BASE_BRANCH> …`
   command without running it.

Result: 3 real commits on the branch, clean working tree except for the
unrelated files, PR drafted and ready for the user to open.

### Example 2: automatic suggestion when /sync closes

Context: `/sync spec-0010` finished promoting docs and archiving the story.

Actions:
1. `/sync` suggests: "Run `/commit spec-0010` to execute the commits and leave the PR
   drafted."
2. If the user confirms, run the full workflow from Step 1.

Result: the story's close continues without the user having to assemble git
commands by hand.

---

## Common Issues

| Issue | Cause | Resolution |
|---|---|---|
| `work/done/spec-<number>/` doesn't exist | `/sync` hasn't run yet | Stop — suggest `/sync spec-<number>` first |
| The index has unexpected files after a `git add` | Something was left staged from a previous session | Stop, `git restore --staged <path>`, re-verify before committing |
| There are unrelated changes in the working tree | Other work in progress on the same branch | Exclude them from every `git add` and list them separately in the summary |
| `git status --porcelain` is empty | The commits already ran, or `/sync` left nothing pending | Check `git log`; report it and stop — don't draft a PR for an empty change |
| Current branch is the base branch | The user forgot to switch branches | Stop immediately, ask them to switch to the working branch |
| A commit was created with the wrong grouping | The index wasn't verified before committing | `git reset --soft HEAD~1` puts it back in the index (working tree untouched); regroup and commit again — only valid while nothing has been pushed |
| User asks to run `git push` or `gh pr create` | Out of this skill's scope | Remind them those are text commands for the user to run; don't execute them even if asked within this flow — confirm explicitly outside the skill if they insist |

---

## Output language

**Commit messages and the PR are written in English** — always, and deliberately
independent of `ARTIFACT_LANGUAGE`: git history and the PR are the repo's shared
record, read outside the project. The profile's section 5 states this exception
explicitly, so it isn't a decision this skill makes on its own.

**Chat interaction follows the user's language** (`OUTPUT_LANGUAGE` in the profile).
The message samples in this document are written in English; render them in the
user's language when that differs.
