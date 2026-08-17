# AUDIT — Procedure, Dimensions and Rules

Reference for `/hexagonal-audit`. Output is a **findings report**, not a refactor.
Do not change code unless the user explicitly asks for the fixes to be applied.
The concrete syntax per stack (detectors, examples) lives in the framework skill's
references (the `nestjs` skill's `references/audit-smells.md`, plus its `audit-scan.sh`).

---

## Step 1 — Map the terrain (read-only, no assumptions)

Run these before forming any opinion. They are cheap and they anchor every later claim.

```bash
# 1. Module and layer inventory
find <src> -maxdepth 2 -type d -not -path "*/node_modules/*" | sort

# 2. Every source file, to detect naming and placement drift
find <src> -type f <language file extensions> -not -path "*/node_modules/*" | sort

# 3. Compiler/alias setup — check BOTH the app and the test config
cat <the stack's alias config>
```

Then run the boundary scan if the framework skill provides a detector:

```bash
bash <framework-skill-dir>/references/audit-scan.sh <src>   # e.g. ~/.agents/skills/conventions/nestjs/references/audit-scan.sh
```

If no detector exists for the stack, map manually with the language's equivalents.
It prints one section per detector, grouped HIGH / MEDIUM / LOW / WIRING, and maps
directly onto the smell catalog (the framework skill's `audit-smells.md`).

Four of its sections read the **shape** of the tree rather than the contents of
files — loose files at a layer root, files at a module root, the role folders each
layer declares, and aggregates without a folder. Read those first: they are the only
ones that surface a defect every module shares, and they frame everything the grep
detectors report afterwards. Two caveats on their output:

- The detector cannot know which top-level folders are bounded modules. A
  composition root, a `tooling/` CLI or a `database/` folder will show up under
  "files at a module root"; that is expected, not a finding.
- A layer root legitimately holds its barrel, and a module root legitimately holds
  its module file. Both are already excluded.

CRITICAL: **every hit is a lead, not a finding.** Open the file and confirm before
reporting it. Several detectors deliberately need human judgement and say so in
their output.

If the script cannot run (no bash), fall back to the individual greps inside it.

## Step 2 — Score each dimension

Score 0–3 per dimension. Anything below 2 becomes a finding. Dimensions against
the canonical layout in `../hexagonal-architecture/references/rules.md`.

| # | Dimension | 3 — solid | 1 — weak |
|---|-----------|-----------|----------|
| 1 | **Dependency direction** | domain imports nothing outward; application never touches adapters | ORM/SDK types appear in domain or application |
| 2 | **Module boundaries** | one folder per bounded context, three layers inside | technical folders at the top, or a "common" dumping ground |
| 3 | **Domain richness** | entities own their rules; queries are methods | anemic entities; rules live in use cases or controllers |
| 4 | **Ports & bindings** | abstractions usable as DI tokens, bound in the module | non-token abstractions + string keys, or adapters injected directly |
| 5 | **Use case granularity** | one intent, one `execute()` | `XService` with many public methods orchestrating everything |
| 6 | **Adapter thinness** | controllers/crons/handlers only delegate | business logic in a controller or scheduler |
| 7 | **Mapping isolation** | domain ≠ persistence ≠ DTO, joined by mappers | one class reused across all three |
| 8 | **Error handling** | typed hierarchy with `code`/`context`/`cause`, formatter for logs | raw errors, swallowed catches, ad-hoc logging |
| 9 | **Naming consistency** | file and class suffixes uniform across modules | mixed suffixes across modules |
| 10 | **Shared kernel hygiene** | shared holds types, VOs, exceptions, config only | business logic or module-specific code in shared |
| 11 | **Cross-module coupling** | via exported use cases or events, wrapped in a local port | direct import of another module's repository/entity |
| 12 | **Testability** | use cases constructible with fakes; no hidden statics | dependencies created with `new` inside classes |
| 13 | **Layer topology** | every file sits in a folder that names its role; `application/` and `infrastructure/` roots hold only their barrel; `domain/` groups by aggregate once there are two | use-case folders with the repository, the registry and a shared enum loose beside them |

Total /39. Report the score with the two or three dimensions that cost the most points.

CRITICAL about dimension 13: it is the one you will not see by reading files, because
a broken topology is almost always **broken the same way in every module**, which
reads as a convention. Score it against the canonical layout in the rules, not
against the other modules — comparing modules only finds the odd one out. Ask what a
loose file would have been called if someone had given it a folder.

## Step 3 — Write findings, ranked by severity

One finding per real defect. Never pad the list.

```markdown
### [SEV] <one-line claim>
- **Where:** `path/to/file:LINE` (+ other occurrences)
- **Rule broken:** <rule from rules.md>
- **Why it hurts:** <the concrete future cost, not a platitude>
- **Fix:** <the smallest change that resolves it>
```

Severity:
- **HIGH** — breaks the dependency direction or makes a technology unswappable.
- **MEDIUM** — logic in the wrong layer, missing abstraction, error handling that loses failures.
- **LOW** — naming drift, missing barrel, missing docs, dead folder.

Close with a **prioritized plan**: the 3–5 changes with the best ratio of
architectural gain to diff size, in the order they should be done.

## Smell catalog

The stack-neutral smells are listed in `../hexagonal-architecture/references/rules.md`
(violation smells per rule). The stack-specific catalog — concrete detectors,
syntax examples, framework traps — lives in the framework skill's audit catalog
(`audit-smells.md`).

## Report template

Write the report's prose in **`ARTIFACT_LANGUAGE`** (profile, language block — falls back
to `OUTPUT_LANGUAGE`; see the Output Language rule in `SKILL.md`). The template below
is English scaffolding: keep the headings, and keep file paths, rule names, severities
and code in English.

```markdown
# Architecture Audit — <project>

**Scope:** <paths reviewed> · **Date:** <date>
**Score:** <n>/39

## Summary
<3–5 lines: what is solid, what is the dominant weakness.>

## Dimension scores
| Dimension | Score | Note |
|---|---|---|
| Dependency direction | 3/3 | — |
| Domain richness | 1/3 | rules live in use cases |
...

## Findings
### [HIGH] ...
### [MEDIUM] ...
### [LOW] ...

## Prioritized plan
1. <highest gain / smallest diff>
2. ...
```

## Rules for the auditor

- **Cite a file and line for every finding.** A claim without a location is not a finding.
- **Verify before reporting.** Read the file; do not infer a violation from a filename.
- **No speculative findings.** "This might not scale" is not a defect. Name the concrete failure.
- **Respect deliberate exceptions — but do not let uniformity end the question.** If
  the project consistently does something differently and it holds the dependency
  direction, report it as a convention to document, not as a defect. The trap: this
  rule reads "consistent" as "decided", and a defect present in *every* module is
  consistent by definition. Before filing something as a convention, ask the two
  questions that separate a decision from a habit:
  - **Is it uniform because someone chose it, or because it was copied?** A
    convention has a reason someone can state. Loose files at a layer root have
    none — nobody decides that a repository has no home; it just never got one.
  - **Would a new module reproduce it?** If yes and nobody would defend it in
    review, it is drift, not convention — and the cost compounds with every module
    added.

  This is how a whole-codebase topology defect stays invisible through an otherwise
  thorough audit: the auditor compares modules against each other, finds them
  consistent, and never compares the shape against the canonical layout. Dimension
  13 exists for exactly this.
- **Separate architecture from style.** Syntax nuance belongs to the stack's code
  skills (TS: `typescript`, `error-handling`, `design-principles`) — mention and defer.
- **Rank honestly.** A report where everything is HIGH is a report nobody acts on.
