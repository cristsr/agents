---
name: rules
description: >
  Creates or amends a project's rules document — the non-negotiable
  principles governing design, implementation, and review. Generic: works for
  any project, not just this workspace. Interviews the developer by category
  (architecture, testing, security, code quality, data, dependencies,
  delivery), takes the best of Spec Kit (articles, quality gates,
  semantic-versioned governance) and Kiro (EARS-style testable principles,
  inclusion modes), and produces a polished rules.md under docs/.
  Use when the user says "/rules", "/constitution", "create the rules",
  "define the project's principles", "generate rules.md", "the project's
  non-negotiable rules", or wants to establish or amend project-wide governing
  principles that other skills (design, plan) must validate against.
  Do NOT use to edit a single user story's artifacts (use /refine), to capture
  per-story technical context (use /clarify), or to document code conventions
  that are descriptive rather than governing (those live in docs/).
---

# rules

## Project profile (read first, always)

Read `.agents/profile.md` (at the root of the current project) to pick up
`OUTPUT_LANGUAGE` (interaction language), `ARTIFACT_LANGUAGE` (the language
`docs/rules.md` is written in) and `PROJECT_NAME`. The constitution it
produces is the source that validates the rest of the flow: `/design` checks its
quality gates and `/plan` respects it.

---

## Overview

The **constitution** is a project's set of non-negotiable principles. Unlike
descriptive documentation (`docs/`), the constitution is **normative** (it uses
MUST/SHALL) and it is the source other skills validate compliance against:
`/design` checks its quality gates before approving a contract, and `/plan`
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

## PHASE 1: Resolve destination and mode

### Step 1 — Determine the file path

Ask/choose where the constitution lives, in this order of preference:
1. If the user passed an explicit path → use it.
2. If a `docs/rules.md` already exists in the project where Claude Code is running
   (the primary working directory) → use that one.
3. Otherwise, the default is `docs/rules.md` in the project (next to
   `CLAUDE.md`). That's the standard location: visible, versioned with the repo and
   on the path the skills read. The user may override it to another path
   (e.g. `custom-rules.md`) if they prefer.

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
written. Look for signals:

```bash
ls docs/architecture/conventions.md docs/architecture/testing.md CONTRIBUTING.md 2>/dev/null
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
- **How it's verified** (which gate/phase checks it: review, `/design`,
  `/plan`, CI, etc.).

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
a frontend). Record only the active ones.

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
> "Constitution saved to `<path>` (v`<version>`). The `/design` and `/plan` skills
> validate against it as the source of non-negotiable principles. If you want the
> flow to enforce it, confirm that `/design` and `/plan` reference it."

Stop — don't start designing or planning.

---

## CRITICAL: Output Language

**`docs/rules.md` follows `ARTIFACT_LANGUAGE`** (profile, section 5 — falls back to
`OUTPUT_LANGUAGE` if the project doesn't declare it): articles, reasons and
verification notes. Never translate them to English on your own.

Article numbering, gate names (they're terms of art), technical identifiers, file
names and paths stay in English (`IDENTIFIER_LANGUAGE`).

**Chat interaction (the interview) follows the user's language**
(`OUTPUT_LANGUAGE` in the profile). The message samples in this document are written
in English; render them in the user's language when that differs.

---

## Common Issues

| Issue | Cause | Resolution |
|-------|-------|------------|
| Vague principles ("good code") | Non-testable answer | Ask again for the objective rejection criterion in review |
| Too many articles (>10) | Negotiable and non-negotiable got mixed | Prioritize; move the negotiable ones to `docs/` |
| Constitution already exists with content | Re-run | Ask amend vs. rewrite; in amend, preserve what wasn't touched |
| File exists but is empty (0 bytes) | Prior scaffolding never populated | Treat as Create mode, version 1.0.0 |
| User doesn't know what to put | Project with no written conventions | Seed from `docs/`/CONTRIBUTING if they exist, or use the gate defaults |

---

## Example

**Input:** `/constitution`

**Flow (Create mode, this workspace):**
1. PHASE 1: resolves `docs/rules.md` in the project (doesn't exist → Create mode,
   v1.0.0). Detects `docs/architecture/conventions.md` and `testing.md` → offers to
   seed. The user accepts.
2. PHASE 2: interview. C1 → "hexagonal mandatory, abstract class as the DI token";
   C2 → "TDD test-first, contract tests for endpoints"; C5 → "manual SQL migrations,
   never synchronize:true"; C6 → "don't break the current API contract";
   C7 → "conventional commits, never build on main". C3/C4/C8 → defaults.
3. PHASE 3: drafts each as a testable principle with a reason + how it's verified.
4. PHASE 4: enables the 4 gates by default.
5. PHASE 5: writes `docs/rules.md` v1.0.0.
6. PHASE 6: summary — 6 articles, 4 gates, v1.0.0.

**Output:**
> "Constitution saved to `docs/rules.md` (v1.0.0). The `/design` and `/plan` skills
> validate against it as the source of non-negotiable principles."
