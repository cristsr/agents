# research-md

The **why** behind the non-trivial technical decisions of one story: the alternatives that were
on the table, the one chosen, and what ruled the others out. It is the only place that
reasoning survives — the contract records the field and the narrative records the verdict, and
neither records what was rejected or on what grounds.

## Identity

- `work/active/spec-<number>/docs/research.md`.
- It exists when the story took at least one non-trivial technical decision. When every
  decision was forced by patterns already in `context.md`, it does not exist — never an empty
  file.
- `template.md` is the floor.

## Requires

A decision is non-trivial — and earns an entry — when it involves any of: choosing between
multiple valid approaches (sync HTTP against a stream, a new table against extending an
existing one, polling against a webhook); a performance, consistency or security trade-off; a
new dependency, pattern or integration point; anything the project's constitution flags as
needing justification.

If none of those applies, skip the file. An entry written to fill a section is worse than no
entry: it makes a forced decision look contested, and the next reader spends time re-deciding
something that was never open.

## Shape

One `## Decision: <title>` block per decision — the context that forces it, the options
evaluated with their pros and cons, the chosen option with its reason, and why the others were
rejected. `template.md` is the floor. At least two options per block: a single-option block is
a decision nobody contested, and it belongs in the code rather than in a research file.

The `Chosen` reason is the part that matters — it names an acceptance criterion or a principle
of the project's constitution. A choice justified by taste is not documented, it is asserted.

## Generation

Written during the design, **before** the artifacts it constrains, so that the contract and the
data model are the consequence of the decision rather than a rationalisation of it. Anything
decided here that changes a field or a flow stays consistent with the API contract and
`docs/data-model.md`: a decision recorded here and contradicted there is worse than no record.
Prose follows `ARTIFACT_LANGUAGE`; `## Decision:` stays in English, because it is read by name.

## Validation

No script and no port. Three things hold it: the design-time quality gates, whose Simplicity
and Anti-Abstraction articles are judged against what this file documents; the plan stage, which
reads it when it exists, so a decision the plan contradicts is visible there; and the
consistency rule above, applied by hand at the close.

## Mutability

**Mutable:** the wording of a decision, and a decision that was taken but never written down.

**Structural:** changing which option was chosen — the contract and the data model were designed
against the old answer and the plan was built on top of them, so all three are verified before
the story continues.

## Guarantees

- **It is the only record of the rejected options**: the contract records the field, the
  narrative records the verdict, and neither records the grounds for ruling the others out.
- **It is what the design-time quality gates are judged against**, so a story with no research
  file is a story where those gates silently pass.
- **A change of the chosen option is not a correction**: what was designed and planned on top of
  it stops being valid.
