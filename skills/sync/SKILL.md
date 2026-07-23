---
name: sync
description: >
  Closes the documentation half of a story at the end of the pipeline:
  promotes the design's artifacts to the affected module's docs folder,
  appends design.md's "Decisiones de Diseño" section (if any) to the
  cumulative docs/decisions.md log, and reads the "Impacto en Arquitectura
  Global" section /design already left in design.md — if it says yes,
  invokes /architecture with the node/edge already specified (sync detects
  nothing on its own, it only promotes what /design already documented) —
  and moves the work/active folder to work/done. Doesn't touch git — that's
  /commit's job. Use when the user says "/sync hu-XXXX", "sincronizar
  documentación", "cerrar historia" or "finalizar historia", or after /build
  completes all plan tasks and the user approves the changes.
  Do NOT use to execute plan tasks (use /build), fix post-build defects
  (use /hotfix), group/execute commits and draft the PR (use /commit, right
  after /sync), or bootstrap docs/architecture/ from scratch (use
  /architecture directly).
---

# sync

## Overview

Close the documentation half of a story at the end of the pipeline: promote
the documentation produced during `/design` into the module docs folder,
append any design decisions to the cumulative `docs/decisions.md` log, read
`design.md`'s own `## Impacto en Arquitectura Global` verdict and hand off to
`/architecture` if it says the story touched global architecture, and archive
the story workspace into `work/done/`. Sync doesn't detect anything itself
anymore — `/design` already determined and documented it; sync only promotes.
That's the whole scope — the git side (grouping and executing commits,
drafting the PR) is `/commit`'s job, meant to run right after this one.

**Announce at start:** "Sincronizando documentación de hu-<number>."

**Output:**

- Artefactos del design promovidos a `apps/<app>/docs/<module>/` (o `docs/<module>/` en raíz si son transversales).
- `docs/decisions.md` (raíz del repo) con una entrada nueva si `design.md` tenía sección "Decisiones de Diseño" (o sin cambios, si no aplicó).
- `docs/architecture/` actualizado por `/architecture` si la historia tocó arquitectura global (o sin cambios, si no aplicó).
- Carpeta `work/active/hu-<number>/` movida a `work/done/hu-<number>/`.
- Sugerencia de correr `/commit hu-<number>` como siguiente paso.

**Core principle:** sync sincroniza documentación, nada más — no propone ni
ejecuta commits ni PR. Sigue leyendo `status`/`diff`/`log` en modo solo
lectura para el chequeo de gates del Step 2, pero el cierre de git vive en
`/commit`.

---

## Perfil del proyecto (leer primero, siempre)

Antes de cualquier otra cosa, leé `.agents/profile.md` (en la raíz del proyecto actual): define el patrón de ID
de historia, las rutas de artefactos, la rama base, la convención de docs por módulo y el idioma de salida.
Si no existe, avisá al usuario que lo cree copiando `~/.agents/sdd-profile.template.md` a `.agents/profile.md`
del proyecto, y detené: sin perfil no conocés las convenciones de este proyecto.

**Los literales de este documento son solo un ejemplo de resolución** (el perfil de admin-back).
Los valores reales salen del `profile.md` del proyecto en el que estés trabajando — si difieren, mandan los del perfil:

| En este documento | Clave en profile.md |
|---|---|
| `hu-<number>` | `STORY_ID_PATTERN` |
| `work/active/hu-<number>/` | `WORKDIR_ACTIVE` |
| `work/done/hu-<number>/` | `WORKDIR_DONE` |
| `master` | `BASE_BRANCH` |
| `apps/<app>/docs/<module>/` | `DOCS_MODULE_ARTIFACTS` |
| salida en español | `OUTPUT_LANGUAGE` |

---

## CRITICAL: Verify inputs

Extract the story number from user input. Then verify, in order:

1. `work/active/hu-<number>/` exists.
   If missing, check `work/done/hu-<number>/` — if it is already there, the
   story was already synced: report it and stop.
2. `plan.md` exists and **all** its tasks are marked `[X]`.
   If there are pending tasks → stop:
   "El plan todavía tiene tareas sin completar. Ejecutá `/build hu-<number>` primero."
3. `design.md` exists — defines the destination of each artifact. If missing,
   ask the user whether to skip doc promotion; do not invent module docs.

---

## CRITICAL: Never run git mutations

Version control is managed by the user — same rule as `/build`. Sync doesn't
even propose a commit plan anymore (that moved to `/commit`); it only reads
git state for the Step 2 gate check.

