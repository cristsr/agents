# Calibrated cases — real decisions from this project

Worked examples of the rubric applied: what was resolved alone, what was escalated,
and why. Read one when a decision sits on the line between autonomous and escalated;
the rubric itself (`decision-authority.md`) is what every run reads.

---

The boundary, using decisions already made in `work/done/`:

| Case | Resolution | Verdict |
|---|---|---|
| spec-0009 · which `NODE_ENV` value means "production"? | `NODE_ENV === 'production'` | **Autonomous, high** — universal ecosystem standard (level 5) |
| spec-0001 · max length of `Payee` | `255` | **Autonomous, medium** — precedent: `merchant` field in `apps/finances` (level 4) |
| spec-0024 · canonicalization algorithm | JCS (RFC 8785) | **Autonomous, high** — RFC with official vectors; correctness is verifiable (level 5) |
| spec-0024 · `NOT NULL` from day one? | Yes, rewriting the migration | **Autonomous, high** — `CLAUDE.md` allows rewriting migrations on a clean base (level 2) |
| spec-0024 · stop at the first break or report them all? | Walks everything, exit `1` if any occurred | **Autonomous, high** — CLI/CI convention (level 5) |
| spec-0024 · define the hash input by exclusion | Full payload + envelope, minus `recorded_at` and `global_position` | **Autonomous, medium** — follows from the AC's invariant: a new field can't fall outside the hash unnoticed (level 6) |
| spec-0002 · `append` with an empty batch | Silent no-op | **Autonomous, medium** — follows from the item's invariants (level 6) |
| spec-0005 · retry with a different `external_ref` | `LEDGER_ALREADY_INITIALIZED` exception | **Autonomous, medium** — typed-error pattern already established (level 4) |
| spec-0025 · transient PostgreSQL codes | Only `40P01` and `40001` | **Autonomous, high** — they're the engine's canonical ones (level 5) |
| spec-0025 · `dryRun` in the body or as a query param? | Body field with `class-validator` | **Autonomous, high** — the stack pack's DTO mapping reference (level 2) |
| spec-0025 · **`dryRun` on every write command?** | On all of them, no exceptions | **ESCALATE** — *scope* category: it defines the item's cross-cutting surface |
| spec-0025 · **how many retries and with what backoff?** | 3 attempts, exponential with jitter | **ESCALATE** — operational policy with a latency/resilience trade-off no source determines |

> How to read the table: of 12 real decisions, 10 had an authority source available.
> The 2 that didn't fall cleanly into the categories in §3.
