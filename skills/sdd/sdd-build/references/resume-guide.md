# Build Resume Guide

Reference for resuming an interrupted `/sdd-build` execution session.

---

## When to use this guide

- The previous Claude session ended mid-execution (context window exhausted, user closed session, etc.)
- Some tasks in `plan.md` are marked `[X]` and others are not
- The user says "resume", "continue the build", "pick it back up", or "keep going from where it stopped"

---

## Step 1: Read plan.md and audit task states

Read `work/active/spec-<number>/plan.md` completely.

Categorize every task:
- `[X]` at the end of the `### Task N:` header → **completed**, do NOT re-execute
- No `[X]` → **pending**, execute in order

Then read the header's "Implementation groups" line: execution resumes by group, so
a partially finished group is what you pick up, not a bare task number.

---

## Step 2: Report state to the user

Before resuming, always report:

> "I found N tasks already completed:
> - Task 0: Verify the working branch [X]
> - Task 1: Filter zones by service type [X]
> - ...
>
> Resuming from Task M: [task name]."

---

## Step 3: Verify the last completed task

Before executing the next pending task, verify that the last `[X]` task
actually produced the expected output:

- If it created a file → check the file exists with `[ -f <path> ]`
- If it ran tests → do NOT re-run; trust the `[X]` marker
- If the file is missing despite `[X]` → warn the user and ask whether to re-execute

---

## Step 4: Resume execution

Continue from the first task NOT marked `[X]`, running its group's cycle from there.
Follow the same execution rules as a fresh start:
- Mark the group's pending tasks `in_progress` in TodoWrite
- Whatever a task fixes is binding; the bodies are yours to write
- Tests for the remaining tasks first, one red run, then implement
- Mark the group's tasks `[X]` in plan.md once it is green
- Do not stop between tasks or groups

---

## Common resume scenarios

| Scenario | Action |
|----------|--------|
| All tasks `[X]` | Report "Plan already completed". Run the final test suite to confirm. |
| `[X]` on task N but file missing | Warn the user, offer to re-execute task N |
| Mid-group interruption (no `[X]`) | Re-execute the group's pending tasks from its red run — tests already written on disk count, re-run them rather than rewriting |
| Branch changed since last run | Verify branch before continuing — stop if on main/master |
| Tests were failing when interrupted | Re-run the failing test, fix if needed, then continue |
