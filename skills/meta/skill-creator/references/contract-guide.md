# The `## Contract` block — pipeline skills only

## Contents

- When it applies
- Placement and shape
- The two rules that decide whether it works
- Profile keys inline, never a lookup table
- Classifying a literal
- Structural headings

Skip this whole file if PHASE 3 Step 4 classified the skill as **standalone**.

---

## When it applies

A skill is **pipeline** if a named skill produces its input or consumes its output,
if it writes into a workspace shared with other skills, or if it reads a project
profile for paths, branches or commands. The handoff is where contract defects
hide — they're invisible reading either side alone.

---

## Placement and shape

It goes **immediately after the Overview** (or after the profile block, if the skill
reads one), **before the first step**. It's an index, not a copy: when the detail
already lives in a step, reference the step instead of repeating it.

```markdown
## Contract

**Requires** — table of preconditions, each with its action on failure.
             ALL are verified before any work.
**Produces** — what the next skill will find, in verifiable terms.
**Writes**   — closed list of writable paths, and what is explicitly out.
**Never**    — forbidden verbs, no matter what.
**Escalates**— when it stops and asks.
**Degrades** — what it does when a tool it depends on is unavailable.
**Profile keys** — the config keys this skill reads, grouped by what for.
```

Write only the rows that apply. One optional row: **Reverting**, when the skill
overwrites live artifacts — name the real way back (`git restore`, a backup copy),
never promise one that doesn't exist.

The fillable template is in `skill-template.md`, section `## Contract`.

---

## The two rules that decide whether it works

- **`Produces` is written for whoever comes next, in countable terms.** "Documents
  the module" isn't a contract; "one line per AC, zero lines marked `✗`" is. A gate
  the model grades itself on is not a gate.
- **`Requires` is checked before any work**, not when each step happens to need it.
  A precondition that fails halfway leaves the workspace half-written.

---

## Profile keys inline, never a lookup table

If the skill reads a profile or config file, **do not add a
`| In this document | Key in profile.yaml |` translation table.** Two pieces replace
it: the `Profile keys` row of the `Contract` (what the skill reads) and the key
written inline in the body, with the example in parentheses.

```diff
- 1. Run the full test suite: cd <microservice> && npx jest --no-coverage
+ 1. Check out `BASE_BRANCH` for each affected <component> (e.g. `develop`)
```

**Why not a table.** It's a map someone has to remember to consult, and that isn't a
guardrail. Real evidence: a skill carried `| develop | BASE_BRANCH |` in its table
and, three hundred lines below, still checked `branch ∉ {main, master}` — letting
through exactly the project whose base branch is `develop`. The one skill that got it
right wrote `` `BASE_BRANCH` (`develop`) `` inline and depended on no table at all.

---

## Classifying a literal

When rewriting a literal, classify it — sentence by sentence; there's no mechanical
pass:

| Kind | Test | What to do |
|---|---|---|
| **Normative** | The action changes if the value changes | Replace with the key |
| **Illustrative** | It only clarifies the sentence | Keep it, in parentheses or in the example |

---

## Structural headings

A heading another skill reads to find its input (`## AC Coverage`,
`## Design Decisions`, `Task N`) is part of the contract. Keep it in English whatever
language the chat runs in, and register it in the project's pipeline catalog.
Translating one breaks the reader silently: the section is there, and the next skill
reports it missing.
