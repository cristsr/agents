# Execution tiers — how much ceremony a story pays for

A story declares how much of the pipeline it runs. That declaration is the story's
**tier**, written in `spec.md`'s front matter, and it is the only thing that decides
which stages exist for that story:

```
/sdd-spec → /sdd-prepare → /sdd-clarify → /sdd-design → /sdd-plan → /sdd-build → /sdd-sync → /sdd-commit
                            └──────────────────┬──────────────────┘
                            the block a reduced tier omits
```

This file is the interface. The profile gates who may enter a reduced tier. The
skills are the domain.

**The tier is not a second `build_mode`.** The two axes are orthogonal and both live in
`spec.md`'s front matter:

| Axis | Question it answers | Values | Default when absent |
|---|---|---|---|
| `tier` | **which stages run** | `fast` · `standard` · `full` | `full` |
| `build_mode` | **how an AC is closed** | `tdd` · `evidence` | `tdd` |

Every combination is meaningful. A `chore` that regenerates a lockfile can be `fast` +
`evidence`; a `feat` that adds an endpoint is `full` + `tdd`; the same `feat` narrowed to
a docs-only deliverable is `standard` + `evidence`.

**The default is the absence of the field.** A story with no `tier` is `full`, exactly as
a story with no `build_mode` is `tdd`. Nothing written before this axis existed changes
behavior, and a story only carries the field when it is *not* the default.

---

## The three tiers

| | `full` (default) | `standard` | `fast` |
|---|---|---|---|
| Applies to | features, multi-component changes, schema or contract changes, critical integrations | a change circumscribed to one component, with no contract or schema change | a defect, a small refactor or a one-line/one-function change with a single criterion |
| `spec.md` | as always | + `## Tier Rationale` | + `## Tier Rationale` + `## Change Surface` |
| `/sdd-clarify` → `context.md` | yes | yes | **no** |
| `/sdd-design` → `design.md` + `docs/` | yes | **no** | **no** |
| `/sdd-plan` → `plan.md` | yes | yes — atomic tasks, no `[P]` groups, no diagram or contract work | **no** |
| `/sdd-build` | from `plan.md` | from `plan.md` | from `spec.md`, and it writes the close |
| Where `## AC Coverage` lives | `plan.md` | `plan.md` | `spec.md` |
| `/sdd-sync`, `/sdd-commit` | yes | yes | yes |

### `full`

The pipeline as documented. Nothing is conditional: the contract comes first, the plan
orders the work, and the build closes it. This is what the absence of `tier` means.

### `standard`

`/sdd-clarify` still runs — the ambiguities still have to be resolved and `context.md`
is still what `/sdd-plan` reads — but there is no `design.md`, no API contract, no data
model and no sequence diagram. `/sdd-plan` produces a simple breakdown: one task per
dependency, each with its files, its contract and its verification, and no `[P]` groups.

**Any change to a public contract or a schema is `full`, not `standard`.** Renaming an
exported function, adding a field to a payload others consume, or touching a migration
is a contract change even when it is one line, and a contract change is designed.

### `fast`

The story goes `spec → build`: no clarification pass, no design, no plan. The whole
ceremony is replaced by three things written into `spec.md` before any code exists:

- exactly **one** acceptance criterion,
- a **`## Change Surface`** naming the files and symbols the change is confined to,
- a **check** that proves the criterion.

`/sdd-build` executes the criterion, runs the check and writes `## AC Coverage` into
`spec.md` — the section that closes the story, in the artifact the tier never omitted.

**What `fast` does not skip:** the working branch (`/sdd-prepare`), the green suite
before closing, the provenance check, the `## AC Coverage` gate, and the archive. The
tier removes the *planning* stages, never the *verification* of the criterion.

---

## Front matter and headings

```yaml
---
type: bug
origin: manual
tier: fast          # only ever written when it is not `full`
---
```

Two headings belong to this axis — `## Tier Rationale` and `## Change Surface` — and it
also decides **where `## AC Coverage` lives**, which is the one heading both axes share.
The other axis' rationale appears in the table only because the two share one document
and the order their sections appear in is part of the contract. Like every structural
heading they stay in English, whatever `ARTIFACT_LANGUAGE` says, because scripts and
skills match them by name.

