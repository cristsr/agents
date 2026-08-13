---
name: skill-creator
description: >
  Interactive guide for creating a new skill from scratch, following Anthropic's
  official guidance for building skills. Interviews the user to define 2–3
  concrete use cases, picks the right category and workflow pattern, drafts the
  YAML frontmatter with explicit triggers, lays out the folder structure
  (SKILL.md + scripts/ + references/ + assets/), writes actionable instructions
  with error handling, adds a Contract block when the skill hands artifacts to
  another one, and proposes the trigger test battery before closing.
  Use when the user says "/skill-creator", "create a skill", "new skill",
  "generate a SKILL.md", "I want to automate this flow with a skill", "turn this
  process into a skill", "build a skill for X", or describes a repeatable
  workflow they want Claude to follow consistently.
  Do NOT use to review or score an existing skill (use /skill-evaluator), to
  edit project artifacts of a user story (use /refine), or to define
  project-wide governing principles (use /constitution).
---

# skill-creator

## Overview

A **skill** is a folder of instructions that teaches Claude to handle a repeatable
task or workflow. This skill guides the creation of a new skill following
Anthropic's official guidance.

This skill is **agnostic** — it works for creating skills for any project or
domain. It assumes nothing about this workspace's structure.

**Announce at start:** "Let's create a new skill. Starting with the use cases."

**Output:** a `<skill-name>/` folder with a `SKILL.md` and, where applicable,
`references/`, `scripts/` and `assets/`.

**Core principle:** the **frontmatter matters most**. It's the only thing Claude
always has loaded, and it's what decides whether the skill activates. A skill with
brilliant instructions and a vague `description` never triggers.

---

## PHASE 1: Use cases (don't skip)

**Write nothing of the skill until you have 2–3 concrete use cases.** This is this
skill's gate: without use cases, the `description` comes out vague and the skill
doesn't trigger.

Ask one at a time:

1. "What does the user want to achieve when they use this skill?"
2. "What exact phrase would they say to ask for it?" (this feeds the triggers)
3. "What multi-stage steps does it require?"
4. "Which tools does it need? (built-in, MCP, scripts)"
5. "What domain knowledge or best practices need to be embedded?"
6. "Which files does it read, which does it write, and does another skill run
   right before or right after it?" (this feeds the `Contract` — PHASE 2 Step 4)

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

> **Pro tip from the guide:** the most effective creators iterate on **one hard
> task** until Claude solves it well, and only then extract the winning approach
> into a skill. If the user hasn't managed the task by hand even once, suggest
> doing that first — it gives much faster signal than designing in the abstract.

---

## PHASE 2: Category and pattern

### Step 1 — Pick the category

Use `AskUserQuestion` (`header: "Category"`) if it isn't obvious:

| Category | What it's for | Key techniques |
|---|---|---|
| **1. Document and asset creation** | Consistent, high-quality output: documents, presentations, apps, designs, code | Embedded style guides, templates, quality checklists, no external tools |
| **2. Workflow automation** | Multi-step processes that benefit from a consistent methodology | Steps with validation gates, templates, refinement loops |
| **3. MCP enhancement** | Workflow guidance layered over the access an MCP server provides | Coordinates several MCP calls in sequence, embeds expertise, handles MCP errors |

### Step 2 — Pick the framing

- **Problem-first:** "I need to set up a project workspace" → the skill orchestrates
  the right calls in the right order. The user describes the outcome; the skill
  handles the tools.
- **Tool-first:** "I have the Notion MCP connected" → the skill teaches Claude the
  optimal workflows. The user already has access; the skill brings the expertise.

### Step 3 — Pick the pattern

Consult `references/patterns.md` for each pattern's full structure:

| Pattern | Use when |
|---|---|
| **1. Sequential orchestration** | The process has steps in a specific order with dependencies |
| **2. Multi-MCP coordination** | The workflow spans several services |
| **3. Iterative refinement** | Output quality improves with iteration |
| **4. Contextual tool selection** | Same outcome, different tool depending on the context |
| **5. Domain intelligence** | The skill brings specialized knowledge beyond tool access |

A skill may combine patterns, but if it fits none of them, check whether it's
actually two skills.

### Step 4 — Pipeline or standalone (decides the `Contract`)

This is the gate for PHASE 5. Answer it now, from use-case question 6.

A skill is **pipeline** if any of these holds:

- a **named** skill produces its input, or a **named** skill consumes its output —
  a chain with a fixed position, not "anyone could hand it a file";
- it writes files into a workspace shared with other skills;
- it reads a project profile or config file for paths, branches or commands.

Otherwise it's **standalone**: it answers, advises or transforms within a single
invocation and owes nothing to a fixed neighbor. Convention and rule-exposing
skills are the usual case, and so is any skill that operates on whatever input the
user points it at — a tool applied to arbitrary files has no handoff to protect,
however often it's run after some other skill.

