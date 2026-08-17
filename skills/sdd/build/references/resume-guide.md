# Build Resume Guide

Reference for resuming an interrupted `/build` execution session.

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

---

## Step 2: Report state to the user

Before resuming, always report:

> "I found N tasks already completed:
> - Task 0: Verify the working branch [X]
> - Task 1: TypeORM entity [X]
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

Continue from the first task NOT marked `[X]`.
Follow the same execution rules as a fresh start:
- Mark `in_progress` in TodoWrite
- Execute each step exactly as written
- Mark `[X]` in plan.md upon completion
- Do not stop between tasks

---

## Common resume scenarios

| Scenario | Action |
|----------|--------|
| All tasks `[X]` | Report "Plan already completed". Run the final test suite to confirm. |
| `[X]` on task N but file missing | Warn the user, offer to re-execute task N |
| Mid-task interruption (no `[X]`) | Re-execute the whole task from Step 1 |
| Branch changed since last run | Verify branch before continuing — stop if on main/master |
| Tests were failing when interrupted | Re-run the failing test, fix if needed, then continue |
