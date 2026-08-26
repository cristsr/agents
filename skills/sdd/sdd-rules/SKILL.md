---
name: sdd-rules
description: >
  Creates or amends a project's constitution — the non-negotiable principles
  governing design, implementation and review — by interviewing the developer
  category by category (architecture, testing, security, data, delivery),
  turning each answer into a testable MUST/SHALL article with the gate that
  catches a violation, and writing a versioned `docs/rules.md`.
  Use when the user says "/sdd-rules", "the constitution", "create the rules",
  "define the project's principles", "generate rules.md", "the project's
  non-negotiable rules", "crea las reglas del proyecto", "la constitución",
  "define los principios del proyecto", or wants to establish or amend
  project-wide governing principles that /sdd-design and /sdd-plan validate against.
  Do NOT use to edit a single user story's artifacts (use /sdd-refine), to capture
  per-story technical context (use /sdd-clarify), or to document code conventions
  that are descriptive rather than governing (those live in docs/).
---

# rules

## Overview

The **constitution** is a project's set of non-negotiable principles. Unlike
descriptive documentation (`docs/`), the constitution is **normative** (it uses
MUST/SHALL) and it is the source other skills validate compliance against:
`/sdd-design` checks its quality gates before approving a contract, and `/sdd-plan`
respects it when generating tasks.

This skill is **generic** — it assumes nothing about this workspace's structure. It
works for creating any project's constitution.

**Announce at start:** "Let's define the project's constitution." (or
"…amend the project's constitution." if one already exists).

**Output:** a `docs/rules.md` (configurable path — see PHASE 1).

**Core principle:** capture only what is **non-negotiable**. If something is
"preferable but negotiable", it belongs in `docs/`, not here. A constitution with 30
articles doesn't get followed; aim for 6–10 high-impact articles.

---

## Project profile (read first, always)

Read `.agents/profile.yaml` from the project root before anything else, as
`~/.agents/references/project-profile.md` describes: what a missing file means, how a
`null` key falls back, and why every path or command shown here is only an example the
profile overrides. **This skill binds no port** — it writes one document and validates
it with a script that ships with the ecosystem. The keys it reads are listed under
**Profile keys** in the `Contract` below.

---

## Contract

What this skill needs, what it guarantees to `/sdd-design`, `/sdd-plan` and `/sdd-clarify`, and
what it may not do. **The `Produces` rows are read by four skills that locate the
file by name** — the path and the structural headings are the contract, not a style.

**Requires**

| Condition | Check | If it fails |
|---|---|---|
| You are in the project's working directory | `pwd` == `WORKING_DIRECTORY` (absolute path, from the profile) | `cd` there before running anything — this skill writes into the project's `docs/` |
| `node` on PATH, for `~/.agents/scripts/validate-rules.mjs` | `node --version` | See **Degrades** |
| Explicit choice before overwriting | `docs/rules.md` exists with content (PHASE 1, Step 2) | Ask amend vs. rewrite; never rewrite an existing constitution unasked |
| Every article the user keeps is testable | PHASE 3 — it names a concrete gate, not "code review" | Ask again for the objective criterion, or demote the rule to `docs/` |

**Produces** — this is what `/sdd-design`, `/sdd-plan`, `/sdd-clarify` and `/healthcheck` look for

- `docs/rules.md` at that exact path. The four consumers hard-code it (`/sdd-design`
  PHASE 1 step 4, `/sdd-plan` step 6c, `/sdd-clarify`'s authority ladder, `/healthcheck`'s
  `validate-rules.mjs docs/rules.md`) and **all four degrade silently when it is
  absent** — a constitution written anywhere else is not read by anyone and nothing
  reports it
- front matter with `version` (semver), `ratified` and `last_amended` (`YYYY-MM-DD`)
- at least one `### Article N: <name>` — the heading is located by that literal
  string — each carrying `**Principle:**` (normative: MUST / SHALL / NEVER),
  `**Reason:**` and `**How it's verified:**`
- a `## Mandatory Quality Gates` section — that literal heading — with the active
  gates as `- [ ]` / `- [x]` checkboxes
- `validate-rules.mjs` reporting **zero ISSUES** against the written file

