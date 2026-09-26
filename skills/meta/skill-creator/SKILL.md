---
name: skill-creator
description: >
  Guides the creation of a new single-responsibility skill following Anthropic's
  skill authoring best practices. Interviews for 2–3 use cases, checks the
  boundary so sibling descriptions stay mutually exclusive, writes the evals and
  a no-skill baseline before any instructions, drafts a third-person frontmatter
  with explicit triggers, keeps SKILL.md under 500 lines, and adds a Contract
  block when the skill hands artifacts to another one.
  Use when the user says "/skill-creator", "create a skill", "new skill",
  "generate a SKILL.md", "turn this process into a skill", "build a skill for X",
  "build the pieces of this split", or describes a repeatable workflow they want
  Claude to follow consistently.
  Do NOT use to review an existing skill or decide whether to split it (use
  /skill-evaluator), to edit a user story's artifacts (use /sdd-refine), or to
  define project-wide principles (use /sdd-rules).
---

# skill-creator

## Overview

A **skill** is a folder of instructions that teaches Claude to handle a repeatable
task or workflow. This skill guides the creation of a new one following Anthropic's
skill authoring best practices.

This skill is **agnostic** — it works for creating skills for any project or
domain. It assumes nothing about this workspace's structure.

**Announce at start:** "Let's create a new skill. Starting with the use cases."

**Output:** a `<skill-name>/` folder with a `SKILL.md`, an `evals/evals.json` and,
where applicable, `references/`, `scripts/` and `assets/`.

**Core principles:**

1. **The context window is shared.** The skill lives next to the system prompt, the
   conversation, every other skill's metadata and the user's request. It adds only
   what Claude doesn't already know — conventions, domain rules, team decisions.
2. **One skill, one responsibility.** If it can't be described in one or two
   sentences without "and also…", it's two skills.
3. **Evals before instructions.** Observe where Claude fails without the skill, then
   write only what fixes those failures.
4. **The frontmatter matters most.** It's the only thing always loaded, and it's
   what decides whether the skill activates. Brilliant instructions behind a vague
   `description` never run.

### Progress checklist

Copy it into the conversation and tick it as you go:

```
- [ ] PHASE 1 — use cases, single-responsibility test, collision check
- [ ] PHASE 2 — evals/evals.json + no-skill baseline
- [ ] PHASE 3 — category, pattern, pipeline or standalone
- [ ] PHASE 4 — frontmatter
- [ ] PHASE 5 — folder structure
- [ ] PHASE 6 — instructions (only what the baseline showed missing)
- [ ] PHASE 7 — evals re-run on every target model, checklist, handoff
```

---

## PHASE 1: Use cases and boundary (don't skip)

**Write nothing of the skill until you have 2–3 concrete use cases.** Without them
the `description` comes out vague and the skill doesn't trigger.

### Step 1 — Interview

Ask one at a time:

1. "What does the user want to achieve when they use this skill?"
2. "What exact phrase would they say to ask for it?" (this feeds the triggers)
3. "What multi-stage steps does it require?"
4. "Which tools does it need? (built-in, MCP, scripts)"
5. "What does Claude get wrong today when you ask for this without a skill?"
   (this seeds the baseline — PHASE 2)
6. "Which files does it read, which does it write, and does another skill run
   right before or right after it?" (this feeds the `Contract` — PHASE 3 Step 4)

Record each use case in this format:

```
Use case: Sprint planning
Trigger: the user says "help me plan this sprint" or "create the sprint's tasks"
Steps:
  1. Pull the project's current state from Linear (via MCP)
  2. Analyze the team's velocity and capacity
  3. Suggest task prioritization
  4. Create tasks in Linear with labels and estimates
Result: sprint planned with the tasks created
```

> **Pro tip from the guide:** iterate on **one hard task** until Claude solves it
> well, and only then extract the winning approach into a skill. If the user hasn't
> done the task by hand even once, suggest doing that first.

### Step 2 — Single-responsibility test

Write the skill's purpose in **one or two sentences**. It passes if:

- the sentences need no "and also…", "plus…", "it can also…";
- every use case from Step 1 ends in the same kind of result for the same consumer;
- there is one reason the skill would change (a convention, a tool, a workflow —
  not two unrelated ones).

If it fails, stop and propose the split to the user: one skill per responsibility,
each with its own use cases. Then create them one at a time.

### Step 3 — Collision check against existing skills

Sibling descriptions must be **mutually exclusive**: if two skills could activate for
the same request, the boundary is drawn wrong. Collect every installed description:

