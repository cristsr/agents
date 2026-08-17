# Spec Template

Produce exactly this structure. Replace all `<placeholders>` with real content.
Remove sections marked as optional if there is no content for them.

The artifact is **agnostic to the type of work**. The only thing that varies is the
**framing block** (§ "Framing blocks per type"); everything else is common to
features, bugs, technical debt, incidents and chores.

---

```markdown
---
type: <feat | bug | debt | incident | chore>
origin: <tracker:<key> | audit:<reference> | manual>
---

# <story-id>: <title>

<!-- Framing block — pick the one matching the type. See the section
     "Framing blocks per type" below. Exactly ONE, never two. -->

## Acceptance Criteria

### AC-1: <title derived from the content>

<exact text of the criterion as provided>

### AC-2: <title derived from the content>

<exact text of the criterion as provided>
[NEEDS CLARIFICATION: <concrete question if the AC is ambiguous or silent>]

<!-- Repeat for each AC. Do not omit any.
     Insert [NEEDS CLARIFICATION: ...] markers inline where the input is silent
     or ambiguous about something that changes the implementation (response
     code, behavior on invalid/empty input, undefined business term, implied
     edge case, contradiction). The markers are resolved and removed during
     clarification. No markers if the item is fully specified. -->

## Business Rules

<!-- OPTIONAL: Include only if the input explicitly provides business rules.
     Remove this section if not applicable. -->

- <business rule exactly as provided>

## Out of Scope

<!-- OPTIONAL: Include only if explicitly mentioned in the input.
     Remove this section if not applicable. -->

- <what explicitly does NOT belong to this item>

## Hotfixes

<!-- OPTIONAL: A defect found after implementation already produced code,
     traced back to a missing or ambiguous AC. Omit entirely if no hotfix
     was ever applied. -->

- **HOTFIX-N (AC-N):** <what was wrong or missing in the AC> → <correction applied to the AC> — implemented in `plan.md` Task HOTFIX-N.
```

---

## Framing blocks per type

The framing answers **why this item exists**. The downstream pipeline doesn't read
it — it consumes the ACs — but it's what lets `/clarify` and `/design` grasp the
intent without forcing an alien mold.

### `feat` — new functionality or a visible behavior change

```markdown
## User Story

**As a** <user role>
**I want** <action or functionality>
**So that** <benefit or business value>
```

### `bug` — a defect in something already delivered

```markdown
## Defect

**Symptom:** <what is observed, in verifiable terms>
**Reproduction:** <minimal steps, or the input that triggers it>
**Expected:** <what should happen>
**Actual:** <what happens instead>
**Impact:** <who/what it affects and how severely>
```

> If the defect stems from an ambiguous AC of an **already-built** item, don't open a
> new `bug`: use `/hotfix` on the original item — it corrects the AC and leaves the
> trace in its `## Hotfixes` section.

### `debt` — technical debt, refactor, structural improvement

```markdown
## Technical Debt

**Current situation:** <what exists today and why it's a problem>
**Risk or cost:** <what breaks, stalls or gets more expensive if it stays this way>
**Desired state:** <what "solved" looks like, in verifiable terms>
```

> Never invent an "As a <maintainer> / I want" to squeeze technical debt into the
> user-story mold. This block exists for exactly that reason.

### `incident` — a production failure requiring remediation

```markdown
## Incident

**Impact:** <what degraded or failed, scope and duration>
**Detection:** <how it was discovered — alert, report, review>
**Mitigation applied:** <what was done to contain it, if any>
**Root cause:** <the why, or `[NEEDS CLARIFICATION: root cause undetermined]`>
```

> An `incident`'s ACs describe the **permanent remediation**, not the mitigation
> already applied. If the root cause is still unknown, the marker is mandatory:
> without a root cause there is no verifiable AC to write.

### `chore` — maintenance with no behavior change

```markdown
## Maintenance

**Motivation:** <why it has to happen now>
**Scope:** <what gets touched and what explicitly does not>
```

> A `chore`'s AC is almost always "everything keeps working the same": name the
> concrete gates (green suite, build, lint) instead of leaving it implicit.

---

## Rules for each section

**`type`:** mandatory. If the input doesn't state it, infer it from the content and
**confirm it** with the user before writing — the type determines the framing and
getting it wrong produces an artifact that contradicts itself.

**`origin`:** where the item came from. `tracker:<key>` if it came from an export or a
tracker key, `audit:<reference>` if an audit generated it (e.g. `/hexagonal-audit`),
`manual` if it was born in the conversation.

**Title:** depends on the item's origin. Never derive it from the AC content — it
comes from the tracker or from the user, in that order of priority:

| Origin | Rule | Length |
|---|---|---|
| Comes from a tracker (PDF/export/key of the profile's `TRACKER`) | **Verbatim.** Don't paraphrase, don't shorten, don't "improve" | Whatever it is — traceability to the backlog beats brevity |
| The user writes it when invoking `/spec` | Use exactly what they wrote | Whatever they wrote |
| Originates in the project and the user gave no title | Propose one and **confirm it** before writing | 5-8 words |

The 5-8 word rule applies **only to the last case** — it's a guide for drafting a new
title, not a limit that trims an existing one.

**AC titles:** Short label for the criterion. Derive from its main concept.
Example: "AC-1: Only administrators can delete" not "AC-1: Criterion 1"

**AC body:** Copy the original text exactly. Do not rewrite or summarize.

**ACs are mandatory for every type.** They are the only contract with the rest of the
pipeline: `/clarify`, `/design`, `/plan` and `/build` consume verifiable ACs and
nothing else. An item with no ACs cannot advance, whatever its type.

**Business Rules:** Copy each rule exactly as provided — do not infer or add
rules not present in the input. Omit the section entirely if none were given.

**Hotfixes:** Never written by `/spec` itself — only `/hotfix` appends to this
section, after correcting/adding an AC for a defect found in already-built code.

## Formatting

Keep the artifact readable — the redaction is prose, not a dump:

- A blank line **after every heading** and **before and after every list and code
  fence**.
- **One idea per bullet**, and never a bullet longer than ~3 lines.
- Break walls of text: no more than ~4 consecutive bullets or bold-label lines
  without a blank line between them.
- When a point splits naturally in two, use a short blank-line-separated paragraph
  instead of a single run-on paragraph.

## Language rules

- Section headings: English. They are structural — `/clarify`, `/design`, `/plan`,
  `/sync` and `/hotfix` locate them by name.
- Prose, ACs, business rules: `ARTIFACT_LANGUAGE` (profile, language block — falls back to
  `OUTPUT_LANGUAGE`).
- The `type` values (`feat`, `bug`, `debt`, `incident`, `chore`) are identifiers and
  never translated.
- If the source item (tracker export, pasted text) is written in a language other than
  `ARTIFACT_LANGUAGE`, translate its content into `ARTIFACT_LANGUAGE` when writing
  `spec.md`, but keep proper nouns, identifiers, endpoints and error codes verbatim.
  If both match, transcribe without translating anything.
