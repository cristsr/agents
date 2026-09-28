# sdd-plan — failure modes that don't stop the run

The ones that stop a run stay in `SKILL.md`, where the decision to abort is made.
These are the rest: what to do when the run can continue.

| Issue | Cause | Resolution |
|-------|-------|------------|
| Service order unclear | Ambiguous sequence diagram | Read the whole diagram, infer from arrow direction |
| No `docs/diagram.md` in the story | `DOC_UNIT = use-case` | Not a gap: read the inline `sequenceDiagram` of each `docs/flows/*.md` |
| Undefined field in a test | Incomplete design | Use only fields confirmed in `<api-artifact>` / `docs/data-model.md` |
| Use case not registered in the module | Task omitted | Always include the module registration step |
| A test with no AC behind it | Invented test | Every test must map to an AC in spec.md |
| Relative path in imports | Convention violated | Follow the conventions doc under `DOCS_ARCHITECTURE` |
| `TESTS.module` unbound | Project without a per-module command | Write each task's TDD cycle against `TESTS.full` |
| An `evidence` story that ALSO has design artifacts | `/sdd-design` ran before the mode was decided | Not an error: the artifacts are extra context. Plan against the `evidence` strategy anyway — the mode in `spec.md` wins |
| The written plan lacks the traceability table or has `[X]` | Step 6 was skipped or cut short | Fix it before closing — Step 6's validator catches both |
| `STALE` from `file-tree.mjs --check` | A task's Files changed after the File Tree was generated | Re-run `node ~/.agents/scripts/file-tree.mjs spec-<number>` — never hand-edit the tree |
