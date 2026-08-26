# sdd-spec — worked example

What a real run looks like: a bug and a technical debt, each from raw text.
Read it when the shape of the output is in doubt; the rules themselves are in
`SKILL.md`.

## Example A — Bug from manual text

**User input:**
> "/sdd-spec the balance counts transfers between the user's own accounts twice.
> It's been happening since we added the new projector. It should count them once."

**Process:**
1. Classify: there's an observable symptom + expected vs. actual → `bug`. Obvious, so
   it's announced without asking.
2. ID: `sequential` → highest existing is `spec-0026` (including any
   `STORY_ID_LEGACY_PREFIXES` folders) →
   proposes `spec-0027`.
3. Title: none given and it originates here → proposes "Double counting of transfers
   in the balance".
4. Applies `spec-template.md` with the `## Defect` block.

**Resulting spec.md (fragment):**
```markdown
---
type: bug
origin: manual
---

# spec-0027: Double counting of transfers in the balance

---

## Example B — Technical debt from an audit

**Input:** `/hexagonal-audit` generates an item from a HIGH finding.

**Resulting spec.md (fragment):**
```markdown
---
type: debt
origin: audit:hexagonal-2026-08-10#H3
---

# spec-0028: Typed read ports for the read side