- **Allowed (read-only):** `git status`, `git diff`, `git log`, `git branch --show-current`.
- **Forbidden:** `git add`, `git commit`, `git push`, `git merge`, `git rebase`,
  `git checkout -b`, `gh pr create` and any other state-changing git/gh command.

Also: if `git branch --show-current` returns the base branch (`master`), stop
immediately and ask the user to switch to the working branch first.

---

## Step 1: Read the story artifacts

Read from `work/active/hu-<number>/`:

- `design.md` — affected apps and modules → defines each artifact's destination.
- `docs/` — artifacts to promote (`diagram.md` sequence diagram,
  `component.md` C4 Level 3, `api.yaml`, `data-model.md`, etc.).

## Step 2: Pre-close verification

1. `git branch --show-current` — stop if it is the base branch.
2. `git status --porcelain` and `git diff --stat` (read-only) — inventory of
   what the story changed.
3. Offer to run the same gates as CI before closing the story. **Ask first** —
   it takes minutes:

   ```bash
   npx nx run-many -t lint,test,build --projects=<apps afectadas>
   ```

   If any gate fails → stop: the story is not ready to close. Report the
   failure; fix it directly, or use `/hotfix hu-<number>` if it traces back to
   a spec gap.

## Step 3: Promote design artifacts to module docs

For each file under `work/active/hu-<number>/docs/`:

1. Identify the affected app and module from `design.md` (and `context.md` if
   needed). If it is ambiguous → ask the user, do not guess.
2. Resolve the destination from `DOCS_MODULE_ARTIFACTS`:
   - Artifact of one app's module → `apps/<app>/docs/<module>/<artifact>.md`
   - Cross-cutting artifact (libs, more than one app) → `docs/<module>/<artifact>.md` at the repo root
