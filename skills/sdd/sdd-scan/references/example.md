# sdd-scan — worked example

What a real run looks like: a refreshed context.md and its delta report.
Read it when the shape of the output is in doubt; the rules themselves are in
`SKILL.md`.

## Example

**Input:** `/scan spec-0042` — the item was clarified three weeks ago and the module
has moved since.

**Flow:**
1. `Requires` pass: the story is open, `spec.md` and `context.md` both exist. The ACs
   are **not** re-read for ambiguity — that is `/sdd-clarify`'s job, not this one's.
2. Re-surveys `apps/ledger` through the `CODE_SURVEY` port and pours the inventory into
   the template, replacing `context.md` whole.
3. Reports the delta against the previous inventory rather than the full listing.

**Output:**
> Context for spec-0042 refreshed — 1 component.
> `apps/ledger`
>   + `TransferProjector` (new)
>   ~ `LedgerEntry.amount` — now `Decimal`, was `number`
>   − `LegacyBalanceReader` (gone)
> Gaps: 1 · Unchanged in: use cases, DTOs
> Next: `/design spec-0042`.

**What it did not touch:** `spec.md`, its ACs and its `## Ambiguity Resolution`. A
change in the code that invalidates a *decision* is not a refresh — that goes back
through `/sdd-clarify` or `/sdd-refine`.
