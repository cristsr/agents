# Skill evaluation rubric

The full rubric with severities. The IDs are used in `skill-evaluator`'s report.

---

## Severity scale

| Severity | Meaning | Criterion |
|---|---|---|
| **BLOCKING** | The skill won't install, won't load, or is malformed | Violates a hard rule of the guidance |
| **IMPORTANT** | The skill works but triggers wrongly or isn't followed | Changes real behavior |
| **MINOR** | Polish, maintainability, consistency | Doesn't change behavior |

Prioritization rule: **first what prevents loading, then what prevents triggering,
then what breaks the chain, wording last.** A skill with brilliant instructions and a
vague `description` never runs; the reverse at least works when invoked by hand.

Groups B and D apply to every skill. **Group C applies only to pipeline skills** —
see its own preamble; forcing it on a standalone skill manufactures findings.

---

## Group B — Hard rules (BLOCKING)

| ID | Rule | Typical failure | Fix |
|---|---|---|---|
| B1 | File named exactly `SKILL.md` | `SKILL.MD`, `skill.md`, `Skill.md` | Rename. Verify with `ls -la` |
| B2 | Frontmatter with opening and closing `---` | Delimiters missing | Add them |
| B3 | Valid YAML | Unclosed quote, broken indentation | Fix the YAML |
| B4 | `name` in kebab-case | `My Cool Skill`, `my_cool_skill`, `MyCoolSkill` | `my-cool-skill` |
| B5 | `name` matches the folder | Folder `report-builder`, `name: reports` | Align both |
| B6 | `name` without "claude"/"anthropic" | `claude-helper` | Rename — they're reserved |
| B7 | `description` present | Field absent | Write it (group D) |
| B8 | `description` < 1024 characters | Enormous description | Trim to the what+when core |
| B9 | No XML angle brackets in the frontmatter | An example with XML tags in the description | Remove them — the frontmatter goes into the system prompt and is injection surface. **Not a violation:** the YAML block-scalar indicator (`description: >` / `description: \|`), which is syntax, not markup. Flagging it marks every well-formed skill as broken |
| B10 | No `README.md` in the skill's folder | A README dragged in from the repo | Delete it or move it out. Docs go in `SKILL.md` or `references/`. A repo-level README (outside the folder) is fine for humans |

---

## Group D — Description (IMPORTANT)

| ID | Check | Typical failure | Fix |
|---|---|---|---|
| D1 | Says **what it does** | Only usage conditions | Add the concrete capability |
| D2 | Says **when to use it** with user phrases | No triggers | Add literal phrases the user would say |
| D3 | The phrases are what the user **actually** types | Internal jargon | Replace with user language |
| D4 | Mentions relevant file types | Handles `.csv` and never says so | Name them |
| D5 | Negative triggers if there are neighboring skills | Overlapping scope | `Do NOT use to… (use the X skill instead)` |
| D6 | Isn't generic | "Helps with projects" | Rewrite with the what + when + capabilities formula |

### Formula

`[what it does] + [when to use it] + [key capabilities]`

### Contrast

```yaml
# Good — specific and actionable
description: Analyzes Figma design files and generates handoff documentation.
  Use when the user uploads .fig files, asks for "design specs",
  "component documentation", or "design-to-code handoff".

# Bad — vague
description: Helps with projects.

# Bad — no triggers
description: Creates sophisticated multi-page documentation systems.

# Bad — technical, no user language
description: Implements the Project entity model with hierarchical relationships.
```

---

## Trigger diagnosis

### Under-triggering

**Signals:**
- The skill doesn't load when it should.
- The user enables it manually.
- Support questions about when to use it.

**Fix:** add detail and nuance to the `description` — above all keywords, in
particular technical terms.

### Over-triggering

**Signals:**
- The skill loads on irrelevant queries.
- The user disables it.
- Confusion about its purpose.

**Fixes, in order:**

1. Add negative triggers:
```yaml
description: Advanced data analysis for CSV files. Use for statistical
  modeling, regression, clustering. Do NOT use for simple data exploration
  (use the data-viz skill instead).
```

2. Be more specific:
```yaml
# Too broad
description: Processes documents.
# More specific
description: Processes legal PDF documents for contract review.
```

3. Clarify the scope:
```yaml
description: PayFlow payment processing for e-commerce. Use specifically for
  online payment workflows, not for general financial queries.
```

### Debug technique

Ask Claude: "When would you use the `<name>` skill?". It will quote the
`description` back. Adjust based on what's missing from that answer.

---

## Group E — Structure (IMPORTANT / MINOR)