**Writes** — the resolved constitution path and nothing else. It never edits a story
artifact, `docs/architecture/`, `CLAUDE.md`, code, or git.

**Never**

- writes a principle that is merely preferable — that is `docs/`, and mixing the two
  is what makes a constitution stop being obeyed
- keeps an article whose only gate is "code review": either it names a mechanical
  check or it is demoted
- translates the structural headings (`### Article N:`, `## Mandatory Quality Gates`)
  or the gate names, whatever `ARTIFACT_LANGUAGE` says — they are located by name
- drops articles the user didn't touch when amending
- starts designing or planning after writing the file

**Degrades**

| Missing | Behavior |
|---|---|
| `node` for `validate-rules.mjs` | Check the form by hand against `references/rules-template.md` — front matter, three fields per article, normative principle, binary gates — and say out loud that the constitution is unvalidated |
| Existing conventions docs to seed from (PHASE 1, Step 3) | Run the interview from a blank page; it is optional, not a precondition |
| `ARTIFACT_LANGUAGE` null | Fall back to `OUTPUT_LANGUAGE`; the structural headings stay English either way |

**Reverting** — `docs/rules.md` is a live artifact four skills read on every run, and
an amendment rewrites the whole file. Before writing, confirm the previous version is
recoverable from git; a rewrite that drops untouched articles removes rules nobody
will notice are gone until a story violates one.

**Profile keys**

| Key | Used for |
|---|---|
| `WORKING_DIRECTORY` | the directory check above |
| `ARTIFACT_LANGUAGE` | the prose of the articles, reasons and verification notes (falls back to `OUTPUT_LANGUAGE`) |
| `OUTPUT_LANGUAGE` | the interview and the closing summary |
| `IDENTIFIER_LANGUAGE` | how identifiers and paths quoted inside an article are spelled |
| `DOCS_ARCHITECTURE` | where PHASE 1 Step 3 looks for conventions to seed from |

---

## PHASE 1: Resolve destination and mode

### Step 1 — Determine the file path

**The path is `docs/rules.md`, and it is part of the contract, not a preference.**
`/sdd-design`, `/sdd-plan`, `/sdd-clarify` and `/healthcheck` locate the constitution at that
literal path, and every one of them treats "not there" as "this project has no
constitution" — silently, by design, because running without one is legitimate. So a
constitution written anywhere else is not a relocated file: it is a file nobody reads
and no one reports.

1. If `docs/rules.md` already exists in the project → use it.
2. Otherwise create it there (next to `CLAUDE.md`): visible, versioned with the repo,
   and on the path the skills read.
3. If the user insists on another path, write it — and say the consequence out loud
   before doing so, naming the four skills that will stop reading it. Then offer the
   alternative that actually works: keep `docs/rules.md` as the file and let their
   preferred location be a link to it.

### Step 2 — Detect create vs. amend

```bash
CONST=<resolved path>
if [ -s "$CONST" ]; then echo "EXISTS_WITH_CONTENT"; \
elif [ -f "$CONST" ]; then echo "EXISTS_EMPTY"; \
else echo "DOES_NOT_EXIST"; fi
```

- `DOES_NOT_EXIST` or `EXISTS_EMPTY` → **Create mode**. Initial version `1.0.0`.
- `EXISTS_WITH_CONTENT` → **Amend mode**. Read the whole file, extract the current
  version from the front-matter and the articles already defined. Use
  `AskUserQuestion` (`header: "Constitution"`, options
  `"Amend (add/adjust articles)"` / `"Rewrite from scratch"`).
  In Amend mode, **preserve** the articles the user doesn't touch.

### Step 3 — Seed from existing documentation (optional)

If the project already has conventions/architecture documentation, offer to extract
principle candidates from it before interviewing — it avoids re-asking what's already
written. Look for signals under the profile's `DOCS_ARCHITECTURE` folder (the sample
below resolves it to its default, `docs/architecture/`):

```bash
ls "$DOCS_ARCHITECTURE"/conventions.md "$DOCS_ARCHITECTURE"/testing.md CONTRIBUTING.md 2>/dev/null
```

If there are files, read them and propose a list of candidate principles for the
user to approve/discard, instead of starting from a blank page. If there's nothing,
continue with a clean interview.

