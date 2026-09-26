# Research — generic floor (stack-agnostic)

Save to `work/active/spec-<number>/docs/research.md`, one `## Decision:` block per
non-trivial decision. Only create the file when at least one decision earns an entry —
never an empty one.

---

````markdown
# Research: spec-<number>

## Decision: <title>

- **Context:** <what problem forces the decision>
- **Options evaluated:**
  1. <option A> — pros / cons
  2. <option B> — pros / cons
- **Chosen:** <option> — <reason, tied to an acceptance criterion or to a constitution
  principle>
- **Rejected because:** <brief reason>
````

## Rules

- **One block per decision**, titled with the decision itself, not with the area it
  touches.
- **At least two options.** A block with a single option is a decision that was never
  contested, and it belongs in the code rather than in a research file.
- **`Chosen` names its ground**: an acceptance criterion, or a principle from the
  project's constitution. "It felt simpler" is not a reason a reviewer can check.
- **`Rejected because` is one line per rejected option** — the cost that ruled it out.
- Anything decided here that changes a field or a flow must stay consistent with the API
  contract and `docs/data-model.md`.
- Headings in English (the `## Decision:` heading is read by name); prose in
  `ARTIFACT_LANGUAGE`.