| Heading | Where | Required when |
|---|---|---|
| `## Tier Rationale` | `spec.md`, below the framing block and before `## Acceptance Criteria` | whenever `tier:` is present — `fast`, `standard`, and `full` written explicitly by an escalation |
| `## Build Mode Rationale` | `spec.md`, below `## Tier Rationale` | the `evidence` carril only — the axis is narrower, so its rationale sits under the wider one |
| `## Change Surface` | `spec.md`, after the rationales and before `## Acceptance Criteria` | `tier: fast` only |
| `## AC Coverage` | `plan.md` | every tier that writes a plan (`full`, `standard`) — the build appends it |
| `## AC Coverage` | `spec.md`, at the end of the file | `tier: fast` only — the build appends it |

`## Tier Rationale` records the decision, never the stage that made it. Two labeled
lines, neither may be empty:

```markdown
## Tier Rationale

**Why this tier:** <the signals that matched — number of criteria, what the change is
confined to, what it does not touch>
**What covers the omitted stages:** <the check that closes the criterion, and the fact
that the working branch still gates the build>
```

`## Change Surface` is what `fast` pays instead of a design and a plan. It is the scope
contract `/sdd-build` enforces: a change that reaches outside it means the tier was
wrong, and the build stops instead of widening it.

```markdown
## Change Surface

**Confined to:** `src/foo/bar.ts` (`parseFoo`)
**Check:** `npm test -- parseFoo`
```

---

## Guardrails

Four layers, the same shape as `build_mode`'s — the reduced tiers are deliberately hard
to reach, and the only configurable one is the first.

| # | Layer | Where | Configurable |
|---|---|---|---|
| 1 | Which item types may enter the tier | `FAST_TIER_TYPES`, `STANDARD_TIER_TYPES` (profile, `items` block) | yes — these keys |
| 2 | A written rationale in the artifact | `## Tier Rationale`, non-empty | no — it is the artifact's contract |
| 3 | Mechanical rejection | `validate-artifacts.mjs`, re-checked at Step 0 of `/sdd-plan`, `/sdd-build` and `/sdd-forge` | no |
| 4 | No silent degradation | a reduced tier whose check cannot run **stops** the story instead of closing it by eye | no |

**Default profile values:**

```yaml
FAST_TIER_TYPES: [bug, debt, chore]
STANDARD_TIER_TYPES: [feat, bug, debt, incident, chore]
```

`feat` is absent from `FAST_TIER_TYPES` on purpose: a new capability with one criterion
is still a capability, and `standard` is where it belongs. `incident` is absent for the
same reason — an incident's remediation is rarely confined to one symbol.

Widening either list is a deliberate, auditable edit of `.agents/profile.yaml`, never a
decision taken inside one conversation. `[]` disables that tier for the project.

**Writing the field against the allowlist is never allowed.** `validate-artifacts.mjs`
reports it and the next stage refuses to run.

---

## Inferring the tier

The tier is inferred **once, when the specification is written**, from the input alone —
`/sdd-spec` never surveys the codebase. Only the item's `type`, its acceptance criteria
and what the input says about the change are available, so the inference is a reading of
the request, not a measurement of the repository.

Signals, evaluated in this order. The first match wins.

| # | Signal in the input | Result |
|---|---|---|
| 1 | A schema, migration, entity or column changes | `full` |
| 2 | A public contract changes: endpoint, DTO, payload, event, exported signature | `full` |
| 3 | A new integration, dependency, queue or third-party service | `full` |
| 4 | More than one component is named, or the change crosses a module boundary | `full` |
| 5 | Security, authentication or performance behavior changes | `full` |
| 6 | Three or more acceptance criteria | `full` |
| 7 | Exactly one criterion, `type` in `FAST_TIER_TYPES`, no `[NEEDS CLARIFICATION]` marker, the input names the file or symbol, and none of 1-6 | `fast` |
| 8 | Anything else | `standard` |

