---
name: sdd-prepare
description: >
  Puts every component affected by a story onto a fresh base branch (checkout +
  pull) and then creates and checks out the story's working branch off it,
  recording the branch name in work/active/spec-{number}/.branch so /sdd-plan's Task 0
  and /sdd-build can rely on it without asking. Runs right after /sdd-spec, before /sdd-clarify.
  Use when the user says "/sdd-prepare", "/sdd-prepare spec-XXXX", "prepare the branches",
  "checkout and pull", "bring the base up to date", "leave the base ready", or
  right after /sdd-spec to leave the repo ready before scanning.
  Do NOT use to commit or push (that's /sdd-commit), to survey the codebase (use
  /sdd-clarify), or to write the plan (use /sdd-plan).
---

# prepare

## Overview

Puts every component affected by a story onto a fresh base branch
(`BASE_BRANCH` from the profile) via `checkout` + `pull`, then **creates and
checks out the story's working branch** off that fresh base and records the name
in the story workspace. The pipeline (clarify → design → plan → build) runs on
the working branch from here on; `/sdd-plan`'s `Task 0` only verifies it, and
`/sdd-build` refuses to run on the base.

**Announce at start:** "Preparing the base and the working branch for <components>."

---

## Project profile (read first, always)

Read `.agents/profile.yaml` from the project root before anything else, as
`~/.agents/references/project-profile.md` describes: what a missing file means, how a
`null` key falls back, how a port resolves to an adapter, and why every path or command
shown here is only an example the profile overrides. The keys this skill reads are
listed under **Profile keys** in the `Contract` below.

---

## Contract

What this skill needs, what the pipeline finds afterwards, and what it may not do.
**Check every `Requires` row before running any git command** — this is the only skill
of the pipeline whose effect is entirely git state, so a wrong precondition here is a
wrong branch everywhere downstream.

**Requires**

| Condition | Check | If it fails |
|---|---|---|
| You are in the project's working directory | `pwd` == `WORKING_DIRECTORY` (absolute path, from the profile) | `cd` there before running anything |
| This project uses this skill for prep | `PREP_SKILL` names `prepare` (or is unset) | Hand over: run the skill the profile names, and stop |
| The affected <component>s are known | resolved from `context.md`, `spec.md` or `MODULE_ROOT` (Step 0) | Ask which ones, and wait — never guess a repo to check out |
| The story's workspace exists | `[ -d work/active/spec-<number>/ ]`, when an id was given | Stop **before running any git command**: "`spec-<number>` has no workspace. Run `/spec spec-<number>` first." Step 3 writes `.branch` into that folder as its last action, so a missing one fails after the branches have already moved |
| The <component>'s working tree is clean | `git status --porcelain` is empty | Stop **for that <component>** and continue with the rest — see Step 1 |

The last row is per-<component>, not global: one dirty repo blocks itself, not the run.

**Produces** — this is what `/sdd-clarify` and `Task 0` rely on

- every affected <component> checked out on `BASE_BRANCH` and fast-forwarded to the
  remote, with a clean working tree. `/sdd-clarify` surveys current code because of this,
  and the working branch is cut off an up-to-date base because of this
- the story's **working branch** created off `BASE_BRANCH` and checked out in every
  affected <component>, with the branch name recorded in
  `work/active/spec-<number>/.branch`. `/sdd-plan`'s `Task 0` verifies it instead of
  creating it, and `/sdd-build` requires it
- for every <component> that couldn't get there, an explicit line saying why. There is
  no silent partial success: the report names each <component> either as prepared or as
  blocked

**Writes** — exactly one file

- `work/active/spec-<number>/.branch` — a single line: the working branch name.

It doesn't write `spec.md`, doesn't touch the other story artifacts, and creates or
edits no source file.

**Never** — the rule is *never lose work, never commit, never guess a branch name*

- **Allowed:** `git status --porcelain`, `git branch --show-current`,
  `git checkout <BASE_BRANCH>`, `git pull --ff-only`,
  `git checkout -b <branch-name> <BASE_BRANCH>`, `git checkout <branch-name>`.
- **Forbidden:** `git add`, `git commit`, `git push`, `git merge`, `git rebase`,
  `git stash`, `git reset`, `git clean`, and any other command that discards,
  rewrites or hides changes.

The `--ff-only` isn't a preference: it is what makes "never lose work" checkable by the
command instead of by intention. A pull that can't fast-forward stops the <component>.

**Escalates**

- The affected <component>s, when neither `context.md`, `spec.md` nor
  `MODULE_ROOT` identifies them (Step 0).
