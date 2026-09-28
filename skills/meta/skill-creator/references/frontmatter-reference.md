# YAML frontmatter reference

## Contents

- Minimum required format
- Fields (`name`, `description`, optional ones)
- Example with every optional field
- Security notes
- Frequent YAML errors
- Description examples
- Negative triggers and sibling exclusivity

The frontmatter is **progressive disclosure level 1**: it's always loaded in Claude's
system prompt. It's what decides whether the skill activates.

---

## Minimum required format

```yaml
---
name: your-skill-name
description: What it does. Use when user asks to [specific phrases].
---
```

That's enough to get started.

---

## Fields

### `name` (required)

- kebab-case only: lowercase letters, numbers and hyphens.
- Must match the folder name.
- **Must not contain "claude" or "anthropic"** (reserved).
- **Specific** — never `helper`, `utils`, `tools`: name the job, not the mechanism.
- **Prefer the gerund form** (`processing-pdfs`, `reviewing-migrations`). A skill
  joining an established family keeps the family's convention (`sdd-plan` next to
  `sdd-build`).

```yaml
# Bad
name: My Cool Skill
name: my_cool_skill
name: MyCoolSkill
name: claude-helper

name: helper

# Good
name: processing-invoices
```

### `description` (required)

- **Third person.** "Processes invoices…", never "I process…" or "You can use this
  to…". It's injected into the system prompt; a shifting point of view hurts
  discovery.
- **One responsibility.** If it takes "and also…" to describe, it's two skills.
- **MUST include both things:**
  - What the skill does.
  - When to use it (trigger conditions).
- Under 1024 characters.
- No XML angle brackets — no `<tag>`, `</tag>` or `<placeholder>`. The YAML
  block-scalar indicator (`description: >`) is syntax, not markup, and is fine.
- Include specific tasks the user might say.
- Mention file types if they're relevant.

Structure: `[what it does] + [when to use it] + [key capabilities]`

### `license` (optional)

- Use if the skill is open source.
- Common ones: `MIT`, `Apache-2.0`.

### `compatibility` (optional)

- 1–500 characters.
- States environment requirements: intended product, required system packages,
  whether network access is needed, etc.

### `allowed-tools` (optional)

Restricts tool access:

```yaml
allowed-tools: "Bash(python:*) Bash(npm:*) WebFetch"
```

### `metadata` (optional)

Any key-value pair. Suggested: `author`, `version`, `mcp-server`.

```yaml
metadata:
  author: Company Name
  version: 1.0.0
  mcp-server: server-name
  category: productivity
  tags: [project-management, automation]
  documentation: https://example.com/docs
  support: support@example.com
```

---

## Example with every optional field

```yaml
---
name: skill-name
description: [required description]
license: MIT
allowed-tools: "Bash(python:*) Bash(npm:*) WebFetch"
metadata:
  author: Company Name
  version: 1.0.0
  mcp-server: server-name
  category: productivity
  tags: [project-management, automation]
---
```

---

## Security notes

**Allowed:**
- Any standard YAML type (strings, numbers, booleans, lists, objects).
- Custom metadata fields.
- Long descriptions (up to 1024 characters).

**Forbidden:**
- XML angle brackets (`<` `>`) — security restriction.
- Code execution in YAML (safe parsing is used).
- Skills with "claude" or "anthropic" in the name (reserved).

**Why:** the frontmatter appears in Claude's system prompt. Malicious content could
inject instructions.

---

## Frequent YAML errors

```yaml
# Bad — delimiters missing
name: my-skill
description: Does things

# Bad — unclosed quote
---
name: my-skill
description: "Does things
---

# Good
---
name: my-skill
description: Does things
---
```

---

## Description examples

### Good ones

```yaml
# Specific and actionable
description: Analyzes Figma design files and generates handoff documentation for
  development. Use when the user uploads .fig files, asks for "design specs",
  "component documentation", or "design-to-code handoff".

# With trigger phrases
description: Manages project workflows in Linear including sprint planning, task
  creation and status tracking. Use when the user mentions "sprint",
  "Linear tasks", "project planning", or asks to "create tickets".

# With a clear value proposition
description: End-to-end customer onboarding workflow for PayFlow. Handles account
  creation, payment setup and subscription management. Use when the user says
  "onboard new customer", "set up subscription", or "create PayFlow account".
```

### Bad ones

```yaml
# Too vague
description: Helps with projects.

# No triggers
description: Creates sophisticated multi-page documentation systems.

# Too technical, no user language
description: Implements the Project entity model with hierarchical relationships.

# First/second person — the point of view shifts inside the system prompt
description: I can help you process Excel files.
description: You can use this to process Excel files.

# Two responsibilities — "and also" is the tell
description: Processes invoices and also reviews supplier contracts.
```

---

## Negative triggers and sibling exclusivity

Sibling descriptions must be **mutually exclusive**: if two skills could activate for
the same request, the boundary between them is drawn wrong. Negative triggers mark
the boundary once it's decided — if both sides need many of them, redraw it instead.

When a skill over-triggers, add explicit exclusions:

```yaml
# Exclude a neighboring domain
description: Advanced data analysis for CSV files. Use for statistical
  modeling, regression, clustering. Do NOT use for simple data exploration
  (use the data-viz skill instead).

# Narrow the scope
description: PayFlow payment processing for e-commerce. Use specifically for
  online payment workflows, not for general financial queries.
```

And when it's too broad, make it more specific:

```yaml
# Too broad
description: Processes documents.

# More specific
description: Processes legal PDF documents for contract review.
```