| ID | Check | Severity | Fix |
|---|---|---|---|
| E1 | Folder in kebab-case | IMPORTANT | Rename |
| E2 | `SKILL.md` < 5,000 words | IMPORTANT | Move detail to `references/` and link it |
| E3 | `references/` linked from `SKILL.md` | IMPORTANT | Add the explicit link — without one, it never loads |
| E4 | No empty folders | MINOR | Delete the contentless scaffolding |
| E5 | Heavy detail in `references/`, not inline | MINOR | Apply progressive disclosure |
| E6 | The referenced `scripts/` exist | IMPORTANT | Fix the paths or add the script |

### Expected structure

```
<skill-name>/
├── SKILL.md          # Required
├── scripts/          # Optional — executable code
├── references/       # Optional — docs loaded on demand
└── assets/           # Optional — templates, fonts, icons
```

### The three levels

| Level | What | When it loads |
|---|---|---|
| 1 | Frontmatter | Always, in the system prompt |
| 2 | `SKILL.md`'s body | When Claude believes it's relevant |
| 3 | Linked files | Only when Claude navigates them |

### Large-context symptom

If the skill feels slow or the responses degrade:
- Skill content too large → move it to `references/`.
- Too many skills enabled at once → check whether more than 20–50 are active;
  recommend selective enabling or "packs" of related skills.
- Everything loaded instead of progressive disclosure → link instead of inlining.

---

## Group C — Contract and handoff (IMPORTANT / MINOR)

**Applies only to pipeline skills** — those that consume or produce artifacts another
skill handles, write into a shared workspace, or read a project profile. On a
standalone skill this whole group is inapplicable, and reporting it produces findings
demanding a contract that shouldn't exist.

Symptom: every skill reads fine on its own and the chain still breaks. A contract
defect is only visible at the junction.

| ID | Check | Severity | Typical failure | Fix |
|---|---|---|---|---|
| C1 | `## Contract` after the Overview, with the rows that apply | IMPORTANT | Preconditions scattered across several `CRITICAL` sections | Consolidate into one block, as an index — reference the step where the detail already lives instead of copying it |
| C2 | `Profile keys` complete and every key real | IMPORTANT | Declares a key the profile template doesn't define, or reads one it never declares | Contrast against the profile template. If a hand-maintained catalog disagrees, report it — don't fix it from here |
| C3 | No `\| In this document \| Key in profile.yaml \|` table | MINOR | The translation table survives alongside the `Contract` | Delete it. `Profile keys` plus the key inline replaces it |
| C4 | Normative literals replaced by their key | IMPORTANT | `git checkout develop` hardcoded while the profile declares `BASE_BRANCH` | Key inline, example in parentheses: `` `BASE_BRANCH` (`develop`) `` |
| C5 | No `## CRITICAL` the `Contract` already covers | MINOR | `## CRITICAL: Output Language`, `## CRITICAL: read the profile first` | Demote to a plain heading. Reserve `CRITICAL` for the irreversible |
| C6 | The junction holds in both directions | IMPORTANT | A `Requires` row nobody produces; a `Produces` nobody consumes | Name both skills. The fix usually belongs to the neighbor |
| C7 | The ecosystem's validator passes | IMPORTANT | A `references/` path that doesn't exist; a key that isn't in the template | Run the project's validation script and fix what it reports |

### The rows of the block

| Row | What goes in it | Optional |
|---|---|---|
| `Requires` | Precondition · how it's checked · what happens if it fails. All verified before any work | No |
| `Produces` | What the next skill will find, in countable terms | No |
| `Writes` | Closed list of writable paths, plus what's explicitly out | No |
| `Never` | Forbidden verbs, whatever a step appears to need | No |
| `Escalates` | The closed list of reasons to stop and ask | If it never stops |
| `Degrades` | Alternate route when a declared tool is unavailable, and the mark it leaves | If nothing is optional |
| `Profile keys` | The config keys it reads, grouped by what for | If it reads no profile |
| `Reverting` | The real way back, and its validity window | Only if it overwrites live artifacts |

### C4 — classifying a literal

Read sentence by sentence; there's no mechanical pass.

| Kind | Test | What to do |
|---|---|---|
| **Normative** | The action changes if the value changes | Replace with the key |
| **Illustrative** | It only clarifies the sentence | Keep it, in parentheses or in `## Example` |

The failure the check exists for: a skill carried `| develop | BASE_BRANCH |` in its
translation table and, hundreds of lines below, still verified
`branch ∉ {main, master}` — passing through exactly the project the table covered.
The table was correct and useless; the check was the contract.

### C6 — reading a junction

```
previous.Produces  ⊇  this.Requires      ← this skill can actually start
this.Produces      ⊇  next.Requires      ← the next one can actually start
```

