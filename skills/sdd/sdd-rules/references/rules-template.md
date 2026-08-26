# Rules Template

Produce exactly this structure. Replace all `<placeholders>` with real content.
Remove optional articles/sections that have no content. Keep the document
normative (MUST/SHALL), concise, and focused on the non-negotiable.

---

```markdown
---
version: <MAJOR.MINOR.PATCH>
ratified: <YYYY-MM-DD>
last_amended: <YYYY-MM-DD>
---

# Project Constitution — <project name>

## Purpose

This document defines the **non-negotiable** principles governing this project's
design, implementation and code review. It is **normative** (it uses MUST / NEVER),
not descriptive. When this document and any other guide (`docs/`, comments, habit)
conflict, **the constitution prevails**.

The constitution is enforced like this:
- The **Quality Gates** are validated before a contract is approved.
- The articles are respected when implementation tasks are generated.
- Code review (human or automated) checks compliance.

---

## Principles (Articles)

### Article 1: <Short principle name>

**Principle:** <rule in MUST/SHALL form, testable — a reviewer can answer yes/no
on whether a change complies>.

**Reason:** <why it's non-negotiable, 1 sentence>.

**How it's verified:** <the concrete gate that catches a violation: a CI job or
linter by name, a `/sdd-design` phase, a script. "Code review" alone is the weakest gate
— if that's all a rule can point to, either name a mechanical check or demote the
rule to `docs/`>.

<!-- Repeat "### Article N" for each principle. Aim for 6–10 total. -->

---

## Mandatory Quality Gates

A binary checklist the design phase (and the planning phase, where applicable) must
pass before approving. Each gate is either met or explicitly documented as not
applicable.

- [ ] **Simplicity Gate** — <criterion: don't add layers/projects/abstractions
  without a present use case justifying them>.
- [ ] **Anti-Abstraction Gate** — <criterion: use the framework/library directly
  before wrapping it in your own abstraction>.
- [ ] **Integration-First Gate** — <criterion: contract (OpenAPI/schema) and
  contract tests defined before implementing the endpoint>.
- [ ] **Test-First Gate** — <criterion: the test is written and fails before the
  production code>.

<!-- Add project-specific gates (e.g. Accessibility Gate) or remove any that
     do not apply. Keep only the ones actually enforced. -->

---

## Workflow constraints

<!-- OPTIONAL: constraints on branching, commits, releases, environments that
     are non-negotiable but don't fit as an "Article". Remove if empty. -->

- <e.g. Never build directly on `main`/`master`.>
- <e.g. Conventional commits mandatory: `type(SPEC-XXXX): description`.>

---

## Governance

**Amendments:** any change to this document goes through the amendment process, with
an updated version and the date in `last_amended`.

**Semantic versioning of the document:**
- **MAJOR** — a principle is removed or redefined incompatibly.
- **MINOR** — a new principle, gate or section is added.
- **PATCH** — wording clarification without changing scope.

**Precedence:** on conflict, this constitution prevails over `docs/` and over any
tacit convention. If a story needs to violate a principle, that's an explicit
exception that must be justified and approved, not a silent implementation
decision.
```

---

## Rules for each section

**Front-matter:** `version` in semver format. `ratified` is the first version's date
and doesn't change on amendments; `last_amended` is always updated.

**Articles:** each must be testable. If you can't write "How it's verified"
concretely, the principle is too vague — reformulate or discard it. Prefer a few
strong articles to many weak ones. **"How it's verified" names a concrete gate** — a
CI job, a linter, a `/sdd-design` phase, a script. A rule verified by nothing but code
review is a style preference: either it gets a mechanical gate or it belongs in
`docs/`, not in the constitution.

**Quality Gates:** they are binary and `/sdd-design` applies them. Don't conflate a gate
(a point-in-time check before approving) with an article (a permanent principle).

**Workflow constraints:** only the non-negotiable. The "preferable" goes in `docs/`.

**Language:** articles, reasons and verification notes in `ARTIFACT_LANGUAGE`
(profile, language block — falls back to `OUTPUT_LANGUAGE`). Identifiers and paths
follow `IDENTIFIER_LANGUAGE` and are quoted as the codebase spells them.

**What never gets translated**, whatever `ARTIFACT_LANGUAGE` says, because
`validate-rules.mjs` locates it by exact string: the heading `### Article N:` (the
name after the colon is prose), the heading `## Mandatory Quality Gates`, the field
labels `**Principle:**` / `**Reason:**` / `**How it's verified:**`, the gate names
(terms of art `/sdd-design` cites), and the normative keywords MUST / SHALL / NEVER. A
constitution whose headings were translated validates as having no articles at all.

**The constitution never names the pipeline**: this template's `<!-- -->` comments are
instructions to whoever fills it in and don't reach `docs/rules.md`, and no article
records which skill or PHASE wrote it. Naming `/sdd-design` as the *gate* that verifies an
article is different — that is the mechanism, and it belongs there.

**Formatting:** keep the constitution readable — a blank line after every heading,
between every article, and before and after every list. One idea per bullet; never a
bullet longer than ~3 lines.
