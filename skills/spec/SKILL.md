---
name: spec
description: >
  Structures any raw unit of work — feature, bug, technical debt, incident or
  chore — into a well-formed spec.md and saves it to
  work/active/<story-id>/spec.md, ready for /clarify. Picks the framing block
  that matches the item type instead of forcing everything into a user story.
  Use when the user says "/spec", "new story", "create story", "structure a
  story", "new bug", "log a defect", "new technical debt", "log an incident",
  "new chore", provides an item id like "spec-XXXX", pastes raw story/bug/debt
  text, or provides a path to a tracker PDF export. Do NOT use for surveying the
  codebase (use /clarify), designing (use /design), planning (use /plan), or
  executing (use /build). For a defect in already-built code that traces back to
  an ambiguous AC, use /hotfix on the original item instead of opening a new one.
---

# spec

## Overview

Receive a raw unit of work (text or tracker export), classify it, structure it
with the spec template, and save it to `work/active/<story-id>/spec.md` — ready
for `/clarify`.

The pipeline is **agnostic to the type of work**: `/clarify`, `/design`, `/plan` and
`/build` consume **verifiable acceptance criteria**, not the narrative mold. That's
why the type only decides the **framing block**, and everything else in the artifact
is identical for a feature, a bug or a piece of technical debt.

**Announce at start:** "Structuring <story-id> (<type>)."

**Output:** `work/active/<story-id>/spec.md`

---

## Project profile (read first, always)

Read `.agents/profile.yaml` at the root of the current project before anything else.
If it doesn't exist, tell the user to run `/bootstrap` and stop — without a profile you
don't know this project's conventions. The file is a YAML map of named blocks; a key
holding `null` is not configured, so use the fallback this skill declares for it —
never a guessed value.

Any path, id, item type or tracker name shown in this document is an example
resolution; the profile's value wins. The keys this skill reads are listed under
**Profile keys** in the `Contract` below.

---

## Contract

What this skill needs, what it guarantees to `/clarify`, and what it may not do.
**Check every `Requires` row before any other work** — this is the pipeline's first
link, so nothing upstream will catch a bad input for you.

**Requires**

| Condition | Check | If it fails |
|---|---|---|
| You are in the project's working directory | `pwd` == `WORKING_DIRECTORY` (absolute path, from the profile) | `cd` there before running anything |
| The input carries something to structure | raw text, or a path to an `INTAKE_FORMATS` export | Ask for the item's content — an id alone is not an item, and nothing here is invented from it |
| A tracker export is readable | the `Read` tool returns content for the given path (Step 1, Mode A) | Report the path and ask for the raw text instead; never guess the export's fields |
| The item's id resolves under `STORY_ID_MODE` | Step 1, Input 2 | `sequential` → propose the next free id and confirm; `tracker-code` → ask for the key; never write under a guessed id |
| It is a new item, not a correction | Step 2, "Cases that are not a new item" | Redirect to `/hotfix <story-id>` (defect in already-built code from an ambiguous AC) or `/refine <story-id>` (artifact not built yet) and stop |
| `work/active/<story-id>/spec.md` does not exist yet | `[ -f work/active/<story-id>/spec.md ]` (Step 3) | Ask for explicit overwrite confirmation before writing anything |

**Produces** — this is what `/clarify` looks for

- `work/active/<story-id>/spec.md`, structured per `references/spec-template.md`
- frontmatter with `type` (one of `ITEM_TYPES`) and `origin` — `/clarify` reads `type`
  to keep the framing and the tone of the ACs
- **exactly one** framing block, the one matching that `type` — never two, never a
  user-story mold forced onto an item that isn't one
- `## Acceptance Criteria` with **at least one** `### AC-N:` heading, numbered in order
  of appearance. Zero ACs is not a valid outcome for any type — the ACs are the only
  contract with the rest of the pipeline
- `## Business Rules` verbatim, when the input carried any
- every unresolved gap as an inline `[NEEDS CLARIFICATION: <question>]` marker, placed
  and left unresolved — `/clarify` resolves and removes them, `/design` refuses to
  proceed while any remain