- A dirty working tree: report and move on — committing, stashing or discarding is the
  user's call, never this skill's.
- A pull that isn't fast-forward: local divergence needs a human decision; report it
  and don't resolve it.
- The working branch name (Step 3) — always asked, never invented. This is the one
  question `/sdd-plan` used to own; prepare owns it now, so `/sdd-plan` and `/sdd-build` never ask.

**Degrades**

- `context.md` absent (the normal case — `/sdd-prepare` runs before `/sdd-clarify`) → derive
  the <component>s from `spec.md` and `MODULE_ROOT`.
- `MODULE_ROOT` (stack block) inconclusive → ask, same as `/sdd-clarify` does.
- No item id in the input (a bare `/sdd-prepare`) → refresh the base only, and report
  that owning the working branch (creating it and recording `.branch`) needs the story
  id: rerun as `/prepare spec-<number>`.
- `REPO_TOPOLOGY = mono-repo` → one repository at the root: prepare it once, without
  `git -C`.

**Reverting** — nothing is overwritten except `.branch`, which is one line and
re-writable. The only other state changed is which branch is checked out, and Step 4's
report names each <component>'s previous branch so `git checkout <previous>` puts it
back. The pull is fast-forward only, so local history is never rewritten.

**Profile keys**

- `STORY_ID_PATTERN`, `WORKDIR_ACTIVE` — the item's id and workspace, written
  throughout this document as `spec-<number>` and `work/active/spec-<number>/`
- `STORY_KEY_PATTERN` — the working branch's `<story-key>` part, in Step 3's ask
- `WORKING_DIRECTORY` — the first `Requires` row
- `BASE_BRANCH` — the base every <component> is refreshed to, and what the working
  branch is cut off
- `PREP_SKILL` — whether this skill is the project's prep step at all
- `REPO_TOPOLOGY` — one repo at the root, or one per <component>
- `MODULE_ROOT` — identifying the affected <component>s (its subdirectories, or a
  `README.md` catalog there)
- `COMPONENT_TERM` and the stack block — the term for a deployable unit, and the project's
  component structure
- `OUTPUT_LANGUAGE` — see "Output language"

---

## Step 0: Identify the components to prepare

1. Extract the item id from the input (pattern `STORY_ID_PATTERN`, e.g. `spec-XXXX`).
   A bare `/sdd-prepare` with no id is valid — skip to the last bullet.
2. To identify the affected <component>s, in this order:
   - `work/active/spec-<number>/context.md` if it exists (because `/sdd-clarify` already
     ran) — it's the source of truth, it was surveyed against the code.
   - Otherwise `work/active/spec-<number>/spec.md` (the normal run: `/sdd-prepare` goes
     right after `/sdd-spec`) — the <component>s named in the item and its keywords, read
     against `MODULE_ROOT`.
   - If it's still unclear → ask: "Which component(s) should I prepare?
     (e.g. `apps/finances`, `apps/ledger`)" and wait. Don't guess.
3. Resolve the topology from `REPO_TOPOLOGY`: `mono-repo` → a single git repository at
   the root, prepared once, without `git -C`; `multi-repo` → repeat the steps per
   <component> with `git -C <component>`.

---

## Step 1: State check (read-only) per component

For EACH affected component (or for the root in a mono-repo):

```bash
git status --porcelain
git branch --show-current
```

- `status` is NOT empty → **STOP for that component**:
  > "`<component>` has uncommitted changes. I'm not touching them. Committing,
  > stashing or discarding them is your call; re-run `/sdd-prepare` once the working tree
  > is clean."
- `status` empty and already on `BASE_BRANCH` → go straight to the pull (Step 2).
- `status` empty and on another branch → checkout the base and then pull (Step 2).

---

## Step 2: Checkout + pull

In a mono-repo (from the root):

```bash
git checkout <BASE_BRANCH>
git pull --ff-only
```

In a multi-repo, per component:

```bash
git -C <component> checkout <BASE_BRANCH>
git -C <component> pull --ff-only
```

- If `--ff-only` refuses the pull → **stop** and report: the repo has local divergence
  requiring a human decision, don't resolve it.
