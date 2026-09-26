# Tier changes — raising after the survey, lowering on request

## Contents

- Raising after clarification (review)
- The lowering question
- Applying a change the developer asked for
- What each direction drags along
- Writing the tier

`~/.agents/contracts/TIERS.md` is the contract: what each tier runs and omits. This file
is how this skill moves a story between tiers.

**Raising is cheap; lowering is expensive.** Raising re-runs a stage that never ran;
lowering discards artifacts that stages already produced — which is why it is never
autonomous and never silent.

---

## Raising after clarification (review)

In the review run, read what `context.md` surveyed and what `## Ambiguity Resolution`
decided against the contract's inference table. Any one of these makes a `standard`
story `full`:

- a public contract or schema change;
- a new integration or dependency;
- more than one <component> in `context.md`;
- a change to security, authentication or performance behavior.

Raising is **autonomous**, because it *adds* work: write `tier: full` (**never delete the
field** — the escalation is part of the record, so the field stays and stops saying
`standard`), append the reason to `## Tier Rationale` — the signal that matched, never
the stage that found it — and report the raise. A `full` story has nothing to review.

---

## The lowering question

When the evidence says the story could run with fewer stages than it has, **ask**, with
the current tier first as the safe default. Each lower option names what that tier stops
producing:

- entering `standard`: `design.md` and everything under `docs/` go;
- entering `fast`: `context.md`, `design.md`, `docs/` and `plan.md` go, and the close
  moves into `spec.md`'s `## AC Coverage`.

Never write a lower tier on your own initiative — the answer authorizes it.

---

## Applying a change the developer asked for

The change run. Confirm explicitly before writing, and say what the change drags along
(next section). The target tier must be open to the story's `type`
(`FAST_TIER_TYPES`, `STANDARD_TIER_TYPES`); outside them the change is refused — widening
either list is a deliberate edit of `.agents/profile.yaml`, never a decision taken inside
one conversation.

Lowering to `fast` also needs what `fast` pays instead of the planning stages: exactly one
acceptance criterion, no `[NEEDS CLARIFICATION]` marker, and a `## Change Surface` that
can be written honestly. If the story can't carry them, it can't be `fast`.

---

## What each direction drags along

This skill **never deletes a file**. It names the files the developer deletes, and the
command that follows.

| Change | Artifacts | `plan.md` | Next |
|---|---|---|---|
| `fast` → `standard` | none to delete; `context.md` is now required | none existed | `/sdd-scan`, then `/sdd-clarify`, then this skill's review |
| `fast` → `full` | same as above, and the design stage comes back | none existed | `/sdd-scan`, then `/sdd-clarify`, then this skill's review |
| `standard` → `full` | none to delete; the design artifacts are now required | invalid — regenerated after the design | `/sdd-design` (or `/sdd-plan` under `evidence`) |
| `full` → `standard` | delete `design.md` and `docs/` | invalid — regenerated flat, no `[P]` groups | `/sdd-plan` |
| `standard`/`full` → `fast` | delete `context.md`, `design.md`, `docs/` | deleted — the tier writes no plan | `/sdd-build`, which closes in `spec.md` |

Run `node ~/.agents/scripts/validate-artifacts.mjs spec-<number>` after applying any
change.

---

## Writing the tier

- **`full`, and nothing raised it** → write **nothing**. The absence of the field *is*
  the default.
- **The field is present** (`fast`, `standard`, or a raise written as `tier: full`) →
  edit it in place, never duplicating it: it sits in the front matter after `origin`.
  `## Tier Rationale` sits below the framing block and **above
  `## Build Mode Rationale`** — the wider decision first:

```markdown
## Tier Rationale

**Why this tier:** <the signals that matched — number of criteria, what the change is
confined to, what it does not touch>
**What covers the omitted stages:** <the check that closes the criterion, and the fact
that the working branch still gates the build>
```

Both labeled lines are mandatory when the field is present and neither may be empty:
`validate-artifacts.mjs` fails the story otherwise.

- **`fast`** also carries `## Change Surface`, after the rationales and before
  `## Acceptance Criteria`:

```markdown
## Change Surface

**Confined to:** `src/foo/bar.ts` (`parseFoo`)
**Check:** `npm test -- parseFoo`
```
