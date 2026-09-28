---
name: skill-evaluator
description: >
  Reviews an existing skill against Anthropic's skill authoring best practices
  and reports findings by severity, a single-responsibility verdict, a trigger
  test battery and the concrete fixes. Checks the frontmatter's hard rules, the
  description and its mutual exclusivity with sibling skills, the 500-line body
  and one-level references, the instructions' conciseness and degree of
  freedom, the evals and their baseline, and the handoff contract.
  Use when the user says "/skill-evaluator", "review this skill",
  "evaluate a skill", "why doesn't my skill trigger", "the skill over-triggers",
  "should this skill be split", "audit a SKILL.md", "improve this skill",
  "review my skills", or points at a skill folder and asks for feedback.
  Do NOT use to create a skill or build the pieces of a decided split (use
  /skill-creator), to review application code (use /code-review), or to run
  eval suites — it diagnoses and proposes tests, it doesn't execute them.
---

# skill-evaluator

## Overview

Reviews one or more skills against Anthropic's skill authoring best practices and
returns an actionable diagnosis: what's broken (blocking), what stops it from
triggering, whether it holds a single responsibility, and which concrete fixes to
apply.

This skill is **agnostic** — it evaluates skills from any project or domain.

**Announce at start:** "I'll evaluate the skill against the guidance. Starting by reading the folder."

**Output:** a report in the chat with prioritized findings, a single-responsibility
verdict, a trigger test battery, and — only if the user approves — the edits
applied.

**Core principle:** most skills fail because of the `description`, not the
instructions. Prioritize findings by what actually changes behavior: first what
prevents the skill from loading, then what makes it trigger wrongly or collide with
a sibling, then what breaks the chain, and finally wording polish.

**CRITICAL: this skill diagnoses; it doesn't rewrite without permission.** Show the
report first and ask for confirmation before editing files.

### Progress checklist

Copy it into the conversation and tick it as you go:

```
- [ ] PHASE 1 — locate, inventory, read, classify, load sibling descriptions
- [ ] PHASE 2 — hard rules (B)
- [ ] PHASE 3 — description and boundary (D)
- [ ] PHASE 4 — structure (E)
- [ ] PHASE 5 — instructions (I)
- [ ] PHASE 6 — contract (C), pipeline only
- [ ] PHASE 7 — evals (V) and trigger battery
- [ ] PHASE 8 — report and handoff
```

---

## PHASE 1: Locate and load the skill

### Step 1 — Resolve the target

Order of preference:
1. The user passed an explicit path (folder or `SKILL.md`) → use it.
2. The user named a skill (e.g. "review `commit`") → find it (`-L` follows the
   symlinks installed skills usually are):

```bash
find -L ~/.claude/skills ~/.agents/skills .claude/skills -maxdepth 2 -iname "SKILL.md" 2>/dev/null
```

3. The user said "review my skills" without specifying → list the ones found and
   ask with `AskUserQuestion` (`header: "Skill"`) which to evaluate. If there are
   few and they explicitly ask, evaluate them all and report per skill.

### Step 2 — Inventory the folder

```bash
SKILL_DIR=<resolved path>
find "$SKILL_DIR" -type f | sort
wc -l "$SKILL_DIR/SKILL.md" "$SKILL_DIR"/references/*.md 2>/dev/null
```

Record: the main file's exact name, which subfolders exist (`evals/` included),
whether a `README.md` is present, and the line count of `SKILL.md` and of each
reference.

### Step 3 — Read

Read `SKILL.md` in full, and `evals/evals.json` if it exists. Read the `references/`
files **only if** `SKILL.md` links them — if it doesn't, that's already a finding
(E3).

### Step 4 — Classify: pipeline or standalone

Decides whether **PHASE 6** applies. A skill is **pipeline** if a **named** skill
produces its input or consumes its output, if it writes into a workspace shared with
other skills, or if it reads a project profile for paths, branches or commands.
Otherwise it's **standalone** — including a skill that operates on whatever file the
user points it at: arbitrary input is not a handoff.

Say which one in the report's header. Getting it wrong costs in both directions:
group C on a standalone skill demands a contract that shouldn't exist; skipping it
on a pipeline skill drops the highest-impact checks there are.

### Step 5 — Load the sibling descriptions

D9 needs them. Collect every other installed skill's frontmatter:

