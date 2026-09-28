# Inferring the execution tier

A story declares how much of the pipeline it runs, in `spec.md`'s front matter. The
initial run infers the field **from the input alone** — nothing has surveyed the
codebase yet — and writes it down, never asks it.

The normative contract is `~/.agents/contracts/TIERS.md`: what each tier runs, what it
omits, and the four guardrails around it. This file is only the reading that decides
between the three values.

## The three values

| `tier` | The flow | Written |
|---|---|---|
| `full` | spec → route → prepare → scan → clarify → route → design → plan → build → sync | **never** — the absence of the field *is* `full` |
| `standard` | spec → route → prepare → scan → clarify → route → plan → build → sync (no design) | yes, with `## Tier Rationale` |
| `fast` | spec → route → prepare → build → sync (no survey, no clarification, no design, no plan) | yes, with `## Tier Rationale` and `## Change Surface` |

**The default is the absence of the field**, exactly as `tdd` is the default of
`build_mode`: a story written before this axis existed keeps every stage it always had,
and nothing here touches it.

## What may be inferred from

Only the input: its `type`, how many acceptance criteria it carries, whether a
criterion is unclear enough to need a marker, and what the input *says* about the
change — the file or symbol it names, and the systems it does not mention.

Nothing else is available. Measuring the real blast radius is `/sdd-scan`'s job (the
`CODE_SURVEY` port), and it is why the inference is provisional: this skill's review run
raises it once `context.md` shows the code disagrees.

## The reading

Signals, in this order. The first match wins.

| # | Signal in the input | Result |
|---|---|---|
| 1 | A schema, migration, entity or column changes | `full` |
| 2 | A public contract changes: endpoint, DTO, payload, event, exported signature | `full` |
| 3 | A new integration, dependency, queue or third-party service | `full` |
| 4 | More than one component is named, or the change crosses a module boundary | `full` |
| 5 | Security, authentication or performance behavior changes | `full` |
| 6 | Three or more acceptance criteria | `full` |
| 7 | Exactly one criterion, the `type` is in `FAST_TIER_TYPES`, no marker, the input names the file or symbol, and none of 1-6 | `fast` |
| 8 | Anything else | `standard` |

Four remarks on the rows, because each one is a mistake waiting to be made:

**A contract change is not a size question.** Rows 1 and 2 fire however small the edit
looks: renaming an exported function, adding a field to a payload someone else reads,
or touching a migration is `full` even when it is one line. That is the whole reason
`standard` is not "anything small".

**One criterion is necessary but not sufficient for `fast`.** The change also has to be
*named*: if the input does not say which file or symbol it concerns — as a path, a
symbol, a module, a route or an error the reader can locate — then `## Change Surface`
cannot be written honestly, and the story is `standard`. Never invent the surface to
reach `fast`.

**A marker disqualifies `fast` and nothing else.** `[NEEDS CLARIFICATION]` means the
input is silent about something that changes the implementation. `fast` is the tier
that omits the pass which resolves markers, so the two cannot coexist; `standard` keeps
that pass and is the answer.

**`type` gates the reduced tiers on its own.** `fast` is open only to the types the
profile lists in `FAST_TIER_TYPES` (default `[bug, debt, chore]`) and `standard` only to
those in `STANDARD_TIER_TYPES` (default `[feat, bug, debt, incident, chore]`). A `feat`
— a new capability — stops at `standard` even when it carries a single criterion, and an
`incident` is `full`. `validate-artifacts.mjs` rejects the pair, so there is nothing to
negotiate here.

## Writing it down

When the reading is not `full`, three things go into `spec.md`, in this order, below the
framing block and above `## Acceptance Criteria`:

1. `tier: fast` or `tier: standard` in the front matter, after `origin`.
2. `## Tier Rationale`, two labeled lines, neither empty: **Why this tier** (the signals
   that matched, cited concretely) and **What covers the omitted stages** (what closes
   the criterion, and the fact that the working branch still gates the build).
3. `## Change Surface`, `fast` only: `**Confined to:**` with the files and symbols in
   backticks, and `**Check:**` with the command that will prove the criterion.

When the reading is `full`, **write nothing**: no field, no rationale. The absence is
the value, and declaring the default would suggest the axis was contested when it was
not.

## Overriding the reading

The developer may disagree — during the initial run, or afterwards through this
skill's change run (`tier-changes.md`). Take their tier, write the field (even for `full`, where an explicit
`tier: full` records the decision), and make `## Tier Rationale` say what the reading
missed. What may never happen is a tier written *against* `FAST_TIER_TYPES` or
`STANDARD_TIER_TYPES`: `validate-artifacts.mjs` fails the story, and widening the
allowlist is a deliberate edit of `.agents/profile.yaml`, not a decision taken inside
one conversation.