| Kind | Gets a `## Contract` | Why |
|---|---|---|
| **Pipeline** | Yes — PHASE 5 | The handoff is where contract defects hide. They're invisible reading either side alone |
| **Standalone** | No | There's no handoff and no territory to bound |

**Don't force a `Contract` where there is no contract.** A standalone skill with
`Requires`/`Produces` rows invented to fill the template is noise, and it trains the
next reader to skim the block — which is exactly what breaks it for the skills that
do need it.

---

## PHASE 3: Frontmatter (the most important part)

Consult `references/frontmatter-reference.md` for every field and rule.

### Hard rules (blocking)

| Rule | Detail |
|---|---|
| Folder name | kebab-case. No spaces, no underscores, no uppercase |
| File | Exactly `SKILL.md` (case-sensitive). Not `SKILL.MD`, not `skill.md` |
| `name` | kebab-case, must match the folder name |
| `description` | Mandatory. Must include **WHAT it does** and **WHEN to use it**. Max 1024 characters |
| Forbidden | XML angle brackets in the frontmatter. Names containing "claude" or "anthropic" (reserved) |
| Forbidden | A `README.md` inside the skill's folder — docs go in `SKILL.md` or `references/` |

> **Why the XML restriction:** the frontmatter enters Claude's system prompt.
> Malicious content there could inject instructions.

### Writing the `description`

Formula: **[what it does] + [when to use it] + [key capabilities]**

Take the literal phrases the user gave in PHASE 1 (question 2) and put them in as
triggers. If the skill competes with a similar one, add **negative triggers**
(`Do NOT use to…`) to avoid over-triggering.

```yaml
# Good — specific, actionable, with triggers
description: Analyzes Figma design files and generates handoff documentation for
  development. Use when the user uploads .fig files, asks for "design specs",
  "component documentation", or "design-to-code handoff".

# Bad — too vague, will never trigger reliably
description: Helps with projects.

# Bad — no triggers, Claude doesn't know when to load it
description: Creates sophisticated multi-page documentation systems.

# Bad — technical, no user language
description: Implements the Project entity model with hierarchical relationships.
```