```bash
for f in $(find -L ~/.claude/skills ~/.agents/skills .claude/skills -maxdepth 2 -name SKILL.md 2>/dev/null); do
  echo "== $f"; awk '/^---$/{n++; next} n==1' "$f" | sed -n '/^description:/,/^[a-z-]*:/p'
done
```

---

## PHASE 2: Hard rules (blocking)

Consult `references/rubric.md` for the full rubric with severities.

Binary: either they hold or the skill is broken. Any failure here is **BLOCKING**
and goes first in the report.

| ID | Rule | How it's verified |
|---|---|---|
| B1 | The file is named exactly `SKILL.md` (case-sensitive) | `ls` — not `SKILL.MD`, not `skill.md` |
| B2 | Frontmatter with opening and closing `---` delimiters | Read the first lines |
| B3 | Valid YAML (closed quotes, consistent indentation) | Look for unclosed quotes and broken indentation |
| B4 | `name` present and in kebab-case | Lowercase letters, numbers and hyphens only |
| B5 | `name` matches the folder name | Compare |
| B6 | `name` doesn't contain "claude" or "anthropic" | Reserved |
| B7 | `description` present | — |
| B8 | `description` under 1024 characters | Count |
| B9 | No XML angle brackets in the frontmatter | **The YAML block-scalar indicators `>` and `\|` on `description:` are not a violation.** What's forbidden is a tag: `<tag>`, `</tag>`, `<placeholder>` |
| B10 | No `README.md` inside the skill's folder | `ls` |

To count the `description`'s characters without eyeballing it:

```bash
python -c "import sys,re,io; t=io.open(sys.argv[1],encoding='utf-8').read(); m=re.search(r'^---\n(.*?)\n---', t, re.S); d=re.search(r'^description:\s*(.*?)(?=^\w+:|\Z)', m.group(1), re.S|re.M); print(len(' '.join(d.group(1).split())))" "$SKILL_DIR/SKILL.md"
```

---

## PHASE 3: Description and boundary

The highest-impact analysis. The `description` is the only thing always loaded — it
decides triggering, and it's the skill's public interface.

### Checks

| ID | Check | Fails if… |
|---|---|---|
| D1 | It says **what the skill does** | It only says when, or it's just a domain name |
| D2 | It says **when to use it** with real user phrases | No trigger phrases, just a technical description |
| D3 | The phrases are ones a user **would actually say** | Internal jargon the user would never type |
| D4 | It mentions file types if they're relevant | It handles `.csv`/`.fig`/`.pdf` and never names them |
| D5 | Negative triggers for every neighboring skill | Overlapping scope with no `Do NOT use…` |
| D6 | It isn't generic | "Helps with projects", "Processes documents" |
| D7 | Written in **third person** | "I can help…", "You can use this to…" |
| D8 | **Single responsibility** | It can't be stated in one or two sentences without "and also…" |
| D9 | **Mutually exclusive** with every sibling | A request exists that this and another skill's description would both claim |
| D10 | `name` is specific | `helper`, `utils`, `tools` (IMPORTANT). Not a gerund outside a family convention (MINOR) |

### D8 — the single-responsibility verdict

Write the skill's purpose in one or two sentences. Other signals it holds more than
one responsibility:

- its triggers serve unrelated user intents;
- the body has modes that share no steps;
- its references split into groups no single step reads together;
- it produces different outputs for different consumers.

When D8 fails, the report proposes the split: each piece named, its one-sentence
purpose, and the triggers it takes. **A piece earns its own skill only if the user
would ask for it on its own**; a piece with no trigger of its own becomes a
reference or a script inside the skill that uses it — every extra skill adds a
permanent description and one more collision risk.

### D9 — reading a collision

For each trigger phrase, check the sibling descriptions loaded in PHASE 1 Step 5:
would another one also claim it? A collision names both skills and proposes the
owner. Cross negative triggers mark a decided boundary; when both sides need many of
them, the boundary itself is wrong — say so.

### Trigger diagnosis

| Risk | Signals | Fix |
|---|---|---|
| **Under-triggering** | Generic description; no trigger phrases; the user invokes it by hand | Add detail — keywords and technical terms the user uses |
| **Over-triggering** | Too broad; loads on unrelated queries; collides with a sibling | Negative triggers, narrower scope, or a redrawn boundary |
| **OK** | Concrete phrases, bounded scope, exclusive with its siblings | — |

> **Debug technique (recommend it):** ask Claude in a clean session "When would you
> use the `<name>` skill?". Whatever's missing from the answer is missing from the
> description.

