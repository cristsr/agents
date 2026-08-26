# Decision log format — worked entries

The shape of each `## Ambiguity Resolution` entry in `spec.md`, one example per
kind: autonomous at high, medium and low confidence, consulted, and the build-mode
entry that is always present whichever carril won.

---

```markdown
## Ambiguity Resolution

- **AC-2 · autonomous (high):** Which HTTP code for an empty list? → **200 with an
  empty array**.
  *Rationale:* it's the REST standard for collections with no results; 404 is reserved
  for a nonexistent resource. *Source:* HTTP convention (level 5).

- **AC-3 · autonomous (medium):** Max length of `Payee`? → **255**.
  *Rationale:* consistency with the analogous field that already exists.
  *Source:* `apps/finances/.../transaction.entity.ts:merchant` (level 4).

- **AC-4 · consulted:** `dryRun` on every write command or only where the case is
  clear? → **On all of them, no exceptions** (developer's decision).
  *Why it was consulted:* it defines the item's cross-cutting surface — scope category.

- **AC-6 · autonomous (low):** Format of the batch identifier? → **ULID**.
  *Rationale:* time-sortable, no coordination required.
  *No precedent:* the repo has no batch-identifier convention yet.
```

One entry is always present, whichever way it went — the **build mode** from P2b:

```markdown
- **Build mode · consulted:** TDD or evidence for this item? → **evidence**
  (developer's decision).
  *Rationale:* the deliverable is a set of `SKILL.md` files; there is no unit that
  can fail first. *Check:* `VERIFY.run` → `node ~/.agents/scripts/validate-skills.mjs`.
```