`description` checklist before moving on:
- [ ] Says what the skill does
- [ ] Says when to use it, with phrases the user would actually say
- [ ] Mentions file types if they're relevant (`.fig`, `.csv`, `.pdf`)
- [ ] Has negative triggers if there are neighboring skills
- [ ] Under 1024 characters, with no XML tags (`description: >` is fine — it's YAML)

---

## PHASE 4: Folder structure

```
<skill-name>/
├── SKILL.md          # Required — main instructions
├── scripts/          # Optional — executable code (Python, Bash)
├── references/       # Optional — documentation loaded on demand
└── assets/           # Optional — templates, fonts, icons used in the output
```

Decide with the user which folders are needed. Rule: **start with just `SKILL.md`**
and add folders when there's real content justifying each one. A skill with an empty
`references/` is noise.

### The three levels of progressive disclosure

| Level | What it is | When it loads |
|---|---|---|
| 1 | YAML frontmatter | Always, in the system prompt |
| 2 | `SKILL.md`'s body | When Claude believes the skill is relevant |
| 3 | Linked files (`references/`) | Only when Claude decides to navigate them |

Exploit it: keep `SKILL.md` to the core instructions (**under 5,000 words**) and move
the detail into `references/` with explicit links.

---

## PHASE 5: Write the instructions

Consult `references/skill-template.md` for the full template.

### Recommended structure

```markdown
# Skill Name

## Overview
[what it solves, announce-at-start, output, core principle]

## Contract            # pipeline skills only — see below
[Requires / Produces / Writes / Never / Escalates / Degrades / Profile keys]

## Instructions
### Step 1: [First major step]
Clear explanation of what happens.

## Examples
Example 1: [common scenario]
User says: "…"
Actions: 1. … 2. …
Result: …

## Troubleshooting
Error: [common message]
Cause: [why it happens]
Solution: [how it's fixed]
```

### The `## Contract` block (pipeline skills only)

Skip this section entirely if PHASE 2 Step 4 said **standalone**.

It goes **immediately after the Overview** (or after the profile block, if the skill
reads one), **before the first step**. It's an index, not a copy: when the detail
already lives in a step, reference the step instead of repeating it — duplicating it
reintroduces the saturation the block exists to prevent.

```markdown
## Contract

**Requires** — table of preconditions, each with its action on failure.
             ALL are verified before any work.
**Produces** — what the next skill will find, in verifiable terms.
**Writes**   — closed list of writable paths, and what is explicitly out.
**Never**    — forbidden verbs, no matter what.
**Escalates**— when it stops and asks.
**Degrades** — what it does when a tool it depends on is unavailable.
**Profile keys** — the config keys this skill reads, grouped by what for.
```

Write only the rows that apply. One optional row: **Reverting**, when the skill
overwrites live artifacts — name the real way back (`git restore`, a backup copy),
never promise one that doesn't exist.

Two rules that decide whether the block works:

- **`Produces` is written for whoever comes next, in countable terms.** "Documents
  the module" isn't a contract; "one line per AC, zero lines marked `✗`" is. A gate
  the model grades itself on is not a gate.
- **`Requires` is checked before any work**, not when each step happens to need it.
  A precondition that fails halfway leaves the workspace half-written.

### Profile keys inline, never a lookup table

If the skill reads a profile or config file, **do not add a
`| In this document | Key in profile.md |` translation table.** Two better pieces
replace it: the `Profile keys` row of the `Contract` (what the skill reads) and the
key written inline in the body, with the example in parentheses.

```diff
- 1. Run the full test suite: cd <microservice> && npx jest --no-coverage
+ 1. Run `FULL_TEST_CMD` for each affected <component> (e.g. `npx jest --no-coverage`)
```

The concrete example survives where it aids understanding, but it stops being the
subject of the sentence.

**Why not a table.** It's a map someone has to remember to consult, and that isn't a
guardrail. Real evidence: a skill carried `| develop | BASE_BRANCH |` in its table
and, three hundred lines below, still checked `branch ∉ {main, master}` — letting
through exactly the project whose base branch is `develop`. The one skill that got it
right wrote `` `BASE_BRANCH` (`develop`) `` inline and depended on no table at all.

When rewriting a literal, classify it: **normative** (the action depends on the value
→ replace it with the key) or **illustrative** (it clarifies a sentence → keep it, in
parentheses or in `## Example`). This is sentence-by-sentence reading; there's no
mechanical pass.

### Writing rules

| Rule | Good | Bad |
|---|---|---|
| **Specific and actionable** | ``Run `python scripts/validate.py --input {filename}` to check the format`` | "Validate the data before continuing" |
| **Unambiguous** | "CRITICAL: before calling `create_project`, verify: name not empty, at least one member assigned, start date not in the past" | "Make sure to validate things properly" |
| **Concise** | Bullets and numbered lists; the detail goes to `references/` | Long paragraphs Claude won't follow |
| **Critical instructions up top** | The rule that governs the run stated near the start — in the `Contract` if there is one | The key rule buried in the middle |
| **`CRITICAL` reserved** | One heading, for something irreversible the `Contract` doesn't already cover | A `## CRITICAL` per section. When everything is critical, nothing is |

### Always include

1. **Error handling** — a common-issues section with cause and solution.
2. **Examples** — at least one end-to-end scenario with what the user says, the
   actions and the result.
3. **Explicit links to the references** — the file existing isn't enough:

```markdown
Before writing queries, consult `references/api-patterns.md` for:
- Rate limiting guidance
- Pagination patterns
- Error codes and handling
```

4. **Structural headings, if the skill is pipeline** — a heading another skill reads
   to find its input (`## AC Coverage`, `## Design Decisions`, `Task N`) is part of
   the contract. Keep them in English whatever language the chat runs in, and
   register them in the project's pipeline catalog. Translating one breaks the
   reader silently: the section is there, and the next skill reports it missing.

> **Advanced technique:** for critical validations, it's better to ship a script
> that does them programmatically than to rely on natural-language instructions.
> Code is deterministic; language interpretation isn't.

---

## PHASE 6: Success criteria and tests

Define with the user how they'll know the skill works. These are aspirational
targets, not exact thresholds.

| Type | Metric | How it's measured |
|---|---|---|
| Quantitative | Triggers on 90% of relevant queries | Run 10–20 test queries; count how often it loads on its own vs. needs explicit invocation |
| Quantitative | Completes the workflow in X tool calls | Compare the same task with and without the skill; count calls and tokens |
| Quantitative | 0 failed calls per workflow | Monitor the MCP logs during the runs |
| Qualitative | The user doesn't need to prompt the next steps | Note how often you have to redirect or clarify |
| Qualitative | The workflow finishes without user correction | Run the same request 3–5 times and compare consistency |

Generate the trigger battery (the user runs it afterwards):

```
Should trigger:
- "<literal phrase from use case 1>"
- "<paraphrase of use case 1>"
- "<literal phrase from use case 2>"

Should NOT trigger:
- "<query from a neighboring domain>"
- "<generic unrelated query>"
```

---

## PHASE 7: Validation and close

Run the checklist before delivering:

- [ ] Folder in kebab-case
- [ ] `SKILL.md` exists with that exact name (case-sensitive)
- [ ] Frontmatter with `---` delimiters
- [ ] `name` in kebab-case, matches the folder, without "claude"/"anthropic"
- [ ] `description` with WHAT and WHEN, under 1024 characters
- [ ] No XML tags in the frontmatter (the YAML `>` block scalar doesn't count)
- [ ] No `README.md` inside the folder
- [ ] Clear, actionable instructions
- [ ] Error handling included
- [ ] Examples included
- [ ] References linked explicitly from `SKILL.md`
- [ ] `SKILL.md` under 5,000 words

If PHASE 2 Step 4 said **pipeline**, seven more. They map one-to-one onto
`/skill-evaluator`'s group C, so a skill that passes here passes its review:

- [ ] **C1** — `## Contract` after the Overview, with the rows that apply
      (+ `Reverting` if it overwrites live artifacts)
- [ ] **C2** — every key in `Profile keys` exists in the project's profile
      template, and every key the skill reads is declared
- [ ] **C3** — no `| In this document | Key in profile.md |` table; keys inline
- [ ] **C4** — no path, branch or command the project configures left hardcoded
      in a step
- [ ] **C5** — no `## CRITICAL` heading the `Contract` already covers
- [ ] **C6** — handoff verified in both directions: the previous skill's
      `Produces` covers this one's `Requires`, and this one's `Produces` covers
      the next one's `Requires`, stated in countable terms
- [ ] **C7** — the project's validation script passes, if it has one

### Handoff

Show a summary:
- Folder path and files created.
- The 2–3 use cases it covers.
- The trigger test battery for the user to run.

Say:
> "Skill created at `<path>`. Run the trigger queries to verify it loads when it
> should. For a full review with a score and over/under-triggering risks, use
> `/skill-evaluator <path>`."

Stop — don't run the new skill or start using it.

---

## Output language

**The `SKILL.md` is written in English** — body, headings, tables and examples.
Technical identifiers, frontmatter field names, paths and code are English too.

**The `description`'s triggers go in the language the user actually speaks.** If the
user asks for things in English, the triggers are English; if they mix languages,
include both variants — a trigger that never matches what the user types is dead
weight.

**Chat interaction (the interview) follows the user's language.**

---

## Common Issues

| Issue | Cause | Resolution |
|---|---|---|
| The user doesn't know which use cases to give | The idea is still fuzzy | Don't move on: ask them to describe the last time they did the task by hand, step by step |
| The skill wants to do too much | Several unrelated workflows mixed together | Split into two skills; each with its own `description` and cross negative triggers |
| Generic `description` ("helps with X") | PHASE 1 was skipped | Go back to the use cases and extract the user's literal phrases |
| Enormous `SKILL.md` | Everything inline instead of progressive disclosure | Move the detail into `references/` and link it |
| Clashes with an existing skill | Overlapping scopes | Add negative triggers to both (`Do NOT use to…`) |
| Invalid name | Spaces, uppercase or underscores | Convert to kebab-case: `My Cool Skill` → `my-cool-skill` |
| Empty `Contract` rows on a standalone skill | The template got filled in without running PHASE 2 Step 4 | Delete the block. No handoff, no contract — invented rows train the reader to skim it |
| `Produces` that nobody can check ("leaves the module documented") | Written for the author, not for the next skill | Restate as a count or a file that either exists or doesn't |
| The skill hardcodes a path or branch the project configures | The literal was never classified as normative | Replace with the key inline, example in parentheses; add it to `Profile keys` |

---

## Example

**Input:** "I want a skill that builds my weekly incident report"

**Flow:**
1. PHASE 1: interview → 2 use cases. Literal phrases: "build the weekly report",
   "this week's incident report". Tools: monitoring MCP + a validation script.
2. PHASE 2: category 3 (MCP enhancement), problem-first framing, pattern 3
   (iterative refinement — the report improves with validation and regeneration).
   Step 4: **pipeline** — it writes into the shared reports workspace and reads the
   project's config for the output path.
3. PHASE 3: `name: incident-weekly-report`; `description` with what + when +
   the literal phrases + `Do NOT use for ad-hoc incident queries`.
4. PHASE 4: `SKILL.md` + `scripts/check_report.py` + `references/severity-rules.md`.
5. PHASE 5: `## Contract` after the Overview — `Requires` (the week's incidents
   exported), `Produces` (one file per severity, zero incidents unclassified),
   `Writes` (the reports path only), `Never` (never edits the incident source),
   `Profile keys` (`REPORTS_DIR`, `OUTPUT_LANGUAGE`). Then the instructions: initial
   draft → quality check → refinement loop → finalization, plus troubleshooting for
   MCP connection errors.
6. PHASE 6: trigger battery (3 positive, 2 negative) + a token baseline.
7. PHASE 7: checklist OK → handoff.

**Output:**
> "Skill created at `incident-weekly-report/`. Run the trigger queries to verify it
> loads when it should. For a full review, use
> `/skill-evaluator incident-weekly-report/`."
