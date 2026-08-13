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

## High-value optional sections

### `## Important` / `## Critical` (recommended)

Goes **near the top**, right after the Overview. Critical instructions buried in the
middle don't get followed.

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

---

## Limits

- `SKILL.md` under **5,000 words**. If it goes over, move content to `references/`.
- `description` under **1024 characters**.
- No `README.md` inside the skill's folder. (A repo-level README for humans is fine
  if it's distributed via GitHub — but outside the skill's folder.)