A `[NEEDS CLARIFICATION]` marker disqualifies `fast` and nothing else: an item whose
input is silent about something that changes the implementation needs the clarification
pass, and `standard` keeps it.

**The inference is written down, not announced as a question.** `/sdd-spec` writes the
field and the rationale, and reports the tier in its closing summary; the developer
overrides it by asking, or afterwards with `/sdd-refine` on `spec.md`. Like every other
inferred value in this pipeline, the decision is what reaches the artifact.

**The inference is provisional, and it is corrected upwards.** `/sdd-spec` cannot see
the code; `/sdd-clarify` can, because it runs the `CODE_SURVEY` port. What the survey
finds may raise the tier — a "one-line fix" that turns out to touch three components is
`full`.

---

## Moving between tiers

| From → To | Who may do it | Rule |
|---|---|---|
| `standard` → `full` | `/sdd-clarify`, `/sdd-plan` | autonomous — it *adds* work. The field is written as `tier: full` (never deleted: the escalation is part of the record) and `## Tier Rationale` gains the reason. `/sdd-clarify` then hands off to `/sdd-design` |
| `fast` → `standard` or `full` | nobody, at the moment it is discovered | `/sdd-build` **stops and reports**. It may not write `spec.md`, and the change it found is evidence for a stage that no longer exists. The way back is `/sdd-refine` on `spec.md`, which writes the new tier — and the passes that tier declares then run: `/sdd-clarify` for `standard`, `/sdd-design` for `full`. `/sdd-clarify` cannot be the first step, because a `fast` story stops at its gate |
| anything → a lower tier | the developer only | `/sdd-clarify` **asks**, and never takes the decision on its own — the same standing as the `evidence` question. `/sdd-refine` applies it on request. Lowering requires deleting the artifacts the lower tier does not produce, and an existing `plan.md` must be regenerated |

**Raising is cheap; lowering is expensive.** Raising a tier re-runs a stage that never
ran; lowering one discards artifacts that stages already produced, which is why it is
never automatic and never silent.

---

## What no tier changes

The tier decides which stages run. It never relaxes what a stage *guarantees*:

- every acceptance criterion has a declared, executable way of being checked;
- `## AC Coverage` carries one line per AC with zero `✗` before the story can close;
- the working branch exists and the build refuses to run on a base branch;
- the pre-close suite runs (`TESTS.full`, or `VERIFY.full` in the `evidence` carril);
- the code carries no reference to the story that produced it;
- the workspace is archived under `work/done/` and the living docs are reconciled.

A tier that cannot satisfy those stops the story. It does not degrade to "reviewed by
eye".

## What the validator enforces

`validate-artifacts.mjs` reads `spec.md`'s front matter and rejects a story
mechanically when a guardrail is broken:

| Check | Result |
|---|---|
| `tier` present but not one of `fast`, `standard`, `full` | issue — never normalized into a tier |
| A tier other than `full` (i.e. the field is present) without a non-empty `## Tier Rationale` | issue |
| `tier: fast` with a `type` outside `FAST_TIER_TYPES` | issue |
| `tier: standard` with a `type` outside `STANDARD_TIER_TYPES` | issue |
| `tier: fast` with anything other than exactly one `### AC-N:` | issue |
| `tier: fast` with a `[NEEDS CLARIFICATION]` marker | issue — the pass that would resolve it does not run |
| `tier: fast` without `## Change Surface`, or with no path in `**Confined to:**`, or with no command in `**Check:**` | issue |
| `tier: fast` with a declared path that does not exist on disk | warning — a fast change modifies what is already there |
| `plan.md` present in `tier: fast` | warning — the tier writes no plan; the close belongs to `spec.md` |
| `context.md` present in `tier: fast` | warning — that tier runs no clarification pass |
| `design.md` present in `standard` or `fast` | warning — only `full` has a design stage; raise the story or drop the artifact |
| `tier: fast` whose `## AC Coverage` is missing once the build is closed, or carries a `✗`, or names no check | issue |

A story with no `tier` field is validated exactly as it was before this axis existed.
