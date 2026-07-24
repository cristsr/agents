---
name: commit
description: >
  Second half of closing a story, right after /sync: groups the working
  tree's changes into logical commits and executes them (`git add` +
  `git commit`), verifying the index before each one, and drafts the PR
  title and body — never running `gh pr create` or `git push`, those stay as
  ready-to-run commands for the user. Use when the user says "/commit
  hu-XXXX", "commiteá los cambios", "ejecutá los commits", "dejá el PR
  redactado", or right after /sync suggests running /commit.
  Do NOT use to promote docs or archive the story workspace (use /sync first
  — /commit expects work/done/hu-<number>/ to already exist).
  Do NOT use to push or open the PR — git push and gh pr create stay as
  ready-to-run commands for the user.
---

# commit

## Perfil del proyecto (leer primero, siempre)

Antes de cualquier otra cosa, leé `.agents/profile.md` (en la raíz del proyecto actual): define el patrón de ID
de historia, las rutas de artefactos, la rama base y el idioma de salida. Si no
existe, avisá al usuario que lo cree copiando `~/.agents/sdd-profile.template.md` a `.agents/profile.md`
del proyecto, y detené: sin perfil no conocés las convenciones de este proyecto.

**Los literales de este documento son solo un ejemplo de resolución** (el perfil de admin-back).
Los valores reales salen del `profile.md` del proyecto en el que estés trabajando — si difieren, mandan los del perfil:

| En este documento | Clave en profile.md |
|---|---|
| `hu-<number>` | `STORY_ID_PATTERN` |
| `work/done/hu-<number>/` | `WORKDIR_DONE` |
| `master` | `BASE_BRANCH` |
| salida en español | `OUTPUT_LANGUAGE` |

---

## Overview

Second half of the story-closing pipeline, right after `/sync`: `/sync`
promotes documentation and archives `work/active/hu-<number>/` →
`work/done/hu-<number>/`; `/commit` takes the resulting working tree and
turns it into real commits on the current branch, and drafts the PR.

**Announce at start:** "Preparando commits para hu-<number>."

**Output:** N commits executed on the current branch (one per logical unit,
aligned with `plan.md`'s tasks) + PR title and body printed in the chat +
a ready-to-run `gh pr create` command.

**Core principle:** the user decides what gets published — `/commit` runs
`git add`/`git commit` locally (reversible, invisible to others until
pushed), but never `git push` or `gh pr create`. Those stay as text commands
for the user to run.

---

## CRITICAL: Verify inputs

1. `work/done/hu-<number>/` must exist.
   - If only `work/active/hu-<number>/` exists instead → stop: "Corré
     `/sync hu-<number>` primero — `/commit` trabaja sobre la historia ya
     archivada, no sobre `work/active/`."
   - If neither exists → stop and ask for the correct story number.
2. `git branch --show-current` — stop if it's the base branch
   (`BASE_BRANCH`) and ask the user to switch to the working branch.

---

## CRITICAL: Never push or open the PR

- **Allowed and executed by this skill:** `git add`, `git commit` (local,
  no push).
- **Forbidden:** `git push`, `git merge`, `git rebase`, `gh pr create` and
  any other command that publishes or shares state. Delivered as a
  ready-to-run text command for the user — never executed.

---

## CRITICAL: Verify the index before every single commit

> Real incident that motivated this rule: a `git add <the task's files>`
> followed by `git commit` without checking the index swept in 31 unrelated
> files that were already `staged` from a previous session (deletes from old
> stories). The resulting commit mixed the story's changes with unrelated
> ones. Never assume the index is empty at the start.

For every commit, no exceptions:

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

---

## Step 1: Read the story artifacts

From `work/done/hu-<number>/` (already archived by `/sync`):

- `hu.md` — goal (As/I want/So that) and ACs → feed the PR body.
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
  description in **English**. Scopes match the module/package name (e.g.
  `finances`, `ledger`, `core`, `shared`). See
  [conventionalcommits.org](https://www.conventionalcommits.org/).

## Step 3: Group and execute commits

For each logical group (aligned with `plan.md`'s tasks, never one giant
commit):

1. Apply the "Verify the index before every single commit" checklist.
2. `git commit -m "..."` using conventional-commit format:
   `type(scope): description` in English.
3. Repeat for the next group.

The commit covering the `work/done/hu-<number>/` archive (the `Move-Item`
`/sync` already ran) goes in its own `docs(<scope>):` commit, or gets folded
into the last one — decide explicitly and say so in the summary.

Unrelated changes identified in Step 2 stay uncommitted — list them in the
final summary so the user decides what to do with them.

## Step 4: Draft the PR (text only, not executed)

**Title** — conventional commit plus the story key (in English):

```
feat(<scope>): hu-0009 <short story title in English>
```

**Body** (markdown, always in English):

```markdown
## Summary
<As/I want/So that from hu.md, condensed in 2-3 lines>

## Implemented features
- <feature 1 based on ACs>
- <feature 2 based on ACs>

## Acceptance criteria
- [x] AC1 …
- [x] AC2 …

## Main changes
- <module/task> — <what was done>

## Documentation
- Story archived in `work/done/hu-<number>/` (via /sync)

## Testing
- `nx run-many -t test --projects=…` ✓ (result from /sync Step 2)

## Migrations
- `<timestamp>-<Name>` — <what it creates/alters> (or "None")
```

Print the title and the full body in the chat, and close with the
ready-to-run command (not executed):

```bash
gh pr create --base master --title "<title>" --body "<body>"
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

User says: "/commit hu-0009"

Actions:
1. Verify `work/done/hu-0009/` exists (`/sync` left it) and the current
   branch isn't `master`.
2. `git status --porcelain` → detects 2 files already staged from a previous
   session that don't belong to this story; warn the user and
   `git restore --staged` those two before continuing.
3. `git add` Task 1's files, `git status --porcelain` to confirm the index,
   `git commit -m "feat(movement): add transfers between own accounts"`.
4. Repeat for Task 2 and for the archive commit.
5. Print the title `feat(movement): hu-0009 add transfers between own
   accounts`, the PR body, and `gh pr create --base master …` without
   running it.

Result: 3 real commits on the branch, clean working tree except for the
unrelated files, PR drafted and ready for the user to open.

### Example 2: automatic suggestion when /sync closes

Context: `/sync hu-0010` finished promoting docs and archiving the story.

Actions:
1. `/sync` suggests: "Corré `/commit hu-0010` para ejecutar los commits y
   dejar el PR redactado."
2. If the user confirms, run the full workflow from Step 1.

Result: the story's close continues without the user having to assemble git
commands by hand.

---

## Common Issues

| Issue | Cause | Resolution |
|---|---|---|
| `work/done/hu-<number>/` doesn't exist | `/sync` hasn't run yet | Stop — suggest `/sync hu-<number>` first |
| The index has unexpected files after a `git add` | Something was left staged from a previous session | Stop, `git restore --staged <path>`, re-verify before committing |
| There are unrelated changes in the working tree | Other work in progress on the same branch | Exclude them from every `git add` and list them separately in the summary |
| Current branch is the base branch | The user forgot to switch branches | Stop immediately, ask them to switch to the working branch |
| User asks to run `git push` or `gh pr create` | Out of this skill's scope | Remind them those are text commands for the user to run; don't execute them even if asked within this flow — confirm explicitly outside the skill if they insist |