```bash
for f in $(find -L ~/.claude/skills ~/.agents/skills .claude/skills -maxdepth 2 -name SKILL.md 2>/dev/null); do
  echo "== $f"; awk '/^---$/{n++; next} n==1' "$f" | sed -n '/^description:/,/^[a-z-]*:/p'
done
```

For each trigger phrase from Step 1, ask: "would another skill's description also
claim this?" If yes, decide with the user who owns it — then the loser gets a
negative trigger, and so does this one.

**Granularity vs discovery.** Every skill adds a description to the permanent
context, and every extra skill raises the collision risk. A piece earns its own skill
only if the user would ask for it on its own — with a trigger no other skill claims.
A piece with no trigger of its own belongs **inside** an existing skill, as a
reference or a script.

---

## PHASE 2: Evals before instructions

Consult `references/evals-format.md` for the file format and a full example.

### Step 1 — Write `evals/evals.json`

From the use cases, before writing a single instruction:

- **Behavior evals** — at least 3, one per use case plus one edge case. Each has a
  `query`, the `files` it needs, and the `expected_behavior` in verifiable terms.
- **Trigger battery** — `should` (literal phrases + paraphrases) and `should_not`,
  with at least one query owned by each neighboring skill found in PHASE 1 Step 3,
  naming that skill as `owner`.
- **Target models** — the models the skill will run on. Haiku may need more detail
  than Opus; a skill tuned only on the strongest model breaks on the weakest.

### Step 2 — Baseline without the skill

Run the behavior evals **without the skill loaded** — the user in a clean session,
or a subagent that doesn't have the skill — on at least one target model. Record
each concrete failure in `baseline`.

The baseline is the scope: **PHASE 6 writes only what fixes those failures.** If the
baseline shows no failures, Claude already handles the task — say so and stop; the
skill would only spend tokens.

---

## PHASE 3: Category, pattern and kind

### Step 1 — Pick the category

Use `AskUserQuestion` (`header: "Category"`) if it isn't obvious:

| Category | What it's for | Key techniques |
|---|---|---|
| **1. Document and asset creation** | Consistent, high-quality output: documents, presentations, apps, designs, code | Embedded style guides, templates, quality checklists |
| **2. Workflow automation** | Multi-step processes that benefit from a consistent methodology | Steps with validation gates, templates, refinement loops |
| **3. MCP enhancement** | Workflow guidance layered over the access an MCP server provides | Coordinates MCP calls in sequence, embeds expertise, handles MCP errors |

### Step 2 — Pick the framing

- **Problem-first:** "I need to set up a project workspace" → the skill orchestrates
  the right calls in the right order.
- **Tool-first:** "I have the Notion MCP connected" → the skill teaches Claude the
  optimal workflows for access the user already has.

### Step 3 — Pick the pattern

Consult `references/patterns.md` for each pattern's full structure:

| Pattern | Use when |
|---|---|
| **1. Sequential orchestration** | The process has steps in a specific order with dependencies |
| **2. Multi-MCP coordination** | The workflow spans several services |
| **3. Iterative refinement** | Output quality improves with iteration |
| **4. Contextual tool selection** | Same outcome, different tool depending on the context |
| **5. Domain intelligence** | The skill brings specialized knowledge beyond tool access |

If it needs two patterns that share no steps, re-run PHASE 1 Step 2 — it's
probably two skills.

### Step 4 — Pipeline or standalone (decides the `Contract`)

A skill is **pipeline** if any of these holds:

- a **named** skill produces its input, or a **named** skill consumes its output;
- it writes files into a workspace shared with other skills;
- it reads a project profile or config file for paths, branches or commands.

Otherwise it's **standalone** — including a skill that operates on whatever file the
user points it at: arbitrary input is not a handoff.

Pipeline skills get a `## Contract` (PHASE 6). Standalone skills don't — rows
invented to fill the template are noise that trains the reader to skim the block.

---

## PHASE 4: Frontmatter (the most important part)

Consult `references/frontmatter-reference.md` for every field and rule.

### Hard rules (blocking)

| Rule | Detail |
|---|---|
| Folder name | kebab-case: lowercase letters, numbers and hyphens |
| File | Exactly `SKILL.md` (case-sensitive) |
| `name` | kebab-case, must match the folder name |
| `description` | Mandatory. **WHAT it does** and **WHEN to use it**. Max 1024 characters |
| Forbidden | XML angle brackets in the frontmatter. Names containing "claude" or "anthropic" |
| Forbidden | A `README.md` inside the skill's folder |

> **Why the XML restriction:** the frontmatter enters Claude's system prompt.
> Malicious content there could inject instructions.

### Choosing the `name`

- **Specific.** Never `helper`, `utils`, `tools`, `assistant` — a generic name gives
  the reader nothing and invites collisions.
