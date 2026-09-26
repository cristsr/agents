# Decision log format — worked entries

The shape of each `## Ambiguity Resolution` entry in `spec.md`, one example per
kind: autonomous at high, medium and low confidence, and consulted.

`/sdd-route` appends two more entries after this skill's — the tier and the build
mode. Those are its own; never write them here.

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