3. **Copy** (don't move) the artifact to its destination:
   - Destination does not exist → create it (create the folder tree as needed).
   - Destination exists → the new version supersedes: overwrite it, and record
     in the PR body that the module docs were updated by this story.
4. The original stays inside the story folder as a point-in-time record — it
   travels to `work/done/` in Step 4.

Stories without design artifacts (no `docs/` folder) skip this step silently;
note it in the final summary.

## Step 4: Append to the decisions log

`docs/decisions.md` (repo root — **not** `docs/architecture/`, that scope is
strictly `/architecture`'s C4 diagrams) is a single cumulative, append-only
log of design decisions across **every** story, not just cross-cutting ones —
a decision scoped to one module still belongs here.

If `design.md` has a `## Decisiones de Diseño` section:

1. If `docs/decisions.md` doesn't exist yet, create it with a short header
   (append-only, reverse-chronological — most recent first).
2. Copy the section **verbatim** (don't paraphrase) as a new entry at the
   **top** of the log:

   ```markdown
   ## HU-<number> — <título corto de la historia> (<fecha de cierre>)

   <contenido literal de la sección "Decisiones de Diseño" de design.md>

   ---
   ```

3. Never edit or delete a previous entry — a superseded decision gets a new
   entry that references the old one.

If `design.md` has no such section, skip silently — not every story has a
significant decision to record.

## Step 5: Archive the story workspace

Move the whole folder (filesystem operation, not a git mutation):

```powershell
Move-Item work/active/hu-<number> work/done/hu-<number>
```

`work/` is tracked by git, so the move shows up in `git status` — `/commit`
picks it up from there as part of its own commit grouping.

## Step 6: Promote global architecture changes (if design.md already flagged one)

`/design` already determined, at design time, whether the story touches
global architecture — it's documented explicitly in `design.md`'s
**`## Impacto en Arquitectura Global`** section (always present, never
conditional — see PHASE 4/`references/design-template.md` of `/design`).
Sync does **not** re-derive this from a git diff — it just reads the
answer and promotes it.

1. Read `## Impacto en Arquitectura Global` from `design.md`.
2. If it says **Sí**: invoke the `architecture` skill in Update mode with
   this story's number (`hu-<number>`), passing along the level (Context/
   Container), the change, and the concrete node/edge already specified
   there — `architecture` applies it, it doesn't have to infer it.
3. If it says **No**: skip silently, note "sin cambios de arquitectura
   global" in the close-out summary.

This runs automatically as part of closing the story — filesystem-only, no
git mutation, same class of action as Step 3's doc promotion. No need to ask
the user first.

If `design.md` predates this section (an older story, written before this
convention existed) and doesn't have it, fall back to asking the user
directly whether the story touched global architecture — do not guess from
the diff.

## Step 7: Suggest /commit and close out

Report, in this order:

1. Artifacts promoted (destination paths) — or "no artifacts to promote".
2. Entry added to `docs/decisions.md` (its title) — or "no design decisions
   to record".
3. Folder archived under `work/done/hu-<number>/`.
4. `docs/architecture/` updated (what changed) — or "no global architecture
   changes".
5. Explicitly suggest: "Corré `/commit hu-<number>` para agrupar y
   ejecutar los commits y dejar el PR redactado."

Then stop — grouping/executing commits and drafting the PR is `/commit`'s job,
not this skill's.

> Si después del cierre aparece un defecto originado en una ambigüedad o gap de
> `hu.md`, no reabrir esta skill — usar `/hotfix hu-<number>`.

---

## Examples

### Example 1: standard close after /build

User says: "/sync hu-0009"

Actions:
1. Read `.agents/profile.md` and verify `work/active/hu-0009/` with the plan
   fully done (`[X]` on every task).
2. `git branch --show-current` → `feat/hu-0009-transfers`; `git status
   --porcelain` → 14 files changed, all from the story.
3. With the user's go-ahead, run `npx nx run-many -t lint,test,build
   --projects=finances` → all green.
4. Promote `docs/diagram.md` and `docs/api.yaml` to
   `apps/finances/docs/movement/` (design points to the `movement` module).
5. `design.md` has a "Decisiones de Diseño" section → append a new entry at
   the top of `docs/decisions.md`.
6. `Move-Item work/active/hu-0009 work/done/hu-0009`.
7. `design.md`'s "Impacto en Arquitectura Global" says **No** → skip
   silently, no need to inspect the diff.
8. Suggest: "Corré `/commit hu-0009` para agrupar y ejecutar los commits y
   dejar el PR redactado."

Result: documentation synced, story archived, and the user knows the next
step (`/commit`).

### Example 2: a story that does touch global architecture

Context: `/sync hu-0015` closes a story that added `apps/notifications`.
`design.md` has:

```markdown
## Impacto en Arquitectura Global

**¿Toca arquitectura global?** Sí.

- **Nivel:** Container (Nivel 2)
- **Cambio:** nuevo microservicio
- **Nodo/arista concreto:** agregar nodo `notifications`; arista
  `ledger -. eventos .-> notifications`.
```

Actions:
1. Sync reads the section as-is — doesn't inspect `git diff` to confirm it.
2. Invokes `/architecture hu-0015`, passing along the level, the change, and
   the already-specified node/edge.
3. `/architecture` applies them directly to `containers.md` without having
   to re-analyze what changed.

Result: `containers.md` updated without any skill having to re-derive the
delta from the code.

### Example 3: automatic suggestion when /build closes

Context: `/build hu-0010` finished all tasks and the user replies "aprobado".

Actions:
1. Suggest: "Corré `/sync hu-0010` para sincronizar la documentación."
2. If the user confirms, run the full workflow from Step 1.
3. On close, in turn suggest `/commit hu-0010`.

Result: the story's close happens without the user having to remember the
next steps.

---

## Common Issues

| Issue | Cause | Resolution |
|---|---|---|
| `plan.md` has tasks without `[X]` | `/build` didn't finish | Stop — suggest `/build hu-<number>` |
| Folder is already in `work/done/` | sync already ran for this story | Report it and stop |
| No `docs/` folder in the story | Story with no API/diagram changes | Skip Step 3, note it in the final summary |
| `design.md` has no "Decisiones de Diseño" section | Story with no significant decisions | Skip Step 4 silently — not every story has a decision worth recording |
| `docs/decisions.md` doesn't exist yet | No story with decisions has ever closed in this repo | Create it in Step 4 with the standard header — no need to wait for a separate bootstrap skill |
| Destination doc already exists | Module docs accumulate across stories | Overwrite (the new version supersedes) and note it in the final summary so `/commit` reflects it in the PR |
| Module can't be identified | `design.md` doesn't name it | Ask the user — don't guess |
| Current branch is the base branch | The user forgot to switch branches | Stop immediately, ask them to switch to the working branch |
| lint/test/build fails in Step 2 | Regression at close time | Stop — fix directly, or `/hotfix` if it traces back to a spec gap |
| User asks to group/execute commits or draft the PR right here | Scope confusion after the skill split | Explain that's `/commit hu-<number>`, meant to run right after |
| `design.md` has no "Impacto en Arquitectura Global" section | Story designed before this convention existed | Don't guess from the diff — ask the user directly whether the story touched global architecture |
| The section says "Sí" but the node/edge isn't clear | `/design` didn't specify it in enough detail | Invoke `/architecture hu-<number>` anyway and let it ask for precision, or ask the user before invoking |
| User asks to bootstrap `docs/architecture/` from here | Out of this skill's scope | Explain that's `/architecture` (with no arguments), not `/sync` |