---

## PHASE 2: Interview by category

Walk the categories **one at a time**. For each, ask **one** short open question and
wait for the answer before the next. The user may answer "skip"/"none"/"n/a" → that
category produces no article.

For each answer, help turn it into a **testable** principle (see PHASE 3) — if the
answer is vague ("good code"), ask again for the objective criterion ("what concrete
rule makes a change get rejected in review?").

### Categories (adapt the order to the project type)

| # | Category | Guiding question |
|---|-----------|---------------|
| C1 | **Architecture** | "Which pattern/structure is mandatory and what is forbidden? (e.g. hexagonal, no business logic in controllers, abstract class as the DI token)" |
| C2 | **Testing** | "What testing discipline is non-negotiable? (e.g. TDD test-first, minimum coverage, contract tests mandatory for endpoints)" |
| C3 | **Security** | "Which security rules can never be violated? (e.g. never log secrets, validate every external input, explicit authz per endpoint)" |
| C4 | **Code quality** | "Which conventions are mandatory, not suggestions? (e.g. naming, typed error handling, no `any`)" |
| C5 | **Data and migrations** | "How are schema changes governed? (e.g. manual SQL migrations, never `synchronize:true`, no dropping columns in production)" |
| C6 | **Dependencies and integrations** | "What limits apply to external dependencies or inter-service calls? (e.g. don't break the current API contract, don't couple services through a shared DB)" |
| C7 | **Delivery and versioning** | "What rules govern commits, branches and releases? (e.g. conventional commits, never build on main, feature branch mandatory)" |
| C8 | **Simplicity** | "How is over-engineering controlled? (e.g. don't abstract until the 2nd use case, use the framework directly, at most N layers)" |

> Adapt the categories to the project: for a library, C6 may be "public API /
> semver"; for a frontend, C3 may include accessibility. The table is a guide, not a
> rigid form.

### Focus rule

After the interview, if there are more than ~10 candidate principles, prioritize with
the user: keep the ones that, if violated, **break the system or cause expensive
rework**. The rest get relegated to `docs/`.

---

## PHASE 3: Draft testable principles

Each article is written as a **verifiable** principle, not a wish. Use the
EARS/normative style:

- Use **MUST / SHALL** (and **NEVER** for prohibitions).
- Phrase it so a reviewer can answer yes/no on whether a change complies.
- Bad: "Code must be well structured."
- Good: "Every business rule MUST live in `application/` — a controller containing
  business logic is rejected in review."

For each article capture three fields (see `references/rules-template.md`):
- **Principle** (the testable MUST/SHALL rule).
- **Reason** (why it's non-negotiable — 1 sentence).
- **How it's verified** — the **concrete gate** that catches a violation: a CI job
  or linter by name, a `/sdd-design` phase, a script. "Code review" alone is the weakest
  gate — if that's all a rule can point to, either name a mechanical check or demote
  the rule to `docs/`.

---

## PHASE 4: Define the mandatory Quality Gates

Independent of the articles, the constitution declares **gates** the design/plan
skills apply as a binary checklist. Propose these four (taken from Spec Kit) and let
the user enable/edit/remove them:

| Gate | What it enforces | Default |
|------|-----------|---------|
| **Simplicity Gate** | Don't introduce layers/projects/abstractions without a present use case justifying them | Active |
| **Anti-Abstraction Gate** | Use the framework/library directly before wrapping it in your own abstraction | Active |
| **Integration-First Gate** | Contract (OpenAPI/schema) and contract tests defined before implementing the endpoint | Active |
| **Test-First Gate** | The test is written and fails before the production code | Active |

The user may rename, disable or add their own gates (e.g. an "Accessibility Gate" on
a frontend). Record only the active ones — but the `## Mandatory Quality Gates`
section itself always stays, with at least one checkbox: `validate-rules.mjs` reads
the section by that literal heading and warns on a constitution that checks no gate
at all. A project that genuinely enforces none should say so in one gate line rather
than leave the list empty.

---

## PHASE 5: Write the file

1. Consult `references/rules-template.md` for the exact structure.
2. Fill in the front-matter:
   - **Create mode** → `version: 1.0.0`, `ratified: <today's date>`,
     `last_amended: <today's date>`.
   - **Amend mode** → bump the version by impact (rule in PHASE 6),
     `last_amended: <today's date>`, `ratified` unchanged.
3. **CRITICAL (amendment):** so previous articles aren't lost, read the whole file,
   merge the preserved articles with the new/edited ones, and write it all together —
   never write only the new section.
4. Save to the path resolved in PHASE 1.
5. Validate the form mechanically and fix what it reports:

   ```bash
   node ~/.agents/scripts/validate-rules.mjs <resolved path>
   ```

   It checks the front-matter, that each article carries its three fields with a
   normative Principle, that the gates are binary, and that no article leans on code
   review alone — the same contract `/healthcheck` applies. ISSUES block the handoff;
   WARNINGS are judgment calls to review with the user.

---

## PHASE 6: Versioning and close

### Semantic version rule (Amend mode)

| Change | Bump |
|--------|------|
| A principle is removed or redefined incompatibly | **MAJOR** (x+1.0.0) |
| A new principle or gate is added, or a new section | **MINOR** (x.y+1.0) |
| Wording clarification without changing scope | **PATCH** (x.y.z+1) |

### Handoff

Show a summary:
- File path, resulting version.
- List of articles (by name) and active gates.
- What changed (Amend mode only).

Say:
> "Constitution saved to `<path>` (v`<version>`). The `/sdd-design` and `/sdd-plan` skills
> validate against it as the source of non-negotiable principles. If you want the
> flow to enforce it, confirm that `/sdd-design` and `/sdd-plan` reference it."

Stop — don't start designing or planning.

---

## Output language

**Conversational output** follows `~/.agents/references/chat-conventions.md` — the six blocks (announce, progress, question, summary, stop, handoff).

**`docs/rules.md` follows `ARTIFACT_LANGUAGE`** (profile, language block — falls back to
`OUTPUT_LANGUAGE` if the project doesn't declare it): articles, reasons and
verification notes. Never translate them to English on your own.

**The structural headings are literals, not prose — never translate them**, whatever
`ARTIFACT_LANGUAGE` says. `validate-rules.mjs` locates them by exact string, so a
constitution written in Spanish with `### Artículo 1:` is reported as having no
articles at all, and one with `## Puertas de Calidad` as missing its gates section.
Three things stay English:

| Stays English | Why |
|---|---|
| `### Article N: <name>` — the `Article N:` part; the name after it is prose | Located by literal string by the validator |
| `## Mandatory Quality Gates` and the field labels `**Principle:**`, `**Reason:**`, `**How it's verified:**` | Same |
| The gate names (Simplicity Gate, Test-First Gate, …) | Terms of art `/sdd-design` cites when it applies them |

The normative keywords MUST / SHALL / NEVER also stay English: the validator tests
the Principle for them, and they are what makes the sentence normative in the first
place. Everything else in the article — the short name, the reason, the verification
note — is prose in `ARTIFACT_LANGUAGE`.

Technical identifiers, file names and paths follow `IDENTIFIER_LANGUAGE` (profile,
language block): quote them as the codebase spells them rather than assuming a
language for them.

**Chat interaction (the interview) follows the user's language**
(`OUTPUT_LANGUAGE` in the profile). The message samples in this document are written
in English; render them in the user's language when that differs.

---

## Common Issues

The 3 that **interrupt a run** — it stops, or the call goes back to the user.
Every other failure mode is in `references/common-issues.md`, with its cause and
resolution.

| Issue | Cause | Resolution |
|-------|-------|------------|
| Constitution already exists with content | Re-run | Ask amend vs. rewrite; in amend, preserve what wasn't touched |
| `validate-rules.mjs` reports "no articles found" on a file full of articles | The headings were translated — `### Artículo 1:` instead of `### Article 1:` | The structural headings are located by literal string (see **Output language**). Restore them; the prose after the colon stays in `ARTIFACT_LANGUAGE` |
| The validator reports the gates section missing | `## Mandatory Quality Gates` translated or renamed | Same cause: restore the literal heading |

---
## Example

A full worked run — an interview and the constitution it writes — is in
`references/example.md`. Read it when the shape of the output is in doubt.

---