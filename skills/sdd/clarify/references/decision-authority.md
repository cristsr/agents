# Decision authority — when to resolve alone and when to escalate

The rubric **phase P (Plan)** uses to decide, for each unknown, whether it resolves it
autonomously or escalates it to the developer.

> **Read it once, at the start of phase R** — not per unknown. Evidence is collected
> in R; here you define how that evidence is interpreted in P.

The question separating the two paths **is not "technical vs. business"**. It is:

> Is there an authority source that **determines** the answer, or am I choosing among
> legitimate alternatives where the preference belongs to the product owner?

---

## 1. Authority source hierarchy

Consult in order. The first one that **determines** the answer wins and gets cited as
`source` in the log. "Determines" means the answer follows from it, not that it's
merely compatible with it.

| # | Source | What it is | How it's cited |
|---|---|---|---|
| 1 | **Project rules** | `docs/rules.md` — non-negotiable principles | `rules.md §<section>` |
| 2 | **Project configuration** | `CLAUDE.md`, `.agents/profile.yaml` — stack, conventions, project phase | `CLAUDE.md` / `profile.yaml <block>` |
| 3 | **Story assets** | The item's own concrete material — `assets/` under the story workspace: mockups, screenshots, wireframes, signed contracts, data exports | `assets/<file>` |
| 4 | **Code precedent** | An equivalent decision already made in the repo | `<path>:<symbol>` |
| 5 | **Formal standard** | RFC, HTTP spec, convention of the framework declared in the profile | `RFC <n>` / `<framework> <convention>` |
| 6 | **The item's own invariants** | Another AC or business rule in `spec.md` that already pins the answer | `AC-<n>` / `Rule <n>` |

If **none** determines the answer → move to the escalation test (§3).

### Hierarchy rules

- **A higher level beats a lower one.** If `rules.md` contradicts a code precedent,
  `rules.md` wins — and the conflict is noted as an observation in the log.
- **An isolated precedent is not authority.** If the repo solved the same thing two
  different ways, there is no precedent: there's an inconsistency. Drop to level 5,
  and if that doesn't resolve it either, escalate as a scope decision.
- **"Compatible with" is not "determined by".** That a standard permits the chosen
  option isn't enough if it permits the alternative just as well.

---

## 2. Code probing (level 4) — happens in R3, not here

Level-4 evidence is collected **entirely in phase R3**, in a single batch of parallel
queries capped at 5. This rubric only says how to **interpret** what R3 brought back:

| R3 result | Verdict |
|---|---|
| One clear analogous case, with verbatim source | **Precedent** — level 4, medium confidence |
| Several matching analogous cases | **Strong precedent** — level 4, medium-high confidence |
| Several cases that contradict each other | **No precedent, an inconsistency** — drop to level 5 and record it |
| No relevant results | **No precedent** — drop to level 5 and record it as a signal for `/scan` |

If `CODE_SURVEY` resolves without call paths, level 4 simply doesn't exist
for that run.

---

## 3. Mandatory escalation

When no source determines the answer, escalate **only** if the unknown falls into one
of these four categories. Outside them, decide with the best available alternative and
mark it low confidence.

| Category | Signal | Example |
|---|---|---|
| **Scope** | One of the outcomes materially grows the item (new module, cross-cutting surface, work the user didn't ask for) | "`dryRun` on every command or only where the case is clear?" |
| **Business intent** | Two equally valid readings of the domain and no rule breaks the tie | "Is the balance recomputed or frozen when the period closes?" |
| **Irreversibility** | Public contract, semantics of an already-emitted event, schema others consume, anything expensive to undo | "Does this event field change meaning?" |
| **Rule conflict** | The only viable outcome violates `docs/rules.md` | "Meeting the AC requires breaking principle X" |

### Counterexamples — these are NOT escalated

- **Technical conventions with a clear standard:** HTTP code, payload shape,
  pagination, date format, engine error codes, CLI exit codes.
- **Wording precision and testability:** rewriting a vague AC, applying EARS. It
  doesn't change behavior; there's nothing to ask.
- **Edge cases already pinned** by a repo pattern or by `rules.md`.
- **Choosing among alternatives where one is clearly superior** for a reason you can
  articulate in one sentence. If you can write the rationale, you don't need the
  question.

### Escalation budget

At most **3 questions per run**, selected in P3 over the **complete** candidate list —
never over whichever showed up first. The cap forces real prioritization instead of
escalating out of convenience.

If more than 3 qualify, that's a **signal about the item**, not just a cut: it means
too much product decision is still open and the item may not be ready to be clarified.
Escalate the 3 with the highest impact, resolve the rest at low confidence, and warn
about it explicitly in the wrap-up.

If an unknown qualifies for escalation, the question is posed with `AskUserQuestion`
keeping the current format: recommended option first with `" (Recommended)"` and the
rationale in its `description`.

---

## 4. Confidence levels

Every autonomous decision is recorded with a level. It determines the order of the
final review block (low ones first, so the eye lands there).

| Level | When | Example |
|---|---|---|
| **high** | Level 1-2 source, a formal standard with objective verification, or a story asset that pins the answer unambiguously (e.g. a signed contract) | JCS RFC 8785 (it ships official test vectors) |
| **medium** | A single clear precedent in the repo, an unambiguous framework convention, or a story asset that suggests the answer without stating it (e.g. a mockup) | `varchar(255)` for consistency with an analogous field |
| **low** | No source determined it; the best alternative was chosen by reasoning, or the unknown qualified for escalation but exceeded the budget | Operational policy chosen by judgment |

Every **low**-confidence decision is listed prominently in the wrap-up.

---

## 5. Calibrated cases (real stories from this project)

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
