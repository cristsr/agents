# Route log — the two entries the review run appends

The review run records both axes in `spec.md`'s `## Ambiguity Resolution`, whichever way
they went, appended after the entries `/sdd-clarify` wrote. They are always present
after a review — `/sdd-status` reads them to know the review ran, because the default
values (`tier` absent, `build_mode` absent) leave no other trace.

The entries start with the literal labels `**Tier ·` and `**Build mode ·`.

```markdown
- **Tier · autonomous (high):** `standard` or `full` for this item? → **full**
  (raised).
  *Rationale:* the survey found the new field crossing a public payload, so the
  story touches a contract.
  *Source:* `context.md` — `src/payees/dto/payee-payload.dto.ts:exported`.

- **Build mode · consulted:** TDD or evidence for this item? → **evidence**
  (developer's decision).
  *Rationale:* the deliverable is a set of `SKILL.md` files; there is no unit that
  can fail first. *Check:* `VERIFY.run` → `node ~/.agents/scripts/validate-skills.mjs`.
```

When nothing changed, the entries still say so:

```markdown
- **Tier · autonomous (high):** does `standard` still hold? → **standard** (held).
  *Rationale:* one component, no contract or schema change in the survey.
  *Source:* `context.md`.

- **Build mode · autonomous (high):** TDD or evidence? → **tdd** (default).
  *Rationale:* the story adds runtime behavior.
```

A re-run replaces its own two entries instead of appending new ones.
