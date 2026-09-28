# `## AC Coverage` — the section that closes the build

## Contents

- Where it lands
- Format
- The rules

## Where it lands

| Tier | The section lands in | Why |
|---|---|---|
| `full`, `standard` | `plan.md`, at the end | the plan is what was executed |
| `fast` | `spec.md`, at the end | the tier writes no plan; `status.mjs` reads "build done" from this section there |

## Format


```markdown
## AC Coverage

AC-1: <short text> — ✓ <component-a>/.../file.spec.ts::<test name>
AC-2: <short text> — ✓ <component-b>/.../file.spec.ts::<test name>
```

`## AC Coverage` is a structural heading — a contract with `/sdd-sync`, which reads it
before closing the story. Never translate it, and write one line per AC in the story's
`spec.md`, no more and no fewer: lines matching the ACs exactly. In `full` and
`standard` that is the plan's own multiple; in `fast` it is exactly one.

Every line carries a concrete reference. In `build_mode: evidence` that reference
is the **command that proves it** (in backticks) or the artifact path plus its
validator, and the same rule applies as for a test — `validate-artifacts.mjs`
rejects a ✓ with nothing behind it. A `fast` line is held to that bar in *either*
mode, because the tier has no task whose verification could vouch for the check:
the line names the command, in backticks, and the observable result it produced.

```markdown
AC-1: <short text> — ✓ `node scripts/validate-skills.mjs` → OK: 50 profile keys, no issues.
```

In `fast` the line is the close itself, so there is no other state to reconcile —
the section is written once, when the check is green, and never as a placeholder.

If an AC cannot be marked ✓ with one, mark it `✗ <reason>` — and then **stop before
declaring the build complete**: report the uncovered ACs and ask how to proceed. A
`✗` is not a footnote to a finished build, it's an unfinished build. Do not mark an
AC ✓ just because its task is [X] — verify the test (or the check) actually
exercises that AC's behavior. In `fast` the same rule reads directly: a `✗` in
`spec.md` means the criterion is not met, whatever the code looks like.

## The rules

- Build it from `spec.md` again, marked against what was actually implemented and checked
  — not against what the plan intended. A task `[X]` is not an AC ✓: verify the test (or
  the check) exercises that AC's behavior.
- An AC that can't be ✓ is `✗ <reason>` — and the build is **unfinished**: stop, report
  the uncovered ACs and ask. `/sdd-sync` refuses to close a story with a `✗`.
- In `fast` the section is written once, when the check is green — never as a
  placeholder, never with a `✗`.
