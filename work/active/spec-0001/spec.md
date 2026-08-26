---
type: debt
origin: manual
---

# spec-0001: Constitution for the agents ecosystem

## Technical Debt

**Current situation:** this repository ships the `/sdd-rules` skill and the
`validate-rules.mjs` gate, but has no `docs/rules.md` of its own.
`npm run rules:check` fails today with
`no rules document at docs/rules.md`.

**Risk or cost:** because the constitution is missing, `/sdd-design` and `/sdd-plan` have
nothing to validate their decisions against when they run on this repo. The gate the
ecosystem asks every other project to satisfy is red in the project that publishes it.

**Desired state:** `docs/rules.md` exists for the agents ecosystem itself, conforming
to the rules contract that `validate-rules.mjs` enforces, and `npm run rules:check`
passes.

## Acceptance Criteria

### AC-1: The rules gate passes

`npm run rules:check` exits successfully against this repository, with no failure
reported for a missing rules document.

### AC-2: The document conforms to the rules contract

`docs/rules.md` satisfies the structural contract that `validate-rules.mjs` enforces.

[NEEDS CLARIFICATION: which sections, article structure and governance fields does the
rules contract require, and does the validator report anything beyond the file's
existence?]

### AC-3: The constitution governs this ecosystem

The rules written down are the non-negotiable principles of this repository — the ones
`/sdd-design` and `/sdd-plan` validate their decisions against when they run here.

[NEEDS CLARIFICATION: which rule categories must the ecosystem's own constitution
cover (architecture, testing, code quality, delivery, dependencies), and are they
derived from the conventions already written in the repo or gathered by interviewing
the developer through `/sdd-rules`?]
