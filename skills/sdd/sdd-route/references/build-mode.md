# Build mode — how each acceptance criterion is closed

## Contents

- The two modes
- When `evidence` is a candidate
- The three conditions
- Never autonomous
- Writing it down
- Changing it later

The mode `/sdd-plan` and `/sdd-build` follow. Two values, and the default is `tdd` —
the absence of the field in the front matter, and what every story written before this
axis existed carries.

**The tier is the other axis and the two are independent:** the tier decides which
stages exist, `build_mode` decides how the criterion is closed among them. A `fast`
story can close its single criterion by `evidence`, a `full` one by `tdd`.

---

## The two modes

| Mode | The AC is closed by | For |
|---|---|---|
| `tdd` | a test written red-first against the behavior | runtime behavior: features, defects, anything with a unit that can fail |
| `evidence` | an executable check over the deliverable (`VERIFY.run`) | a deliverable no test suite covers, or code where red-first is impossible |

---

## When `evidence` is a candidate

Two families, and nothing else:

- **The deliverable is not code**: documentation, ADRs, architecture docs, a prompt or
  agent definition, a research/spike whose output is a decision, a skill.
- **It is code, but the red-first cycle cannot exist**: a pure refactor with no
  behavior change (the test that would "fail first" cannot be written by definition),
  an infra/config chore, a data migration or a one-shot script.

A story that adds or changes runtime behavior is `tdd`, full stop — "there is no time to
write tests" and "it's a small change" are not this axis.

---

## The three conditions

All three are required. If any fails, the mode stays `tdd`:

1. The item's `type` is in `EVIDENCE_MODE_TYPES` (profile, items block; default
   `[debt, chore, incident]`).
2. There is a **real check**: an adapter for the `VERIFY` port that can tell the
   deliverable being right from being wrong. Unbound port, or a check that passes no
   matter what the file says → not eligible. Name the concrete check; "the reviewer
   reads it" is not one.
3. Every AC can be closed by that check. If some can and some can't, the story is
   `tdd` — a split mode inside one plan is how coverage gets lost.

When the type is ineligible but the deliverable genuinely isn't code, say so and stop
there: the fix is widening `EVIDENCE_MODE_TYPES` in the profile, a deliberate edit the
developer makes. **Never write the field against the allowlist** —
`validate-artifacts.mjs` fails the story and `/sdd-plan` refuses to run anyway.

---

## Never autonomous

Even with all three conditions met, `evidence` is **asked**, with `tdd` first as the
safe default and the concrete check named in the recommended option. `tdd` *is*
autonomous — it is the default, and choosing it needs no one's permission.

---

## Writing it down

- **`tdd`** → write **nothing** in the front matter. The absence of the field *is* the
  default; adding it would suggest the axis was contested when it wasn't.
- **`evidence`** → add `build_mode: evidence` to the front matter, after `origin` (and
  after `tier` when that one is written), and write `## Build Mode Rationale` below
  `## Tier Rationale` when there is one, otherwise right below the framing block —
  always before `## Acceptance Criteria`:

```markdown
## Build Mode Rationale

**Why not TDD:** <what makes a red-first test impossible or meaningless here —
the concrete reason, not "it's not code">
**What verifies it:** `VERIFY.run` → `<the exact check that closes the ACs>`
```

`## Build Mode Rationale` is a structural heading — English always; the prose under it
follows `ARTIFACT_LANGUAGE`. Both lines are mandatory and neither may be empty:
`validate-artifacts.mjs` fails the story otherwise — the mode is only valid when what
replaces TDD is written down.

---

## Changing it later

A change of mode switches what the whole pipeline produces. Say what it drags along
before applying it:

- **Into `evidence`**: the three conditions above, plus the rationale section. The
  design artifacts stop being required — `/sdd-design` refuses to run on such a story.
- **Back to `tdd`**: remove the field and `## Build Mode Rationale`. `/sdd-plan` will
  then demand the design artifacts in `full`, so `/sdd-design` runs next there.
- **Either direction**: an existing `plan.md` was written for the other mode and is
  invalid — name it for regeneration with `/sdd-plan`.
