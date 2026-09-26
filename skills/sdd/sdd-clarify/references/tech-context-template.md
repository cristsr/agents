# Template: Technical Context Section

The `## Technical Context` section of `spec.md`. It carries **exclusively what the
developer declared** in R5 — what is written in no file and cannot be deduced from the
code.

Everything surveyed from the repository (module, entities, providers, DTOs, ports,
gaps) goes to **`context.md`**, not here. Since `/sdd-scan` already wrote `context.md` before
this pass, there is no reason to duplicate the inventory in `spec.md`.

**If the developer declared nothing, omit the whole section.** An empty section, or
one padded with inferences, is worse than its absence: it invites `/sdd-design` to treat
an assumption as a requirement.

---

```markdown
## Technical Context

### Technical Constraints
- <what must NOT be done, or a known limitation>
[One bullet per constraint]

### Relevant Technical Debt
- <module or area + description of the known problem>
[One bullet per debt item]

### Planned Integrations
- <protocol + target + endpoint/topic that does NOT exist in the code yet>
  Example: HTTP GET to capabilities-ms: `/zones/{id}` (not implemented yet)
[One bullet per integration; omit if they all already exist in the code — those are
 surveyed by context.md]
```

---

## What belongs here and what doesn't

| Information | Where it lives | Why |
|---|---|---|
| "Don't touch table `X` directly" | **Here** | Only the developer knows it |
| "Module `Y` has a known bug with Z" | **Here** | It isn't written down anywhere |
| "We're going to integrate with `capabilities-ms`, it doesn't exist yet" | **Here** | There's no code to survey |
| Affected module, entities, fields | `context.md` | Surveyed from the code |
| Artifacts to reuse, port signatures | `context.md` | Surveyed from the code |
| Mandatory project patterns | `docs/rules.md` | Cross-cutting, not per item |
| Documentation gaps | `context.md` | They come out of the survey |

## Rules

- **Never infer content for this section.** If the developer answered `-` in R5, the
  section doesn't exist. There's no `(inferred)` marker because nothing here is
  inferred.
- **Never overwritten on re-run.** What was declared is the source of truth: a later
  `/sdd-clarify` run may add items, never replace or degrade existing ones.
- Omit any subsection with no content.

## Language rules

- Section headings: English (they are structural — other skills read them by name)
- Component names, classes, paths, identifiers, endpoints: `IDENTIFIER_LANGUAGE`
- Descriptive bullet text: `ARTIFACT_LANGUAGE` (profile, language block — falls back to
  `OUTPUT_LANGUAGE`)
- **The artifact never names the pipeline.** This template's `<!-- -->` comments and
  `[bracketed]` notes are instructions to whoever fills it in, not content: they don't
  reach the artifact. Neither does the skill, PHASE or Step that produced a line —
  what is written down is the decision, not who made it.