- countable close (Step 5): the summary reports the AC count and the marker count; a
  summary with zero ACs means the artifact isn't finished

Not `## Ambiguity Resolution` or `## Technical Context` (that's `/clarify`), and not
`## Hotfixes` (that's `/hotfix`).

**Writes** — nothing outside this list

- `work/active/<story-id>/spec.md`
- the story folder itself (`mkdir -p work/active/<story-id>/`)

Not `context.md`, `design.md` or `plan.md`, not the project's source code, and not the
project's documentation.

**Never** — regardless of how incomplete the input looks

- resolve or delete a `[NEEDS CLARIFICATION]` marker. Placing them is this skill's job;
  resolving them is `/clarify`'s
- add an acceptance criterion, a business rule or a technical note that isn't in the
  input, or change the meaning of one that is
- survey the codebase, read modules or start the design — `/spec` structures the input
  and nothing else
- any git command. This skill only reads the filesystem (listing `work/active/` and
  `work/done/` to compute the next free id)

**Escalates** — asks and waits, never guesses

- the type inference isn't clear → `AskUserQuestion` with the candidate types (Step 2)
- the item comes from a tracker and no title came with it → ask for the exact title
- the next free id under `STORY_ID_MODE: sequential` → propose and confirm before writing
- `spec.md` already exists → overwrite confirmation (Step 3)

**Reverting** — overwriting an existing `spec.md` is confirmed, not undone: if the story
folder is already tracked by git, `git checkout -- work/active/<story-id>/spec.md`
restores it; if the item was created and never committed, there is no way back. That is
exactly why the confirmation in Step 3 is mandatory.

**Degrades** — the intake block with no field mapping → the generic reading of
the export in Step 1, Mode A; `STORY_ID_MODE` unset → `sequential`;
`STORY_ID_LEGACY_PREFIXES` at `—` → only the current prefix counts toward the next free
number.

**Profile keys**

- `STORY_ID_MODE`, `STORY_ID_PREFIX`, `STORY_ID_PATTERN`, `STORY_KEY_PATTERN`,
  `STORY_ID_LEGACY_PREFIXES` — how the item's id is resolved and written, shown
  throughout this document as `<story-id>` / `spec-<number>`
- `WORKDIR_ACTIVE` — the story's workspace, written here as `work/active/<story-id>/`
- `ITEM_TYPES` — the types this project classifies among (Step 2)
- `TRACKER`, `INTAKE_FORMATS` and the intake mapping of the intake block — Mode A's extraction
- `ARTIFACT_LANGUAGE`, `OUTPUT_LANGUAGE`, `IDENTIFIER_LANGUAGE` — see "Output language"

---

## Step 1: Collect the inputs (before writing anything)

Two modes are supported. Detect automatically which one applies.

---

### Mode A — Tracker export file path

**Trigger:** The user provides a path to an export in one of the project's
`INTAKE_FORMATS` (contains `\` or `/`, or otherwise looks like a file reference — a
typical resolution is a `.pdf` tracker export).

**A1 — Read the file:**
Use the `Read` tool on the provided path. If it can't be read, stop and ask for the raw
text instead — an unreadable export is not a reason to guess the fields.

**A2 — Extract fields, mapping per the profile's intake mapping (intake block):**

**The label for each field comes from the profile's intake table** — the project
declares which heading of its export feeds each `spec.md` field, in its own tracker
and its own language. If the profile's intake block declares no mapping, fall back to
this generic reading of the export:

| spec.md field | Generic fallback (no mapping in the profile) |
|---|---|
| ID / key | The key in brackets in the page title / main heading (`STORY_KEY_PATTERN`) |
| Title | Text after the key in the main heading |
| Framing (As/I want/So that or equivalent) | The actor/goal/benefit block, or the objective section |
| Acceptance Criteria | The acceptance-criteria section (numbered list) |
| Business Rules | The business-rules section |
| Additional notes | The additional-notes section — append to notes if non-empty |
| Relevant comments | The comments thread — only if they refine requirements |

> The heading names you **search for** are the exporting tracker's, verbatim as the
> profile declares them. What you **write** into `spec.md` always uses the English
> section names of `references/spec-template.md`.

**A3 — Confirm extracted values (brief, inline):**
Show a one-line summary: "Extracted: <key> · <title> · <type> · <N> ACs · <M> rules."
Then proceed — do NOT ask the user to re-paste anything already in the export.

---

### Mode B — Manual text input

**Trigger:** The user pastes raw text or provides no file path.

Collect these inputs. Ask for any that are missing — one question at a time.

**Input 1 — Type**
See Step 2 below. It's inferred and confirmed; never asked flatly.

**Input 2 — Number / ID**
The ID mode comes from `STORY_ID_MODE` (profile, items block):

- `sequential` (default): look for an ID or number in the input. If none comes,
  propose the **next free number**: list `work/active/` and `work/done/`, take the
  highest existing `<n>` **including the legacy prefixes**
  (`STORY_ID_LEGACY_PREFIXES`) and add 1. Announce:
  "Next available ID: `<prefix><n+1>`. Should I use it?" (confirm before writing).
- `name`: the ID is a slug of the title (`STORY_ID_PREFIX` + kebab-case of the title).
- `tracker-code`: the ID is the tracker key (e.g. `SPEC-1933`); the folder uses the key
  in lowercase. If it doesn't come: "What's the item's key in <TRACKER>?"

> **Numbering is global, not per type.** `spec-0026` and `spec-0027` may be a feature
> and a bug — the order reflects chronology and never collides.

**Input 3 — Title**
Never derive it from the AC content. The origin sets the rule:

- **If the user gave a title** (in the input or as the `TRACKER` key) → use it
  **verbatim**, without paraphrasing or shortening. A long tracker title is kept
  whole: traceability to the backlog beats brevity.
- **If no title was given and the item comes from a tracker** → ask:
  "What's the item's exact title in <TRACKER>?"
- **If no title was given and the item originates in this project** (the usual case
  with `STORY_ID_MODE: sequential`) → **propose** a 5-8 word one derived from the
  objective and confirm it: "I propose the title "<title>". Use it, or would you
  rather another?"

See the table in `references/spec-template.md` § "Rules for each section".

**Input 4 — Content**
The raw text: the framing (per type) + the acceptance criteria.
If it doesn't come: "What's the item's content (acceptance criteria included)?"

---

## Step 2: Classify the item

The `type` determines the framing block. **Infer it from the content and confirm it**
before writing — getting it wrong produces an artifact that contradicts itself (the
classic case: a refactor disguised as a user story, with an invented "As a maintainer"
to fill the mold).

| Signal in the input | Type |
|---|---|
| New functionality, "I want to be able to…", change visible to a user | `feat` |
| "doesn't work", "fails", "throws an error", expected vs. actual, reproduction steps | `bug` |
| "refactor", "debt", "it's coupled", "we should reorganize", audit finding | `debt` |
| Something that already failed in production, with impact and a need for remediation | `incident` |
| Updating dependencies, tooling, configuration, with no behavior change | `chore` |

The rows above are the default set; the types you may actually assign are the project's
`ITEM_TYPES` (items block). A project that trims the list classifies only among what it
declares — never assign a type the profile doesn't list.

Confirm with `AskUserQuestion` (`header: "Type"`) **only if the inference isn't
clear**, offering the 2-3 candidate types with the inferred one first and
`" (Recommended)"`. If it's obvious, announce it at the start and move on.

**Cases that are not a new item:**
- A defect in **already-built** code that originates in an ambiguous AC → `/hotfix`
  on the original item, not a new `bug`. Redirect and stop.
- A correction to an artifact that hasn't been built yet → `/refine`.

---

## Step 3: Check for an existing file

Before writing, check if the item already exists:

```bash
[ -f work/active/<story-id>/spec.md ] && echo "EXISTS" || echo "NEW"
```

- If it does NOT exist → create the directory silently and continue:
  ```bash
  mkdir -p work/active/<story-id>/
  ```
- If it DOES exist → use `AskUserQuestion` with `question: "work/active/<story-id>/spec.md
  already exists. Do you want to overwrite it?"`, `header: "Overwrite"`,
  and options `"Yes, overwrite"` / `"No, cancel"`. Wait for confirmation.

> **Legacy compatibility:** if the folder holds an `hu.md` instead of a `spec.md`, it's
> an item created before the rename. Treat it as the same artifact (read it, don't
> duplicate it) and mention: "`<story-id>` uses the legacy name `hu.md`."

---

## Step 4: Write `spec.md`

Consult `references/spec-template.md` for the exact file structure to produce,
including the framing block that corresponds to the item's `type`. The rules below
govern what goes into it.

### What to preserve
- Every acceptance criterion — do not omit, summarize, or merge any AC.
- The exact wording of the framing block — do not paraphrase.
- All business rules, edge cases, and error messages mentioned.

### What to add
- The title as provided by the user — use it verbatim.
- Structured AC headings derived from the criterion content.
- Out of scope section — only if explicitly mentioned in the input.

### What NOT to invent
- Do not add acceptance criteria not present in the input.
- Do not add technical notes — use `/clarify` for that after saving.
- Do not change the meaning or intent of any requirement.
- **Do not force a user-story framing onto an item that is not one.** If it's `debt`
  or `chore`, use its block; inventing an "As a <role>" is exactly the mistake this
  template exists to prevent.

### Flag gaps with `[NEEDS CLARIFICATION]` markers (do NOT resolve them here)

Structuring the item is NOT the same as inventing missing detail. When the input is
**silent or ambiguous** about something that matters — but you have no basis to
fill it — insert an explicit marker instead of guessing:

```
[NEEDS CLARIFICATION: <concrete question>]
```

Place the marker inline, right where the gap is. This mirrors the industry standard
(Spec Kit): the marker prevents the common LLM failure of assuming something
plausible but wrong.

Insert a marker when the input is silent about any of these **and** the answer
would change the implementation:
- HTTP response code / output shape for a described behavior
- Behavior on invalid, empty, or missing input
- A business term used without a definition
- A boundary/edge case implied but never stated
- A contradiction between two ACs
- **An `incident` with no determined root cause** — mandatory: with no root cause
  there is no verifiable AC to write.

**Do NOT resolve the markers here** — that is `/clarify`'s job. Just place them.

### AC structure
Number each criterion. Add a short title derived from its main concept.
Keep the original text as-is under each heading.

**ACs are mandatory for every type** — they are the only contract with the rest of the
pipeline. An item with no ACs cannot move forward. If the input carries none, derive
them from the framing and mark them with `[NEEDS CLARIFICATION]` wherever precision is
missing; never leave the section empty.

---

## Step 5: Save and hand off

After saving `work/active/<story-id>/spec.md`:

1. Show a brief summary: ID, type, title, **number of ACs** and **number of
   `[NEEDS CLARIFICATION]` markers**. Both counts are the stage's closing signal, so
   state them even when a count is zero — and if the AC count is zero, the item isn't
   finished: go back to Step 4 rather than handing it off.

2. Say, depending on whether markers were inserted:
   - **With markers:** "Saved to `work/active/<story-id>/spec.md` with <N>
     `[NEEDS CLARIFICATION]` markers. Run `/clarify <story-id>` to resolve them —
     `/design` won't proceed while any remain unresolved. You can run
     `/prepare <story-id>` first, to leave the base branch fresh."
   - **Without markers:** "Saved to `work/active/<story-id>/spec.md`. Review it and
     when you're ready run `/prepare <story-id>` (leaves the base fresh) and then
     `/clarify <story-id>`."

3. Stop — do not start scanning.

---

## Output language
**Conversational output** follows `~/.agents/references/chat-conventions.md` - the six blocks (announce, progress, question, summary, stop, handoff).

**Artifact prose follows `ARTIFACT_LANGUAGE`** (profile, language block — falls back to
`OUTPUT_LANGUAGE` if the project doesn't declare it). The framing block, the ACs and
the business rules of `spec.md` are written in that language. Never translate them to
English on your own: the language is the profile's decision, not this skill's.

Two things stay in English regardless of that key: the **section headings** (other
skills locate them by name) and the **identifiers** — the `type` field's values
(the project's `ITEM_TYPES`, e.g. `feat`, `bug`, `debt`), the item ID and any path or
symbol (`IDENTIFIER_LANGUAGE`).

**Chat interaction follows the user's language** (`OUTPUT_LANGUAGE` in the profile).
The message samples in this document are written in English; render them in the
user's language when that differs.

---

## Common Issues

| Issue | Cause | Resolution |
|-------|-------|------------|
| No title provided | User pasted only the content | If it comes from a tracker, ask for the exact title; if it originates in the project, propose a 5-8 word one and confirm it |
| Very long tracker title | Item with a descriptive name in the backlog | Keep it verbatim — the 5-8 word rule only applies to new titles |
| Type ambiguous between `bug` and `debt` | The defect is structural, not behavioral | If there's an observable symptom today → `bug`; if it's a latent risk → `debt` |
| Type ambiguous between `bug` and `hotfix` | Defect in already-built code | If it traces to an ambiguous AC of the original item → `/hotfix`; if it's independent → a new `bug` |
| `incident` with no root cause | Still under investigation | Mandatory marker; the item may exist but won't advance to `/design` without a root cause |
| Unnumbered ACs in the input | Badly formatted item | Number them in order of appearance |
| The item already exists | Re-run | Confirm overwrite before continuing |
| The folder has `hu.md`, not `spec.md` | Item predating the rename | Treat it as the same artifact; mention it uses the legacy name |
| Number not identifiable | Input with no ID | Resolve per `STORY_ID_MODE`: next free (sequential), title slug (name) or tracker key (tracker-code) |

---

## Example A — Bug from manual text

**User input:**
> "/spec the balance counts transfers between the user's own accounts twice.
> It's been happening since we added the new projector. It should count them once."

**Process:**
1. Classify: there's an observable symptom + expected vs. actual → `bug`. Obvious, so
   it's announced without asking.
2. ID: `sequential` → highest existing is `spec-0026` (including any
   `STORY_ID_LEGACY_PREFIXES` folders) →
   proposes `spec-0027`.
3. Title: none given and it originates here → proposes "Double counting of transfers
   in the balance".
4. Applies `references/spec-template.md` with the `## Defect` block.

**Resulting spec.md (fragment):**
```markdown
---
type: bug
origin: manual
---

# spec-0027: Double counting of transfers in the balance

## Defect

**Symptom:** the balance counts transfers between the same user's accounts twice.
**Reproduction:** record a transfer between two of your own accounts and query the balance.
**Expected:** the transfer is counted once.
**Actual:** it's counted twice.
**Impact:** the displayed balance is wrong for any user with internal transfers.
[NEEDS CLARIFICATION: which version/projector introduced it? does it affect the already-persisted read model?]

## Acceptance Criteria

### AC-1: An internal transfer is counted once
The balance of a user with transfers between their own accounts reflects the amount only once.
```

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

## Technical Debt

**Current situation:** use cases read from the generic `ReadModelStore` and know the
projections' physical schema (table names, `snake_case`, nullability).
**Risk or cost:** any schema change breaks the application layer, and per-user scoping
is resolved in memory instead of in the database.
**Desired state:** each use case reads through its own typed port.

## Acceptance Criteria

### AC-1: `application/` doesn't know the read model
No file under `apps/ledger/src/**/application/` imports `ReadModelStore`.
```

No "As a maintainer / I want", no footnote apologizing for not being a product story.
