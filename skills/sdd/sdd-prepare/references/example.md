# sdd-prepare — worked example

What a real run looks like: the checkout, the pull and the branch it records.
Read it when the shape of the output is in doubt; the rules themselves are in
`SKILL.md`.

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
   > "Ready: the mono-repo on `feat/SPEC-0009-ledger-transfers` (cut off an up-to-date `develop`; you were on `feat/ledger-transfers`), recorded in `work/active/spec-0009/.branch`. You can now run `/sdd-scan spec-0009`."

**User input (with a dirty working tree):**
> `/prepare spec-0009`

**Flow:**
1. `git status --porcelain` → 3 modified files.
2. STOP: "The repo has uncommitted changes. I'm not touching them. Committing, stashing or discarding them is your call; re-run `/sdd-prepare` once the working tree is clean."
