# sdd-bootstrap — failure modes that don't stop the run

The ones that stop a run stay in `SKILL.md`, where the decision to abort is made.
These are the rest: what to do when the run can continue.

| Issue | Cause | Resolution |
|---|---|---|
| `validate-profile.mjs` fails before reporting any key | The file isn't valid YAML — usually an unquoted Windows path or a tab | The error carries the line; quote the whole path in double quotes and re-indent with spaces |
| Every skill reports it isn't in the working directory | `WORKING_DIRECTORY` written as a relative path, or with the wrong separator | It is compared against `pwd` verbatim — write it absolute, exactly as the shell prints it |
| `/sdd-plan` stops on a story declaring `build_mode: evidence` | `EVIDENCE_MODE_TYPES` lists eligible types while the `VERIFY` port is unbound | Bind `VERIFY` to a check that can actually fail, or narrow the list. A check that always passes is worse than none |
| The pipeline hangs on the first red-green turn | A watch script bound to `TESTS.module` | Never bind a command containing `watch`, `--watch` or `serve`; use the pack's runner invocation with a path filter |
| Every TDD turn costs minutes | `TESTS.module` bound to the full suite or an e2e script | That port runs on every turn — it wants the narrowest command that can run one module's tests |
| A skill reports a `references/` template it can't find | `STACK_REFS` null or pointing at a pack that doesn't exist | Resolution walks the packs last → first, then falls back to each skill's own generic `references/`. Verify each path exists before writing the list |
| The profile keeps growing with system descriptions | Component catalogs and endpoint tables written in instead of pointed at | Apply the rule of thumb: if it changes when the code changes, it is documentation. Strip it and leave the `DOCS_*` pointer |
