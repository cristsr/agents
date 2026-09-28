# Loading the artifacts — what to read, and what to take from each

## Contents

- Which steps apply per tier and mode
- The steps

Read this at Step 4, before drafting. Take only what each step names.

## Which steps apply

| Tier · mode | Steps |
|---|---|
| `full` · `tdd` | all |
| `full` · `evidence` | 1, 2, 6b, 6c, 7-8, 11b — no 3-6, no 11 |
| `standard` · either | 1, 2, 6b, 6c, 7-8, 11b — no 3-6, no 11 |

## The steps

1. Read `work/active/spec-<number>/spec.md` — extract:

   - All acceptance criteria — these drive the test cases
   - Each AC's `##### Scenario:` blocks — a scenario is already a test case: its
     `**WHEN**` is the arrange+act and its `**THEN**` the assertion, with the real
     values `/sdd-clarify` settled. Write the test from the scenario rather than
     re-deriving one from the AC's prose, and give the test a name that traces back
     to it. An AC with several scenarios needs several test cases
   - Business rules and edge cases

2. Read `work/active/spec-<number>/context.md` — extract:
   - Affected <component>s
   - Existing module paths per <component> (under `MODULE_ROOT`)
   - Injection patterns (how use cases are registered — read them from the code, and
     from the framework skill's references for the binding syntax, e.g. the `nestjs`
     skill's `references/nestjs-binding.md`)
   - Existing DTOs available for reuse
   - Current providers in each module registration file

3. Read `work/active/spec-<number>/design.md` — extract:
   - Endpoint table per <component> (business description)
   - Whether `## Data Modeling` is present (signals a new/changed table
     exists — the actual entity/SQL lives in `docs/data-model.md`)

4. Read `<flow-artifact>` — the sequence diagram determines the <component>
   implementation order (the order section).

5. Read `work/active/spec-<number>/docs/<api-artifact>` — written in `API_CONTRACT`
   (e.g. OpenAPI 3.1), this is the **source of truth** for DTOs, never `design.md`:
   - Every path + operation → the endpoint a controller task must expose
   - Every schema in `components.schemas` → one DTO class, field-by-field
   - Every response code + description → the HTTP response cases a task must test

6. If `design.md` has a data model section, read
   `work/active/spec-<number>/docs/data-model.md` — this is the **source of
   truth** for the entity/migration task, never `design.md`:
   - Every entity field + type → the `ORM` column definition and the SQL column
   - Every SQL column → must match the entity field name/type exactly

6b. If `work/active/spec-<number>/docs/research.md` exists, read it — the chosen
    options and their rationale constrain how tasks should implement each
    decision (do not re-litigate a decision already recorded there).

6c. Read the project constitution if it exists — its Articles are non-negotiable
    and the generated tasks MUST respect them; `/sdd-design` already validated the
    Quality Gates where the design stage ran, so here just avoid producing tasks that
    violate an Article:

    ```bash
    [ -s docs/rules.md ] && echo "FOUND" || echo "NONE"
    ```

7. Read the testing doc under `DOCS_ARCHITECTURE` (e.g. `docs/architecture/testing.md`)
   — apply TDD task format and test commands
   throughout (in the evidence mode, take from it only what applies: the project's
   conventions for naming and running checks, not the red-first cycle).
8. Read the conventions doc under `DOCS_ARCHITECTURE` (e.g.
   `docs/architecture/conventions.md`) — apply naming conventions throughout.
9-10. The header and task templates are named in `SKILL.md` Step 5 — nothing to load
    here.
11. Consult the `api-contract` artifact contract's `openapi-to-dto-mapping.md`
    (`~/.agents/contracts/artifacts/api-contract/openapi-to-dto-mapping.md`, or
    `<STACK_REFS>/references/openapi-to-dto-mapping.md` when a stack pack overrides it) —
    exact mapping from the API contract schema fields for the DTO task(s).
11b. Load each skill in the profile's `stack.SKILLS`
     with the Skill tool before writing code blocks, and apply its rules to the
     task text. Load by name; a name that doesn't exist is reported under
     Unknowns, not fatal. When the list is empty, apply only what steps 7-8
     require.
