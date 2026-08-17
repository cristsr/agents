# SKILL.md Template

Adapt this template to the concrete skill. Replace the bracketed sections with the
specific content. Optional sections are marked.

---

## Base template

```markdown
---
name: your-skill
description: [what it does] + [when to use it, with the user's literal phrases] +
  [key capabilities]. Do NOT use to [excluded neighboring scope].
---

# Skill Name

## Overview

[One or two sentences: what the skill solves and for whom.]

**Announce at start:** "[Short phrase Claude says when starting.]"

**Output:** [what it concretely produces — file, PR, report, etc.]

**Core principle:** [the rule governing decisions inside the skill.]

---

[If the skill is PIPELINE, the `## Contract` block goes here — see below.
 If it's standalone, delete this line and move on.]

---

## Instructions

### Step 1: [First major step]

Clear explanation of what happens.

Example:
```bash
python scripts/fetch_data.py --project-id PROJECT_ID
```
Expected output: [describe what success looks like]

### Step 2: [Second major step]

[Add as many steps as needed.]

---

## Examples

### Example 1: [common scenario]

User says: "Set up a new marketing campaign"

Actions:
1. Fetch existing campaigns via MCP
2. Create the new campaign with the given parameters

Result: Campaign created with a confirmation link

[Add more examples as needed.]

---

## Troubleshooting

### Error: [common error message]

Cause: [why it happens]
Solution: [how it's fixed]

[Add more error cases.]
```

---

## `## Contract` — pipeline skills only

Goes right after the Overview, before the first step. Write only the rows that
apply; delete the rest. `Reverting` is optional — include it when the skill
overwrites live artifacts.

```markdown
## Contract

What this skill needs, what it guarantees to the next stage, and what it may not
do. **Check every `Requires` row before any other work** — a failed precondition
stops the run at the start, not halfway through.

**Requires**

| Condition | Check | If it fails |
|---|---|---|
| [precondition] | [the literal command or comparison] | Stop: "[what the user is told, with the command that fixes it]" |

**Produces** — this is what `/<next-skill>` looks for

- [artifact, in terms someone can count or test]

**Writes** — nothing outside this list

- [path]

Not [what a reader would reasonably expect it to touch and it doesn't] (that's
`/<other-skill>`).

**Never** — regardless of what a step appears to need

- [forbidden verb, with the reason it's forbidden]

**Escalates** — [the closed list of reasons to stop and ask. "There is no fifth."]

**Reverting** — [the real mechanism to undo, and its validity window]

**Degrades** — `KEY` unavailable → [alternate route, and the mark it leaves]

**Profile keys**

- `KEY_A`, `KEY_B` — [what they're read for], written in this document as
  [how they appear inline]
```

Two failure modes this block exists to prevent:

- **`Produces` written as an adjective.** "Leaves the module documented" can't be
  checked. "One line per AC, zero lines marked `✗`" can. If the next skill can't
  verify it mechanically, it isn't a contract.
- **`Requires` checked lazily.** All rows verified up front. A precondition that
  fails at step 7 leaves a half-written workspace.

---

## High-value optional sections

### `## Important` / `## Critical` (use sparingly)

Goes **near the top**, right after the Overview. Critical instructions buried in the
middle don't get followed.

**One per skill at most, and only for something irreversible.** If the skill has a
`Contract`, that block already covers preconditions, forbidden verbs and escalation
— a `## CRITICAL` repeating any of them subtracts. Language conventions, read paths
and ordinary preconditions never qualify. When everything is critical, nothing is.

```markdown
## Critical

CRITICAL: before calling `create_project`, verify:
- The project name isn't empty
- At least one member is assigned
- The start date isn't in the past
```

### `## Common Issues` (recommended)

An issue / cause / resolution table. Denser than the Troubleshooting block and
easier to scan:

```markdown
| Issue | Cause | Resolution |
|---|---|---|
| MCP connection fails | Server not connected | Settings > Extensions > [Service] > Reconnect |
```

### Referencing bundled resources

Link explicitly — the file existing isn't enough:

```markdown
Before writing queries, consult `references/api-patterns.md` for:
- Rate limiting guidance
- Pagination patterns
- Error codes and handling
```

### `## Performance Notes` (use judiciously)

A counter to model "laziness" on long tasks:

```markdown
## Performance Notes
- Take the time needed to do this thoroughly
- Quality matters more than speed
- Don't skip the validation steps
```

> Note from the guide: this is **more effective in the user's prompt than in
> SKILL.md**. Include it only if the task is long and there's evidence steps get
> skipped.

---

## Error handling — template

```markdown
## Common Issues

### MCP Connection Failed

If you see "Connection refused":
1. Verify the MCP server is running: Settings > Extensions
2. Confirm the API key is valid
3. Reconnect: Settings > Extensions > [Service] > Reconnect
```

---

## Writing rules

| Rule | Good | Bad |
|---|---|---|
| Specific and actionable | ``Run `python scripts/validate.py --input {filename}` to check the format. If it fails, the typical problems are: missing required fields (add them to the CSV), invalid date formats (use YYYY-MM-DD)`` | "Validate the data before proceeding" |
| Unambiguous | "CRITICAL: verify the name isn't empty" | "Make sure to validate things properly" |
| Concise | Bullets and numbered lists | Long paragraphs |
| Progressive disclosure | Core in `SKILL.md`, detail in `references/` | Everything inline |
| Config keys inline | ``Check out `BASE_BRANCH` (e.g. `develop`)`` in the sentence itself | A `\| In this document \| Key in profile.yaml \|` table the reader must remember to consult |

---

## Limits

- `SKILL.md` under **5,000 words**. If it goes over, move content to `references/`.
- `description` under **1024 characters**.
- No `README.md` inside the skill's folder. (A repo-level README for humans is fine
  if it's distributed via GitHub — but outside the skill's folder.)