---

## PHASE 4: Structure and progressive disclosure

| ID | Check | Threshold |
|---|---|---|
| E1 | Folder in kebab-case | Lowercase letters, numbers and hyphens |
| E2 | `SKILL.md` body under ~500 lines | Over it → move detail to `references/` |
| E3 | Every `references/` file is linked from `SKILL.md` | A file nobody links never loads |
| E4 | No empty folders | Scaffolding with no content is noise |
| E5 | Heavy detail lives in `references/`, not inline | Progressive disclosure level 3 |
| E6 | The referenced `scripts/` exist and the command is correct | Verify the paths |
| E7 | References one level deep | A reference that sends the reader to another reference for needed content |
| E8 | TOC on references over ~100 lines | A long reference with no contents list at the top |
| E9 | Forward slashes in every path | `references\guide.md`, `C:\…` |
| E10 | Scripts are robust and their role is stated | A script that punts errors to Claude, an unexplained magic constant, or `SKILL.md` not saying whether to **run** it or **read** it |

The three levels: frontmatter (always) → `SKILL.md`'s body (on activation) → linked
files (on demand; a script's code never enters the context, only its output).

---

## PHASE 5: Instruction quality

The symptom: *the skill loads but Claude doesn't follow it, or follows it at a high
token cost.*

| ID | Common cause | Check | Fix |
|---|---|---|---|
| I1 | Too verbose | Long paragraphs where a list belongs? | Bullets and numbered lists; detail into `references/` |
| I2 | Buried instructions | Is the governing rule near the start? | Move it up — into the `Contract` if there is one |
| I3 | Ambiguous language | "Validate properly" instead of what to validate? | Verifiable criteria |
| I4 | No error handling | A common-issues section with cause and resolution? | Add it |
| I5 | No examples | At least one end-to-end scenario? | Add user says / actions / result |
| I6 | Not actionable | Literal, copy-pasteable commands? | ``Run `python scripts/validate.py --input {file}` `` |
| I7 | Explains what Claude knows | General concepts (what a PDF, an endpoint, a branch is)? | Cut it; keep conventions, domain rules, team decisions |
| I8 | Freedom mismatched to fragility | Loose prose on a fragile operation, or rigid steps on a judgment task? | Low freedom (exact steps, a script) for fragile; high (criteria) for judgment |
| I9 | Inconsistent terminology | Several terms for one concept? | One term per concept |
| I10 | Time-sensitive information | "Currently", "as of 2025", "the new API" in the main flow? | Remove it or isolate it in a `## Legacy` section |
| I11 | Multi-step with no checklist | A long workflow Claude can lose its place in? | A copyable checklist to tick as it goes |
| I12 | No feedback loop | Quality-critical output with no run → validate → fix → repeat? | Add the loop, ideally around a validation script |

**Advanced signal:** a critical validation that depends on the model interpreting
text is an opportunity — recommend a script. Code is deterministic; language
interpretation isn't.

---

## PHASE 6: Contract and handoff (pipeline skills only)

Skip this phase if PHASE 1 Step 4 said **standalone**, and say so in one line.
`references/rubric.md` carries group C in full.

The symptom: *each skill reads fine on its own and the chain still breaks.* A
contract defect is only visible at the junction.

| ID | Check | Fails if… |
|---|---|---|
| C1 | A `## Contract` block after the Overview, with the rows that apply | Absent, or scattered across several `CRITICAL` sections |
| C2 | Every key in `Profile keys` exists in the profile template, and every key read is declared | A key is invented, missing, or catalog and skill disagree |
| C3 | No `\| In this document \| Key in profile.yaml \|` translation table | The table is still there |
| C4 | Normative literals replaced by their key | A configured path, branch or command is hardcoded in a step |
| C5 | No `## CRITICAL` heading the `Contract` already covers | `CRITICAL` used for language conventions or ordinary preconditions |
| C6 | The handoff holds in both directions | It requires something nobody produces, or produces something nobody consumes |
| C7 | The ecosystem's validator passes, if the project has one | It reports issues on this skill |

**C2** — read the profile template, not a hand-maintained catalog. Where they
disagree, the catalog is the suspect: report it, don't fix it from here.

**C6** — open the neighbor and read its `Contract`, both directions:

```
previous.Produces  ⊇  this.Requires      ← this skill can actually start
this.Produces      ⊇  next.Requires      ← the next one can actually start
```

A `Requires` with no producer is a finding against **whoever should produce it**.
Name both skills.

---

## PHASE 7: Evals and trigger battery

The guidance's central point: evals come **before** the documentation, and the
instructions exist to fix failures observed without the skill.

| ID | Check | Fails if… |
|---|---|---|
| V1 | `evals/evals.json` exists with ≥3 behavior evals and a trigger battery | Missing, or only happy-path queries |
| V2 | `baseline` records failures observed without the skill | Empty or absent — nothing shows the skill's content is needed |
| V3 | `should_not` includes a query owned by each neighboring skill | The battery can't detect a D9 collision |
| V4 | `models` lists the target models and `runs` covers each | Tested on one model only, or never run |

Then produce the battery for the report:

- **With `evals.json`:** take its `triggers`, and add what V3 found missing.
- **Without it:** derive the queries from the `description` and the examples — don't
  invent them from nothing — and offer to persist them as `evals/evals.json` in the
  format `/skill-creator` uses.

```
Should trigger:
- "<literal phrase from the description>"
- "<natural paraphrase of that phrase>"
- "<use case described in the skill's examples>"

Should NOT trigger:
- "<query a named sibling owns>"  (owner: <sibling>)
- "<generic unrelated query>"
```

Target: triggers on ~90% of relevant queries and on none owned by a sibling.

---

## PHASE 8: Report and close

### Report format

```markdown
## Evaluation: <skill-name>

**Verdict:** <Ready to use | Needs adjustments | Broken>
**Kind:** <Pipeline | Standalone>   ← standalone means group C doesn't apply
**Single responsibility:** <Yes | No — split into `a` (…), `b` (…)>
**Trigger risk:** <Under-triggering | Over-triggering | OK>
**Collides with:** <none | sibling skills and the shared triggers>

### Blocking (N)
| ID | Finding | Fix |
|---|---|---|

### Important (N)
| ID | Finding | Fix |
|---|---|---|

### Minor (N)
| ID | Finding | Fix |
|---|---|---|

### Suggested trigger tests
Should trigger: …
Should NOT trigger: …

### What I'd do first
1. <the highest-impact fix>
2. …
```

Report rules:
- **Order by severity**, not by order of appearance in the file.
- Every finding carries the concrete fix, not just the diagnosis.
- If a category has no findings, say so in one line — don't pad.
- Don't report as a problem what the guidance leaves to the author's judgment.
- **C6 and D9 findings name both skills.** The fix often belongs to the neighbor.
- **Findings against a skill you weren't asked to evaluate are reported, not
  fixed.** Editing a neighbor from here leaves a change with no record of why.
- **A split is proposed, not executed.** Building the pieces is `/skill-creator`'s
  job, with the boundary this report drew.

### Handoff

Ask with `AskUserQuestion` (`header: "Fixes"`):
- `"Apply the blocking and important ones"` / `"Apply everything"` /
  `"Report only, don't touch anything"`.

If the user approves, apply the edits and show what changed. If not, stop.

Say:
> "Evaluation ready. Run the trigger queries in a clean session to verify the real
> behavior — the report predicts triggering, it doesn't measure it."

---

## Output language

**The skills reviewed and any edit applied are written in English.** Finding IDs
(B1, D8, E7, I8, C6, V2), frontmatter field names, paths and code are always English.
So are structural headings that form a contract between skills (`## Contract`,
`## AC Coverage`, `Task N`) — a translated one is a C6 finding, not a style note.

When proposing `description` fixes, keep the triggers in the language the user
actually types — a trigger that never matches what the user writes is dead weight.

**Chat interaction (the report) follows the user's language.**

---

## Common Issues

The 3 that **interrupt a run** — it stops, or the call goes back to the user.
Every other failure mode is in `references/common-issues.md`, with its cause and
resolution.

| Issue | Cause | Resolution |
|---|---|---|
| The skill can't be found | Misspelled path or skill in another scope | Run PHASE 1 Step 1's `find -L` over all three scopes |
| `SKILL.md` is a symlink | Global skills linked from `~/.claude/skills` | Resolve the real target before editing: `readlink -f`; edit the original |
| The user says "just fix it" | They want to skip the report | Show the blocking summary anyway before editing — it's the only moment to decide scope |

---

## Example

A full worked run — a skill evaluated phase by phase, with its findings — is in
`references/example.md`. Read it when the shape of the output is in doubt.