- **Prefer the gerund form** (`processing-pdfs`, `reviewing-migrations`). Exception:
  a skill joining an established family keeps the family's convention
  (`sdd-plan` next to `sdd-build`) — consistency within the family wins.

### Writing the `description`

Formula: **[what it does] + [when to use it] + [key capabilities]**

- **Third person.** "Analyzes Figma files…", never "I analyze…" or "You can use this
  to…". The description is injected into the system prompt; a shifting point of
  view hurts discovery.
- The literal phrases from PHASE 1 as triggers.
- Negative triggers (`Do NOT use to… (use /x)`) for every collision PHASE 1 Step 3
  resolved.

```yaml
# Good — third person, specific, with triggers
description: Analyzes Figma design files and generates handoff documentation for
  development. Use when the user uploads .fig files, asks for "design specs",
  "component documentation", or "design-to-code handoff".

# Bad — vague
description: Helps with projects.

# Bad — first person, no triggers
description: I create sophisticated multi-page documentation systems.
```

`description` checklist before moving on:
- [ ] Third person; says what the skill does and when to use it
- [ ] Phrases the user would actually say; file types if relevant
- [ ] Passes the single-responsibility test — no "and also…"
- [ ] A negative trigger for every neighbor it could collide with
- [ ] Under 1024 characters, no XML tags (`description: >` is fine — it's YAML)

---

## PHASE 5: Folder structure

```
<skill-name>/
├── SKILL.md          # Required — main instructions
├── evals/            # Required — evals.json (never linked from SKILL.md)
├── scripts/          # Optional — executable code
├── references/       # Optional — documentation loaded on demand
└── assets/           # Optional — templates, fonts, icons used in the output
```

**Start with `SKILL.md` and `evals/`**; add other folders only when real content
justifies them. An empty `references/` is noise.

### Progressive disclosure

| Level | What it is | When it loads |
|---|---|---|
| 1 | YAML frontmatter | Always, in the system prompt |
| 2 | `SKILL.md`'s body | When the skill activates |
| 3 | Linked files (`references/`, `scripts/`) | Only on demand — a script's code never enters the context, only its output |

Rules:

- **`SKILL.md` body under ~500 lines.** Split into `references/` as it approaches
  the limit.
- **References one level deep.** Every reference is linked from `SKILL.md`; a
  reference that sends the reader to another reference gets read partially.
- **A table of contents** at the top of any reference longer than ~100 lines.
- **Forward slashes** in every path (`references/guide.md`), never Windows style.

---

## PHASE 6: Write the instructions

Consult `references/skill-template.md` for the full template, and — for pipeline
skills — `references/contract-guide.md` for the `## Contract` block, its rows and
how profile keys are written inline.

### Only what the baseline showed missing

Assume Claude is intelligent. Don't explain what a PDF, an endpoint or a git branch
is. Explain the conventions, domain rules and team decisions it failed on in the
baseline. Every section should trace back to a baseline failure or to a rule Claude
couldn't know.

### Match the degree of freedom to the task's fragility

| Freedom | When | Form |
|---|---|---|
| **High** | Many valid solutions (reviewing code, writing prose) | General criteria and heuristics |
| **Medium** | A preferred pattern with acceptable variations | Template or parameterized pseudocode |
| **Low** | Fragile operation where consistency is critical (a DB migration) | Exact steps or a script, "run exactly this" |

Loose prose on a fragile operation causes errors; rigid steps on a judgment task
cause bad output.

### Workflows and feedback loops

- **Multi-step task → a copyable checklist** Claude pastes and ticks as it goes.
- **Quality-critical output → a loop:** run → validate → fix → repeat until the
  validator passes. It's the pattern that improves results most.
- **Scripts:** handle their own errors (don't punt them to Claude), justify every
  configurable value (no magic constants), and `SKILL.md` says whether each script is
  to be **run** or **read as reference**.

### Recommended structure

```markdown
# Skill Name

## Overview
[what it solves, announce-at-start, output, core principle]

## Contract            # pipeline skills only
[Requires / Produces / Writes / Never / Escalates / Degrades / Profile keys]

## Instructions
### Step 1: [First major step]

## Example
[link to references/example.md]

## Troubleshooting
[issue / cause / resolution]
```

### Writing rules

| Rule | Good | Bad |
|---|---|---|
| **Specific and actionable** | ``Run `python scripts/validate.py --input {filename}` to check the format`` | "Validate the data before continuing" |
| **Unambiguous** | "Before calling `create_project`, verify: name not empty, one member assigned, start date not past" | "Make sure to validate things properly" |
| **Concise** | Bullets and numbered lists; detail in `references/` | Long paragraphs Claude won't follow |
| **Consistent terminology** | One term per concept across the whole skill | "field", "box", "element" for the same thing |
| **Timeless** | Current behavior only; legacy isolated in a `## Legacy` section | "As of 2025, use the new API" |
| **Critical up top** | The governing rule near the start — in the `Contract` if there is one | The key rule buried in the middle |
| **`CRITICAL` reserved** | One heading, for something irreversible the `Contract` doesn't cover | A `## CRITICAL` per section |

### Always include

1. **Error handling** — a common-issues section with cause and resolution.
2. **An example** — one end-to-end scenario: what the user says, the actions, the
   result.
3. **Explicit links to every reference** — the file existing isn't enough; say what
   to consult it for.
4. **Structural headings in English, if the skill is pipeline** — a heading another
   skill reads to find its input (`## AC Coverage`, `Task N`) is part of the
   contract. Translating one breaks the reader silently.

> **Critical validations belong in a script.** Code is deterministic; language
> interpretation isn't.

---

## PHASE 7: Verify against the evals and close

### Step 1 — Re-run the evals with the skill

On **every target model** in `evals/evals.json`:

1. Run the behavior evals. Each baseline failure must be gone; record the run in
   `runs`.
2. Run the trigger battery. Target: loads on ~90% of `should`, on none of
   `should_not`.
3. **Observe navigation:** which files Claude reads, which it ignores, in what
   order. A reference never opened is dead weight or badly linked; one read on every
   run belongs in `SKILL.md`.

A failure → fix the instruction that should have prevented it → re-run. Iterate on
observed behavior, not on assumptions.

### Step 2 — Checklist

- [ ] Folder and `name` in kebab-case, matching, without "claude"/"anthropic"
- [ ] `name` specific (no `helper`/`utils`/`tools`); gerund unless a family
      convention applies
- [ ] `description` in third person, WHAT and WHEN, under 1024 characters, no XML
- [ ] Describable in one or two sentences without "and also…"
- [ ] No trigger collides with an existing skill
- [ ] No `README.md` inside the folder
- [ ] `SKILL.md` body under 500 lines
- [ ] References one level deep, all linked; TOC on those over ~100 lines
- [ ] Nothing Claude already knows is explained
- [ ] Degree of freedom matches the task's fragility
- [ ] Multi-step workflows carry a checklist; quality-critical ones a validation loop
- [ ] Error handling and an example included
- [ ] `evals/evals.json` with a baseline, created before the instructions
- [ ] Evals re-run on every target model

If PHASE 3 Step 4 said **pipeline**, seven more — they map one-to-one onto
`/skill-evaluator`'s group C and are detailed in `references/contract-guide.md`:

- [ ] **C1** — `## Contract` after the Overview, with the rows that apply
- [ ] **C2** — every key in `Profile keys` exists in the profile template, and every
      key read is declared
- [ ] **C3** — no `| In this document | Key in profile.yaml |` table; keys inline
- [ ] **C4** — no configured path, branch or command hardcoded in a step
- [ ] **C5** — no `## CRITICAL` heading the `Contract` already covers
- [ ] **C6** — handoff verified in both directions, in countable terms
- [ ] **C7** — the project's validation script passes, if it has one

### Step 3 — Handoff

Show a summary: folder path and files created, the 2–3 use cases covered, the
baseline failures and whether each is fixed, and the models tested.

Say:
> "Skill created at `<path>`. Its evals live in `evals/evals.json` — re-run them
> whenever the skill changes. For a full review with a score and over/under-triggering
> risks, use `/skill-evaluator <path>`."

Stop — don't start using the new skill.

---

## Output language

**The `SKILL.md` is written in English** — body, headings, tables and examples.
Technical identifiers, frontmatter field names, paths and code are English too.

**The `description`'s triggers go in the language the user actually speaks.** If they
mix languages, include both variants — a trigger that never matches what the user
types is dead weight. The same holds for the trigger battery in `evals/evals.json`.

**Chat interaction (the interview) follows the user's language.**

---

## Common Issues

The 3 that **interrupt a run** — it stops, or the call goes back to the user.
Every other failure mode is in `references/common-issues.md`, with its cause and
resolution.

| Issue | Cause | Resolution |
|---|---|---|
| The user doesn't know which use cases to give | The idea is still fuzzy | Don't move on: ask them to describe the last time they did the task by hand, step by step |
| The skill fails the single-responsibility test | Several responsibilities mixed together | Stop and propose the split; create each skill separately, with cross negative triggers |
| The baseline shows no failures | Claude already handles the task | Say so and stop — the skill would only spend tokens |

---

## Example

A full worked run — an interview turned into a finished skill — is in
`references/example.md`. Read it when the shape of the output is in doubt.