Two rules:

- **A `Produces` written as an adjective fails the check.** "Leaves the module
  documented" can't be verified by the next skill; "one line per AC, zero lines
  marked `✗`" can. A gate the model grades itself on is not a gate.
- **Evaluating several skills at once, re-check the junctions at the end**, with both
  sides in their final version. A neighbor rewritten mid-evaluation produces findings
  that were already fixed.

---

## Group I — Instructions (IMPORTANT / MINOR)

Symptom: the skill loads but Claude doesn't follow the instructions.

| ID | Cause | Severity | Fix |
|---|---|---|---|
| I1 | Instructions too verbose | IMPORTANT | Bullets and numbered lists; detail into separate files |
| I2 | Critical instructions buried | IMPORTANT | Put them up top — in the `Contract` if the skill has one. A `## CRITICAL` heading only for something irreversible it doesn't already cover (see C5) |
| I3 | Ambiguous language | IMPORTANT | Verifiable criteria |
| I4 | No error handling | IMPORTANT | Add a common-issues section |
| I5 | No examples | MINOR | Add user says / actions / result |
| I6 | Not actionable | IMPORTANT | Literal, copy-pasteable commands |

### Ambiguity contrast

```
# Bad
Make sure to validate things properly

# Good
CRITICAL: Before calling create_project, verify:
- Project name is non-empty
- At least one team member assigned
- Start date is not in the past
```

### Actionability contrast

```
# Bad
Validate the data before proceeding.

# Good
Run `python scripts/validate.py --input {filename}` to check data format.
If validation fails, common issues include:
- Missing required fields (add them to the CSV)
- Invalid date formats (use YYYY-MM-DD)
```

### Opportunity: script-based validation

If a critical validation depends on the model interpreting text, flag it as an
improvement opportunity: bundle a script that does it programmatically. Code is
deterministic; language interpretation isn't.

### Note on model "laziness"

If the skill has a block like:
```
## Performance Notes
- Take your time to do this thoroughly
- Quality is more important than speed
- Do not skip validation steps
```
It isn't an error, but it's worth noting that **it's more effective in the user's
prompt than inside `SKILL.md`**.

---

## Success criteria (for recommending measurement)

These are aspirational targets — rough benchmarks, not precise thresholds. There's a
judgment component to each criterion.

### Quantitative

| Metric | How it's measured |
|---|---|
| Triggers on 90% of relevant queries | Run 10–20 test queries; count automatic loads vs. explicit invocation |
| Completes the workflow in X calls | Compare the same task with and without the skill; count calls and tokens |
| 0 failed calls per workflow | Monitor the MCP logs; track retries and error codes |

### Qualitative

| Metric | How it's assessed |
|---|---|
| The user doesn't need to prompt next steps | Note how often you have to redirect or clarify |
| The workflow completes without correction | Run the same request 3–5 times; compare structural and quality consistency |
| Consistent results across sessions | Does a new user complete the task on the first try with minimal guidance? |

### Baseline comparison

```
Without the skill:
- The user gives instructions every time
- 15 back-and-forth messages
- 3 failed calls with retries
- 12,000 tokens consumed

With the skill:
- Automatic workflow execution
- 2 clarifying questions only
- 0 failed calls
- 6,000 tokens consumed
```

---

## Quick checklist

### During development
- [ ] Folder in kebab-case
- [ ] `SKILL.md` exists (exact spelling)
- [ ] Frontmatter with `---` delimiters
- [ ] `name`: kebab-case, no spaces, no uppercase
- [ ] `description` includes WHAT and WHEN
- [ ] No XML tags in the frontmatter (the YAML `>` block scalar doesn't count)
- [ ] Clear, actionable instructions
- [ ] Error handling included
- [ ] Examples provided
- [ ] References clearly linked

### Pipeline skills only
- [ ] `## Contract` after the Overview, with the rows that apply
- [ ] `Produces` in countable terms, not adjectives
- [ ] No `| In this document | Key in profile.yaml |` table
- [ ] Every key in `Profile keys` exists in the profile template
- [ ] No `## CRITICAL` the `Contract` already covers
- [ ] Junction verified in both directions with the neighboring skills
- [ ] The project's validation script passes

### Before shipping
- [ ] Triggering tested on obvious tasks
- [ ] Triggering tested with paraphrased requests
- [ ] Verified it does NOT trigger on unrelated topics
- [ ] Functional tests pass
- [ ] Tool integration works (if applicable)

### After shipping
- [ ] Test in real conversations
- [ ] Monitor under/over-triggering
- [ ] Collect feedback
- [ ] Iterate on description and instructions
- [ ] Update the version in `metadata`
