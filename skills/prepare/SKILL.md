---
name: prepare
description: >
  Prepares a fresh base branch (checkout + pull) for the components affected by
  an item, so /clarify surveys current code and /plan's Task 0 creates the working
  branch off an up-to-date base. Runs right after /spec, before /clarify.
  Use when the user says "/prepare", "/prepare spec-XXXX", "prepare the branches",
  "checkout and pull", "bring the base up to date", "leave the base fresh", or
  right after /spec to leave the base ready before scanning.
  Do NOT use to create working branches (that's /plan's Task 0), to commit or
  push (that's /commit), or to survey the codebase (use /clarify).
---

# prepare

## Overview

Puts every component affected by a story onto a fresh base branch
(`BASE_BRANCH` from the profile) via `checkout` + `pull`, so the pipeline always
starts on up-to-date code. It **doesn't create the working branch** — that's
`/plan`'s Task 0 — and it **mutates nothing beyond** the base checkout/pull.

**Announce at start:** "Preparing the base branch for <components>."

**Output:** every affected component on `BASE_BRANCH`, up to date and with a clean
working tree (or a report of what's blocking it).

---

## Project profile (read first, always)

Before anything else, read `.agents/profile.md` (at the root of the current project): it defines the base branch (`BASE_BRANCH`), the repo topology (`REPO_TOPOLOGY`: mono-repo vs multi-repo), the story ID pattern and the configured prep skill (`PREP_SKILL`). If it doesn't exist, tell the user to create it by copying `~/.agents/sdd-profile.template.md` to the project's `.agents/profile.md`, and stop: without a profile you don't know this project's conventions.

**CRITICAL — Working directory:** before running anything, verify you are in the project's working directory (`WORKING_DIRECTORY` from the profile — absolute path). If `pwd` doesn't match `WORKING_DIRECTORY`, `cd` there before continuing.

**The literals in this document are only an example resolution**.
The real values come from the `profile.md` of the project you're working on — if they differ, the profile wins:

| In this document | Key in profile.md |
|---|---|
| `spec-<number>` | `STORY_ID_PATTERN` |
| "microservice" in the prose | `COMPONENT_TERM` (section 7) — read the term from the profile |
| `develop` | `BASE_BRANCH` |
| mono-repo (a single git repo at the root) | `REPO_TOPOLOGY` |
| `apps/finances`, `apps/ledger` | section 7 / the project's component structure |
| interaction language | `OUTPUT_LANGUAGE` |

---

## CRITICAL: Identify the components to prepare

1. Extract the story number from the input (pattern `STORY_ID_PATTERN`, e.g. `spec-XXXX`).
2. To identify the affected components, in this order:
   - Read `work/active/spec-<number>/spec.md` (normal run: `/prepare` runs right
     after `/spec`) — the microservices/modules named in the story and its keywords
     serve as the initial hint.
   - If `work/active/spec-<number>/context.md` exists (because `/clarify` already ran),
     use it as the source of truth.
   - If it's still unclear → ask: "Which component(s) should I prepare?
     (e.g. apps/finances, apps/ledger)" and wait. Don't guess.
3. If the profile defines `REPO_TOPOLOGY = mono-repo` → a single git repository at the
   root: prepare the root once, without `git -C`. If it's `multi-repo` → repeat the
   steps for each component with `git -C <component>`.

---

## CRITICAL: Never lose work, never create branches, never commit

- **Allowed:** `git checkout <BASE_BRANCH>`, `git pull` (fast-forward only;
  if the pull asks for a merge/rebase → stop and report).
- **Forbidden:** `git checkout -b` (working branch = `/plan`'s Task 0),
  `git add`, `git commit`, `git push`, `git merge`, `git rebase`, `git stash`,
  and any command that discards or hides changes.
- Before touching any component, verify (read-only) that its working tree is clean.
  If there are uncommitted changes → **STOP** for that component: you neither lose
  them nor move them across branches; you report it and continue with the rest.

---

## Step 1: State check (read-only) per component

For EACH affected component (or for the root in a mono-repo):

```bash
git status --porcelain
git branch --show-current
```

- `status` is NOT empty → **STOP for that component**:
  > "`<component>` has uncommitted changes. I'm not touching them. Committing,
  > stashing or discarding them is your call; re-run `/prepare` once the working tree
  > is clean."
- `status` empty and already on `BASE_BRANCH` → go straight to the pull (Step 2).
- `status` empty and on another branch → checkout the base and then pull (Step 2).

---

## Step 2: Checkout + pull

In a mono-repo (from the root):

```bash
git checkout <BASE_BRANCH>
git pull
```

In a multi-repo, per component:

```bash
git -C <component> checkout <BASE_BRANCH>
git -C <component> pull
```

- If the pull isn't fast-forward (it asks for a merge or rebase) → **stop** and report:
  the repo has local divergence requiring a human decision, don't resolve it.
- If the checkout fails because there are uncommitted files → report it; don't force
  (`git checkout` doesn't lose them, but the cause was already detected in Step 1).

---

## Step 3: Report and hand off

1. Show per component: previous branch → `BASE_BRANCH`, pull result
   (up-to-date / fast-forward), and the working tree state.
2. Close with:
   > "Base prepared: <components> on an up-to-date `<BASE_BRANCH>`. You can now run
   > `/clarify spec-<number>`."
3. Stop — don't clarify or scan.

---

## Common Issues

| Issue | Cause | Resolution |
|-------|-------|------------|
| Dirty working tree in a component | Uncommitted work | STOP for that component; don't touch it — let the user resolve it and retry |
| Pull asks for merge/rebase | Local divergence from the remote | Stop and report; human decision |
| Component can't be identified | Missing `context.md` or the user didn't say which | Ask explicitly — don't guess |
| `PREP_SKILL` in the profile points to another skill | The project defines its own prep | Run the one the profile names; this skill is the default |
| The current base branch is the working branch | The user already created the branch and re-ran `/prepare` | Say the base is already prepared and that working branches aren't touched |

---

## Example

**User input:**
> `/prepare spec-0009`

**Flow:**
1. Story `spec-0009`; `spec.md` mentions `apps/finances` and `apps/ledger`. Profile: `REPO_TOPOLOGY = mono-repo`, `BASE_BRANCH = develop`.
2. At the root: `git status --porcelain` → empty; `git branch --show-current` → `feat/ledger-transfers`.
3. `git checkout develop` + `git pull` → up-to-date.
4. Reports:
   > "Base prepared: the mono-repo on an up-to-date `develop` (you were on `feat/ledger-transfers`). You can now run `/clarify spec-0009`."

**User input (with a dirty working tree):**
> `/prepare spec-0009`

**Flow:**
1. `git status --porcelain` → 3 modified files.
2. STOP: "The repo has uncommitted changes. I'm not touching them. Committing, stashing or discarding them is your call; re-run `/prepare` once the working tree is clean."

---

## CRITICAL: Output Language

This skill writes no artifacts. **Chat interaction follows the user's language**
(`OUTPUT_LANGUAGE` in the profile) — the message samples above are written in English;
render them in the user's language when that differs.