- If the checkout fails because there are uncommitted files → report it; don't force
  (`git checkout` doesn't lose them, but the cause was already detected in Step 1).

---

## Step 3: Resolve, create and record the working branch

With every <component> on a fresh `BASE_BRANCH`:

1. **Resolve the branch name.** Ask, never invent:
   > "What's the branch name? Use English for the description.
   > (e.g. `feat/<story-key>-short-english-description` or
   > `fix/<story-key>-short-english-description`, where `<story-key>` follows
   > `STORY_KEY_PATTERN` from the profile)"

2. **Create it in every affected <component>**, explicitly off `BASE_BRANCH`. Step 3
   is re-runnable, so check first whether the branch is already there — `git checkout
   -b` fails with *already exists* and that is not a reason to stop:

   | State of the branch | What to do |
   |---|---|
   | Doesn't exist | Create it with the command below |
   | Exists and is checked out | Verify it and skip the creation |
   | Exists but another branch is active | `git checkout <branch-name>` — never re-create it, and never `-b` |

   When it has to be created:

   ```bash
   # mono-repo (from the root)
   git checkout -b <branch-name> <BASE_BRANCH>

   # multi-repo, per component
   git -C <component> checkout -b <branch-name> <BASE_BRANCH>
   ```

   Expected: working branch created and active, starting **explicitly** from
   `BASE_BRANCH` rather than from whatever happened to be checked out.

3. **Record the name** in the story workspace:

   ```bash
   echo <branch-name> > work/active/spec-<number>/.branch
   ```

   This file is the marker `/sdd-plan` and `/sdd-build` check to know the working branch
   exists; `/sdd-plan`'s `Task 0` and `/sdd-build`'s branch gate read the name from it.

---

## Step 4: Report and hand off

1. Show per component: previous branch → working branch (off `BASE_BRANCH`, pull
   result up-to-date / fast-forward), working tree state.
2. Close with:
   > "Ready: <components> on `<branch-name>` (cut off an up-to-date
   > `<BASE_BRANCH>`), recorded in `work/active/spec-<number>/.branch`.
   > You can now run `/clarify spec-<number>`."
3. Stop — don't clarify or scan.

---

## Common Issues

The 4 that **interrupt a run** — it stops, or the call goes back to the user.
Every other failure mode is in `references/common-issues.md`, with its cause and
resolution.

| Issue | Cause | Resolution |
|-------|-------|------------|
| Dirty working tree in a component | Uncommitted work | STOP for that component; don't touch it — let the user resolve it and retry |
| `--ff-only` refuses the pull | Local divergence from the remote | Stop and report; human decision |
| Component can't be identified | Missing `context.md` or the user didn't say which | Ask explicitly — don't guess |
| `/prepare spec-XXXX` with an id that has no workspace | Typo in the id, or `/sdd-spec` never ran | Stop before any git command — the `Requires` row catches it. Otherwise the branches move and `.branch` fails to write at the very end |

---
## Example

**User input:**
> `/prepare spec-0009`

**Flow:**
1. Story `spec-0009`; `spec.md` mentions `apps/finances` and `apps/ledger`. Profile: `REPO_TOPOLOGY = mono-repo`, `BASE_BRANCH = develop`, `STORY_KEY_PATTERN = SPEC-<number>`.
2. At the root: `git status --porcelain` → empty; `git branch --show-current` → `feat/ledger-transfers`.
3. `git checkout develop` + `git pull --ff-only` → up-to-date.
4. Asks: "What's the branch name? (e.g. `feat/SPEC-0009-short-english-description`)". User: `feat/SPEC-0009-ledger-transfers`.
5. `git checkout -b feat/SPEC-0009-ledger-transfers develop` → created and active.
6. `echo feat/SPEC-0009-ledger-transfers > work/active/spec-0009/.branch`.
7. Reports:
   > "Ready: the mono-repo on `feat/SPEC-0009-ledger-transfers` (cut off an up-to-date `develop`; you were on `feat/ledger-transfers`), recorded in `work/active/spec-0009/.branch`. You can now run `/clarify spec-0009`."

**User input (with a dirty working tree):**
> `/prepare spec-0009`

**Flow:**
1. `git status --porcelain` → 3 modified files.
2. STOP: "The repo has uncommitted changes. I'm not touching them. Committing, stashing or discarding them is your call; re-run `/sdd-prepare` once the working tree is clean."

---

## Output language
**Conversational output** follows `~/.agents/references/chat-conventions.md` - the six blocks (announce, progress, question, summary, stop, handoff).

This skill writes only the branch name. A branch is git surface — history read
outside the project — so its description stays English regardless of the language
keys, exactly as `/sdd-commit` treats commit messages and the PR.
**Chat interaction follows the user's language** (`OUTPUT_LANGUAGE` in the profile) —
the message samples above are written in English; render them in the user's language
when that differs.
